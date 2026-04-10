'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { IconSettings, IconLogout } from './icons'

type RestaurantSummary = { id: string; name: string; slug: string }
type SubStatus = 'active' | 'trialing' | 'expired' | 'none'

interface UserMenuProps {
  displayName: string
  email: string
  avatarUrl?: string | null
  signOutAction: () => Promise<void>
  restaurants?: RestaurantSummary[]
  activeRestaurantId?: string | null
  setActiveAction?: (formData: FormData) => Promise<void>
  deleteAction?: (formData: FormData) => Promise<void>
  subStatus?: SubStatus
  trialEndsAt?: string | null
  compact?: boolean
  dropdownAlign?: 'left' | 'right'
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
  subStatus,
  trialEndsAt,
  compact = false,
  dropdownAlign = 'right',
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
        {!compact && <span className="hidden sm:block text-xs text-zinc-300 max-w-[120px] truncate">{displayName}</span>}
        {!compact && <svg
          className={`w-3 h-3 text-zinc-500 transition-transform hidden sm:block ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
        </svg>}
      </button>

      {open && (
        <div className={`popup-panel absolute top-full mt-2 w-64 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl shadow-black/40 z-50 overflow-hidden ${dropdownAlign === 'left' ? 'left-0' : 'right-0'}`}>
          {/* Infos utilisateur + vitrine */}
          {(() => {
            const active = restaurants.find((r) => r.id === activeRestaurantId)
            return (
              <div className="px-4 py-3 border-b border-zinc-800">
                <p className="text-xs font-semibold text-white truncate">{displayName}</p>
                <p className="text-xs text-zinc-500 truncate mt-0.5">{email}</p>
                {/* Badge plan */}
                {subStatus === 'trialing' && trialEndsAt && (() => {
                  const days = Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
                  return (
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full bg-amber-500/15 text-amber-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        Essai — {days} jour{days !== 1 ? 's' : ''} restant{days !== 1 ? 's' : ''}
                      </span>
                      <a
                        href="/subscribe"
                        onClick={() => setOpen(false)}
                        className="text-[10px] font-semibold text-orange-400 hover:text-orange-300 transition-colors shrink-0"
                      >
                        S&apos;abonner →
                      </a>
                    </div>
                  )
                })()}
                {subStatus === 'active' && (
                  <div className="mt-2.5">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      Plan Pro
                    </span>
                  </div>
                )}
                {/* Vitrine */}
                {active && (
                  <a
                    href={`/menu/${active.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="mt-3 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white leading-tight">Voir ma vitrine</p>
                      <p className="text-[10px] text-orange-100/80 truncate mt-0.5">{active.name}</p>
                    </div>
                    <svg className="w-3.5 h-3.5 text-white shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                )}
              </div>
            )
          })()}

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
                          ? 'text-white bg-white/8'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-white/60' : 'bg-zinc-700'}`} />
                      <span className="truncate">{r.name}</span>
                      {isActive && <span className="ml-auto text-[10px] text-zinc-400 font-medium shrink-0">actif</span>}
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
