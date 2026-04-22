'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

function fmt(p: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
  }).format(p)
}

type Props = {
  restaurantId: string
  tableId: string | null
  items: Array<{ itemId: string; quantity: number; sizeLabel?: string }>
  note: string
  totalPrice: number
  customerEmail?: string
  fulfillmentType?: 'table' | 'pickup'
  pickupCode?: string
  brandColor?: string
  onSuccess: () => void
  onBack: () => void
}

function CheckoutForm({ totalPrice, stripeAccountId, customerEmail, fulfillmentType, pickupCode, brandColor, onSuccess, onBack }: {
  totalPrice: number
  stripeAccountId: string | null
  customerEmail?: string
  fulfillmentType?: 'table' | 'pickup'
  pickupCode?: string
  brandColor: string
  onSuccess: () => void
  onBack: () => void
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

    // Créer la commande côté serveur (ne pas dépendre uniquement du webhook)
    if (paymentIntent?.id) {
      const res = await fetch('/api/stripe/confirm-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId: paymentIntent.id, stripeAccountId, customerEmail, fulfillmentType, pickupCode }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Erreur après paiement')
        setIsPending(false)
        return
      }
    }

    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <PaymentElement 
          options={{ 
            layout: {
              type: 'accordion',
              defaultCollapsed: false,
              spacedAccordionItems: true
            },
            wallets: {
              applePay: 'auto',
              googlePay: 'auto',
            },
            fields: {
              billingDetails: 'never'
            }
          }} 
        />
        {error && <p className="text-sm text-red-400 mt-4 text-center bg-red-950/30 border border-red-500/30 rounded-lg px-4 py-3">{error}</p>}
      </div>
      <div className="px-5 py-4 shrink-0 border-t border-stone-800/60 flex flex-col gap-2">
        <button
          type="submit"
          disabled={isPending || !stripe}
          style={{ backgroundColor: brandColor }}
          className="w-full disabled:opacity-60 text-white font-bold py-4 rounded-2xl transition-colors text-base"
        >
          {isPending ? 'Paiement en cours…' : `Payer ${fmt(totalPrice)}`}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={isPending}
          className="w-full text-sm text-stone-500 hover:text-stone-300 py-2.5 transition-colors"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}

export default function StripeCheckoutForm({ restaurantId, tableId, items, note, totalPrice, customerEmail, fulfillmentType, pickupCode, brandColor = '#F07A4F', onSuccess, onBack }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  const stripePromise = useMemo(
    () => loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
      stripeAccountId ? { stripeAccount: stripeAccountId } : undefined
    ),
    [stripeAccountId]
  )

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    fetch('/api/stripe/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId, tableId, items, note, fulfillmentType: fulfillmentType ?? 'table', pickupCode }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) setLoadError(data.error)
        else {
          setStripeAccountId(data.stripeAccountId ?? null)
          setClientSecret(data.clientSecret)
        }
      })
      .catch(() => setLoadError('Erreur de connexion'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-8 text-center gap-4">
        <p className="text-red-400 text-sm">{loadError}</p>
        <button onClick={onBack} className="text-sm text-stone-500 hover:text-stone-300 transition-colors">← Retour</button>
      </div>
    )
  }

  if (!clientSecret) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: brandColor,
            colorBackground: '#1c1917',
            colorText: '#fafaf9',
            colorDanger: '#ef4444',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSizeBase: '15px',
            fontWeightNormal: '500',
            borderRadius: '12px',
            spacingUnit: '4px',
          },
          rules: {
            '.Label': {
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '8px',
              color: '#fafaf9',
            },
            '.TabLabel': {
              color: '#fafaf9',
            },
            '.Text': {
              color: '#e7e5e4',
            },
            '.Input': {
              fontSize: '16px',
              padding: '14px 12px',
              backgroundColor: '#292524',
              border: '1px solid #44403c',
            },
            '.Input:focus': {
              border: `1px solid ${brandColor}`,
              boxShadow: `0 0 0 1px ${brandColor}`,
              outline: 'none',
            },
            '.Tab': {
              border: '1px solid #44403c',
              backgroundColor: '#1c1917',
            },
            '.Tab--selected': {
              border: `1px solid ${brandColor}`,
              backgroundColor: '#1c1917',
              color: '#fafaf9',
            },
            '.Tab--selected .TabLabel': {
              color: '#fafaf9',
            },
          },
        },
      }}
    >
      <CheckoutForm totalPrice={totalPrice} stripeAccountId={stripeAccountId} customerEmail={customerEmail} fulfillmentType={fulfillmentType} pickupCode={pickupCode} brandColor={brandColor} onSuccess={onSuccess} onBack={onBack} />
    </Elements>
  )
}
