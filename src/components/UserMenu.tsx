'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { IconSettings, IconLogout } from './icons'

interface UserMenuProps {
  displayName: string
  email: string
  avatarUrl?: string | null
  signOutAction: () => Promise<void>
}

export default function UserMenu({ displayName, email, avatarUrl, signOutAction }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const initial = displayName.charAt(0).toUpperCase()

  // Fermer en cliquant à l'extérieur
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={displayName} className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-xs font-semibold shrink-0">
            {initial}
          </div>
        )}
        <span className="hidden sm:block text-xs text-zinc-300 max-w-[120px] truncate">{displayName}</span>
        <svg
          className={`w-3 h-3 text-zinc-500 transition-transform hidden sm:block ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl shadow-black/40 z-50 overflow-hidden">
          {/* Infos utilisateur */}
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-xs font-semibold text-white truncate">{displayName}</p>
            <p className="text-xs text-zinc-500 truncate mt-0.5">{email}</p>
          </div>

          {/* Actions */}
          <div className="py-1">
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <IconSettings className="w-4 h-4 text-zinc-500" />
              Paramètres
            </Link>
          </div>

          <div className="border-t border-zinc-800 py-1">
            <button
              type="button"
              onClick={async () => {
                setOpen(false)
                try { await signOutAction() } catch { /* redirect throws */ }
                window.location.href = '/login'
              }}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <IconLogout className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
