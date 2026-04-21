import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { restaurantId, tableId, items, note, fulfillmentType, pickupCode, customAmount } = await req.json()

    console.log('[create-payment-intent] Request:', { restaurantId, tableId, hasItems: !!items, customAmount, fulfillmentType })

    if (!restaurantId) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }

    const UUID_RE = /^[0-9a-f-]{36}$/i
    if (!UUID_RE.test(restaurantId)) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Vérifier que le restaurant accepte le paiement en ligne
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, name, accepted_payment_methods, happy_hour, stripe_account_id')
      .eq('id', restaurantId)
      .single()

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404 })
    }
    if (!(restaurant.accepted_payment_methods ?? ['online', 'cash']).includes('online')) {
      return NextResponse.json({ error: 'Paiement en ligne non accepté' }, { status: 400 })
    }

    let amountCents: number

    // Si customAmount est fourni (paiement partiel), l'utiliser directement
    if (typeof customAmount === 'number') {
      amountCents = customAmount
    } else {
      // Sinon, calculer depuis les items
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
      }

      for (const item of items) {
        if (!UUID_RE.test(item.itemId) || item.quantity < 1 || item.quantity > 99) {
          return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
        }
      }

      // Récupérer les prix depuis la DB — ne jamais faire confiance au client
      const itemIds = items.map((i: { itemId: string }) => i.itemId)
      const uniqueItemIds = [...new Set(itemIds)] // Déduplication pour éviter les erreurs si même item commandé 2x
      const { data: dbItems } = await supabase
        .from('items')
        .select('id, price, happy_hour_price, is_available, category_id, sizes')
        .in('id', uniqueItemIds)

      if (!dbItems || dbItems.length !== uniqueItemIds.length) {
        return NextResponse.json({ error: 'Articles introuvables' }, { status: 400 })
      }

      // Vérifier l'appartenance au restaurant
      const catIds = [...new Set(dbItems.map((i) => i.category_id))]
      const { data: cats } = await supabase
        .from('categories')
        .select('id')
        .in('id', catIds)
        .eq('restaurant_id', restaurantId)

      if (!cats || cats.length !== catIds.length) {
        return NextResponse.json({ error: 'Articles invalides' }, { status: 400 })
      }

      if (dbItems.some((i) => !i.is_available)) {
        return NextResponse.json({ error: 'Certains articles ne sont plus disponibles' }, { status: 400 })
      }

      // Calculer le montant côté serveur
      const isHH = checkHHActive(restaurant.happy_hour as HHData | null)
      amountCents = items.reduce((sum: number, pi: { itemId: string; quantity: number; sizeLabel?: string }) => {
        const dbItem = dbItems.find((i) => i.id === pi.itemId)!
        
        // Si une taille est spécifiée, chercher son prix dans sizes
        let unitPrice: number
        if (pi.sizeLabel && dbItem.sizes && Array.isArray(dbItem.sizes)) {
          const selectedSize = dbItem.sizes.find((s: any) => s.label === pi.sizeLabel)
          if (selectedSize) {
            // Utiliser le prix HH de la size si disponible, sinon le prix normal
            unitPrice = isHH && selectedSize.happy_hour_price != null
              ? Number(selectedSize.happy_hour_price)
              : Number(selectedSize.price)
          } else {
            // Size non trouvée, utiliser prix de base
            unitPrice = isHH && dbItem.happy_hour_price != null
              ? Number(dbItem.happy_hour_price)
              : Number(dbItem.price)
          }
        } else {
          // Pas de size, utiliser le prix de base
          unitPrice = isHH && dbItem.happy_hour_price != null
            ? Number(dbItem.happy_hour_price)
            : Number(dbItem.price)
        }
        
        return sum + Math.round(unitPrice * 100) * pi.quantity
      }, 0)
    }

    if (amountCents < 50) {
      console.error('[create-payment-intent] Amount too low:', amountCents)
      return NextResponse.json({ error: 'Montant minimum 0,50 €' }, { status: 400 })
    }

    console.log('[create-payment-intent] Creating payment intent with amount:', amountCents)

    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: amountCents,
      currency: 'eur',
      statement_descriptor_suffix: 'QOMAND',
      metadata: {
        restaurantId,
        tableId: tableId ?? '',
        note: (note ?? '').slice(0, 500),
        items: typeof customAmount === 'number' ? '' : JSON.stringify(items),
        fulfillmentType: fulfillmentType === 'pickup' ? 'pickup' : 'table',
        pickupCode: (fulfillmentType === 'pickup' && pickupCode) ? String(pickupCode) : '',
        isPartialPayment: typeof customAmount === 'number' ? 'true' : 'false',
      },
    }

    // Direct charge sur le compte Connect : les frais Stripe sont supportés par le restaurant
    if (restaurant.stripe_account_id) {
      console.log('[create-payment-intent] Using Stripe Connect account:', restaurant.stripe_account_id)
      paymentIntentParams.application_fee_amount = Math.round(amountCents * 0.01)
      
      try {
        const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams, {
          stripeAccount: restaurant.stripe_account_id,
        })
        return NextResponse.json({
          clientSecret: paymentIntent.client_secret,
          stripeAccountId: restaurant.stripe_account_id,
        })
      } catch (stripeError: any) {
        console.error('[create-payment-intent] Stripe Connect error:', stripeError.message)
        // Fallback: si le compte Connect ne fonctionne pas, utiliser le compte principal
        console.log('[create-payment-intent] Falling back to platform account')
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountCents,
          currency: 'eur',
          statement_descriptor_suffix: 'QOMAND',
          metadata: paymentIntentParams.metadata,
        })
        return NextResponse.json({ clientSecret: paymentIntent.client_secret })
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams)
    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (err: any) {
    console.error('[create-payment-intent] Error:', err)
    console.error('[create-payment-intent] Error message:', err.message)
    console.error('[create-payment-intent] Error stack:', err.stack)
    return NextResponse.json({ 
      error: err.message || 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 })
  }
}

// --- helpers copiés de restaurant.ts pour rester autonome ---
type HHData = { enabled: boolean; start: string; end: string; days: string[] }
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
function parseTime(t: string): number { const [h, m] = t.split(':').map(Number); return h * 60 + m }
function checkHHActive(hh: HHData | null): boolean {
  if (!hh?.enabled) return false
  const now = new Date()
  const dayKey = DAY_KEYS[now.getDay()]
  if (!hh.days.includes(dayKey)) return false
  const nowMins = now.getHours() * 60 + now.getMinutes()
  return nowMins >= parseTime(hh.start) && nowMins < parseTime(hh.end)
}
