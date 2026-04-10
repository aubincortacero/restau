'use client'

import { useTransition, useState } from 'react'
import { createTable, bulkCreateTables } from '@/app/actions/restaurant'
import { IconPlus } from '@/components/icons'
import { type Floor } from './FloorPlan'

export default function TableAddForm({
  restaurantId,
  floors,
  defaultOpen = true,
}: {
  restaurantId: string
  floors: Floor[]
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [mode, setMode] = useState<'single' | 'bulk'>('single')
  const [zone, setZone] = useState('')
  const [number, setNumber] = useState('')
  const [count, setCount] = useState(2)
  const [selectedFloor, setSelectedFloor] = useState(floors[0]?.id ?? 0)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Zones du niveau sélectionné
  const currentFloorData = floors.find((f) => f.id === selectedFloor) ?? floors[0]
  const availableZones = currentFloorData?.zones ?? []
  const selectedZoneData = availableZones.find((z) => z.name === zone) ?? null

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      if (mode === 'single') {
        const res = await createTable(fd)
        if (res?.error) { setError(res.error); return }
      } else {
        await bulkCreateTables(fd)
      }
      setZone('')
      setNumber('')
      setCount(2)
    })
  }

  return (
    <div className="mb-5">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 px-4 py-2.5 rounded-xl transition-colors cursor-pointer w-full justify-center"
        >
          <IconPlus className="w-3 h-3" />
          Ajouter des tables
        </button>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {/* En-tête */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-zinc-800">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Ajouter des tables
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
            <input type="hidden" name="restaurant_id" value={restaurantId} />

            {/* Toggle mode */}
            <div className="flex bg-zinc-800 rounded-xl p-1 gap-0.5">
              <button
                type="button"
                onClick={() => { setMode('single'); setError(null) }}
                className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  mode === 'single' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                1 table
              </button>
              <button
                type="button"
                onClick={() => { setMode('bulk'); setError(null) }}
                className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  mode === 'bulk' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Lot
              </button>
            </div>

            {/* Niveau (si plusieurs) */}
            {floors.length > 1 ? (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Niveau</label>
                <select
                  name="floor"
                  value={selectedFloor}
                  onChange={(e) => { setSelectedFloor(parseInt(e.target.value)); setZone('') }}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
                >
                  {floors.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <input type="hidden" name="floor" value={floors[0]?.id ?? 0} />
            )}

            {/* Zone */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                Zone
              </label>
              {availableZones.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => setZone('')}
                    className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-left transition-colors cursor-pointer border ${
                      zone === ''
                        ? 'border-zinc-600 bg-zinc-800 text-zinc-300'
                        : 'border-transparent text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full border border-zinc-600 shrink-0" />
                    <span className="text-xs">Aucune</span>
                  </button>
                  {availableZones.map((z) => (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => setZone(z.name)}
                      className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-left transition-colors cursor-pointer border ${
                        zone === z.name
                          ? 'border-zinc-600 bg-zinc-800 text-white'
                          : 'border-transparent text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-300'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: z.color }}
                      />
                      <span className="text-xs truncate">{z.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-zinc-800/40 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-600 leading-relaxed">
                  Créez d'abord une zone sur le plan (bouton&nbsp;<strong className="text-zinc-500">Zone</strong>).
                </div>
              )}
              <input type="hidden" name="zone" value={zone} />
              {selectedZoneData && (
                <>
                  <input type="hidden" name="zone_x" value={selectedZoneData.x} />
                  <input type="hidden" name="zone_y" value={selectedZoneData.y} />
                  <input type="hidden" name="zone_w" value={selectedZoneData.w} />
                  <input type="hidden" name="zone_h" value={selectedZoneData.h} />
                </>
              )}
            </div>

            {/* Numéro (mode simple) */}
            {mode === 'single' && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                  Numéro <span className="normal-case font-normal">(auto si vide)</span>
                </label>
                <input
                  name="number"
                  type="number"
                  min="1"
                  value={number}
                  onChange={(e) => { setNumber(e.target.value); setError(null) }}
                  placeholder="Auto"
                  className={`w-full bg-zinc-800 border rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 ${
                    error ? 'border-red-500/60' : 'border-zinc-700'
                  }`}
                />
              </div>
            )}

            {/* Nombre de tables (mode lot) */}
            {mode === 'bulk' && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                  Nombre de tables
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCount((c) => Math.max(2, c - 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-base cursor-pointer hover:bg-zinc-700 transition-colors"
                  >−</button>
                  <input
                    name="count"
                    type="number"
                    min="2"
                    max="50"
                    value={count}
                    onChange={(e) => setCount(Math.max(2, parseInt(e.target.value) || 2))}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setCount((c) => Math.min(50, c + 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-base cursor-pointer hover:bg-zinc-700 transition-colors"
                  >+</button>
                </div>
              </div>
            )}

            {/* Erreur */}
            {error && <p className="text-xs text-red-400">{error}</p>}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <IconPlus className="w-3.5 h-3.5" />
              {isPending
                ? 'Création…'
                : mode === 'bulk'
                ? `Créer ${count} tables`
                : 'Ajouter la table'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
