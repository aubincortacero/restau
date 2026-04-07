import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveRestaurantId } from '@/lib/active-restaurant'
import PageEditor from './PageEditor'
import DeletePageButton from './DeletePageButton'
import PageCoverUpload from '@/components/PageCoverUpload'

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
    .select('id, title, slug, is_published, cover_image_url')
    .eq('id', pageId)
    .eq('restaurant_id', activeRestaurantId)
    .single()

  if (!page) notFound()

  const { data: sections } = await supabase
    .from('page_sections')
    .select('id, type, position, content')
    .eq('page_id', pageId)
    .order('position')

  return (
    <div className="max-w-xl space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{page.title}</h1>
          <p className="text-xs text-zinc-500 mt-0.5">slug : {page.slug}</p>
        </div>
        <DeletePageButton pageId={pageId} title={page.title} />
      </div>

      {/* Image d'en-tête */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <PageCoverUpload
          pageId={pageId}
          restaurantId={activeRestaurantId}
          initialUrl={(page as { cover_image_url?: string | null }).cover_image_url ?? null}
        />
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
