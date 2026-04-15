import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getSubscriptionStatus,
  isAdmin,
  isAccessGranted,
} from '@/lib/subscription'
import SubscribeWrapper from './SubscribeWrapper'

export default async function SubscribePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { status } = await getSubscriptionStatus(user.id)

  // Déjà abonné (plan actif) → retour au dashboard
  if (status === 'active') redirect('/dashboard')

  const expired = status === 'expired'
  const admin = isAdmin(user.email)

  // Vérifier si l'email a déjà utilisé un essai
  const email = user.email?.toLowerCase().trim() ?? ''
  const { data: trialUsed } = await createAdminClient()
    .from('trial_emails')
    .select('email')
    .eq('email', email)
    .maybeSingle()

  return (
    <SubscribeWrapper
      expired={expired}
      isAdmin={admin}
      email={user.email ?? ''}
      trialAlreadyUsed={!!trialUsed}
      isTrialing={status === 'trialing'}
    />
  )
}
