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

  const { data: pages } = await supabase
    .from('restaurant_pages')
    .select('id, title, slug, is_published, position')
    .eq('restaurant_id', activeRestaurantId)
    .order('position')

  return (
    <div className="max-w-xl space-y-6">
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

      {!pages?.length ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />
            </svg>
          </div>
          <p className="text-zinc-400 font-medium mb-1">Aucune page créée</p>
          <p className="text-zinc-600 text-sm">Créez une première page (ex : &ldquo;À propos&rdquo;, &ldquo;Notre histoire&rdquo;…)</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pages.map(page => (
            <div
              key={page.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{page.title}</p>
                <p className="text-xs text-zinc-600 mt-0.5 font-mono">/{page.slug}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!page.is_published && (
                  <span className="text-xs bg-zinc-800 text-zinc-500 px-2 py-1 rounded-lg">Masquée</span>
                )}
                <Link
                  href={`/dashboard/website/${page.id}`}
                  className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium px-3 py-1.5 rounded-xl transition-colors"
                >
                  Éditer
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
