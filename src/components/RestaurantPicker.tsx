'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Restaurant = { id: string; name: string; slug: string }

interface Props {
  restaurants: Restaurant[]
  activeId: string | null
  setActiveAction: (formData: FormData) => Promise<void>
  deleteAction: (formData: FormData) => Promise<void>
}

export default function RestaurantPicker({ restaurants, activeId, setActiveAction, deleteAction }: Props) {
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  const active = restaurants.find((r) => r.id === activeId) ?? restaurants[0]

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setConfirmDelete(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function switchTo(id: string) {
    if (id === activeId) { setOpen(false); return }
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => {
      await setActiveAction(fd)
      router.refresh()
      setOpen(false)
    })
  }

  if (!active) return null

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setConfirmDelete(null) }}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors text-sm cursor-pointer ${
          open
            ? 'bg-zinc-800 border-zinc-600 text-white'
            : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-600'
        } ${isPending ? 'opacity-60' : ''}`}
        disabled={isPending}
      >
        {/* Icône restaurant */}
        <svg className="w-3.5 h-3.5 text-orange-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016 2.993 2.993 0 0 0 2.25-1.016 3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
        </svg>
        <span className="max-w-[120px] truncate font-medium text-xs">{active.name}</span>
        <svg
          className={`w-3 h-3 text-zinc-500 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-56 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl shadow-black/40 z-50 overflow-hidden">
          <div className="p-1.5 space-y-0.5">
            {restaurants.map((r) => {
              const isActive = r.id === activeId
              return (
                <div key={r.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => switchTo(r.id)}
                    className={`flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer text-left ${
                      isActive
                        ? 'bg-orange-500/10 text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-orange-500' : 'bg-zinc-700'}`} />
                    <span className="truncate">{r.name}</span>
                    {isActive && (
                      <svg className="w-3.5 h-3.5 text-orange-500 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </button>

                  {/* Supprimer — seulement si > 1 restaurant */}
                  {restaurants.length > 1 && (
                    confirmDelete === r.id ? (
                      <div className="flex gap-0.5 shrink-0 pr-1">
                        <form action={async (fd) => {
                          await deleteAction(fd)
                          router.refresh()
                          setOpen(false)
                          setConfirmDelete(null)
                        }}>
                          <input type="hidden" name="id" value={r.id} />
                          <button type="submit" className="text-[10px] text-red-400 hover:text-red-300 px-2 py-1 rounded cursor-pointer font-medium">
                            Oui
                          </button>
                        </form>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          className="text-[10px] text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded cursor-pointer"
                        >
                          Non
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(r.id)}
                        className="shrink-0 p-1.5 mr-0.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
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
          </div>

          {/* Ajouter */}
          <div className="border-t border-zinc-800 p-1.5">
            <Link
              href="/dashboard/new"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors border border-dashed border-zinc-700 hover:border-zinc-600"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Ajouter un restaurant
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
