import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MenuAccordion from '@/components/MenuAccordion'

export const dynamic = 'force-dynamic'

type Item = {
  id: string
  name: string
  description: string | null
  price: number
  happy_hour_price: number | null
  allergens: string[] | null
  is_available: boolean
  is_vegetarian: boolean
  is_vegan: boolean
  image_url: string | null
}

export type PublicCategory = {
  id: string
  name: string
  position: number
  category_type: string
  items: Item[]
}

type HappyHour = {
  enabled: boolean
  start: string
  end: string
  days: string[]
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function isHappyHourActive(hh: HappyHour | null): boolean {
  if (!hh?.enabled) return false
  const now = new Date()
  const dayKey = DAY_KEYS[now.getDay()]
  if (!hh.days.includes(dayKey)) return false
  const nowMins = now.getHours() * 60 + now.getMinutes()
  return nowMins >= parseTime(hh.start) && nowMins < parseTime(hh.end)
}

export default async function PublicMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ table?: string }>
}) {
  const { slug } = await params
  const { table: tableId } = await searchParams
  const supabase = await createClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, logo_url, address, happy_hour')
    .eq('slug', slug)
    .single()

  if (!restaurant) notFound()

  // Résoudre le numéro de table depuis l'UUID
  let tableLabel: string | null = null
  if (tableId) {
    const { data: tableData } = await supabase
      .from('tables')
      .select('number, label')
      .eq('id', tableId)
      .eq('restaurant_id', restaurant.id)
      .single()
    if (tableData) {
      tableLabel = tableData.label
        ? `Table ${tableData.number} — ${tableData.label}`
        : `Table ${tableData.number}`
    }
  }

  const { data: rawCategories } = await supabase
    .from('categories')
    .select('id, name, position, category_type, items(id, name, description, price, happy_hour_price, allergens, is_available, is_vegetarian, is_vegan, image_url)')
    .eq('restaurant_id', restaurant.id)
    .order('position')

  const hhActive = isHappyHourActive(restaurant.happy_hour as HappyHour | null)

  const categories: PublicCategory[] = (rawCategories ?? [])
    .map(c => ({
      id: c.id,
      name: c.name,
      position: c.position,
      category_type: (c as { category_type?: string }).category_type ?? 'standard',
      items: ((c.items ?? []) as Item[]).filter(i => i.is_available),
    }))
    .filter(c => c.items.length > 0)

  const totalItems = categories.reduce((acc, c) => acc + c.items.length, 0)

  return (
    <div className="min-h-screen bg-[#0a0908] text-stone-100">
      {/* Hero header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-950/20 to-transparent pointer-events-none" />
        <div className="relative px-5 pt-12 pb-8 text-center">
          {restaurant.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={restaurant.logo_url}
              alt={restaurant.name}
              className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4 border border-stone-700/60"
            />
          )}
          <h1 className="text-3xl font-bold tracking-tight text-stone-50">
            {restaurant.name}
          </h1>
          {restaurant.address && (
            <p className="text-sm text-stone-500 mt-1.5 flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              {restaurant.address}
            </p>
          )}

          {tableLabel && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-stone-800/60 text-stone-300 border border-stone-700/50 rounded-full px-3.5 py-1 text-xs font-medium">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" /></svg>
              {tableLabel}
            </div>
          )}

          {hhActive && (
            <div className="mt-3 inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-4 py-1.5 text-sm font-semibold">
              <span className="animate-pulse">🍹</span>
              Happy Hour en cours
            </div>
          )}
        </div>

        {/* Subtle divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-stone-700/60 to-transparent mx-5" />

        {/* Category & item count */}
        {categories.length > 0 && (
          <p className="text-center text-xs text-stone-600 py-3">
            {categories.length} catégorie{categories.length > 1 ? 's' : ''} · {totalItems} plat{totalItems > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Menu */}
      <main className="max-w-lg mx-auto">
        {categories.length === 0 ? (
          <div className="text-center py-24 text-stone-500 px-8">
            <p className="text-5xl mb-4">🍽️</p>
            <p className="text-lg font-medium text-stone-400 mb-1">Carte non disponible</p>
            <p className="text-sm">Le menu de ce restaurant n&apos;a pas encore été configuré.</p>
          </div>
        ) : (
          <MenuAccordion
            categories={categories}
            hhActive={hhActive}
            tableId={tableId ?? null}
            tableLabel={tableLabel}
            restaurantId={restaurant.id}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-10 text-stone-700 text-xs">
        <p>Propulsé par Restau·app</p>
      </footer>
    </div>
  )
}
