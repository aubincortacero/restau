import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getActiveRestaurantId } from '@/lib/active-restaurant'
import { createTable } from '@/app/actions/restaurant'
import FloorPlan, { type Wall } from './FloorPlan'
import { IconPlus } from '@/components/icons'

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

      {/* Ajouter une table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-3">Ajouter une table</h2>
        <form action={createTable} className="flex gap-2 flex-wrap">
          <input type="hidden" name="restaurant_id" value={restaurant.id} />
          <input
            name="number"
            type="number"
            min="1"
            required
            placeholder="N°"
            className="w-20 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
          />
          <input
            name="label"
            placeholder="Libellé (ex: Terrasse 1)"
            className="flex-1 min-w-40 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <IconPlus className="w-3.5 h-3.5" />
            Ajouter
          </button>
        </form>
      </div>

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
