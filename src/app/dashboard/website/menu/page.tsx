import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveRestaurantId } from '@/lib/active-restaurant'
import { getOrCreateMenuPage } from '@/app/actions/restaurant'
import MenuPageEditor from './MenuPageEditor'

export default async function MenuPageEditorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const activeRestaurantId = await getActiveRestaurantId(user.id)
  if (!activeRestaurantId) redirect('/dashboard/new')

  const result = await getOrCreateMenuPage(activeRestaurantId)
  if (result.error || !result.pageId) redirect('/dashboard/website')

  const { data: sections } = await supabase
    .from('page_sections')
    .select('id, type, position, content')
    .eq('page_id', result.pageId)
    .order('position')

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/website"
          className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 flex items-center justify-center transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Menu</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Ajoutez du contenu avant et après la carte</p>
        </div>
      </div>

      <MenuPageEditor
        pageId={result.pageId}
        restaurantId={activeRestaurantId}
        initialSections={(sections ?? []) as Parameters<typeof MenuPageEditor>[0]['initialSections']}
      />
    </div>
  )
}
