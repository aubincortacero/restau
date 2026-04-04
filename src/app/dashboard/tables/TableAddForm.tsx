'use client'

import { useTransition, useState, useId } from 'react'
import { createTable, bulkCreateTables } from '@/app/actions/restaurant'
import { IconPlus } from '@/components/icons'

export default function TableAddForm({
  restaurantId,
  existingZones,
  floors,
  defaultOpen = true,
}: {
  restaurantId: string
  existingZones: string[]
  floors: { id: number; name: string }[]
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
  const listId = useId()

  function floorIcon(idx: number) {
    if (idx === 0) return '🟫'
    if (floors.length >= 3 && idx === floors.length - 1) return '🏠'
    return '🏢'
  }

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
      {/* Toggle */}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
        >
          <IconPlus className="w-3 h-3" />
          Ajouter des tables
        </button>
      ) : (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      {/* Header + toggle mode */}
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-widest flex-1">
          Ajouter des tables
        </h2>
        <div className="flex bg-zinc-800 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => { setMode('single'); setError(null) }}
            className={`text-xs px-3 py-1 rounded-md transition-colors cursor-pointer ${
              mode === 'single' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            1 table
          </button>
          <button
            type="button"
            onClick={() => { setMode('bulk'); setError(null) }}
            className={`text-xs px-3 py-1 rounded-md transition-colors cursor-pointer ${
              mode === 'bulk' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Lot
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 flex-wrap items-center">
        <input type="hidden" name="restaurant_id" value={restaurantId} />

        {/* Sélecteur de niveau (si plusieurs niveaux) */}
        {floors.length > 1 ? (
          <select
            name="floor"
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(parseInt(e.target.value))}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 shrink-0"
          >
            {floors.map((f, i) => (
              <option key={f.id} value={f.id}>{floorIcon(i)} {f.name}</option>
            ))}
          </select>
        ) : (
          <input type="hidden" name="floor" value={floors[0]?.id ?? 0} />
        )}

        {/* Numéro (mode single uniquement) */}
        {mode === 'single' && (
          <input
            name="number"
            type="number"
            min="1"
            value={number}
            onChange={(e) => { setNumber(e.target.value); setError(null) }}
            placeholder="N° (auto)"
            className={`w-24 bg-zinc-800 border rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 shrink-0 ${
              error ? 'border-red-500/60' : 'border-zinc-700'
            }`}
          />
        )}

        {/* Zone — combobox libre avec suggestions */}
        <div className="relative flex-1 min-w-40">
          <input
            name="zone"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            list={listId}
            placeholder="Zone (ex: Terrasse, Salle, Bar…)"
            autoComplete="off"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
          />
          <datalist id={listId}>
            {existingZones.map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
        </div>

        {/* Nombre de tables (mode lot uniquement) */}
        {mode === 'bulk' && (
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              name="count"
              type="number"
              min="2"
              max="50"
              value={count}
              onChange={(e) => setCount(Math.max(2, parseInt(e.target.value) || 2))}
              className="w-16 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
            />
            <span className="text-xs text-zinc-500">tables</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer shrink-0"
        >
          <IconPlus className="w-3.5 h-3.5" />
          {isPending
            ? 'Ajout…'
            : mode === 'bulk'
            ? `Créer ${count} tables`
            : 'Ajouter'}
        </button>
      </form>

      {/* Erreur */}
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

      {/* Zones existantes : badges cliquables */}
      {existingZones.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {existingZones.map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setZone(z)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                zone === z
                  ? 'border-orange-500/50 bg-orange-500/12 text-orange-300'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
              }`}
            >
              {z}
            </button>
          ))}
        </div>
      )}

      {/* Réduire */}
      <div className="flex justify-end mt-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
        >
          Réduire ↑
        </button>
      </div>
    </div>
    )}
    </div>
  )
}
