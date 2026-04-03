import { createAdminClient } from './supabase/admin'

export type SubStatus = 'active' | 'trialing' | 'expired' | 'none'

// Emails admin — séparés par virgule dans ADMIN_EMAILS (env) + valeur par défaut
const raw = process.env.ADMIN_EMAILS ?? 'contact@aubincortacero.fr'
export const ADMIN_EMAILS = raw.split(',').map((e) => e.trim().toLowerCase())

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

export async function getSubscriptionStatus(userId: string): Promise<{
  status: SubStatus
  trialEndsAt: Date | null
}> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select('subscription_status, trial_ends_at')
    .eq('id', userId)
    .single()

  if (!data) return { status: 'none', trialEndsAt: null }

  const status = (data.subscription_status as SubStatus | null) ?? 'none'
  const trialEndsAt = data.trial_ends_at ? new Date(data.trial_ends_at as string) : null

  // Auto-expiration des trials
  if (status === 'trialing' && trialEndsAt && trialEndsAt < new Date()) {
    await supabase
      .from('profiles')
      .update({ subscription_status: 'expired' })
      .eq('id', userId)
    return { status: 'expired', trialEndsAt }
  }

  return { status, trialEndsAt }
}

export function isAccessGranted(status: SubStatus): boolean {
  return status === 'active' || status === 'trialing'
}
