'use client'

import { useState, useTransition } from 'react'
import { applyGeneratedPlan } from '@/app/actions/restaurant'

// ─── Constantes grille ────────────────────────────────────────
const COLS = 4
const ROWS = 3
const TOTAL_CELLS = COLS * ROWS

const ZONE_COLORS = [
  { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-300', dot: 'bg-blue-400', active: 'bg-blue-500/30' },
  { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-300', dot: 'bg-emerald-400', active: 'bg-emerald-500/30' },
  { bg: 'bg-violet-500/20', border: 'border-violet-500/50', text: 'text-violet-300', dot: 'bg-violet-400', active: 'bg-violet-500/30' },
  { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-300', dot: 'bg-amber-400', active: 'bg-amber-500/30' },
  { bg: 'bg-rose-500/20', border: 'border-rose-500/50', text: 'text-rose-300', dot: 'bg-rose-400', active: 'bg-rose-500/30' },
  { bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', text: 'text-cyan-300', dot: 'bg-cyan-400', active: 'bg-cyan-500/30' },
  { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-300', dot: 'bg-orange-400', active: 'bg-orange-500/30' },
  { bg: 'bg-pink-500/20', border: 'border-pink-500/50', text: 'text-pink-300', dot: 'bg-pink-400', active: 'bg-pink-500/30' },
]

const LAYOUT_OPTIONS = [
  { value: 'grid', label: 'Grille', desc: '⬛ Tables en rangées régulières' },
  { value: 'row', label: 'Ligne', desc: '➡️ Tables sur une seule rangée' },
  { value: 'L', label: 'En L', desc: '⌐ Disposées en L' },
  { value: 'U', label: 'En U', desc: '⊓ Disposées en U' },
]

type Zone = {
  id: string
  name: string
  tableCount: number
  cells: number[]
  layout: 'grid' | 'row' | 'L' | 'U'
  colorIdx: number
}

type GeneratedPlan = {
  tables: Array<{ number: number; label: string; pos_x: number; pos_y: number }>
  walls: Array<{ id: string; x: number; y: number; w: number; h: number }>
}

export default function FloorPlanGenerator({
  restaurantId,
  hasExistingTables,
  onClose,
}: {
  restaurantId: string
  hasExistingTables: boolean
  onClose: () => void
}) {
  const [zones, setZones] = useState<Zone[]>([
    { id: 'z1', name: 'Salle', tableCount: 10, cells: [0, 1, 4, 5], layout: 'grid', colorIdx: 0 },
  ])
  const [activeZoneId, setActiveZoneId] = useState<string>('z1')
  const [isPainting, setIsPainting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [replaceExisting, setReplaceExisting] = useState(true)
  const [isApplying, startApplyTransition] = useTransition()

  // ─── Grille ───────────────────────────────────────────────
  function cellZone(cellIdx: number): Zone | null {
    return zones.find((z) => z.cells.includes(cellIdx)) ?? null
  }

  function handleCellInteract(cellIdx: number) {
    const existing = cellZone(cellIdx)
    const activeZone = zones.find((z) => z.id === activeZoneId)
    if (!activeZone) return

    if (existing?.id === activeZoneId) {
      // Dépeindre
      setZones((prev) =>
        prev.map((z) => z.id === activeZoneId ? { ...z, cells: z.cells.filter((c) => c !== cellIdx) } : z)
      )
    } else {
      // Retirer de l'ancienne zone éventuelle + assigner à la zone active
      setZones((prev) =>
        prev.map((z) => {
          if (z.id === activeZoneId) return { ...z, cells: [...z.cells, cellIdx] }
          return { ...z, cells: z.cells.filter((c) => c !== cellIdx) }
        })
      )
    }
  }

  // ─── Zones ────────────────────────────────────────────────
  function addZone() {
    if (zones.length >= 8) return
    const id = `z${Date.now()}`
    const colorIdx = zones.length % ZONE_COLORS.length
    const newZone: Zone = { id, name: '', tableCount: 5, cells: [], layout: 'grid', colorIdx }
    setZones((prev) => [...prev, newZone])
    setActiveZoneId(id)
  }

  function removeZone(id: string) {
    setZones((prev) => prev.filter((z) => z.id !== id))
    setActiveZoneId((prev) => (prev === id ? zones.find((z) => z.id !== id)?.id ?? '' : prev))
  }

  function updateZone(id: string, patch: Partial<Zone>) {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...patch } : z)))
  }

  // ─── Validation ───────────────────────────────────────────
  const validationError = (() => {
    if (zones.length === 0) return 'Ajoutez au moins une zone.'
    for (const z of zones) {
      if (!z.name.trim()) return 'Toutes les zones doivent avoir un nom.'
      if (z.cells.length === 0) return `La zone "${z.name || '?'}" n'a aucune cellule sélectionnée.`
      if (z.tableCount < 1) return `La zone "${z.name}" doit avoir au moins 1 table.`
    }
    return null
  })()

  // ─── Génération ───────────────────────────────────────────
  async function handleGenerate() {
    if (validationError) return
    setGenerating(true)
    setError(null)
    setGeneratedPlan(null)
    try {
      const res = await fetch('/api/floor-plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          zones: zones.map((z) => ({
            id: z.id,
            name: z.name.trim(),
            tableCount: z.tableCount,
            cells: z.cells,
            layout: z.layout,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur IA'); return }
      setGeneratedPlan(data)
    } catch {
      setError('Erreur de connexion')
    } finally {
      setGenerating(false)
    }
  }

  // ─── Application ──────────────────────────────────────────
  function handleApply() {
    if (!generatedPlan) return
    startApplyTransition(async () => {
      const result = await applyGeneratedPlan(
        restaurantId,
        generatedPlan.tables,
        generatedPlan.walls,
        replaceExisting,
      )
      if (result?.error) { setError(result.error); return }
      onClose()
    })
  }

  const activeZone = zones.find((z) => z.id === activeZoneId)

  return (
    <div className="flex flex-col gap-5">

      {/* ── Zones ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest">Zones</p>
          <button
            type="button"
            onClick={addZone}
            disabled={zones.length >= 8}
            className="text-xs text-orange-400 hover:text-orange-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            + Ajouter une zone
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {zones.map((zone) => {
            const color = ZONE_COLORS[zone.colorIdx]
            const isActive = zone.id === activeZoneId
            return (
              <div
                key={zone.id}
                onClick={() => setActiveZoneId(zone.id)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                  isActive ? `${color.active} ${color.border}` : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color.dot}`} />
                <input
                  value={zone.name}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => updateZone(zone.id, { name: e.target.value })}
                  placeholder="Nom de la zone"
                  className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none min-w-0"
                />
                {/* Layout */}
                <select
                  value={zone.layout}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => updateZone(zone.id, { layout: e.target.value as Zone['layout'] })}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 px-2 py-1 focus:outline-none cursor-pointer"
                >
                  {LAYOUT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {/* Compteur tables */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); updateZone(zone.id, { tableCount: Math.max(1, zone.tableCount - 1) }) }}
                    className="w-5 h-5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs flex items-center justify-center cursor-pointer"
                  >−</button>
                  <span className={`text-sm font-semibold tabular-nums w-7 text-center ${color.text}`}>
                    {zone.tableCount}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); updateZone(zone.id, { tableCount: Math.min(50, zone.tableCount + 1) }) }}
                    className="w-5 h-5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs flex items-center justify-center cursor-pointer"
                  >+</button>
                </div>
                {zones.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeZone(zone.id) }}
                    className="text-zinc-600 hover:text-red-400 transition-colors cursor-pointer shrink-0 ml-0.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Grille 4×3 ────────────────────────────────────── */}
      <div>
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-2">
          Disposition
          {activeZone && (
            <span className={`ml-2 normal-case font-normal ${ZONE_COLORS[activeZone.colorIdx].text}`}>
              — peindre : {activeZone.name || 'zone sans nom'}
            </span>
          )}
        </p>
        <div
          className="grid gap-1 select-none"
          style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
          onMouseLeave={() => setIsPainting(false)}
        >
          {Array.from({ length: TOTAL_CELLS }, (_, idx) => {
            const zone = cellZone(idx)
            const color = zone ? ZONE_COLORS[zone.colorIdx] : null
            return (
              <div
                key={idx}
                className={`aspect-[5/4] rounded-lg border-2 cursor-pointer transition-all flex items-end justify-center pb-1 ${
                  zone
                    ? `${color!.bg} ${color!.border}`
                    : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800'
                }`}
                onMouseDown={() => { setIsPainting(true); handleCellInteract(idx) }}
                onMouseEnter={() => { if (isPainting) handleCellInteract(idx) }}
                onMouseUp={() => setIsPainting(false)}
              >
                {zone && (
                  <span className={`text-[10px] font-medium truncate px-1 ${color!.text}`}>
                    {zone.name || '?'}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-xs text-zinc-600 mt-1.5">
          Cliquez / glissez pour assigner des cellules à la zone active.
        </p>
      </div>

      {/* ── Résumé ────────────────────────────────────────── */}
      {zones.some((z) => z.cells.length > 0 && z.name.trim()) && (
        <div className="flex flex-wrap gap-2">
          {zones.filter((z) => z.cells.length > 0 && z.name.trim()).map((zone) => {
            const color = ZONE_COLORS[zone.colorIdx]
            return (
              <span key={zone.id} className={`text-xs px-2.5 py-1 rounded-full border ${color.bg} ${color.border} ${color.text}`}>
                {zone.name} · {zone.tableCount} tables · {zone.cells.length} cellule{zone.cells.length > 1 ? 's' : ''}
              </span>
            )
          })}
        </div>
      )}

      {/* ── Erreur validation ─────────────────────────────── */}
      {validationError && (
        <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          {validationError}
        </p>
      )}

      {/* ── Plan généré — aperçu ───────────────────────────── */}
      {generatedPlan && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-3">
          <p className="text-xs font-medium text-zinc-300 mb-2">Plan généré</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {zones.map((zone) => {
              const count = generatedPlan.tables.filter((t) => t.label === zone.name).length
              const color = ZONE_COLORS[zone.colorIdx]
              return (
                <span key={zone.id} className={`text-xs px-2.5 py-1 rounded-full border ${color.bg} ${color.border} ${color.text}`}>
                  {zone.name} : {count} table{count > 1 ? 's' : ''}
                </span>
              )
            })}
          </div>
          <p className="text-xs text-zinc-500">{generatedPlan.tables.length} tables · {generatedPlan.walls.length} zones délimitées</p>
        </div>
      )}

      {/* ── Erreur IA ─────────────────────────────────────── */}
      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* ── Actions ───────────────────────────────────────── */}
      <div className="flex flex-col gap-2 pt-1">
        {!generatedPlan ? (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !!validationError}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            {generating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Génération en cours…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
                Générer le plan avec l'IA
              </>
            )}
          </button>
        ) : (
          <>
            {hasExistingTables && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="accent-orange-500"
                />
                <span className="text-xs text-zinc-400">Remplacer les tables existantes</span>
              </label>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGeneratedPlan(null)}
                className="flex-1 text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-600 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Régénérer
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={isApplying}
                className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                {isApplying ? 'Application…' : 'Appliquer au plan'}
              </button>
            </div>
          </>
        )}
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer text-center"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
