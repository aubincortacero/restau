import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getActiveRestaurantId } from '@/lib/active-restaurant'
import FloorPlan, { type Wall, type Floor } from './FloorPlan'
import TableAddForm from './TableAddForm'
import QRExportButton from './QRExportButton'

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
    .select('id, number, label, pos_x, pos_y, floor')
    .eq('restaurant_id', restaurant.id)
    .order('number')

  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const proto = headersList.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  const siteUrl = `${proto}://${host}`

  // Positions par défaut pour les tables sans coordonnées
  const tablesWithPos = (tables ?? []).map((t, i) => ({
    ...t,
    floor: t.floor ?? 0,
    pos_x: t.pos_x ?? 50 + (i % 4) * 180,
    pos_y: t.pos_y ?? 50 + Math.floor(i / 4) * 140,
  }))

  // Zones existantes (distinct, non nulles) pour l'autocomplete
  const existingZones = [...new Set(
    (tables ?? []).map((t) => t.label).filter((l): l is string => !!l)
  )]

  // Niveaux depuis restaurant.floor_plan (rétro-compat format plat { walls: [] })
  type FpNew = { floors?: Floor[] }
  type FpOld = { walls?: Wall[] }
  const fp = restaurant.floor_plan as FpNew | FpOld | null
  let floors: Floor[]
  if (fp && 'floors' in fp && fp.floors) {
    floors = fp.floors
  } else {
    const oldWalls: Wall[] = ((fp as FpOld)?.walls ?? []).map((w: Wall) => ({
      id: w.id, x: w.x, y: w.y, w: w.w, h: w.h,
    }))
    floors = [{ id: 0, name: 'RDC', walls: oldWalls }]
  }

  const hasTables = tablesWithPos.length > 0

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold flex-1">Plan de salle</h1>
        {hasTables && (
          <QRExportButton
            tables={tablesWithPos.map((t) => ({ id: t.id, number: t.number, label: t.label }))}
            siteUrl={siteUrl}
            restaurantSlug={restaurant.slug}
          />
        )}
      </div>

      {/* Ajouter des tables */}
      <TableAddForm
        restaurantId={restaurant.id}
        existingZones={existingZones}
        floors={floors}
        defaultOpen={!hasTables}
      />

      {/* Plan de salle */}
      {!hasTables ? (
        <div className="text-center py-20 text-zinc-500 text-sm border border-zinc-800 rounded-2xl">
          Ajoutez votre première table pour commencer à construire votre plan.
        </div>
      ) : (
        <FloorPlan
          initialTables={tablesWithPos}
          initialFloors={floors}
          restaurantId={restaurant.id}
          restaurantSlug={restaurant.slug}
          siteUrl={siteUrl}
        />
      )}
    </div>
  )
}
