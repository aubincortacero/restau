import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getActiveRestaurantId } from '@/lib/active-restaurant'
import TablesClientLayout from './TablesClientLayout'
import { type Wall, type Zone, type Floor } from './FloorPlan'

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

  const tablesWithPos = (tables ?? []).map((t, i) => ({
    ...t,
    floor: t.floor ?? 0,
    pos_x: t.pos_x ?? 50 + (i % 4) * 180,
    pos_y: t.pos_y ?? 50 + Math.floor(i / 4) * 140,
  }))

  type FpNew = { floors?: Floor[] }
  type FpOld = { walls?: Wall[] }
  const fp = restaurant.floor_plan as FpNew | FpOld | null
  let floors: Floor[]
  if (fp && 'floors' in fp && fp.floors) {
    floors = fp.floors.map((f) => ({
      ...f,
      walls: f.walls ?? [],
      zones: (f.zones ?? []).map((z: Zone) => ({
        id: z.id, name: z.name, color: z.color,
        x: z.x, y: z.y, w: z.w, h: z.h,
      })),
    }))
  } else {
    const oldWalls: Wall[] = ((fp as FpOld)?.walls ?? []).map((w: Wall) => ({
      id: w.id, x: w.x, y: w.y, w: w.w, h: w.h,
    }))
    floors = [{ id: 0, name: 'RDC', walls: oldWalls, zones: [] }]
  }

  return (
    <TablesClientLayout
      tables={tablesWithPos}
      floors={floors}
      restaurantId={restaurant.id}
      restaurantSlug={restaurant.slug}
      siteUrl={siteUrl}
    />
  )
}
