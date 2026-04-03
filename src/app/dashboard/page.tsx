import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveRestaurantId } from '@/lib/active-restaurant'
import { IconSettings } from '@/components/icons'
import StatsPeriodSelector from '@/components/StatsPeriodSelector'

export const dynamic = 'force-dynamic'

// ─── Types ─────────────────────────────────────────────────────
type OrderItem = {
  quantity: number
  unit_price: string | number
  items: { name: string } | null
}
type Order = {
  id: string
  status: string
  payment_method: string
  payment_status: string
  created_at: string
  order_items: OrderItem[]
}

// ─── Period helpers ────────────────────────────────────────────
function getPeriodBounds(period: string, from?: string, to?: string) {
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  if (period === 'today') return { start: todayStart, end: now }

  if (period === 'week') {
    const start = new Date(now)
    start.setDate(now.getDate() - 6)
    start.setHours(0, 0, 0, 0)
    return { start, end: now }
  }

  if (period === 'month') {
    const start = new Date(now)
    start.setDate(now.getDate() - 29)
    start.setHours(0, 0, 0, 0)
    return { start, end: now }
  }

  if (period === 'custom' && from && to) {
    const start = new Date(from)
    start.setHours(0, 0, 0, 0)
    const end = new Date(to)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }

  return { start: todayStart, end: now }
}

function getPrevBounds(start: Date, end: Date) {
  const diff = end.getTime() - start.getTime()
  return {
    start: new Date(start.getTime() - diff),
    end:   new Date(start.getTime() - 1),
  }
}

// ─── Stats computation ─────────────────────────────────────────
function computeStats(orders: Order[]) {
  const done      = orders.filter(o => o.status === 'done')
  const cancelled = orders.filter(o => o.status === 'cancelled')

  const revenue = done.reduce(
    (s, o) => s + o.order_items.reduce((a, oi) => a + oi.quantity * Number(oi.unit_price), 0), 0
  )
  const cashRevenue = done
    .filter(o => o.payment_method === 'cash')
    .reduce((s, o) => s + o.order_items.reduce((a, oi) => a + oi.quantity * Number(oi.unit_price), 0), 0)
  const onlineRevenue = revenue - cashRevenue

  const avgBasket  = done.length > 0 ? revenue / done.length : 0
  const cancelRate = (done.length + cancelled.length) > 0
    ? (cancelled.length / (done.length + cancelled.length)) * 100
    : 0

  // Top items
  const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {}
  for (const o of done) {
    for (const oi of o.order_items) {
      const name = oi.items?.name ?? '?'
      if (!itemMap[name]) itemMap[name] = { name, qty: 0, revenue: 0 }
      itemMap[name].qty     += oi.quantity
      itemMap[name].revenue += oi.quantity * Number(oi.unit_price)
    }
  }
  const topItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 7)

  return {
    revenue, cashRevenue, onlineRevenue,
    orders: done.length, cancelledOrders: cancelled.length,
    avgBasket, cancelRate, topItems,
  }
}

// ─── Timeline ─────────────────────────────────────────────────
function buildTimeline(orders: Order[], granularity: 'hour' | 'day') {
  const map: Record<string, { revenue: number; orders: number; sortKey: string }> = {}

  for (const o of orders.filter(o => o.status === 'done')) {
    const d   = new Date(o.created_at)
    let key: string
    let sortKey: string

    if (granularity === 'hour') {
      const h   = String(d.getHours()).padStart(2, '0')
      key     = `${h}h`
      sortKey = h
    } else {
      sortKey = o.created_at.slice(0, 10)
      key = d.toLocaleDateString('fr-FR', {
        weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Paris',
      })
    }

    if (!map[key]) map[key] = { revenue: 0, orders: 0, sortKey }
    map[key].orders  += 1
    map[key].revenue += o.order_items.reduce((s, oi) => s + oi.quantity * Number(oi.unit_price), 0)
  }

  return Object.entries(map)
    .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
    .map(([label, v]) => ({ label, revenue: v.revenue, orders: v.orders }))
}

// ─── Formatters ────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}
function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0) return null
  return ((curr - prev) / prev) * 100
}

// ─── Page ─────────────────────────────────────────────────────
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string; compare?: string }>
}) {
  const sp      = await searchParams
  const period  = sp.period ?? 'today'
  const compare = sp.compare === '1'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const activeRestaurantId = await getActiveRestaurantId(user.id)

  const { data: restaurant } = activeRestaurantId
    ? await supabase
        .from('restaurants')
        .select('id, name, slug, opening_hours, happy_hour')
        .eq('id', activeRestaurantId)
        .maybeSingle()
    : { data: null }

  if (!restaurant) redirect('/dashboard/new')

  const { start, end }             = getPeriodBounds(period, sp.from, sp.to)
  const { start: ps, end: pe }     = getPrevBounds(start, end)

  const fetchOrders = (from: Date, to: Date) =>
    supabase
      .from('orders')
      .select('id, status, payment_method, payment_status, created_at, order_items(quantity, unit_price, items(name))')
      .eq('restaurant_id', restaurant.id)
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())
      .order('created_at')

  const [{ data: rawOrders }, { data: rawPrev }, { count: pendingCount }] = await Promise.all([
    fetchOrders(start, end),
    compare ? fetchOrders(ps, pe) : Promise.resolve({ data: [] }),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant.id)
      .eq('status', 'pending')
      .is('archived_at', null),
  ])

  const orders     = (rawOrders ?? []) as unknown as Order[]
  const prevOrders = (rawPrev   ?? []) as unknown as Order[]

  const stats     = computeStats(orders)
  const prevStats = compare ? computeStats(prevOrders) : null

  const granularity = period === 'today' ? 'hour' : 'day'
  const timeline    = buildTimeline(orders, granularity)
  const maxRevenue  = Math.max(...timeline.map(t => t.revenue), 1)

  // Period label for comparison badge
  const periodLabel: Record<string, string> = {
    today: 'hier', week: '7 j préc.', month: '30 j préc.', custom: 'période préc.',
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-semibold">{restaurant.name}</h1>
            {(() => {
              type OH = Record<string, { open: string; close: string; closed: boolean }>
              type HH = { enabled: boolean; start: string; end: string; days: string[] }
              const now = new Date()
              const parts = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
              }).formatToParts(now)
              const get = (type: string) => parts.find(p => p.type === type)?.value ?? '0'
              const hour = parseInt(get('hour')) % 24
              const mins = hour * 60 + parseInt(get('minute'))
              const dayKey = get('weekday').toLowerCase().slice(0, 3)
              const pt = (t: string) => { const [h,m] = t.split(':').map(Number); return h*60+m }
              const oh = restaurant.opening_hours as OH | null
              const hh = restaurant.happy_hour as HH | null
              let isOpen = true
              if (oh?.[dayKey]) {
                const { open, close, closed } = oh[dayKey]
                const o = pt(open), c = pt(close)
                isOpen = !closed && (c > o ? mins >= o && mins < c : mins >= o || mins < c)
              }
              const isHH = (hh?.enabled ?? false) && hh!.days.includes(dayKey) && (() => {
                const o = pt(hh!.start), c = pt(hh!.end)
                return c > o ? mins >= o && mins < c : mins >= o || mins < c
              })()
              return (
                <>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ isOpen ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400' }`}>
                    {isOpen ? 'Ouvert' : 'Fermé'}
                  </span>
                  {isHH && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-400">🍹 Happy Hour</span>
                  )}
                </>
              )
            })()}
          </div>
          <p className="text-sm text-zinc-400">/{restaurant.slug}</p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Period selector */}
      <StatsPeriodSelector period={period} from={sp.from} to={sp.to} compare={compare} />

      {/* Pending banner */}
      {(pendingCount ?? 0) > 0 && (
        <Link
          href="/dashboard/orders"
          className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3 text-sm text-orange-400 hover:bg-orange-500/15 transition-colors"
        >
          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse shrink-0" />
          <span>
            <strong>{pendingCount}</strong> commande{(pendingCount ?? 0) > 1 ? 's' : ''} en attente
          </span>
          <svg className="w-4 h-4 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Chiffre d'affaires"
          value={fmt(stats.revenue)}
          delta={prevStats ? pctDelta(stats.revenue, prevStats.revenue) : null}
          prevLabel={periodLabel[period]}
          accent
        />
        <KpiCard
          label="Commandes"
          value={String(stats.orders)}
          delta={prevStats ? pctDelta(stats.orders, prevStats.orders) : null}
          prevLabel={periodLabel[period]}
          accent={stats.orders > 0}
        />
        <KpiCard
          label="Panier moyen"
          value={stats.orders > 0 ? fmt(stats.avgBasket) : '—'}
          delta={prevStats && prevStats.orders > 0 ? pctDelta(stats.avgBasket, prevStats.avgBasket) : null}
          prevLabel={periodLabel[period]}
        />
        <KpiCard
          label="Taux annulation"
          value={`${Math.round(stats.cancelRate)}%`}
          sub={stats.cancelledOrders > 0 ? `${stats.cancelledOrders} commande${stats.cancelledOrders > 1 ? 's' : ''}` : undefined}
          delta={prevStats ? pctDelta(stats.cancelRate, prevStats.cancelRate) : null}
          prevLabel={periodLabel[period]}
          invertDelta
        />
      </div>

      {/* Payment split + Top items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Payment split */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-sm font-medium text-zinc-300 mb-4">Répartition paiement</h2>
          {stats.revenue === 0 ? (
            <p className="text-sm text-zinc-600 py-4 text-center">Aucune commande sur la période</p>
          ) : (
            <div className="space-y-3.5">
              <PayBar label="Carte / en ligne" value={stats.onlineRevenue} total={stats.revenue} color="bg-orange-500" />
              <PayBar label="Espèces / sur place" value={stats.cashRevenue} total={stats.revenue} color="bg-zinc-500" />
            </div>
          )}
          {prevStats && prevStats.revenue > 0 && (
            <div className="mt-5 pt-4 border-t border-zinc-800 space-y-3.5">
              <p className="text-xs text-zinc-600 mb-3">{periodLabel[period]}</p>
              <PayBar label="Carte" value={prevStats.onlineRevenue} total={prevStats.revenue} color="bg-orange-500/40" />
              <PayBar label="Espèces" value={prevStats.cashRevenue}  total={prevStats.revenue} color="bg-zinc-600/40"   />
            </div>
          )}
        </div>

        {/* Top items */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-sm font-medium text-zinc-300 mb-4">Articles les plus vendus</h2>
          {stats.topItems.length === 0 ? (
            <p className="text-sm text-zinc-600 py-4 text-center">Aucune donnée sur la période</p>
          ) : (
            <ol className="space-y-3">
              {stats.topItems.map((item, i) => (
                <li key={item.name} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-600 w-4 text-right tabular-nums shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm text-white truncate">{item.name}</span>
                      <span className="text-xs text-zinc-400 shrink-0 tabular-nums">{fmt(item.revenue)}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500/60 rounded-full"
                        style={{ width: `${(item.qty / (stats.topItems[0]?.qty || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-orange-400 w-8 text-right tabular-nums shrink-0">
                    ×{item.qty}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-sm font-medium text-zinc-300 mb-5">
          {granularity === 'hour' ? 'Activité par heure' : 'Activité par jour'}
        </h2>

        {timeline.length === 0 ? (
          <p className="text-sm text-zinc-600 py-8 text-center">Aucune commande sur la période</p>
        ) : (
          <>
            <div className="flex items-end gap-1 overflow-x-auto pb-1" style={{ height: 100 }}>
              {timeline.map(t => (
                <div
                  key={t.label}
                  className="group flex flex-col items-center justify-end gap-1 min-w-[32px] flex-1"
                  style={{ height: 100 }}
                >
                  <div className="relative w-full flex flex-col justify-end" style={{ height: 80 }}>
                    {/* Tooltip */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-[10px] text-white whitespace-nowrap z-10">
                      {fmt(t.revenue)} · {t.orders} cmd
                    </div>
                    <div
                      className="w-full bg-orange-500/60 hover:bg-orange-500 rounded-t-sm transition-colors"
                      style={{ height: `${Math.max(2, (t.revenue / maxRevenue) * 80)}px` }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-600 group-hover:text-zinc-400 transition-colors leading-none">
                    {t.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-zinc-600">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-orange-500/60 rounded-sm" />
                <span>Chiffre d'affaires (survolez pour le détail)</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { href: '/dashboard/orders',   label: 'Commandes en cours', desc: 'Temps réel' },
          { href: '/dashboard/menu',     label: 'Gérer le menu',      desc: 'Catégories & plats' },
          { href: '/dashboard/tables',   label: 'Tables & QR codes',  desc: `${restaurant.slug}` },
        ].map(({ href, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between border border-zinc-800 hover:border-orange-500/30 rounded-xl px-4 py-3 transition-colors group"
          >
            <div>
              <p className="text-sm font-medium text-white group-hover:text-orange-400 transition-colors">{label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
            </div>
            <svg className="w-4 h-4 text-zinc-600 group-hover:text-orange-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────

function KpiCard({
  label, value, sub, delta, prevLabel, accent, invertDelta,
}: {
  label: string
  value: string
  sub?: string
  delta: number | null
  prevLabel: string
  accent?: boolean
  invertDelta?: boolean
}) {
  const isPositive = (delta ?? 0) > 0
  const isNegative = (delta ?? 0) < 0
  const good = invertDelta ? isNegative : isPositive
  const bad  = invertDelta ? isPositive : isNegative

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <p className="text-xs text-zinc-500 mb-2 leading-tight">{label}</p>
      <p className="text-2xl font-bold tabular-nums text-white">{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
      {delta != null && (
        <p className={`text-xs mt-2 font-medium flex items-center gap-1 ${good ? 'text-emerald-400' : bad ? 'text-red-400' : 'text-zinc-500'}`}>
          {isPositive ? '▲' : isNegative ? '▼' : '='} {Math.abs(Math.round(delta))}%
          <span className="font-normal text-zinc-600">vs {prevLabel}</span>
        </p>
      )}
    </div>
  )
}

function PayBar({ label, value, total, color }: {
  label: string; value: number; total: number; color: string
}) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-zinc-400">{label}</span>
        <span className="text-xs font-medium text-white tabular-nums">
          {fmt(value)}&nbsp;<span className="text-zinc-600">({Math.round(pct)}%)</span>
        </span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
