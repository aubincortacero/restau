import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type Section = {
  id: string
  type: 'text_block' | 'gallery'
  position: number
  content: Record<string, unknown>
}

export default async function CustomPage({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>
}) {
  const { slug, pageSlug } = await params
  const supabase = await createClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (!restaurant) notFound()

  const { data: page } = await supabase
    .from('restaurant_pages')
    .select('id, title, slug, cover_image_url')
    .eq('restaurant_id', restaurant.id)
    .eq('slug', pageSlug)
    .eq('is_published', true)
    .single()

  if (!page) notFound()

  const { data: sections } = await supabase
    .from('page_sections')
    .select('id, type, position, content')
    .eq('page_id', page.id)
    .order('position')

  const coverUrl = (page as { cover_image_url?: string | null }).cover_image_url ?? null

  return (
    <main className="min-h-screen bg-[#0a0908] text-stone-100 pb-20">
      {/* Hero */}
      <div className="relative w-full" style={{ height: '45vw', maxHeight: '320px', minHeight: '200px' }}>
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={page.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0908] via-[#0a0908]/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 max-w-lg mx-auto">
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-lg">{page.title}</h1>
        </div>
      </div>

      <div className="px-5 pt-8 max-w-lg mx-auto space-y-10">
        {(sections ?? []).map(section => (
          <SectionRenderer key={section.id} section={section as Section} />
        ))}
      </div>
    </main>
  )
}

function SectionRenderer({ section }: { section: Section }) {
  if (section.type === 'text_block') {
    const c = section.content as { title?: string; subtitle?: string; body?: string }
    return (
      <div className="space-y-2">
        {c.title && <h2 className="text-2xl font-bold text-white">{c.title}</h2>}
        {c.subtitle && <p className="text-base font-medium text-stone-400">{c.subtitle}</p>}
        {c.body && (
          <p className="text-sm text-stone-300 leading-relaxed whitespace-pre-line">{c.body}</p>
        )}
      </div>
    )
  }

  if (section.type === 'gallery') {
    const c = section.content as { images?: { url: string; caption?: string }[] }
    const images = c.images ?? []
    if (!images.length) return null

    return (
      <div
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-5 px-5 [&::-webkit-scrollbar]:hidden pb-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {images.map((img, i) => (
          <div
            key={img.url + i}
            className="shrink-0 snap-start rounded-2xl overflow-hidden bg-zinc-900"
            style={{ width: '80vw', maxWidth: '340px' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.caption ?? ''}
              className="w-full aspect-[4/3] object-cover"
              loading="lazy"
            />
            {img.caption && (
              <p className="text-xs text-stone-400 px-3 py-2">{img.caption}</p>
            )}
          </div>
        ))}
        {/* Trailing spacer pour révéler le edge du dernier item */}
        <div className="shrink-0 w-5" />
      </div>
    )
  }

  return null
}
