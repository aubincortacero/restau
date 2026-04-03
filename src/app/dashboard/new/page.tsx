import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/subscription'
import NewRestaurantWrapper from './NewRestaurantWrapper'

export default async function NewRestaurantPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <NewRestaurantWrapper isAdmin={isAdmin(user.email)} />
}

