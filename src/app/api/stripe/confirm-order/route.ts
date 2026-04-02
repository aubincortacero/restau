import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderOrderEmail } from '@/lib/email-template'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const resend = process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('votre_cle')
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export async function POST(req: NextRequest) {
  try {
    const { paymentIntentId, stripeAccountId, customerEmail } = await req.json()
    if (!paymentIntentId || typeof paymentIntentId !== 'string') {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }

    // Récupérer le PI sur le bon compte (direct charge = compte connecté)
    const retrieveOptions = stripeAccountId && typeof stripeAccountId === 'string'
      ? { stripeAccount: stripeAccountId }
      : {}
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {}, retrieveOptions)
    if (pi.status !== 'succeeded') {
      return NextResponse.json({ error: 'Paiement non confirmé' }, { status: 400 })
    }

    const supabase = createAdminClient()

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
      .select('id, name, price, happy_hour_price, category_id')
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
      .select('id, created_at')
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Erreur création commande' }, { status: 500 })
    }

    const orderItemsToInsert = items.map((pi_item) => {
      const dbItem = dbItems.find((i) => i.id === pi_item.itemId)!
      return {
        order_id: order.id,
        item_id: pi_item.itemId,
        quantity: pi_item.quantity,
        unit_price: Number(dbItem.price),
      }
    })

    await supabase.from('order_items').insert(orderItemsToInsert)

    // Envoi email de confirmation si email fourni et Resend configuré
    const email = customerEmail && typeof customerEmail === 'string' && customerEmail.includes('@')
      ? customerEmail.trim()
      : null

    if (email && resend) {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('name')
        .eq('id', restaurantId)
        .single()

      const { data: tableData } = tableId
        ? await supabase.from('tables').select('number, label').eq('id', tableId).single()
        : { data: null }

      const tableLabel = tableData
        ? `Table ${tableData.number}${tableData.label ? ` — ${tableData.label}` : ''}`
        : 'Commande sur place'

      const emailItems = items.map((pi_item) => {
        const dbItem = dbItems.find((i) => i.id === pi_item.itemId)!
        return { name: dbItem.name, quantity: pi_item.quantity, unit_price: Number(dbItem.price) }
      })
      const total = emailItems.reduce((s, i) => s + i.unit_price * i.quantity, 0)

      const createdAt = new Date(order.created_at).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Europe/Paris',
      })

      await resend.emails.send({
        from: 'Qomand <noreply@qomand.fr>',
        to: email,
        subject: `Votre commande chez ${restaurant?.name ?? 'le restaurant'}`,
        html: renderOrderEmail({
          restaurantName: restaurant?.name ?? 'Restaurant',
          tableLabel,
          items: emailItems,
          total,
          orderId: order.id,
          createdAt,
        }),
      }).catch(() => { /* email non bloquant */ })
    }

    return NextResponse.json({ orderId: order.id })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
