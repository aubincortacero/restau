'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'

const SETTINGS_NAV = [
  { href: '/dashboard/settings', label: 'Profil', exact: true },
  { href: '/dashboard/settings/restaurant', label: 'Restaurant' },
  { href: '/dashboard/settings/schedules', label: 'Horaires & Happy Hour' },
  { href: '/dashboard/settings/stripe', label: 'Stripe Connect' },
  { href: '/dashboard/settings/danger', label: 'Zone dangereuse', danger: true },
]

export default function SettingsMobileNav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const currentItem = SETTINGS_NAV.find(
    (item) => item.exact ? pathname === item.href : pathname.startsWith(item.href)
  ) ?? SETTINGS_NAV[0]

  return (
    <div className="md:hidden mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-left"
      >
        <span className={`text-sm font-medium ${currentItem.danger ? 'text-red-400' : 'text-white'}`}>
          {currentItem.label}
        </span>
        <svg
          className={`w-5 h-5 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-2 bg-zinc-900 border border-zinc-800 rounded-xl p-2">
          {SETTINGS_NAV.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-white/8 text-white font-medium'
                    : item.danger
                    ? 'text-red-400 hover:bg-red-400/10'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
