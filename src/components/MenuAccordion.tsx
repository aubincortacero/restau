'use client'

import { useState, useTransition } from 'react'
import { CATEGORY_TYPES } from '@/lib/category-types'
import type { PublicCategory } from '@/app/menu/[slug]/page'
import { placeOrder } from '@/app/actions/restaurant'
import StripeCheckoutForm from '@/components/StripeCheckoutForm'

type Item = PublicCategory['items'][number]
type CartItem = { id: string; name: string; price: number; quantity: number }
type CartStep = 'cart' | 'payment-choice' | 'email' | 'stripe-form' | 'success'

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
}: {
  categories: PublicCategory[]
  hhActive: boolean
  tableId: string | null
  tableLabel: string | null
  restaurantId: string
  acceptedPaymentMethods: string[]
}) {
  const [openIds, setOpenIds] = useState<string[]>(
    categories.length > 0 ? [categories[0].id] : []
  )
  const [cart, setCart] = useState<Record<string, CartItem>>({})
  const [cartOpen, setCartOpen] = useState(false)
  const [note, setNote] = useState('')
  const [isPending, startTransition] = useTransition()
  const [cartStep, setCartStep] = useState<CartStep>('cart')
  const [orderError, setOrderError] = useState<string | null>(null)
  const [customerEmail, setCustomerEmail] = useState('')

  function toggleCat(id: string) {
    setOpenIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function addItem(item: Item, price: number) {
    setCart(prev => ({
      ...prev,
      [item.id]: { id: item.id, name: item.name, price, quantity: (prev[item.id]?.quantity ?? 0) + 1 },
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

  function handleOrder() {
    setOrderError(null)
    const hasOnline = acceptedPaymentMethods.includes('online')
    const hasCash = acceptedPaymentMethods.includes('cash')
    if (hasOnline && hasCash) {
      setCartStep('payment-choice')
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
        items: cartItems.map(i => ({ itemId: i.id, quantity: i.quantity })),
        note,
        paymentMethod: 'cash',
      })
      if (result.success) {
        setCartStep('success')
        setCart({})
        setNote('')
      } else {
        setOrderError(result.error)
      }
    })
  }

  return (
    <>
      <div className="pb-32">
        {categories.map(cat => {
          const isOpen = openIds.includes(cat.id)
          const catType = CATEGORY_TYPES.find(t => t.id === cat.category_type)
          const emoji = catType?.emoji ?? '🍽️'
          const circleClass = CATEGORY_CIRCLE[cat.category_type] ?? CATEGORY_CIRCLE.standard
          const catCartQty = cat.items.reduce((s, i) => s + (cart[i.id]?.quantity ?? 0), 0)

          return (
            <div key={cat.id} className="border-b border-stone-800/50">
              <button
                onClick={() => toggleCat(cat.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left active:bg-stone-800/30 transition-colors"
              >
                <span className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 relative ${circleClass}`}>
                  {emoji}
                  {catCartQty > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                      {catCartQty}
                    </span>
                  )}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-stone-100 text-lg leading-tight">{cat.name}</span>
                  <span className="text-xs text-stone-500 mt-0.5 block">
                    {cat.items.length} plat{cat.items.length > 1 ? 's' : ''}
                  </span>
                </span>
                <svg
                  className={`w-5 h-5 text-stone-500 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                </svg>
              </button>

              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="pb-2">
                  {cat.items.map((item, idx) => {
                    const effectivePrice = hhActive && item.happy_hour_price != null ? item.happy_hour_price : item.price
                    return (
                      <ItemRow
                        key={item.id}
                        item={item}
                        hhActive={hhActive}
                        last={idx === cat.items.length - 1}
                        qty={cart[item.id]?.quantity ?? 0}
                        onAdd={() => addItem(item, effectivePrice)}
                        onRemove={() => removeItem(item.id)}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Sticky cart bar */}
      {totalQty > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-6 pt-8 bg-gradient-to-t from-[#0a0908] via-[#0a0908]/95 to-transparent pointer-events-none">
          <button
            onClick={() => { setCartOpen(true); setCartStep('cart'); setOrderError(null) }}
            className="pointer-events-auto w-full max-w-lg mx-auto flex items-center justify-between bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white rounded-2xl px-5 py-4 shadow-xl shadow-orange-900/30 transition-colors"
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
              <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-800/40">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-stone-100 mb-2">Commande envoyée !</h3>
                {tableLabel && <p className="text-xs text-stone-500 mb-2 font-medium">{tableLabel}</p>}
                <p className="text-stone-400 text-sm mb-8 leading-relaxed">
                  Votre commande a bien été transmise. Le service va s&apos;en occuper dans quelques instants.
                </p>
                <button onClick={() => setCartOpen(false)} className="bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold px-8 py-3 rounded-2xl transition-colors">
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
                    onClick={() => setCartStep('email')}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-stone-700 hover:border-orange-500/50 bg-stone-900 hover:bg-orange-500/5 transition-all text-left active:scale-[0.99]"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-stone-100">Payer maintenant</p>
                      <p className="text-xs text-stone-500 mt-0.5">Par carte bancaire — paiement sécurisé</p>
                    </div>
                    <span className="text-stone-100 font-bold text-base shrink-0">{fmt(totalPrice)}</span>
                  </button>

                  <button
                    onClick={placeCashOrder}
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

            ) : cartStep === 'email' ? (
              <>
                <div className="px-5 pt-2 pb-3 shrink-0 flex items-center gap-3">
                  <button
                    onClick={() => setCartStep(acceptedPaymentMethods.includes('cash') ? 'payment-choice' : 'cart')}
                    className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-stone-100">Reçu par email</h2>
                    <p className="text-xs text-stone-500 mt-0.5">Optionnel — aucune pub, juste la confirmation</p>
                  </div>
                </div>
                <div className="flex-1 px-5 pb-6 flex flex-col gap-4">
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full bg-stone-900 border border-stone-700 rounded-2xl px-4 py-3 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  />
                  <button
                    onClick={() => setCartStep('stripe-form')}
                    className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-4 rounded-2xl transition-colors text-base"
                  >
                    Continuer vers le paiement
                  </button>
                  <button
                    onClick={() => { setCustomerEmail(''); setCartStep('stripe-form') }}
                    className="text-sm text-stone-500 hover:text-stone-300 text-center py-1 transition-colors"
                  >
                    Passer sans email
                  </button>
                </div>
              </>

            ) : cartStep === 'stripe-form' ? (
              <>
                <div className="px-5 pt-2 pb-3 shrink-0 flex items-center gap-3">
                  <button
                    onClick={() => setCartStep(acceptedPaymentMethods.includes('cash') ? 'payment-choice' : 'cart')}
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
                  items={cartItems.map(i => ({ itemId: i.id, quantity: i.quantity }))}
                  note={note}
                  totalPrice={totalPrice}
                  customerEmail={customerEmail || undefined}
                  onSuccess={() => { setCartStep('success'); setCart({}); setNote(''); setCustomerEmail('') }}
                  onBack={() => setCartStep(acceptedPaymentMethods.includes('cash') ? 'payment-choice' : 'email')}
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
                      className="w-full bg-stone-900 border border-stone-800 rounded-2xl px-4 py-3 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500/40 resize-none"
                    />
                  </div>
                </div>

                {orderError && <p className="text-xs text-red-400 text-center px-5 pb-2">{orderError}</p>}

                <div className="px-5 py-4 shrink-0 border-t border-stone-800/60">
                  <button
                    onClick={handleOrder}
                    disabled={isPending}
                    className="w-full bg-orange-500 hover:bg-orange-400 active:bg-orange-600 disabled:opacity-60 text-white font-bold py-4 rounded-2xl transition-colors text-base"
                  >
                    {isPending ? 'Envoi…' : `Commander · ${fmt(totalPrice)}`}
                  </button>
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
  onAdd,
  onRemove,
}: {
  item: Item
  hhActive: boolean
  last: boolean
  qty: number
  onAdd: () => void
  onRemove: () => void
}) {
  const showHH = hhActive && item.happy_hour_price != null

  return (
    <div className={`flex items-start gap-3 px-5 py-4 ${!last ? 'border-b border-stone-800/30' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-stone-100 text-base leading-snug flex-1">{item.name}</p>
          <div className="text-right shrink-0">
            {showHH ? (
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
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {item.is_vegan && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 font-medium border border-emerald-800/40">🌿 Vegan</span>
            )}
            {item.is_vegetarian && !item.is_vegan && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-400 font-medium border border-green-800/40">🌱 Végétarien</span>
            )}
          </div>
        )}

        {item.description && (
          <p className="text-sm text-stone-400 mt-1.5 line-clamp-2 leading-relaxed">{item.description}</p>
        )}

        {item.allergens && item.allergens.length > 0 && (
          <p className="text-xs text-stone-600 mt-1.5">Allergènes : {item.allergens.join(', ')}</p>
        )}

        <div className="mt-3">
          {qty === 0 ? (
            <button
              onClick={onAdd}
              className="flex items-center gap-1.5 bg-stone-800/80 hover:bg-orange-500/20 hover:text-orange-400 active:scale-95 text-stone-300 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all border border-stone-700/50 hover:border-orange-500/30"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Ajouter
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <button onClick={onRemove} className="w-8 h-8 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 flex items-center justify-center transition-all border border-stone-700/50">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" /></svg>
              </button>
              <span className="text-stone-100 font-bold text-sm w-5 text-center">{qty}</span>
              <button onClick={onAdd} className="w-8 h-8 rounded-xl bg-orange-500 hover:bg-orange-400 active:scale-95 text-white flex items-center justify-center transition-all">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {item.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image_url}
          alt={item.name}
          className="w-20 h-20 object-cover rounded-2xl shrink-0 border border-stone-800/60 mt-0.5"
          loading="lazy"
        />
      )}
    </div>
  )
}
