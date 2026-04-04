import { createClient } from '@/lib/supabase/server'
import { getActiveRestaurantId } from '@/lib/active-restaurant'
import SetupChecklistFloat from './SetupChecklistFloat'

export default async function SetupChecklist() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const restaurantId = await getActiveRestaurantId(user.id)
  if (!restaurantId) return null

  const [categoriesRes, tablesRes, restaurantRes, ordersRes] = await Promise.all([
    supabase.from('categories').select('id').eq('restaurant_id', restaurantId).limit(1),
    supabase.from('tables').select('id').eq('restaurant_id', restaurantId).limit(1),
    supabase.from('restaurants').select('stripe_account_id').eq('id', restaurantId).single(),
    supabase.from('orders').select('id').eq('restaurant_id', restaurantId).limit(1),
  ])

  const items = [
    {
      id: 'menu',
      label: 'Créer votre menu',
      done: (categoriesRes.data ?? []).length > 0,
      href: '/dashboard/menu',
    },
    {
      id: 'tables',
      label: 'Configurer vos tables',
      done: (tablesRes.data ?? []).length > 0,
      href: '/dashboard/tables',
    },
    {
      id: 'stripe',
      label: 'Connecter Stripe',
      done: !!restaurantRes.data?.stripe_account_id,
      href: '/dashboard/settings/stripe',
    },
    {
      id: 'orders',
      label: 'Recevoir une commande',
      done: (ordersRes.data ?? []).length > 0,
      href: '/dashboard/orders',
    },
  ]

  return <SetupChecklistFloat items={items} />
}
