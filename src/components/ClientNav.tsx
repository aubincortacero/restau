'use client'

import Link from 'next/link'
import { useSearchParams, usePathname } from 'next/navigation'
import { useState } from 'react'

type Page = { title: string; slug: string }

export default function ClientNav({
  restaurantSlug,
  pages,
}: {
  restaurantSlug: string
  pages: Page[]
}) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const tableId = searchParams.get('table')
  const q = tableId ? `?table=${encodeURIComponent(tableId)}` : ''

  const menuHref = `/menu/${restaurantSlug}${q}`
  const isMenu = pathname === `/menu/${restaurantSlug}`

  const directPages = pages.slice(0, 2)
  const overflowPages = pages.slice(2)
  const [burgerOpen, setBurgerOpen] = useState(false)

  function isPageActive(slug: string) {
    return pathname === `/menu/${restaurantSlug}/pages/${slug}`
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      {/* Gradient de lisibilité */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-transparent" />

      <div
        className="relative flex items-center gap-5 px-5 max-w-lg mx-auto pointer-events-auto"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
      >
        <Link
          href={menuHref}
          className={`text-sm font-semibold transition-opacity ${isMenu ? 'text-white' : 'text-white/70'}`}
        >
          Menu
        </Link>

        <div className="flex items-center gap-4 flex-1">
          {directPages.map(p => (
            <Link
              key={p.slug}
              href={`/menu/${restaurantSlug}/pages/${p.slug}${q}`}
              className={`text-sm font-semibold transition-opacity ${isPageActive(p.slug) ? 'text-white' : 'text-white/70'}`}
            >
              {p.title}
            </Link>
          ))}
        </div>

        {overflowPages.length > 0 && (
          <div className="relative ml-auto">
            <button
              onClick={() => setBurgerOpen(v => !v)}
              className="w-8 h-8 flex flex-col gap-1.5 items-center justify-center"
              aria-label="Menu"
            >
              <span className={`block w-5 h-0.5 bg-white transition-transform ${burgerOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block w-5 h-0.5 bg-white transition-opacity ${burgerOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-white transition-transform ${burgerOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>

            {burgerOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-48 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                style={{ backdropFilter: 'blur(20px)' }}
              >
                {overflowPages.map((p, i) => (
                  <Link
                    key={p.slug}
                    href={`/menu/${restaurantSlug}/pages/${p.slug}${q}`}
                    onClick={() => setBurgerOpen(false)}
                    className={`block px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors ${i > 0 ? 'border-t border-white/5' : ''}`}
                  >
                    {p.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
