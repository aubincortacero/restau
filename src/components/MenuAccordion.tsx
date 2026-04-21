'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { CATEGORY_TYPES } from '@/lib/category-types'
import type { PublicCategory } from '@/app/menu/[slug]/page'
import { placeOrder } from '@/app/actions/restaurant'
import StripeCheckoutForm from '@/components/StripeCheckoutForm'

type Item = PublicCategory['items'][number]
type CartItem = { 
  id: string
  itemId: string // UUID original de l'item
  name: string
  price: number
  quantity: number
  sizeLabel?: string
}
type CartStep = 'cart' | 'payment-choice' | 'fulfillment-choice' | 'email' | 'stripe-form' | 'success'

const CATEGORY_CIRCLE: Record<string, string> = {
  standard: 'bg-stone-800 text-stone-300',
  meat:     'bg-red-900/40 text-red-300',
  fish:     'bg-blue-900/40 text-blue-300',
  pizza:    'bg-yellow-900/40 text-yellow-300',
  burger:   'bg-orange-900/40 text-orange-300',
  alcohol:  'bg-purple-900/40 text-purple-300',
  beverage: 'bg-teal-900/40 text-teal-300',
  dessert:  'bg-pink-900/40 text-pink-300',
}

function fmt(p: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
  }).format(p)
}

export default function MenuAccordion({
  categories,
  hhActive,
  tableId,
  tableLabel,
  restaurantId,
  acceptedPaymentMethods,
  onlineBlocked,
  fulfillmentModes,
  brandColor = '#f97316',
}: {
  categories: PublicCategory[]
  hhActive: boolean
  tableId: string | null
  tableLabel: string | null
  restaurantId: string
  acceptedPaymentMethods: string[]
  onlineBlocked: boolean
  fulfillmentModes: string[]
  brandColor?: string
}) {
  const [activeTab, setActiveTab] = useState<string>(
    categories.length > 0 ? categories[0].id : ''
  )
  const cartKey = `cart_${restaurantId}`
  const [cart, setCart] = useState<Record<string, CartItem>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const stored = JSON.parse(localStorage.getItem(cartKey) ?? '{}')
      // Migration : ajouter itemId si manquant (extraire de la clé)
      const migrated: Record<string, CartItem> = {}
      for (const [key, item] of Object.entries(stored)) {
        const cartItem = item as any
        if (!cartItem.itemId) {
          // Extraire l'UUID de la clé (avant le ":")
          const itemId = key.includes(':') ? key.split(':')[0] : key
          migrated[key] = { ...cartItem, itemId }
        } else {
          migrated[key] = cartItem
        }
      }
      return migrated
    } catch {
      return {}
    }
  })

  useEffect(() => {
    try { localStorage.setItem(cartKey, JSON.stringify(cart)) } catch { /* ignore */ }
  }, [cart, cartKey])
  const [cartOpen, setCartOpen] = useState(false)
  const [note, setNote] = useState('')
  const [isPending, startTransition] = useTransition()
  const [cartStep, setCartStep] = useState<CartStep>('cart')
  const [orderError, setOrderError] = useState<string | null>(null)
  const [successWasCash, setSuccessWasCash] = useState(false)
  const [customerEmail, setCustomerEmail] = useState('')
  const [fulfillmentType, setFulfillmentType] = useState<'table' | 'pickup'>('table')
  const [pickupCode, setPickupCode] = useState<string | null>(null)
  const [successPickupCode, setSuccessPickupCode] = useState<string | null>(null)
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<'cash' | 'online'>('online')

  function addItem(item: Item, price: number, sizeLabel?: string) {
    const key = sizeLabel ? `${item.id}:${sizeLabel}` : item.id
    const name = sizeLabel ? `${item.name} \u2014 ${sizeLabel}` : item.name
    setCart(prev => ({
      ...prev,
      [key]: { 
        id: key, 
        itemId: item.id, // UUID original de l'item
        name, 
        price, 
        quantity: (prev[key]?.quantity ?? 0) + 1, 
        sizeLabel 
      },
    }))
  }

  function removeItem(id: string) {
    setCart(prev => {
      const qty = prev[id]?.quantity ?? 0
      if (qty <= 1) { const next = { ...prev }; delete next[id]; return next }
      return { ...prev, [id]: { ...prev[id], quantity: qty - 1 } }
    })
  }

  const cartItems = Object.values(cart)
  const totalQty = cartItems.reduce((s, i) => s + i.quantity, 0)
  const totalPrice = cartItems.reduce((s, i) => s + i.price * i.quantity, 0)

  function genPickupCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const rand = (n: number) =>
      Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    return `${rand(3)} ${rand(3)}`
  }

  function handleOrder() {
    setOrderError(null)
    const hasOnline = acceptedPaymentMethods.includes('online')
    const hasCash = acceptedPaymentMethods.includes('cash')
    const hasTable = fulfillmentModes.includes('table')
    const hasPickup = fulfillmentModes.includes('pickup')

    if (hasOnline && hasCash) {
      setCartStep('payment-choice')
    } else if (hasTable && hasPickup) {
      // Un seul mode de paiement disponible : le mémoriser avant le choix de service
      setPendingPaymentMethod(hasOnline ? 'online' : 'cash')
      setCartStep('fulfillment-choice')
    } else if (hasPickup) {
      // Seul pickup disponible : générer code, forcer email
      setPendingPaymentMethod(hasOnline ? 'online' : 'cash')
      setFulfillmentType('pickup')
      setPickupCode(genPickupCode())
      setCartStep('email')
    } else if (hasOnline) {
      setCartStep('email')
    } else {
      placeCashOrder()
    }
  }

  function placeCashOrder() {
    setOrderError(null)
    startTransition(async () => {
      const result = await placeOrder({
        restaurantId,
        tableId,
        items: cartItems.map(i => ({ itemId: i.itemId, quantity: i.quantity })),
        note,
        paymentMethod: 'cash',
        fulfillmentType,
        customerEmail: customerEmail || undefined,
        pickupCode: pickupCode || undefined,
      })
      if (result.success) {
        setSuccessPickupCode(result.pickupCode ?? null)
        setSuccessWasCash(true)
        setCartStep('success')
        setCart({})
        setNote('')
        setCustomerEmail('')
        setPickupCode(null)
        try { localStorage.removeItem(cartKey) } catch { /* ignore */ }
      } else {
        setOrderError(result.error)
      }
    })
  }

  return (
    <>
      <style>{`
        .menu-btn-primary { background-color: var(--brand); border-radius: var(--btn-radius, 12px); }
        .menu-btn-primary:hover { filter: brightness(1.1); }
        .menu-btn-primary:active { filter: brightness(0.9); }
        .menu-add-btn:hover { background-color: color-mix(in srgb, var(--brand) 20%, transparent); color: var(--brand); border-color: color-mix(in srgb, var(--brand) 50%, transparent); }
        .menu-choice-btn:hover { border-color: color-mix(in srgb, var(--brand) 60%, transparent); background-color: color-mix(in srgb, var(--brand) 6%, #1c1917); }
        .menu-choice-icon { background-color: color-mix(in srgb, var(--brand) 12%, transparent) !important; border-color: color-mix(in srgb, var(--brand) 25%, transparent) !important; }
        .menu-choice-icon svg { color: var(--brand) !important; }
        .menu-cart-badge { background-color: var(--brand); }
        .menu-pickup-code { border-color: var(--brand); }
        .menu-pickup-text { color: var(--brand); }
        .menu-item-plus { background-color: var(--brand); border-radius: 10px; }
        .menu-item-plus:hover { filter: brightness(1.1); }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      {/* Tabs horizontales scrollables */}
      <div className="sticky top-0 z-30 bg-[#0a0908] border-b border-stone-900 -mx-4 px-4">
        <div className="flex gap-2 py-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
          {categories.map((cat) => {
            const isActive = activeTab === cat.id
            const catType = CATEGORY_TYPES.find(t => t.id === cat.category_type)
            const emoji = catType?.emoji ?? '🍽️'
            const catCartQty = cat.items.reduce((s, i) => {
              const totalQty = cart[i.id]?.quantity ?? 0
              const sizeQty = i.sizes?.reduce((sum, size) => 
                sum + (cart[`${i.id}:${size.label}`]?.quantity ?? 0), 0) ?? 0
              return s + totalQty + sizeQty
            }, 0)

            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`snap-start shrink-0 relative px-5 py-2.5 rounded-full font-semibold text-sm transition-all ${
                  isActive 
                    ? 'text-white shadow-lg' 
                    : 'bg-stone-900 text-stone-400 hover:bg-stone-800 hover:text-stone-300'
                }`}
                style={isActive ? { backgroundColor: brandColor } : undefined}
              >
                <span className="flex items-center gap-2">
                  <span>{emoji}</span>
                  <span>{cat.name}</span>
                </span>
                {catCartQty > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {catCartQty}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grille de produits */}
      <div className="px-4 pt-4 pb-32">
        {categories.map((cat) => {
          if (cat.id !== activeTab) return null

          return (
            <div key={cat.id} className="grid grid-cols-1 gap-4">
              {cat.items.map((item) => {
                const effectivePrice = hhActive && item.happy_hour_price != null ? item.happy_hour_price : item.price
                const qty = cart[item.id]?.quantity ?? 0
                const hasSizes = item.sizes && item.sizes.length > 0

                return (
                  <div
                    key={item.id}
                    className="bg-stone-900 rounded-2xl overflow-hidden relative"
                  >
                    {/* Image */}
                    {item.image_url ? (
                      <div className="relative w-full aspect-[16/10] bg-stone-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        {hhActive && item.happy_hour_price != null && (
                          <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <span>🎉</span>
                            <span>Happy Hour</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative w-full aspect-[16/10] bg-gradient-to-br from-stone-800 to-stone-900 flex items-center justify-center">
                        <span className="text-6xl opacity-20">🍽️</span>
                        {hhActive && item.happy_hour_price != null && (
                          <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <span>🎉</span>
                            <span>Happy Hour</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Contenu */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-stone-100 text-base leading-tight mb-1">
                            {item.name}
                          </h3>
                          {item.description && (
                            <p className="text-sm text-stone-400 leading-snug line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          {/* Badges */}
                          <div className="flex items-center gap-1.5 mt-2">
                            {item.is_vegetarian && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-300 border border-green-800/50">
                                🌱 Végétarien
                              </span>
                            )}
                            {item.is_vegan && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-300 border border-green-800/50">
                                🌿 Vegan
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Prix et bouton d'ajout */}
                      {!hasSizes ? (
                        <div className="flex items-center justify-between mt-3">
                          <div>
                            <span className="text-2xl font-bold text-white">
                              {fmt(effectivePrice)}
                            </span>
                            {hhActive && item.happy_hour_price != null && (
                              <span className="ml-2 text-sm text-stone-500 line-through">
                                {fmt(item.price)}
                              </span>
                            )}
                          </div>
                          {qty > 0 ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => removeItem(item.id)}
                                className="w-10 h-10 rounded-full bg-stone-800 text-stone-300 hover:bg-stone-700 flex items-center justify-center font-bold text-lg transition-colors"
                              >
                                −
                              </button>
                              <span className="text-white font-bold text-lg min-w-[2rem] text-center">
                                {qty}
                              </span>
                              <button
                                onClick={() => addItem(item, effectivePrice)}
                                className="menu-item-plus w-10 h-10 rounded-full text-white hover:brightness-110 flex items-center justify-center font-bold text-lg transition-all shadow-lg"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addItem(item, effectivePrice)}
                              className="menu-item-plus w-12 h-12 rounded-full text-white hover:brightness-110 flex items-center justify-center font-bold text-2xl transition-all shadow-lg"
                            >
                              +
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {item.sizes.map((size) => {
                            const sizePrice = hhActive && size.happy_hour_price != null ? size.happy_hour_price : size.price
                            const sizeQty = cart[`${item.id}:${size.label}`]?.quantity ?? 0
                            
                            return (
                              <div key={size.label} className="flex items-center justify-between p-2 rounded-lg bg-stone-800/50">
                                <div>
                                  <span className="text-stone-300 text-sm font-medium">{size.label}</span>
                                  <span className="ml-3 text-white font-bold">{fmt(sizePrice)}</span>
                                  {hhActive && size.happy_hour_price != null && (
                                    <span className="ml-2 text-xs text-stone-500 line-through">
                                      {fmt(size.price)}
                                    </span>
                                  )}
                                </div>
                                {sizeQty > 0 ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => removeItem(`${item.id}:${size.label}`)}
                                      className="w-8 h-8 rounded-full bg-stone-700 text-stone-300 hover:bg-stone-600 flex items-center justify-center font-bold transition-colors"
                                    >
                                      −
                                    </button>
                                    <span className="text-white font-bold min-w-[1.5rem] text-center">
                                      {sizeQty}
                                    </span>
                                    <button
                                      onClick={() => addItem(item, sizePrice, size.label)}
                                      className="menu-item-plus w-8 h-8 rounded-full text-white hover:brightness-110 flex items-center justify-center font-bold transition-all"
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => addItem(item, sizePrice, size.label)}
                                    className="menu-item-plus w-9 h-9 rounded-full text-white hover:brightness-110 flex items-center justify-center font-bold text-xl transition-all shadow-md"
                                  >
                                    +
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Sticky cart bar */}
      {totalQty > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-6 pt-8 bg-gradient-to-t from-[#0a0908] via-[#0a0908]/95 to-transparent pointer-events-none">
          <button
            onClick={() => { setCartOpen(true); setCartStep('cart'); setOrderError(null) }}
            className="pointer-events-auto w-full max-w-lg mx-auto flex items-center justify-between menu-btn-primary text-white px-5 py-4 shadow-xl transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 bg-white/20 rounded-xl flex items-center justify-center text-sm font-bold shrink-0">
                {totalQty}
              </span>
              <span className="font-semibold text-base">Voir mon panier</span>
            </div>
            <span className="font-bold text-lg">{fmt(totalPrice)}</span>
          </button>
        </div>
      )}

      {/* Cart sheet */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="relative bg-[#111110] rounded-t-3xl max-h-[88vh] flex flex-col border-t border-stone-800/80">
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-stone-700 rounded-full" />
            </div>

            {cartStep === 'success' ? (
              <div className="flex flex-col items-center justify-center py-10 px-8 text-center">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-800/40">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-stone-100 mb-2">Commande envoyée !</h3>
                {tableLabel && !successPickupCode && <p className="text-xs text-stone-500 mb-2 font-medium">{tableLabel}</p>}
                {successWasCash && !successPickupCode && (
                  <div className="flex items-center gap-2 bg-stone-800/60 border border-stone-700/50 rounded-2xl px-4 py-3 mb-4 text-sm text-stone-300">
                    <svg className="w-4 h-4 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>
                    Pensez à régler votre addition à la caisse.
                  </div>
                )}
                {successPickupCode ? (
                  <>
                    <p className="text-stone-400 text-sm mb-4 leading-relaxed">
                      Votre commande est en cours de préparation. Récupérez-la au comptoir avec ce code :
                    </p>
                    <div className="menu-pickup-code w-full bg-stone-900 border-2 rounded-2xl px-6 py-5 mb-6 text-center">
                      <p className="text-xs text-stone-500 uppercase tracking-widest mb-1 font-medium">Code de retrait</p>
                      <p className="menu-pickup-text text-4xl font-black tracking-widest font-mono">{successPickupCode}</p>
                      <p className="text-xs text-stone-600 mt-2">Un email de confirmation vous a été envoyé</p>
                    </div>
                  </>
                ) : (
                  <p className="text-stone-400 text-sm mb-8 leading-relaxed">
                    Votre commande a bien été transmise. Le service va s&apos;en occuper dans quelques instants.
                  </p>
                )}
                <button onClick={() => { setCartOpen(false); setSuccessPickupCode(null); setSuccessWasCash(false) }} className="bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold px-8 py-3 rounded-2xl transition-colors">
                  Fermer
                </button>
              </div>

            ) : cartStep === 'payment-choice' ? (
              <>
                <div className="px-5 pt-2 pb-3 shrink-0 flex items-center gap-3">
                  <button onClick={() => setCartStep('cart')} className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 flex items-center justify-center transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-stone-100">Comment souhaitez-vous payer ?</h2>
                    {tableLabel && <p className="text-xs text-stone-500 mt-0.5">{tableLabel}</p>}
                  </div>
                </div>
                <div className="flex-1 px-5 pb-4 flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setPendingPaymentMethod('online')
                      const hasPickup = fulfillmentModes.includes('pickup')
                      const hasTable = fulfillmentModes.includes('table')
                      if (hasPickup && hasTable) setCartStep('fulfillment-choice')
                      else setCartStep('email')
                    }}
                    className="menu-choice-btn w-full flex items-center gap-4 p-4 rounded-2xl border border-stone-700 bg-stone-900 transition-all text-left active:scale-[0.99]"
                  >
                    <div className="menu-choice-icon w-11 h-11 rounded-2xl flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-stone-100">Payer maintenant</p>
                      <p className="text-xs text-stone-500 mt-0.5">Par carte bancaire — paiement sécurisé</p>
                    </div>
                    <span className="text-stone-100 font-bold text-base shrink-0">{fmt(totalPrice)}</span>
                  </button>

                  <button
                    onClick={() => {
                      setPendingPaymentMethod('cash')
                      const hasPickup = fulfillmentModes.includes('pickup')
                      const hasTable = fulfillmentModes.includes('table')
                      if (hasPickup && hasTable) {
                        setCartStep('fulfillment-choice')
                      } else if (hasPickup) {
                        setFulfillmentType('pickup')
                        const code = genPickupCode()
                        setPickupCode(code)
                        setCartStep('email')
                      } else {
                        placeCashOrder()
                      }
                    }}
                    disabled={isPending}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-stone-700 hover:border-stone-600 bg-stone-900 hover:bg-stone-800/60 transition-all text-left active:scale-[0.99] disabled:opacity-60"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-stone-800 border border-stone-700 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-stone-100">Payer à la caisse</p>
                      <p className="text-xs text-stone-500 mt-0.5">Espèces ou carte à la fin du repas</p>
                    </div>
                    {isPending && <div className="w-4 h-4 border-2 border-stone-500 border-t-transparent rounded-full animate-spin shrink-0" />}
                  </button>
                  {orderError && <p className="text-xs text-red-400 text-center">{orderError}</p>}
                </div>
              </>

            ) : cartStep === 'fulfillment-choice' ? (
              <>
                <div className="px-5 pt-2 pb-3 shrink-0 flex items-center gap-3">
                  <button
                    onClick={() => setCartStep(acceptedPaymentMethods.includes('online') && acceptedPaymentMethods.includes('cash') ? 'payment-choice' : 'cart')}
                    className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-stone-100">Comment récupérer votre commande ?</h2>
                    {tableLabel && <p className="text-xs text-stone-500 mt-0.5">{tableLabel}</p>}
                  </div>
                </div>
                <div className="flex-1 px-5 pb-4 flex flex-col gap-3">
                  {fulfillmentModes.includes('table') && (
                    <button
                      onClick={() => {
                        setFulfillmentType('table')
                        setPickupCode(null)
                        if (pendingPaymentMethod === 'cash') placeCashOrder()
                        else setCartStep('email')
                      }}
                      className="menu-choice-btn w-full flex items-center gap-4 p-4 rounded-2xl border border-stone-700 bg-stone-900 transition-all text-left active:scale-[0.99]"
                    >
                      <div className="menu-choice-icon w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-2xl">
                        🍽️
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-stone-100">Livré à la table</p>
                        <p className="text-xs text-stone-500 mt-0.5">Le service apporte votre commande</p>
                      </div>
                    </button>
                  )}
                  {fulfillmentModes.includes('pickup') && (
                    <button
                      onClick={() => {
                        setFulfillmentType('pickup')
                        const code = genPickupCode()
                        setPickupCode(code)
                        setCartStep('email')
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border border-stone-700 hover:border-stone-600 bg-stone-900 hover:bg-stone-800/60 transition-all text-left active:scale-[0.99]"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-stone-800 border border-stone-700 flex items-center justify-center shrink-0 text-2xl">
                        🛍️
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-stone-100">Récupérer au comptoir</p>
                        <p className="text-xs text-stone-500 mt-0.5">Vous récupérez votre commande au comptoir</p>
                      </div>
                    </button>
                  )}
                  {orderError && <p className="text-xs text-red-400 text-center">{orderError}</p>}
                </div>
              </>

            ) : cartStep === 'email' ? (
              <>
                <div className="px-5 pt-2 pb-3 shrink-0 flex items-center gap-3">
                  <button
                    onClick={() => {
                      const hasBothPayments = acceptedPaymentMethods.includes('online') && acceptedPaymentMethods.includes('cash')
                      const hasBothFulfillments = fulfillmentModes.includes('table') && fulfillmentModes.includes('pickup')
                      if (hasBothFulfillments) setCartStep('fulfillment-choice')
                      else if (hasBothPayments) setCartStep('payment-choice')
                      else setCartStep('cart')
                    }}
                    className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                  </button>
                  <div>
                    {fulfillmentType === 'pickup' ? (
                      <>
                        <h2 className="text-lg font-bold text-stone-100">Votre email</h2>
                        <p className="text-xs text-stone-500 mt-0.5">Pour recevoir votre code de retrait</p>
                      </>
                    ) : (
                      <>
                        <h2 className="text-lg font-bold text-stone-100">Reçu par email</h2>
                        <p className="text-xs text-stone-500 mt-0.5">Optionnel — aucune pub, juste la confirmation</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex-1 px-5 pb-6 flex flex-col gap-4">
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    placeholder="votre@email.com"
                    required={fulfillmentType === 'pickup'}
                    className="w-full bg-stone-900 border border-stone-700 rounded-2xl px-4 py-3 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40"
                  />
                  <button
                    onClick={() => {
                      if (fulfillmentType === 'pickup' && !customerEmail.includes('@')) return
                      if (pendingPaymentMethod === 'cash') placeCashOrder()
                      else setCartStep('stripe-form')
                    }}
                    className="w-full menu-btn-primary text-white font-bold py-4 transition-colors text-base"
                  >
                    {fulfillmentType === 'pickup'
                      ? pendingPaymentMethod === 'cash' ? 'Confirmer ma commande' : 'Recevoir mon code et payer'
                      : 'Continuer vers le paiement'}
                  </button>
                  {fulfillmentType !== 'pickup' && (
                    <button
                      onClick={() => { setCustomerEmail(''); setCartStep('stripe-form') }}
                      className="text-sm text-stone-500 hover:text-stone-300 text-center py-1 transition-colors"
                    >
                      Passer sans email
                    </button>
                  )}
                </div>
              </>

            ) : cartStep === 'stripe-form' ? (
              <>
                <div className="px-5 pt-2 pb-3 shrink-0 flex items-center gap-3">
                  <button
                    onClick={() => setCartStep('email')}
                    className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-stone-100">Paiement sécurisé</h2>
                    <p className="text-xs text-stone-500 mt-0.5">Propulsé par Stripe</p>
                  </div>
                </div>
                <StripeCheckoutForm
                  restaurantId={restaurantId}
                  tableId={tableId}
                  items={cartItems.map(i => ({ itemId: i.itemId, quantity: i.quantity }))}
                  note={note}
                  totalPrice={totalPrice}
                  customerEmail={customerEmail || undefined}
                  fulfillmentType={fulfillmentType}
                  pickupCode={pickupCode || undefined}
                  brandColor={brandColor}
                  onSuccess={() => { setCartStep('success'); setCart({}); setNote(''); setCustomerEmail(''); setPickupCode(null); try { localStorage.removeItem(cartKey) } catch { /* ignore */ } }}
                  onBack={() => setCartStep('email')}
                />
              </>

            ) : (
              <>
                <div className="px-5 pt-2 pb-3 shrink-0 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-stone-100">Votre commande</h2>
                    {tableLabel && <p className="text-xs text-stone-500 mt-0.5">{tableLabel}</p>}
                  </div>
                  <button onClick={() => setCartOpen(false)} className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 flex items-center justify-center transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 pb-2">
                  {cartItems.map(ci => (
                    <div key={ci.id} className="flex items-center gap-3 py-3 border-b border-stone-800/40">
                      <p className="flex-1 min-w-0 text-stone-200 font-medium text-sm truncate">{ci.name}</p>
                      <span className="text-stone-400 text-sm w-16 text-right shrink-0">{fmt(ci.price * ci.quantity)}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => removeItem(ci.id)} className="w-7 h-7 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition-colors">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" /></svg>
                        </button>
                        <span className="text-stone-100 font-bold text-sm w-4 text-center">{ci.quantity}</span>
                        <button
                          onClick={() => { const catItem = categories.flatMap(c => c.items).find(i => i.id === ci.id); if (catItem) addItem(catItem, ci.price) }}
                          className="w-7 h-7 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-between py-3">
                    <span className="text-stone-400 text-sm">Total</span>
                    <span className="text-stone-100 font-bold text-xl">{fmt(totalPrice)}</span>
                  </div>

                  <div className="pb-2">
                    <label className="block text-xs text-stone-500 mb-2">Note pour la cuisine (optionnel)</label>
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Ex : sans oignons, allergie gluten…"
                      rows={2}
                      maxLength={300}
                      className="w-full bg-stone-900 border border-stone-800 rounded-2xl px-4 py-3 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 resize-none"
                    />
                  </div>
                </div>

                {orderError && <p className="text-xs text-red-400 text-center px-5 pb-2">{orderError}</p>}

                <div className="px-5 py-4 shrink-0 border-t border-stone-800/60">
                  {acceptedPaymentMethods.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-2 text-center">
                      <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center mb-1">
                        <svg className="w-5 h-5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                      </div>
                      <p className="text-stone-300 font-semibold text-sm">Commande en ligne indisponible</p>
                      <p className="text-stone-500 text-xs leading-relaxed">Le paiement en ligne n&apos;est pas encore configuré par ce restaurant. Veuillez commander directement auprès du service.</p>
                    </div>
                  ) : (
                    <>
                      {onlineBlocked && (
                        <p className="text-xs text-amber-500/80 text-center mb-3">
                          Paiement en ligne indisponible — règlement à la caisse uniquement.
                        </p>
                      )}
                      <button
                        onClick={handleOrder}
                        disabled={isPending}
                        className="w-full menu-btn-primary disabled:opacity-60 text-white font-bold py-4 transition-colors text-base"
                      >
                        {isPending ? 'Envoi…' : `Commander · ${fmt(totalPrice)}`}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function ItemRow({
  item,
  hhActive,
  last,
  qty,
  qtyBySize,
  onAdd,
  onAddSize,
  onRemove,
  onRemoveSize,
}: {
  item: Item
  hhActive: boolean
  last: boolean
  qty: number
  qtyBySize?: Record<string, number>
  onAdd: () => void
  onAddSize?: (label: string, price: number) => void
  onRemove: () => void
  onRemoveSize?: (label: string) => void
}) {
  const showHH = hhActive && item.happy_hour_price != null
  const [imageOpen, setImageOpen] = useState(false)
  const [imageVisible, setImageVisible] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function openImage() {
    if (!item.image_url) return
    setImageOpen(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setImageVisible(true)))
  }

  function closeImage() {
    setImageVisible(false)
    setTimeout(() => setImageOpen(false), 200)
  }

  function startLongPress() {
    if (!item.image_url) return
    longPressTimer.current = setTimeout(() => openImage(), 450)
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  return (
    <>
      {/* Image popup */}
      {imageOpen && item.image_url && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{
            backdropFilter: 'blur(8px)',
            background: `rgba(10,9,8,${imageVisible ? '0.80' : '0'})`,
            transition: 'background 0.2s ease',
          }}
          onClick={closeImage}
        >
          <div
            className="relative mx-6 rounded-3xl overflow-hidden shadow-2xl"
            style={{
              maxWidth: '340px',
              width: '100%',
              transform: imageVisible ? 'scale(1)' : 'scale(0.75)',
              opacity: imageVisible ? 1 : 0,
              transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1), opacity 0.18s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full object-cover"
              style={{ maxHeight: '65vw', minHeight: '200px' }}
            />
            <div className="absolute top-3 right-3">
              <button
                onClick={closeImage}
                className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white border border-white/20"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className={`flex items-center gap-4 px-4 py-3.5 ${item.image_url ? 'select-none' : ''}`}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onTouchMove={cancelLongPress}
        onMouseDown={startLongPress}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
      >
        {/* Miniature cliquable */}
        {item.image_url ? (
          <button
            type="button"
            onClick={openImage}
            className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-stone-800/60 active:scale-95 transition-transform"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </button>
        ) : null}

        {/* Texte + actions */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={`font-semibold text-stone-100 text-base leading-snug flex-1 truncate ${item.image_url ? 'cursor-pointer active:opacity-70' : ''}`}
              onClick={item.image_url ? openImage : undefined}
            >{item.name}</p>
            <div className="text-right shrink-0 ml-2">
              {item.sizes && item.sizes.length > 0 ? (
                <p className="text-stone-500 text-xs font-medium">
                  {hhActive && item.sizes.some(s => s.happy_hour_price != null)
                    ? <>dès <span className="text-amber-400">{fmt(Math.min(...item.sizes.map(s => s.happy_hour_price ?? s.price)))}</span> <span className="line-through opacity-50">{fmt(Math.min(...item.sizes.map(s => s.price)))}</span></>
                    : <>dès {fmt(Math.min(...item.sizes.map(s => s.price)))}</>}
                </p>
              ) : showHH ? (
                <>
                  <p className="font-bold text-amber-400 text-base leading-tight">{fmt(item.happy_hour_price!)}</p>
                  <p className="text-stone-500 line-through text-xs mt-0.5">{fmt(item.price)}</p>
                </>
              ) : (
                <p className="font-semibold text-stone-200 text-base">{fmt(item.price)}</p>
              )}
            </div>
          </div>

          {(item.is_vegan || item.is_vegetarian) && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {item.is_vegan && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 font-medium border border-emerald-800/40">🌿 Vegan</span>
              )}
              {item.is_vegetarian && !item.is_vegan && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-400 font-medium border border-green-800/40">🌱 Végétarien</span>
              )}
            </div>
          )}

          {item.description && (
            <p className="text-xs text-stone-500 mt-1 line-clamp-1 leading-relaxed">{item.description}</p>
          )}

          {item.allergens && item.allergens.length > 0 && (
            <p className="text-xs text-stone-700 mt-1">Allergènes : {item.allergens.join(', ')}</p>
          )}

          <div className="mt-2.5">
            {item.sizes && item.sizes.length > 0 ? (
              <div className="space-y-1.5">
                {item.sizes.map(size => {
                  const sizeQty = qtyBySize?.[size.label] ?? 0
                  const sizeEffectivePrice = hhActive && size.happy_hour_price != null ? size.happy_hour_price : size.price
                  return (
                    <div key={size.label} className="flex items-center gap-2">
                      <span className="text-stone-400 text-xs font-medium flex-1">{size.label}</span>
                      <span className="text-right shrink-0">
                        {hhActive && size.happy_hour_price != null ? (
                          <>
                            <span className="text-amber-400 text-xs font-semibold">{fmt(size.happy_hour_price)}</span>
                            <span className="text-stone-600 line-through text-[10px] ml-1">{fmt(size.price)}</span>
                          </>
                        ) : (
                          <span className="text-stone-300 text-xs font-semibold">{fmt(size.price)}</span>
                        )}
                      </span>
                      {sizeQty === 0 ? (
                        <button
                          onClick={() => onAddSize?.(size.label, sizeEffectivePrice)}
                          className="menu-add-btn flex items-center gap-1 bg-stone-800/80 active:scale-95 text-stone-300 text-xs font-semibold px-2.5 py-1 rounded-xl transition-all border border-stone-700/50"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          Ajouter
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => onRemoveSize?.(size.label)} className="w-6 h-6 rounded-lg bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 flex items-center justify-center transition-all border border-stone-700/50">
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" /></svg>
                          </button>
                          <span className="text-stone-100 font-bold text-sm w-4 text-center">{sizeQty}</span>
                          <button onClick={() => onAddSize?.(size.label, sizeEffectivePrice)} className="menu-item-plus w-6 h-6 active:scale-95 text-white flex items-center justify-center transition-all">
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : qty === 0 ? (
              <button
                onClick={onAdd}
                className="menu-add-btn flex items-center gap-1.5 bg-stone-800/80 active:scale-95 text-stone-300 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all border border-stone-700/50"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Ajouter
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={onRemove} className="w-7 h-7 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 flex items-center justify-center transition-all border border-stone-700/50">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" /></svg>
                </button>
                <span className="text-stone-100 font-bold text-sm w-5 text-center">{qty}</span>
                <button onClick={onAdd} className="menu-item-plus w-7 h-7 active:scale-95 text-white flex items-center justify-center transition-all">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
