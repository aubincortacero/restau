import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveRestaurantId } from '@/lib/active-restaurant'
import { getOrCreateMenuPage } from '@/app/actions/restaurant'
import MenuPageEditor from './MenuPageEditor'
import PageCoverUpload from '@/components/PageCoverUpload'

export default async function MenuPageEditorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const activeRestaurantId = await getActiveRestaurantId(user.id)
  if (!activeRestaurantId) redirect('/dashboard/new')

  const result = await getOrCreateMenuPage(activeRestaurantId)
  if (result.error || !result.pageId) redirect('/dashboard/website')

  const { data: menuPageData } = await supabase
    .from('restaurant_pages')
    .select('cover_image_url')
    .eq('id', result.pageId)
    .single()

  const { data: sections } = await supabase
    .from('page_sections')
    .select('id, type, position, content')
    .eq('page_id', result.pageId)
    .order('position')

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Menu</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Ajoutez du contenu avant et après la carte</p>
      </div>

      {/* Image d'en-tête */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <PageCoverUpload
          pageId={result.pageId}
          restaurantId={activeRestaurantId}
          initialUrl={(menuPageData as { cover_image_url?: string | null } | null)?.cover_image_url ?? null}
        />
      </div>

      <MenuPageEditor
        pageId={result.pageId}
        restaurantId={activeRestaurantId}
        initialSections={(sections ?? []) as Parameters<typeof MenuPageEditor>[0]['initialSections']}
      />
    </div>
  )
}
