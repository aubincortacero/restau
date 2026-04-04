import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getSubscriptionStatus,
  isAdmin,
  isAccessGranted,
} from '@/lib/subscription'
import SubscribeWrapper from './SubscribeWrapper'

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ trial_error?: string }>
}) {
  const { trial_error } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { status } = await getSubscriptionStatus(user.id)

  // Déjà abonné ou en trial valide → retour au dashboard
  if (isAccessGranted(status)) redirect('/dashboard')

  const expired = status === 'expired'
  const admin = isAdmin(user.email)

  return (
    <SubscribeWrapper
      expired={expired}
      isAdmin={admin}
      email={user.email ?? ''}
      trialError={trial_error}
    />
  )
}
