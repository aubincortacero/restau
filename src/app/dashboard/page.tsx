import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveRestaurantId } from '@/lib/active-restaurant'
import { IconSettings } from '@/components/icons'

export const dynamic = 'force-dynamic'

type OpeningHours = Record<string, { open: string; close: string; closed: boolean }>
type HappyHour = { enabled: boolean; start: string; end: string; days: string[] }

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

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const restaurantId = await getActiveRestaurantId(user.id)
  if (!restaurantId) redirect('/dashboard/new')

  const [restaurantRes, pendingRes, categoriesRes, tablesRes, ordersRes] = await Promise.all([
    supabase
      .from('restaurants')
      .select('id, name, slug, opening_hours, happy_hour, stripe_account_id')
      .eq('id', restaurantId)
      .maybeSingle(),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('status', 'pending')
      .is('archived_at', null),
    supabase.from('categories').select('id').eq('restaurant_id', restaurantId).limit(1),
    supabase.from('tables').select('id').eq('restaurant_id', restaurantId).limit(1),
    supabase.from('orders').select('id').eq('restaurant_id', restaurantId).limit(1),
  ])

  const restaurant = restaurantRes.data
  if (!restaurant) redirect('/dashboard/new')

  const pendingCount = pendingRes.count ?? 0
  const { open, happyHour } = getStatusNow(
    restaurant.opening_hours as OpeningHours | null,
    restaurant.happy_hour as HappyHour | null,
  )

  const checklist = [
    { id: 'menu',   label: 'Créer votre menu',     done: (categoriesRes.data ?? []).length > 0, href: '/dashboard/menu' },
    { id: 'tables', label: 'Configurer vos tables', done: (tablesRes.data ?? []).length > 0,    href: '/dashboard/tables' },
    { id: 'stripe', label: 'Connecter Stripe',      done: !!restaurant.stripe_account_id,       href: '/dashboard/settings/stripe' },
    { id: 'orders', label: 'Recevoir une commande', done: (ordersRes.data ?? []).length > 0,    href: '/dashboard/orders' },
  ]
  const checklistDone = checklist.every(i => i.done)
  const doneCount = checklist.filter(i => i.done).length

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

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

      {/* Commandes en attente */}
      {pendingCount > 0 && (
        <Link
          href="/dashboard/orders"
          className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3 text-sm text-orange-400 hover:bg-orange-500/15 transition-colors"
        >
          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse shrink-0" />
          <span>
            <strong>{pendingCount}</strong> commande{pendingCount > 1 ? 's' : ''} en attente
          </span>
          <svg className="w-4 h-4 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      )}

      {/* Guide de démarrage – disparaît une fois tout coché */}
      {!checklistDone && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Guide de démarrage</h2>
            <span className="text-xs text-zinc-500">{doneCount}/{checklist.length}</span>
          </div>
          <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${(doneCount / checklist.length) * 100}%` }}
            />
          </div>
          <ul className="space-y-0.5">
            {checklist.map(item => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-2 py-2.5 rounded-xl text-sm transition-colors ${
                    item.done ? 'text-zinc-500' : 'text-zinc-200 hover:bg-zinc-800/60 hover:text-white'
                  }`}
                >
                  {item.done ? (
                    <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-zinc-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="9" />
                    </svg>
                  )}
                  <span className={item.done ? 'line-through' : ''}>{item.label}</span>
                  {!item.done && (
                    <svg className="w-3.5 h-3.5 text-zinc-600 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                    </svg>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Raccourcis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { href: '/dashboard/orders',           label: 'Commandes',  desc: 'Suivi en temps réel',   icon: '🧾' },
          { href: '/dashboard/menu',             label: 'Menu',        desc: 'Catégories & articles', icon: '📋' },
          { href: '/dashboard/tables',           label: 'Tables & QR', desc: 'Gérer vos QR codes',   icon: '🪑' },
          { href: '/dashboard/settings/schedules', label: 'Horaires', desc: 'Ouverture & Happy Hour', icon: '🕐' },
        ].map(({ href, label, desc, icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 border border-zinc-800 hover:border-orange-500/30 rounded-xl px-4 py-4 transition-colors group"
          >
            <span className="text-2xl">{icon}</span>
            <div className="flex-1 min-w-0">
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
