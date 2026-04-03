'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function signInWithGoogle() {
  const supabase = await createClient()
  const headersList = await headers()
  const xForwardedHost = headersList.get('x-forwarded-host')
  const originHeader = headersList.get('origin')
  const origin = originHeader
    ?? (xForwardedHost ? `https://${xForwardedHost}` : process.env.NEXT_PUBLIC_SITE_URL!)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) redirect('/login?error=oauth_error')
  if (data.url) redirect(data.url)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}

export async function deleteAccount() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Supprime le profil (cascade supprimera restaurants, menus, commandes…)
  await supabase.from('profiles').delete().eq('id', user.id)

  // Supprime le compte auth.users via le client admin (service role)
  const adminClient = createAdminClient()
  await adminClient.auth.admin.deleteUser(user.id)

  redirect('/login?deleted=1')
}
