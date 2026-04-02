'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  href: string
  label: string
  exact?: boolean
  danger?: boolean
}

export default function SettingsNavLink({ href, label, exact, danger }: Props) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
        isActive
          ? danger
            ? 'bg-red-500/10 text-red-400'
            : 'bg-orange-500/10 text-orange-400 font-medium'
          : danger
          ? 'text-red-500/70 hover:text-red-400 hover:bg-red-500/5'
          : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
      }`}
    >
      {label}
    </Link>
  )
}
