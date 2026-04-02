'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconHome, IconMenu, IconTable, IconOrders, IconSettings } from './icons'

export const navItems = [
  { href: '/dashboard', label: 'Accueil', icon: IconHome },
  { href: '/dashboard/menu', label: 'Menu', icon: IconMenu },
  { href: '/dashboard/tables', label: 'Tables', icon: IconTable },
  { href: '/dashboard/orders', label: 'Commandes', icon: IconOrders },
  { href: '/dashboard/settings', label: 'Paramètres', icon: IconSettings },
]

function useIsActive(href: string) {
  const pathname = usePathname()
  return href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
}

/** Barre de navigation desktop (hidden md:flex) */
export function NavDesktop() {
  const pathname = usePathname()
  return (
    <nav className="hidden md:flex items-center gap-1">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isActive
                ? 'text-orange-400 bg-orange-500/10'
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

/** Barre de navigation mobile (md:hidden, border-t) */
export function MobileNav() {
  const pathname = usePathname()
  return (
    <div className="md:hidden border-t border-zinc-800 flex overflow-x-auto">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 px-4 py-2.5 shrink-0 transition-colors ${
              isActive ? 'text-orange-400' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        )
      })}
    </div>
  )
}

// Export par défaut pour compatibilité (desktop uniquement)
export default NavDesktop
