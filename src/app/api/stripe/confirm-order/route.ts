import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { paymentIntentId } = await req.json()
    if (!paymentIntentId || typeof paymentIntentId !== 'string') {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }

    // Vérifier auprès de Stripe que le paiement est bien confirmé
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
    if (pi.status !== 'succeeded') {
      return NextResponse.json({ error: 'Paiement non confirmé' }, { status: 400 })
    }

    const supabase = await createClient()

    // Idempotence — si le webhook a déjà créé la commande, on la retourne
    const { data: existing } = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_payment_intent_id', pi.id)
      .single()
    if (existing) {
      return NextResponse.json({ orderId: existing.id })
    }

    const { restaurantId, tableId, note, items: itemsJson } = pi.metadata
    if (!restaurantId || !itemsJson) {
      return NextResponse.json({ error: 'Metadata manquante' }, { status: 400 })
    }

    const items: Array<{ itemId: string; quantity: number }> = JSON.parse(itemsJson)
    const itemIds = items.map((i) => i.itemId)

    const { data: dbItems } = await supabase
      .from('items')
      .select('id, price, happy_hour_price, category_id')
      .in('id', itemIds)

    if (!dbItems || dbItems.length !== itemIds.length) {
      return NextResponse.json({ error: 'Articles introuvables' }, { status: 400 })
    }

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

    return NextResponse.json({ orderId: order.id })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
