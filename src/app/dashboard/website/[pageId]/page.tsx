import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveRestaurantId } from '@/lib/active-restaurant'
import { deletePageById } from '@/app/actions/restaurant'
import PageEditor from './PageEditor'

export default async function PageEditorPage({
  params,
}: {
  params: Promise<{ pageId: string }>
}) {
  const { pageId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const activeRestaurantId = await getActiveRestaurantId(user.id)
  if (!activeRestaurantId) redirect('/dashboard/new')

  const { data: page } = await supabase
    .from('restaurant_pages')
    .select('id, title, slug, is_published')
    .eq('id', pageId)
    .eq('restaurant_id', activeRestaurantId)
    .single()

  if (!page) notFound()

  const { data: sections } = await supabase
    .from('page_sections')
    .select('id, type, position, content')
    .eq('page_id', pageId)
    .order('position')

  async function handleDelete() {
    'use server'
    await deletePageById(pageId)
    redirect('/dashboard/website')
  }

  return (
    <div className="max-w-xl space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/website"
          className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 flex items-center justify-center transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{page.title}</h1>
          <p className="text-xs text-zinc-500 mt-0.5">slug : {page.slug}</p>
        </div>
        <form action={handleDelete}>
          <button
            type="submit"
            className="text-xs text-zinc-600 hover:text-red-400 transition-colors px-2 py-1 rounded-lg"
            onClick={e => {
              if (!confirm(`Supprimer la page "${page.title}" ?`)) e.preventDefault()
            }}
          >
            Supprimer
          </button>
        </form>
      </div>

      {/* Éditeur de sections */}
      <PageEditor
        pageId={pageId}
        restaurantId={activeRestaurantId}
        initialSections={(sections ?? []) as Parameters<typeof PageEditor>[0]['initialSections']}
      />
    </div>
  )
}
