import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveRestaurantId } from '@/lib/active-restaurant'
import { IconSettings } from '@/components/icons'

export const dynamic = 'force-dynamic'

type OpeningHours = Record<string, { open: string; close: string; closed: boolean }>
type HappyHour = { enabled: boolean; start: string; end: string; days: string[] }
type OrderRow = {
  created_at: string
  payment_status: string | null
  status: string
  table_id: string | null
  archived_at: string | null
  order_items: { quantity: number; unit_price: string | number }[]
}

function getStatusNow(oh: OpeningHours | null, hh: HappyHour | null) {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '0'
  const hour = parseInt(get('hour')) % 24
  const mins = hour * 60 + parseInt(get('minute'))
  const dayKey = get('weekday').toLowerCase().slice(0, 3)
  const pt = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

  let open = true
  if (oh?.[dayKey]) {
    const { open: o, close: c, closed } = oh[dayKey]
    const ot = pt(o), ct = pt(c)
    open = !closed && (ct > ot ? mins >= ot && mins < ct : mins >= ot || mins < ct)
  }

  const happyHour =
    (hh?.enabled ?? false) &&
    hh!.days.includes(dayKey) &&
    (() => { const o = pt(hh!.start), c = pt(hh!.end); return c > o ? mins >= o && mins < c : mins >= o || mins < c })()

  return { open, happyHour }
}

/** Retourne l'ISO UTC correspondant à minuit heure de Paris, il y a `daysAgo` jours */
function parisStartISO(daysAgo: number): string {
  const now = new Date()
  const todayParis = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(now)
  const base = new Date(todayParis + 'T00:00:00Z')
  base.setUTCDate(base.getUTCDate() - daysAgo)
  const targetDateStr = base.toISOString().slice(0, 10)
  const utcMidnight = new Date(targetDateStr + 'T00:00:00Z')
  const parisHour = parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', hour: 'numeric', hour12: false }).format(utcMidnight),
  ) % 24
  return new Date(utcMidnight.getTime() - parisHour * 3600_000).toISOString()
}

function sumOrders(orders: OrderRow[]): number {
  return orders.reduce((total, o) =>
    total + (o.order_items ?? []).reduce((s, i) => s + i.quantity * Number(i.unit_price), 0), 0)
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

function formatDelta(current: number, previous: number, compareLabel: string) {
  if (previous === 0 && current === 0) return { text: '—', positive: null as null, compareLabel }
  if (previous === 0) return { text: `+${current > 0 ? '∞' : '0'}`, positive: true as const, compareLabel }
  const pct = Math.round(((current - previous) / previous) * 100)
  return { text: pct >= 0 ? `+${pct}%` : `${pct}%`, positive: pct >= 0, compareLabel }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const restaurantId = await getActiveRestaurantId(user.id)
  if (!restaurantId) redirect('/dashboard/new')

  const todayStart      = parisStartISO(0)
  const yesterdayStart  = parisStartISO(1)
  const dayBeforeStart  = parisStartISO(2)
  const sameTimeYesterday = new Date(Date.now() - 86_400_000)

  const [restaurantRes, tablesCountRes, recentOrdersRes] = await Promise.all([
    supabase
      .from('restaurants')
      .select('id, name, slug, opening_hours, happy_hour')
      .eq('id', restaurantId)
      .maybeSingle(),
    supabase
      .from('tables')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId),
    supabase
      .from('orders')
      .select('created_at, payment_status, status, table_id, archived_at, order_items(quantity, unit_price)')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', dayBeforeStart)
      .order('created_at', { ascending: false }),
  ])

  const restaurant = restaurantRes.data
  if (!restaurant) redirect('/dashboard/new')

  const totalTables = tablesCountRes.count ?? 0
  const allOrders = (recentOrdersRes.data ?? []) as unknown as OrderRow[]

  // Commandes actives (pending/ready, non archivées)
  const activeOrders = allOrders.filter(o => (o.status === 'pending' || o.status === 'ready') && !o.archived_at)
  const pendingCount = activeOrders.filter(o => o.status === 'pending').length
  const activeTableIds = new Set(activeOrders.filter(o => o.table_id).map(o => o.table_id))

  // CA aujourd'hui (depuis minuit Paris)
  const paidToday = allOrders.filter(o =>
    o.payment_status === 'paid' && new Date(o.created_at) >= new Date(todayStart))
  const caToday = sumOrders(paidToday)

  // CA hier même heure (fenêtre équivalente hier)
  const paidHierMemeHeure = allOrders.filter(o =>
    o.payment_status === 'paid' &&
    new Date(o.created_at) >= new Date(yesterdayStart) &&
    new Date(o.created_at) < sameTimeYesterday)
  const caHierMemeHeure = sumOrders(paidHierMemeHeure)

  // CA hier (journée complète)
  const paidYesterdayFull = allOrders.filter(o =>
    o.payment_status === 'paid' &&
    new Date(o.created_at) >= new Date(yesterdayStart) &&
    new Date(o.created_at) < new Date(todayStart))
  const caYesterday = sumOrders(paidYesterdayFull)

  // CA avant-hier (pour comparaison CA hier)
  const paidDayBefore = allOrders.filter(o =>
    o.payment_status === 'paid' &&
    new Date(o.created_at) >= new Date(dayBeforeStart) &&
    new Date(o.created_at) < new Date(yesterdayStart))
  const caDayBefore = sumOrders(paidDayBefore)

  // Comptage commandes aujourd'hui (non annulées)
  const ordersTodayCount = allOrders.filter(o =>
    new Date(o.created_at) >= new Date(todayStart) && o.status !== 'cancelled').length

  // Comptage commandes hier même fenêtre
  const ordersHierMemeHeureCount = allOrders.filter(o =>
    new Date(o.created_at) >= new Date(yesterdayStart) &&
    new Date(o.created_at) < sameTimeYesterday &&
    o.status !== 'cancelled').length

  const deltaCA       = formatDelta(caToday,           caHierMemeHeure,          'vs hier même heure')
  const deltaCaHier   = formatDelta(caYesterday,        caDayBefore,              'vs avant-hier')
  const deltaCommandes = formatDelta(ordersTodayCount,  ordersHierMemeHeureCount, 'vs hier même heure')

  const { open, happyHour } = getStatusNow(
    restaurant.opening_hours as OpeningHours | null,
    restaurant.happy_hour as HappyHour | null,
  )

  type StatCard = {
    href: string
    label: string
    value: string
    sub: string
    delta: ReturnType<typeof formatDelta> | null
    bg: string
  }

  const STAT_CARDS: StatCard[] = [
    {
      href: '/dashboard/orders',
      label: 'Commandes live',
      value: String(pendingCount),
      sub: `${ordersTodayCount} commande${ordersTodayCount !== 1 ? 's' : ''} aujourd'hui`,
      delta: deltaCommandes,
      bg: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80',
    },
    {
      href: '/dashboard/tables',
      label: 'Tables',
      value: String(totalTables),
      sub: `${activeTableIds.size} active${activeTableIds.size !== 1 ? 's' : ''} en ce moment`,
      delta: null,
      bg: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    },
    {
      href: '/dashboard/orders/archives',
      label: "CA aujourd'hui",
      value: formatCurrency(caToday),
      sub: "Depuis l'ouverture",
      delta: deltaCA,
      bg: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    },
    {
      href: '/dashboard/orders/archives',
      label: 'CA hier',
      value: formatCurrency(caYesterday),
      sub: 'Journée complète',
      delta: deltaCaHier,
      bg: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?auto=format&fit=crop&w=800&q=80',
    },
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center flex-wrap gap-2 mb-1">
            <h1 className="text-2xl font-semibold">{restaurant.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${open ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
              {open ? 'Ouvert' : 'Fermé'}
            </span>
            {happyHour && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-400">🍹 Happy Hour</span>
            )}
          </div>
          <p className="text-sm text-zinc-500">/{restaurant.slug}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/menu/${restaurant.slug}`}
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            Vitrine
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </Link>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors"
          >
            <IconSettings className="w-3.5 h-3.5" />
            Paramètres
          </Link>
        </div>
      </div>

      {/* 4 stat cards — 4 par ligne sur grand écran, 2 sur mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAT_CARDS.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="relative overflow-hidden rounded-2xl h-44 lg:h-52 flex flex-col justify-between group border border-zinc-800 hover:border-orange-500/30 transition-all duration-300"
          >
            {/* Photo de fond */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${card.bg})` }}
            />
            {/* Overlay — s'assombrit au survol pour la lisibilité */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/55 to-black/30 group-hover:from-black/97 group-hover:via-black/80 group-hover:to-black/55 transition-all duration-300" />

            {/* Label haut */}
            <div className="relative z-10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-zinc-300 transition-colors duration-200">
                {card.label}
              </p>
            </div>

            {/* Valeur + comparatif bas */}
            <div className="relative z-10 p-4">
              <p className="text-3xl font-black text-white leading-none tracking-tight">
                {card.value}
              </p>
              <p className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors mt-1">
                {card.sub}
              </p>
              {card.delta && card.delta.text !== '—' && (
                <div className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  card.delta.positive === true
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : card.delta.positive === false
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {card.delta.positive === true ? '↑' : card.delta.positive === false ? '↓' : ''}
                  {card.delta.text}
                  <span className="font-normal text-zinc-500">{' '}{card.delta.compareLabel}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
