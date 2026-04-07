import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import ClientNav from '@/components/ClientNav'

export default async function MenuLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', slug)
    .single()

  let pages: { title: string; slug: string }[] = []
  if (restaurant) {
    const { data } = await supabase
      .from('restaurant_pages')
      .select('title, slug')
      .eq('restaurant_id', restaurant.id)
      .eq('is_published', true)
      .order('position')
    pages = data ?? []
  }

  return (
    <>
      <Suspense fallback={null}>
        <ClientNav restaurantSlug={slug} pages={pages} />
      </Suspense>
      {children}
    </>
  )
}
