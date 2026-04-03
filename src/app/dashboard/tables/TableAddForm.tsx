'use client'

import { useTransition, useState, useId } from 'react'
import { createTable, bulkCreateTables } from '@/app/actions/restaurant'
import { IconPlus } from '@/components/icons'

export default function TableAddForm({
  restaurantId,
  existingZones,
}: {
  restaurantId: string
  existingZones: string[]
}) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single')
  const [zone, setZone] = useState('')
  const [count, setCount] = useState(2)
  const [isPending, startTransition] = useTransition()
  const listId = useId()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      if (mode === 'single') {
        await createTable(fd)
      } else {
        await bulkCreateTables(fd)
      }
      setZone('')
      setCount(2)
    })
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
      {/* Header + toggle mode */}
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-widest flex-1">
          Ajouter des tables
        </h2>
        <div className="flex bg-zinc-800 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`text-xs px-3 py-1 rounded-md transition-colors cursor-pointer ${
              mode === 'single' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            1 table
          </button>
          <button
            type="button"
            onClick={() => setMode('bulk')}
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
    </div>
  )
}
