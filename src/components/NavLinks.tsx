'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { IconHome, IconMenu, IconTable, IconOrders, IconEye } from './icons'

export const navItems = [
  { href: '/dashboard', label: 'Accueil', icon: IconHome },
  { href: '/dashboard/menu', label: 'Menu', icon: IconMenu },
  { href: '/dashboard/tables', label: 'Tables', icon: IconTable },
  { href: '/dashboard/orders', label: 'Commandes', icon: IconOrders },
]

/** Barre de navigation desktop (hidden md:flex) */
export function NavDesktop() {
  const pathname = usePathname()
  const [activePath, setActivePath] = useState<string | null>(null)
  useEffect(() => { setActivePath(pathname) }, [pathname])

  return (
    <nav className="hidden md:flex items-center gap-1">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = activePath !== null && (
          href === '/dashboard' ? activePath === '/dashboard' : activePath.startsWith(href)
        )
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isActive
                ? 'text-black bg-orange-500 hover:bg-orange-400'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

/** Barre de navigation mobile fixe en bas — style appli native */
export function MobileNav({ restaurantSlug }: { restaurantSlug?: string }) {
  const pathname = usePathname()
  const [activePath, setActivePath] = useState<string | null>(null)
  useEffect(() => { setActivePath(pathname) }, [pathname])

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-zinc-800 flex safe-area-pb">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = activePath !== null && (
          href === '/dashboard' ? activePath === '/dashboard' : activePath.startsWith(href)
        )
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-2.5 pb-4 transition-colors ${
              isActive ? 'text-orange-500' : 'text-zinc-500 active:text-zinc-300'
            }`}
          >
            <div className={`flex items-center justify-center w-10 h-7 rounded-xl transition-colors ${isActive ? 'bg-orange-500/15' : ''}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className={`text-[10px] font-medium leading-none ${isActive ? 'text-orange-400' : 'text-zinc-500'}`}>{label}</span>
          </Link>
        )
      })}
      {restaurantSlug && (
        <a
          href={`/menu/${restaurantSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center gap-1 flex-1 py-2.5 pb-4 text-zinc-500 active:text-zinc-300 transition-colors"
        >
          <div className="flex items-center justify-center w-10 h-7 rounded-xl">
            <IconEye className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium leading-none text-zinc-500">Vitrine</span>
        </a>
      )}
    </nav>
  )
}

// Export par défaut pour compatibilité (desktop uniquement)
export default NavDesktop
