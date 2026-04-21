'use client'

import { useState, useEffect, useMemo } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import type { SessionWithDetails, SelectedItemForPayment, OrderItemWithPayment } from '@/types/session'
import { formatCurrency } from '@/lib/utils'
import { createPartialPayment } from '@/app/actions/sessions'

type PartialPaymentModalProps = {
  session: SessionWithDetails
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  restaurantId: string
}

function StripePaymentForm({ 
  totalAmount, 
  stripeAccountId, 
  selectedItems,
  session,
  customerEmail,
  onSuccess, 
  onCancel 
}: {
  totalAmount: number
  stripeAccountId: string | null
  selectedItems: SelectedItemForPayment[]
  session: SessionWithDetails
  customerEmail: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setIsPending(true)
    setError(null)

    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message ?? 'Erreur')
      setIsPending(false)
      return
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        payment_method_data: {
          billing_details: { name: 'Client' },
        },
      },
    })

    if (confirmError) {
      setError(confirmError.message ?? 'Paiement refusé')
      setIsPending(false)
      return
    }

    if (paymentIntent?.id) {
      // Créer le paiement partiel
      const result = await createPartialPayment(
        session.id,
        selectedItems,
        'online',
        paymentIntent.id,
        undefined,
        customerEmail || undefined
      )

      if (result.success) {
        onSuccess()
      } else {
        setError(result.error ?? 'Erreur lors de la validation')
      }
    }

    setIsPending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <PaymentElement options={{ layout: 'tabs' }} />
        {error && <p className="text-xs text-red-400 mt-3 text-center">{error}</p>}
      </div>
      <div className="px-5 py-4 shrink-0 border-t border-zinc-800/60 flex flex-col gap-2">
        <button
          type="submit"
          disabled={isPending || !stripe}
          className="w-full px-4 py-4 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Paiement en cours...' : `Payer ${formatCurrency(totalAmount)}`}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}

export function PartialPaymentModal({
  session,
  isOpen,
  onClose,
  onSuccess,
  restaurantId,
}: PartialPaymentModalProps) {
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map())
  const [step, setStep] = useState<'select' | 'payment'>('select')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null)
  const [isLoadingPayment, setIsLoadingPayment] = useState(false)
  const [customerEmail, setCustomerEmail] = useState('')

  // Créer le stripePromise dynamiquement en fonction du compte Connect
  const stripePromise = useMemo(
    () => loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
      stripeAccountId ? { stripeAccount: stripeAccountId } : undefined
    ),
    [stripeAccountId]
  )

  // Récupérer tous les items non entièrement payés (et avec un prix > 0)
  const availableItems: OrderItemWithPayment[] = session.orders.flatMap((order) =>
    order.order_items.filter((item) => item.remaining_quantity > 0 && item.unit_price > 0)
  )

  // Calculer le total
  const totalAmount = availableItems.reduce((sum, item) => {
    const selectedQty = selectedItems.get(item.id) || 0
    return sum + selectedQty * item.unit_price
  }, 0)

  const handleQuantityChange = (itemId: string, delta: number) => {
    const item = availableItems.find(i => i.id === itemId)
    if (!item) return
    
    const currentQty = selectedItems.get(itemId) || 0
    const newQty = Math.max(0, Math.min(item.remaining_quantity, currentQty + delta))
    
    const newMap = new Map(selectedItems)
    if (newQty > 0) {
      newMap.set(itemId, newQty)
    } else {
      newMap.delete(itemId)
    }
    setSelectedItems(newMap)
  }

  const handleSelectAll = () => {
    const newMap = new Map<string, number>()
    availableItems.forEach(item => {
      newMap.set(item.id, item.remaining_quantity)
    })
    setSelectedItems(newMap)
  }

  const handleProceedToPayment = async () => {
    if (totalAmount <= 0) {
      alert('Veuillez sélectionner au moins un article')
      return
    }

    setIsLoadingPayment(true)

    // Créer un payment intent pour le paiement partiel
    const amountCents = Math.round(totalAmount * 100)
    
    console.log('[PartialPaymentModal] Creating payment intent:', { 
      totalAmount, 
      amountCents, 
      restaurantId,
      sessionId: session.id 
    })
    
    const res = await fetch('/api/stripe/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId,
        tableId: session.table_id,
        items: [], // Pour un paiement partiel, on ne passe pas les items du menu
        note: `Paiement partiel - Session ${session.id}`,
        customAmount: amountCents,
        fulfillmentType: 'table',
      }),
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erreur inconnue' }))
      console.error('[PartialPaymentModal] Payment intent error:', errorData)
      const errorMessage = errorData.error || 'Erreur inconnue'
      const errorDetails = errorData.details ? `\n\nDétails: ${errorData.details}` : ''
      alert(`Erreur lors de la création du paiement: ${errorMessage}${errorDetails}`)
      setIsLoadingPayment(false)
      return
    }

    const data = await res.json()
    console.log('[PartialPaymentModal] Payment intent created:', data)
    setClientSecret(data.clientSecret)
    setStripeAccountId(data.stripeAccountId || null)
    setStep('payment')
    setIsLoadingPayment(false)
  }

  const handleBackToSelection = () => {
    setStep('select')
    setClientSecret(null)
  }

  const itemsForPayment: SelectedItemForPayment[] = availableItems
    .filter((item) => (selectedItems.get(item.id) || 0) > 0)
    .map((item) => ({
      order_item_id: item.id,
      item_name: item.item_name,
      size_label: item.size_label,
      quantity: selectedItems.get(item.id)!,
      unit_price: item.unit_price,
      max_quantity: item.remaining_quantity,
    }))

  if (!isOpen) return null

  if (step === 'payment' && clientSecret) {
    const options = {
      clientSecret,
      appearance: {
        theme: 'night' as const,
        variables: {
          colorPrimary: '#f97316',
          colorBackground: '#18181b',
          colorText: '#fafafa',
          colorDanger: '#f87171',
          borderRadius: '12px',
          fontFamily: 'inherit',
        },
      },
    }

    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => {
          onClose()
          setStep('select')
          setSelectedItems(new Map())
          setCustomerEmail('')
        }} />
        <div className="relative bg-[#111110] rounded-t-3xl max-h-[88vh] flex flex-col border-t border-zinc-800/80">
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 bg-zinc-700 rounded-full" />
          </div>
          <div className="px-5 pt-2 pb-3 shrink-0 flex items-center gap-3">
            <button
              onClick={handleBackToSelection}
              className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div>
              <h2 className="text-lg font-bold text-stone-100">Paiement sécurisé</h2>
              <p className="text-xs text-stone-500 mt-0.5">Propulsé par Stripe</p>
            </div>
          </div>
          <Elements stripe={stripePromise} options={options}>
            <StripePaymentForm 
              totalAmount={totalAmount}
              stripeAccountId={stripeAccountId}
              selectedItems={itemsForPayment}
              session={session}
              customerEmail={customerEmail}
              onSuccess={() => {
                onSuccess()
                onClose()
                setStep('select')
                setSelectedItems(new Map())
                setCustomerEmail('')
              }}
              onCancel={handleBackToSelection}
            />
          </Elements>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#111110] rounded-t-3xl max-h-[88vh] flex flex-col border-t border-zinc-800/80">
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>
        {/* En-tête */}
        <div className="px-5 pt-2 pb-3 border-b border-zinc-800 shrink-0">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-xl font-bold text-white">Paiement partiel</h2>
              <p className="text-sm text-zinc-400 mt-0.5">Sélectionnez les articles à payer</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
          {availableItems.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="w-full mt-3 px-4 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Tout prendre
            </button>
          )}
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {availableItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-zinc-400 font-medium">Tout est déjà payé !</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableItems.map((item) => {
                const selectedQty = selectedItems.get(item.id) || 0
                const itemTotal = selectedQty * item.unit_price

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl p-4 border-2 transition-all ${
                      selectedQty > 0
                        ? 'bg-orange-950/30 border-orange-500/50'
                        : 'bg-zinc-800/40 border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-white">
                          {item.item_name}{item.size_label ? ` ${item.size_label}` : ''}
                        </p>
                        <p className="text-sm text-zinc-400 mt-0.5">
                          {item.remaining_quantity} restant{item.remaining_quantity > 1 ? 's' : ''} × {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                      {selectedQty > 0 && (
                        <p className="font-bold text-lg text-orange-400 tabular-nums">
                          {formatCurrency(itemTotal)}
                        </p>
                      )}
                    </div>

                    {/* Sélecteur de quantité */}
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-2xl font-black text-white tabular-nums">
                          {selectedQty}
                        </p>
                        <p className="text-xs text-zinc-500">
                          sur {item.remaining_quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuantityChange(item.id, -1)}
                          disabled={selectedQty === 0}
                          className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-xl flex items-center justify-center transition-colors"
                        >
                          −
                        </button>
                        <button
                          onClick={() => handleQuantityChange(item.id, 1)}
                          disabled={selectedQty >= item.remaining_quantity}
                          className="w-10 h-10 rounded-full bg-orange-500 hover:bg-orange-400 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-xl flex items-center justify-center transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Boutons rapides */}
                    {item.remaining_quantity > 1 && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleQuantityChange(item.id, item.remaining_quantity - selectedQty)}
                          className="flex-1 py-2 px-3 text-xs font-medium rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
                        >
                          Tout ({item.remaining_quantity})
                        </button>
                        {selectedQty > 0 && (
                          <button
                            onClick={() => {
                              const newMap = new Map(selectedItems)
                              newMap.delete(item.id)
                              setSelectedItems(newMap)
                            }}
                            className="py-2 px-3 text-xs font-medium rounded-lg bg-zinc-700 hover:bg-red-900/30 text-zinc-400 hover:text-red-400 transition-colors"
                          >
                            Annuler
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pied de page avec total et CTA */}
        {availableItems.length > 0 && (
          <div className="px-5 py-4 border-t border-zinc-800 shrink-0 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-zinc-300">Total à payer</span>
              <span className="text-3xl font-black text-white tabular-nums">
                {formatCurrency(totalAmount)}
              </span>
            </div>
            
            {totalAmount > 0 && (
              <>
                <div className="bg-orange-950/30 border border-orange-500/30 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-orange-300">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span>Paiement en ligne par carte bancaire</span>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="customer-email" className="block text-sm font-medium text-zinc-300 mb-2">
                    Email pour recevoir le reçu
                  </label>
                  <input
                    id="customer-email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-colors"
                  />
                </div>
              </>
            )}

            <button
              onClick={handleProceedToPayment}
              disabled={totalAmount <= 0 || isLoadingPayment}
              className={`w-full px-4 py-4 rounded-xl font-bold transition-colors ${
                totalAmount > 0 && !isLoadingPayment
                  ? 'bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              {isLoadingPayment ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
                  Préparation...
                </span>
              ) : (
                'Payer'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
