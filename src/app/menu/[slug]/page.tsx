import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MenuAccordion from '@/components/MenuAccordion'
import HappyHourCountdown from '@/components/HappyHourCountdown'

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
  sizes: { label: string; price: number }[] | null
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
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '0'
  const dayKey = get('weekday').toLowerCase().slice(0, 3)
  if (!hh.days.includes(dayKey)) return false
  const nowMins = (parseInt(get('hour')) % 24) * 60 + parseInt(get('minute'))
  const o = parseTime(hh.start), c = parseTime(hh.end)
  return c > o ? nowMins >= o && nowMins < c : nowMins >= o || nowMins < c
}

function getHHEndsAtMs(endTimeStr: string): number {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '0'
  const curMins = (parseInt(get('hour')) % 24) * 60 + parseInt(get('minute'))
  const [h, m] = endTimeStr.split(':').map(Number)
  const endMins = h * 60 + m
  const remainMs = endMins > curMins
    ? (endMins - curMins) * 60_000
    : (24 * 60 - curMins + endMins) * 60_000
  return Date.now() + remainMs
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
    .select('id, name, logo_url, cover_image_url, address, happy_hour, accepted_payment_methods, fulfillment_modes, stripe_charges_enabled, brand_color, menu_button_radius, menu_header_style')
    .eq('slug', slug)
    .single()

  if (!restaurant) notFound()

  // Sections avant/après le menu (page __menu__)
  let beforeSections: { id: string; type: string; content: Record<string, unknown> }[] = []
  let afterSections: { id: string; type: string; content: Record<string, unknown> }[] = []
  const { data: menuPage } = await supabase
    .from('restaurant_pages')
    .select('id, cover_image_url')
    .eq('restaurant_id', restaurant.id)
    .eq('slug', '__menu__')
    .maybeSingle()
  if (menuPage) {
    const { data: menuSections } = await supabase
      .from('page_sections')
      .select('id, type, position, content')
      .eq('page_id', menuPage.id)
      .order('position')
    beforeSections = (menuSections ?? []).filter(
      s => (s.content as { _placement?: string })._placement === 'before'
    )
    afterSections = (menuSections ?? []).filter(
      s => (s.content as { _placement?: string })._placement !== 'before'
    )
  }

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
    .select('id, name, position, category_type, items(id, name, description, price, happy_hour_price, allergens, is_available, is_vegetarian, is_vegan, image_url, sizes)')
    .eq('restaurant_id', restaurant.id)
    .order('position')

  const hh = restaurant.happy_hour as HappyHour | null
  const hhActive = isHappyHourActive(hh)
  const hhEndsAt = hhActive ? getHHEndsAtMs(hh!.end) : null

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

  const brandColor = (restaurant.brand_color as string | null) ?? '#f97316'
  const buttonRadius = (restaurant.menu_button_radius as string | null) ?? 'rounded'
  const headerStyle = (restaurant.menu_header_style as string | null) ?? 'dark'

  const headerBg =
    headerStyle === 'colored' ? brandColor :
    headerStyle === 'light' ? '#fafaf9' :
    '#0a0908'
  const headerText = headerStyle === 'light' ? '#1c1917' : '#fafaf9'
  const headerSubText = headerStyle === 'light' ? '#78716c' : '#78716c'

  const btnRadius =
    buttonRadius === 'pill' ? '9999px' :
    buttonRadius === 'sharp' ? '4px' :
    '12px'

  const coverUrl = (menuPage as { cover_image_url?: string | null } | null)?.cover_image_url ?? null

  return (
    <div
      className="min-h-screen bg-[#0a0908] text-stone-100"
      style={{
        '--brand': brandColor,
        '--btn-radius': btnRadius,
        '--header-bg': headerBg,
        '--header-text': headerText,
        '--header-subtext': headerSubText,
      } as React.CSSProperties}
    >
      {/* Hero plein-écran */}
      <div className="relative w-full" style={{ height: '52vw', maxHeight: '390px', minHeight: '270px' }}>
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={restaurant.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: headerStyle === 'colored' ? brandColor : headerStyle === 'light' ? '#e5e5e4' : '#111110' }}
          />
        )}
        {/* Gradient overlay bas → titre */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0908] via-[#0a0908]/60 to-transparent" />

        {/* Contenu hero */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-6">
          <div className="flex items-end gap-4 max-w-lg mx-auto">
            {restaurant.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="h-[60px] w-auto rounded-2xl object-contain shrink-0 shadow-xl"
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold tracking-tight text-white leading-tight drop-shadow-lg">
                {restaurant.name}
              </h1>
              {tableLabel && (
                <p className="text-sm text-stone-300 mt-1 drop-shadow font-medium">{tableLabel}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Barre infos sous le hero */}
      <div className="max-w-lg mx-auto px-5 pt-4 pb-2 flex flex-wrap items-center gap-3">
        {restaurant.address && (
          <p className="text-xs text-stone-500 flex items-center gap-1">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            {restaurant.address}
          </p>
        )}

        {hhActive && hhEndsAt && (
          <HappyHourCountdown endsAt={hhEndsAt} />
        )}
      </div>

      {categories.length > 0 && (
        <p className="text-center text-xs text-stone-700 pb-3">
          {categories.length} catégorie{categories.length > 1 ? 's' : ''} · {totalItems} plat{totalItems > 1 ? 's' : ''}
        </p>
      )}

      {/* Sections AVANT le menu */}
      {beforeSections.length > 0 && (
        <div className="max-w-lg mx-auto px-5 pt-4 space-y-8">
          {beforeSections.map(s => (
            <PublicSectionRenderer key={s.id} section={s} />
          ))}
        </div>
      )}

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
            acceptedPaymentMethods={
              (restaurant.accepted_payment_methods as string[] | null ?? ['online', 'cash'])
                .filter(m => m !== 'online' || !!restaurant.stripe_charges_enabled)
            }
            onlineBlocked={
              !!(restaurant.accepted_payment_methods as string[] | null ?? ['online', 'cash']).includes('online')
              && !restaurant.stripe_charges_enabled
            }
            fulfillmentModes={(restaurant.fulfillment_modes as string[] | null) ?? ['table']}
            brandColor={brandColor}
          />
        )}
      </main>

      {/* Sections APRÈS le menu */}
      {afterSections.length > 0 && (
        <div className="max-w-lg mx-auto px-5 pt-6 pb-4 space-y-8">
          {afterSections.map(s => (
            <PublicSectionRenderer key={s.id} section={s} />
          ))}
        </div>
      )}

      {/* Footer */}
      <footer className="text-center py-10 text-stone-700 text-xs">
        <p>Propulsé par Qomand</p>
      </footer>
    </div>
  )
}

function PublicSectionRenderer({
  section,
}: {
  section: { id: string; type: string; content: Record<string, unknown> }
}) {
  if (section.type === 'text_block') {
    const c = section.content as { title?: string; subtitle?: string; body?: string }
    return (
      <div className="space-y-2">
        {c.title && <h2 className="text-2xl font-bold text-white">{c.title}</h2>}
        {c.subtitle && <p className="text-base font-medium text-stone-400">{c.subtitle}</p>}
        {c.body && <p className="text-sm text-stone-300 leading-relaxed whitespace-pre-line">{c.body}</p>}
      </div>
    )
  }

  if (section.type === 'gallery') {
    const c = section.content as { images?: { url: string; caption?: string }[] }
    const images = c.images ?? []
    if (!images.length) return null
    return (
      <div
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-5 px-5 scroll-pl-5 [&::-webkit-scrollbar]:hidden pb-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {images.map((img, i) => (
          <div key={img.url + i} className="shrink-0 snap-start rounded-2xl overflow-hidden bg-zinc-900" style={{ width: '80vw', maxWidth: '340px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.caption ?? ''} className="w-full aspect-[4/3] object-cover" loading="lazy" />
            {img.caption && <p className="text-xs text-stone-400 px-3 py-2">{img.caption}</p>}
          </div>
        ))}
        <div className="shrink-0 w-5" />
      </div>
    )
  }

  return null
}
