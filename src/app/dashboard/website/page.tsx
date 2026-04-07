import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveRestaurantId } from '@/lib/active-restaurant'
import NewPageButton from './NewPageButton'

export default async function WebsitePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const activeRestaurantId = await getActiveRestaurantId(user.id)
  if (!activeRestaurantId) redirect('/dashboard/new')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, slug')
    .eq('id', activeRestaurantId)
    .single()
  if (!restaurant) notFound()

  // Exclure la page intégrée __menu__ de la liste des pages custom
  const { data: pages } = await supabase
    .from('restaurant_pages')
    .select('id, title, slug, is_published, position')
    .eq('restaurant_id', activeRestaurantId)
    .neq('slug', '__menu__')
    .order('position')

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Pages du site</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Ces pages apparaissent dans le menu&nbsp;
            <span className="text-zinc-300 font-medium">{`/menu/${restaurant.slug}`}</span>
          </p>
        </div>
        <NewPageButton restaurantId={activeRestaurantId} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Carte Menu intégrée — toujours en premier */}
        <div className="bg-zinc-900 border border-blue-900/40 rounded-2xl px-5 py-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-900/20 border border-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white">Menu</p>
              <p className="text-xs text-zinc-600 mt-0.5 font-mono">/menu/{restaurant.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md bg-blue-900/30 text-blue-400">
              Intégrée
            </span>
            <Link
              href="/dashboard/website/menu"
              className="ml-auto flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium px-3 py-1.5 rounded-xl transition-colors"
            >
              Éditer
            </Link>
          </div>
        </div>

        {/* Pages custom */}
        {(pages ?? []).map(page => (
          <div
            key={page.id}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 flex flex-col gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{page.title}</p>
              <p className="text-xs text-zinc-600 mt-0.5 font-mono">/{page.slug}</p>
            </div>
            <div className="flex items-center gap-2">
              {!page.is_published && (
                <span className="text-xs bg-zinc-800 text-zinc-500 px-2 py-1 rounded-lg">Masquée</span>
              )}
              <Link
                href={`/dashboard/website/${page.id}`}
                className="ml-auto flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium px-3 py-1.5 rounded-xl transition-colors"
              >
                Éditer
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
