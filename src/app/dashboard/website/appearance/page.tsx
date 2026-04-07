import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveRestaurantId } from '@/lib/active-restaurant'
import AppearanceForm from '@/app/dashboard/settings/restaurant/AppearanceForm'

export default async function WebsiteAppearancePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>
}) {
  const { saved } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const activeRestaurantId = await getActiveRestaurantId(user.id)
  if (!activeRestaurantId) redirect('/dashboard/new')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, brand_color, menu_button_radius, menu_header_style, logo_url, menu_max_width')
    .eq('id', activeRestaurantId)
    .single()

  if (!restaurant) notFound()

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">Apparence</h2>
        <p className="text-sm text-zinc-400 mt-1">Personnalisez l&apos;aspect visuel de votre menu client.</p>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <AppearanceForm
          restaurantId={restaurant.id}
          initial={{
            brand_color: (restaurant.brand_color as string | null) ?? '#f97316',
            menu_button_radius: (restaurant.menu_button_radius as string | null) ?? 'rounded',
            menu_header_style: (restaurant.menu_header_style as string | null) ?? 'dark',
            logo_url: restaurant.logo_url as string | null,
            menu_max_width: restaurant.menu_max_width as number | null,
          }}
          saved={saved === 'appearance'}
        />
      </div>
    </div>
  )
}
