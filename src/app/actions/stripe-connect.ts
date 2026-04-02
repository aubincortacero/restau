'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

function getOrigin(headersList: Awaited<ReturnType<typeof headers>>) {
  const forwarded = headersList.get('x-forwarded-host')
  if (forwarded && !forwarded.startsWith('localhost')) return `https://${forwarded}`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (siteUrl) return siteUrl.replace(/\/$/, '')
  return headersList.get('origin') ?? 'http://localhost:3000'
}

export async function createConnectOnboardingLink() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, stripe_account_id')
    .eq('owner_id', user.id)
    .single()

  if (!restaurant) redirect('/dashboard/new')

  const headersList = await headers()
  const origin = getOrigin(headersList)

  let accountId: string = restaurant.stripe_account_id ?? ''

  try {
    // Créer un nouveau compte Express si pas encore fait
    if (!accountId) {
      // URL publique canonique — évite de passer localhost à Stripe
      const publicUrl = process.env.NEXT_PUBLIC_CANONICAL_URL
        ?? (origin.startsWith('http://localhost') ? undefined : origin)

      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        ...(publicUrl ? { business_profile: { url: publicUrl } } : {}),
      })
      accountId = account.id

      await supabase
        .from('restaurants')
        .update({ stripe_account_id: accountId })
        .eq('id', restaurant.id)
        .eq('owner_id', user.id)
    }

    // Générer le lien d'onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard/settings/stripe/refresh`,
      return_url: `${origin}/dashboard/settings/stripe/return`,
      type: 'account_onboarding',
    })

    redirect(accountLink.url)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    redirect(`/dashboard/settings/stripe?error=${encodeURIComponent(msg)}`)
  }
}

export async function createStripeLoginLink() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('stripe_account_id')
    .eq('owner_id', user.id)
    .single()

  if (!restaurant?.stripe_account_id) redirect('/dashboard/settings/stripe')

  const loginLink = await stripe.accounts.createLoginLink(restaurant.stripe_account_id)
  redirect(loginLink.url)
}

export async function disconnectStripeAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase
    .from('restaurants')
    .update({ stripe_account_id: null })
    .eq('owner_id', user.id)

  redirect('/dashboard/settings/stripe')
}
