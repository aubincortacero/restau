'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createPage } from '@/app/actions/restaurant'

type Page = { id: string; title: string; slug: string; is_published: boolean }

export default function WebsiteNav({
  restaurantId,
  pages,
}: {
  restaurantId: string
  pages: Page[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [pending, startTransition] = useTransition()

  const menuActive = pathname === '/dashboard/website/menu' || pathname.startsWith('/dashboard/website/menu/')
  const appearanceActive = pathname.startsWith('/dashboard/website/appearance')

  function handleCreate() {
    if (!title.trim()) return
    startTransition(async () => {
      const result = await createPage(restaurantId, title.trim())
      if (result.pageId) {
        router.push(`/dashboard/website/${result.pageId}`)
        setAdding(false)
        setTitle('')
      }
    })
  }

  return (
    <nav className="w-48 shrink-0 hidden md:block">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 px-3 mb-2">Pages</p>
      <ul className="space-y-0.5">
        {/* Menu intégrée */}
        <li>
          <Link
            href="/dashboard/website/menu"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              menuActive
                ? 'bg-white/8 text-white font-medium'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <svg className="w-3.5 h-3.5 shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
            </svg>
            <span className="truncate flex-1">Menu</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-blue-400/80 bg-blue-900/20 px-1.5 py-0.5 rounded shrink-0">
              Base
            </span>
          </Link>
        </li>

        {/* Pages custom */}
        {pages.map(page => {
          const isActive = pathname === `/dashboard/website/${page.id}` || pathname.startsWith(`/dashboard/website/${page.id}/`)
          return (
            <li key={page.id}>
              <Link
                href={`/dashboard/website/${page.id}`}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-white/8 text-white font-medium'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${page.is_published ? 'bg-zinc-500' : 'bg-zinc-700'}`} />
                <span className="truncate">{page.title}</span>
              </Link>
            </li>
          )
        })}

        {/* + Ajouter une page */}
        <li className="pt-0.5">
          {!adding ? (
            <button
              onClick={() => setAdding(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 transition-colors border border-dashed border-zinc-800 hover:border-zinc-700 mt-1"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Ajouter une page
            </button>
          ) : (
            <div className="space-y-1.5 mt-1">
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreate()
                  if (e.key === 'Escape') { setAdding(false); setTitle('') }
                }}
                placeholder="Titre…"
                autoFocus
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
              />
              <div className="flex gap-1">
                <button
                  onClick={handleCreate}
                  disabled={!title.trim() || pending}
                  className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Créer
                </button>
                <button
                  onClick={() => { setAdding(false); setTitle('') }}
                  className="px-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded-lg transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </li>
      </ul>

      {/* Apparence */}
      <div className="mt-4 pt-4 border-t border-zinc-800">
        <Link
          href="/dashboard/website/appearance"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            appearanceActive
              ? 'bg-white/8 text-white font-medium'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
          </svg>
          Apparence
        </Link>
      </div>
    </nav>
  )
}
