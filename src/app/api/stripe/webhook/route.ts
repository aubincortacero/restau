import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

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

  const admin = createAdminClient()

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent
    const { restaurantId, isPartialPayment, items: itemsJson, note } = pi.metadata

    // Si c'est un paiement partiel, ne rien faire ici
    // Le paiement partiel est géré directement par createPartialPayment après la confirmation
    if (isPartialPayment === 'true') {
      console.log('[webhook] Partial payment succeeded, skipping order creation')
      return NextResponse.json({ received: true })
    }

    if (!restaurantId || !itemsJson) {
      return NextResponse.json({ error: 'Metadata manquante' }, { status: 400 })
    }

    const items: Array<{ itemId: string; quantity: number; sizeLabel?: string }> = JSON.parse(itemsJson)

    // Recalculer les prix depuis la DB
    const itemIds = items.map((i) => i.itemId)
    const { data: dbItems } = await admin
      .from('items')
      .select('id, price, happy_hour_price, category_id, sizes')
      .in('id', itemIds)

    if (!dbItems || dbItems.length !== itemIds.length) {
      return NextResponse.json({ error: 'Articles introuvables' }, { status: 400 })
    }

    // Créer la commande en base
    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        table_id: pi.metadata.tableId || null,
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

    await admin.from('order_items').insert(
      items.map((pi_item) => {
        const dbItem = dbItems.find((i) => i.id === pi_item.itemId)!
        
        // Si une taille est spécifiée, chercher son prix dans sizes
        let unitPrice: number
        if (pi_item.sizeLabel && dbItem.sizes && Array.isArray(dbItem.sizes)) {
          const selectedSize = dbItem.sizes.find((s: any) => s.label === pi_item.sizeLabel)
          if (selectedSize) {
            unitPrice = Number(selectedSize.price)
          } else {
            unitPrice = Number(dbItem.price)
          }
        } else {
          unitPrice = Number(dbItem.price)
        }
        
        return {
          order_id: order.id,
          item_id: pi_item.itemId,
          quantity: pi_item.quantity,
          unit_price: unitPrice,
          size_label: pi_item.sizeLabel || null,
        }
      })
    )
  }

  if (event.type === 'payment_intent.payment_failed') {
    // Rien à faire — la commande n'est jamais créée en cas d'échec
  }

  // Synchroniser le statut du compte Connect quand Stripe valide/modifie un compte
  if (event.type === 'account.updated') {
    const account = event.data.object as import('stripe').default.Account
    await admin
      .from('restaurants')
      .update({
        stripe_charges_enabled: account.charges_enabled,
        stripe_payouts_enabled: account.payouts_enabled,
        stripe_details_submitted: account.details_submitted,
      })
      .eq('stripe_account_id', account.id)
  }

  // ─── Abonnements plateforme ────────────────────────────────────
  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated'
  ) {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.supabase_user_id
    if (userId) {
      const isActive = sub.status === 'active' || sub.status === 'trialing'
      await admin
        .from('profiles')
        .update({
          subscription_status: isActive ? 'active' : 'expired',
          stripe_subscription_id: sub.id,
        })
        .eq('id', userId)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.supabase_user_id
    if (userId) {
      await admin
        .from('profiles')
        .update({ subscription_status: 'expired' })
        .eq('id', userId)
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const inv = event.data.object as Stripe.Invoice
    const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id
    if (customerId) {
      await admin
        .from('profiles')
        .update({ subscription_status: 'expired' })
        .eq('stripe_customer_id', customerId)
    }
  }

  return NextResponse.json({ received: true })
}
