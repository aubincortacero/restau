import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveRestaurantId } from '@/lib/active-restaurant'
import WebsiteNav from './WebsiteNav'

export default async function WebsiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const activeRestaurantId = await getActiveRestaurantId(user.id)
  if (!activeRestaurantId) redirect('/dashboard/new')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, slug')
    .eq('id', activeRestaurantId)
    .single()

  if (!restaurant) redirect('/dashboard/new')

  const { data: pages } = await supabase
    .from('restaurant_pages')
    .select('id, title, slug, is_published, position')
    .eq('restaurant_id', activeRestaurantId)
    .neq('slug', '__menu__')
    .order('position')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Site web</h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          Pages visibles sur{' '}
          <span className="text-zinc-300 font-medium">/menu/{restaurant.slug}</span>
        </p>
      </div>

      <div className="flex gap-8 items-start">
        {/* Navigation (responsive intégrée) */}
        <WebsiteNav
          restaurantId={restaurant.id}
          pages={pages ?? []}
        />

        {/* Contenu */}
        <div className="flex-1 min-w-0 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
