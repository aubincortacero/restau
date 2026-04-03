import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getActiveRestaurantId } from '@/lib/active-restaurant'
import FloorPlan, { type Wall } from './FloorPlan'
import TableAddForm from './TableAddForm'

export const dynamic = 'force-dynamic'

export default async function TablesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const activeRestaurantId = await getActiveRestaurantId(user.id)

  const { data: restaurant } = activeRestaurantId
    ? await supabase.from('restaurants').select('id, name, slug, floor_plan').eq('id', activeRestaurantId).maybeSingle()
    : { data: null }

  if (!restaurant) redirect('/dashboard/new')

  const { data: tables } = await supabase
    .from('tables')
    .select('id, number, label, pos_x, pos_y')
    .eq('restaurant_id', restaurant.id)
    .order('number')

  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const proto = headersList.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  const siteUrl = `${proto}://${host}`

  // Positions par défaut pour les tables sans coordonnées
  const tablesWithPos = (tables ?? []).map((t, i) => ({
    ...t,
    pos_x: t.pos_x ?? 50 + (i % 4) * 180,
    pos_y: t.pos_y ?? 50 + Math.floor(i / 4) * 140,
  }))

  // Zones existantes (distinct, non nulles) pour l'autocomplete
  const existingZones = [...new Set(
    (tables ?? []).map((t) => t.label).filter((l): l is string => !!l)
  )]

  // Murs depuis restaurant.floor_plan
  const fp = restaurant.floor_plan as { walls?: Wall[] } | null
  const walls: Wall[] = (fp?.walls ?? []).map((w: Wall) => ({
    id: w.id,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Plan de salle</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Positionnez vos tables, ajoutez des murs, enregistrez le plan.
          </p>
        </div>
      </div>

      {/* Ajouter des tables */}
      <TableAddForm restaurantId={restaurant.id} existingZones={existingZones} />

      {/* Plan de salle */}
      {tablesWithPos.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 text-sm border border-zinc-800 rounded-2xl">
          Ajoutez votre première table pour commencer à construire votre plan.
        </div>
      ) : (
        <FloorPlan
          initialTables={tablesWithPos}
          initialWalls={walls}
          restaurantId={restaurant.id}
          restaurantSlug={restaurant.slug}
          siteUrl={siteUrl}
        />
      )}
    </div>
  )
}
