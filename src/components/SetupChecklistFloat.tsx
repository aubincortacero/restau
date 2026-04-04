'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export interface ChecklistItem {
  id: string
  label: string
  done: boolean
  href: string
}

interface Props {
  items: ChecklistItem[]
}

export default function SetupChecklistFloat({ items }: Props) {
  const [open, setOpen] = useState(true)
  const [dismissed, setDismissed] = useState<boolean | null>(null)

  useEffect(() => {
    setDismissed(localStorage.getItem('qomand_checklist_dismissed') === '1')
  }, [])

  function dismiss() {
    localStorage.setItem('qomand_checklist_dismissed', '1')
    setDismissed(true)
  }

  const doneCount = items.filter((i) => i.done).length
  const allDone = doneCount === items.length

  // Pas encore lu localStorage → rien pour éviter flash
  if (dismissed === null) return null
  // Fermé définitivement (dismissed)
  if (dismissed) return null
  // Tout fait ET déjà fermé → rien (géré ci-dessus)

  return (
    <div className="popup-panel fixed bottom-6 right-6 z-40 w-64 rounded-2xl border border-zinc-800 bg-zinc-900/95 shadow-2xl shadow-black/40 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          <div className="relative w-5 h-5 shrink-0">
            {/* Icône checklist */}
            <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">Guide de démarrage</p>
            <p className="text-[10px] text-zinc-500 leading-tight">
              {allDone ? '✓ Tout est prêt !' : `${doneCount}/${items.length} étapes complètes`}
            </p>
          </div>
          <svg
            className={`w-4 h-4 text-zinc-500 transition-transform shrink-0 ${open ? '' : '-rotate-180'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
          </svg>
        </button>
        <button
          onClick={dismiss}
          className="ml-2 text-zinc-600 hover:text-zinc-400 transition-colors shrink-0"
          title="Fermer définitivement"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-2.5">
        <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-500"
            style={{ width: `${(doneCount / items.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Items */}
      {open && (
        <ul className="px-3 py-2 space-y-0.5">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className={`flex items-center gap-2.5 px-2 py-2 rounded-xl text-xs transition-colors ${
                  item.done
                    ? 'text-zinc-500 hover:text-zinc-400'
                    : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                {item.done ? (
                  <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-zinc-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                )}
                <span className={item.done ? 'line-through' : ''}>{item.label}</span>
                {!item.done && (
                  <svg className="w-3 h-3 text-zinc-600 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                  </svg>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {allDone && open && (
        <div className="px-4 pb-3 pt-1">
          <p className="text-[10px] text-emerald-400/80 text-center">
            🎉 Votre restaurant est opérationnel !
          </p>
        </div>
      )}
    </div>
  )
}
