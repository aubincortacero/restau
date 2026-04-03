'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/subscription'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

function getOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

async function getOrCreateCustomer(userId: string, email: string | undefined): Promise<string> {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  const existing = profile?.stripe_customer_id as string | null
  if (existing) return existing

  const customer = await stripe.customers.create({
    email: email ?? undefined,
    metadata: { supabase_user_id: userId },
  })

  await admin
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId)

  return customer.id
}

// ─── Essai gratuit 7 jours (sans carte) ───────────────────────
export async function startTrial() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 7)

  await createAdminClient()
    .from('profiles')
    .update({
      subscription_status: 'trialing',
      trial_ends_at: trialEndsAt.toISOString(),
    })
    .eq('id', user.id)

  redirect('/dashboard')
}

// ─── Admin : simuler un accès valide (trial 1 an) ─────────────
export async function adminSkipSubscription() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isAdmin(user.email)) redirect('/subscribe')

  const trialEndsAt = new Date()
  trialEndsAt.setFullYear(trialEndsAt.getFullYear() + 1)

  await createAdminClient()
    .from('profiles')
    .update({
      subscription_status: 'trialing',
      trial_ends_at: trialEndsAt.toISOString(),
    })
    .eq('id', user.id)

  redirect('/dashboard')
}

// ─── Stripe Checkout (mensuel ou annuel) ──────────────────────
export async function createCheckoutSession(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const plan = formData.get('plan') === 'yearly' ? 'yearly' : 'monthly'
  const priceId = plan === 'yearly'
    ? process.env.STRIPE_PRICE_ID_YEARLY
    : process.env.STRIPE_PRICE_ID

  if (!priceId) throw new Error(`STRIPE_PRICE_ID${plan === 'yearly' ? '_YEARLY' : ''} non configuré dans .env.local`)

  const origin = getOrigin()
  const customerId = await getOrCreateCustomer(user.id, user.email ?? undefined)

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?subscribed=1`,
    cancel_url: `${origin}/subscribe`,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { supabase_user_id: user.id },
    },
    custom_text: {
      submit: {
        message: plan === 'yearly'
          ? 'Abonnement annuel — 200 € facturé une fois par an.'
          : 'Votre abonnement démarre immédiatement.',
      },
    },
  })

  redirect(session.url!)
}

// ─── Stripe Customer Portal ────────────────────────────────────
export async function createPortalSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const origin = getOrigin()
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  const customerId = profile?.stripe_customer_id as string | null
  if (!customerId) redirect('/subscribe')

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/dashboard/settings/stripe`,
  })

  redirect(session.url)
}
