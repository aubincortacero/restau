'use client'

import { useState } from 'react'
import FloorPlanGenerator from './FloorPlanGenerator'

export default function FloorPlanGeneratorTrigger({
  restaurantId,
  hasExistingTables,
}: {
  restaurantId: string
  hasExistingTables: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 border border-violet-500/30 hover:border-violet-500/60 bg-violet-500/10 hover:bg-violet-500/15 px-3 py-2 rounded-xl transition-colors cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
        </svg>
        Générer avec l'IA
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-8 px-4">
          <div className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-800">
              <div>
                <h2 className="text-base font-semibold text-white">Générer le plan de salle</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Définissez vos zones, l'IA positionne les tables.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5">
              <FloorPlanGenerator
                restaurantId={restaurantId}
                hasExistingTables={hasExistingTables}
                onClose={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
