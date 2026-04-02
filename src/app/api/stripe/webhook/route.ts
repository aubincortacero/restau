import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent
    const { restaurantId, tableId, note, items: itemsJson } = pi.metadata

    if (!restaurantId || !itemsJson) {
      return NextResponse.json({ error: 'Metadata manquante' }, { status: 400 })
    }

    const supabase = await createClient()
    const items: Array<{ itemId: string; quantity: number }> = JSON.parse(itemsJson)

    // Recalculer les prix depuis la DB
    const itemIds = items.map((i) => i.itemId)
    const { data: dbItems } = await supabase
      .from('items')
      .select('id, price, happy_hour_price, category_id')
      .in('id', itemIds)

    if (!dbItems || dbItems.length !== itemIds.length) {
      return NextResponse.json({ error: 'Articles introuvables' }, { status: 400 })
    }

    // Créer la commande en base
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        table_id: tableId || null,
        status: 'pending',
        payment_method: 'online',
        payment_status: 'paid',
        customer_note: note || null,
        stripe_payment_intent_id: pi.id,
      })
      .select('id')
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Erreur création commande' }, { status: 500 })
    }

    await supabase.from('order_items').insert(
      items.map((pi_item) => {
        const dbItem = dbItems.find((i) => i.id === pi_item.itemId)!
        return {
          order_id: order.id,
          item_id: pi_item.itemId,
          quantity: pi_item.quantity,
          unit_price: Number(dbItem.price),
        }
      })
    )
  }

  if (event.type === 'payment_intent.payment_failed') {
    // Rien à faire — la commande n'est jamais créée en cas d'échec
  }

  return NextResponse.json({ received: true })
}
