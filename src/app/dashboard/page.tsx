import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { IconOrders, IconTable, IconSettings, IconMenu, IconQR } from '@/components/icons'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, is_open, slug')
    .eq('owner_id', user.id)
    .single()

  if (!restaurant) redirect('/dashboard/new')

  const [{ count: tablesCount }, { count: ordersCount }] = await Promise.all([
    supabase.from('tables').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id),
    supabase.from('orders').select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant.id)
      .eq('status', 'pending'),
  ])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-semibold">{restaurant.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              restaurant.is_open
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-zinc-800 text-zinc-400'
            }`}>
              {restaurant.is_open ? 'Ouvert' : 'Fermé'}
            </span>
          </div>
          <p className="text-sm text-zinc-400">/{restaurant.slug}</p>
        </div>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors"
        >
          <IconSettings className="w-3.5 h-3.5" />
          Paramètres
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link
          href="/dashboard/orders"
          className="bg-zinc-900 border border-zinc-800 hover:border-orange-500/30 rounded-2xl p-5 transition-colors group"
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${(ordersCount ?? 0) > 0 ? 'bg-orange-500/15 text-orange-400' : 'bg-zinc-800 text-zinc-400'}`}>
            <IconOrders className="w-5 h-5" />
          </div>
          <div className={`text-3xl font-semibold ${(ordersCount ?? 0) > 0 ? 'text-orange-400' : 'text-white'}`}>{ordersCount ?? 0}</div>
          <div className="text-xs text-zinc-400 mt-1 group-hover:text-zinc-300 transition-colors">Commandes en attente</div>
        </Link>

        <Link
          href="/dashboard/tables"
          className="bg-zinc-900 border border-zinc-800 hover:border-orange-500/30 rounded-2xl p-5 transition-colors group"
        >
          <div className="w-9 h-9 rounded-xl bg-zinc-800 text-zinc-400 flex items-center justify-center mb-3">
            <IconTable className="w-5 h-5" />
          </div>
          <div className="text-3xl font-semibold text-white">{tablesCount ?? 0}</div>
          <div className="text-xs text-zinc-400 mt-1 group-hover:text-zinc-300 transition-colors">Tables configurées</div>
        </Link>
      </div>

      {/* Quick actions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { href: '/dashboard/menu', label: 'Gérer le menu', desc: 'Catégories, plats, prix', Icon: IconMenu },
            { href: '/dashboard/tables', label: 'Gérer les tables', desc: 'QR codes, numéros', Icon: IconQR },
            { href: '/dashboard/orders', label: 'Voir les commandes', desc: 'Temps réel', Icon: IconOrders },
          ].map(({ href, label, desc, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-start gap-3 border border-zinc-800 hover:border-orange-500/30 rounded-xl p-4 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-800 group-hover:bg-orange-500/10 text-zinc-400 group-hover:text-orange-400 flex items-center justify-center transition-colors shrink-0 mt-0.5">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-white group-hover:text-orange-400 transition-colors">{label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* CTA vitrine */}
      <div className="mt-4 flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4">
        <div>
          <p className="text-sm font-medium text-white">Voir la vitrine client</p>
          <p className="text-xs text-zinc-500 mt-0.5">/{restaurant.slug}</p>
        </div>
        <Link
          href={`/menu/${restaurant.slug}`}
          target="_blank"
          className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shrink-0"
        >
          Ouvrir
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
