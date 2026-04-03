'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { IconSettings, IconLogout } from './icons'

type RestaurantSummary = { id: string; name: string; slug: string }

interface UserMenuProps {
  displayName: string
  email: string
  avatarUrl?: string | null
  signOutAction: () => Promise<void>
  restaurants?: RestaurantSummary[]
  activeRestaurantId?: string | null
  setActiveAction?: (formData: FormData) => Promise<void>
  deleteAction?: (formData: FormData) => Promise<void>
}

export default function UserMenu({
  displayName,
  email,
  avatarUrl,
  signOutAction,
  restaurants = [],
  activeRestaurantId,
  setActiveAction,
  deleteAction,
}: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()
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

          {/* ── Sélecteur de restaurant ── */}
          {restaurants.length > 0 && setActiveAction && (
            <div className="py-2 border-b border-zinc-800">
              <p className="px-4 pb-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Mes restaurants</p>
              {restaurants.map((r) => {
                const isActive = r.id === activeRestaurantId
                return (
                  <div key={r.id} className="flex items-center gap-1 px-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (isActive) return
                        const fd = new FormData()
                        fd.set('id', r.id)
                        startTransition(async () => {
                          await setActiveAction(fd)
                          router.refresh()
                          setOpen(false)
                        })
                      }}
                      className={`flex-1 min-w-0 flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors cursor-pointer text-left ${
                        isActive
                          ? 'text-white bg-orange-500/10'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-orange-500' : 'bg-zinc-700'}`} />
                      <span className="truncate">{r.name}</span>
                      {isActive && <span className="ml-auto text-[10px] text-orange-500 font-medium shrink-0">actif</span>}
                    </button>
                    {restaurants.length > 1 && deleteAction && (
                      confirmDelete === r.id ? (
                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const fd = new FormData()
                              fd.set('id', r.id)
                              startTransition(async () => {
                                await deleteAction(fd)
                                router.refresh()
                                setConfirmDelete(null)
                              })
                            }}
                            className="text-[10px] text-red-400 hover:text-red-300 px-1.5 py-1 rounded cursor-pointer"
                          >
                            Oui
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(null)}
                            className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1.5 py-1 rounded cursor-pointer"
                          >
                            Non
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(r.id)}
                          className="shrink-0 p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      )
                    )}
                  </div>
                )
              })}
              <Link
                href="/dashboard/new"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 mx-2 mt-1 px-2 py-2 rounded-lg text-xs text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors border border-dashed border-zinc-700 hover:border-zinc-600"
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Ajouter un restaurant
              </Link>
            </div>
          )}

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
