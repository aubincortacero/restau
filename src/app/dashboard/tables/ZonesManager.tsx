'use client'

import { useState, useTransition } from 'react'
import { type Floor } from './FloorPlan'

const ZONE_COLORS = [
  { value: '#ef4444', label: 'Rouge' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Jaune' },
  { value: '#22c55e', label: 'Vert' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#3b82f6', label: 'Bleu' },
  { value: '#a855f7', label: 'Violet' },
  { value: '#ec4899', label: 'Rose' },
]

type Zone = {
  id: string
  name: string
  color: string
  x: number
  y: number
  w: number
  h: number
}

interface ZonesManagerProps {
  floors: Floor[]
  restaurantId: string
  onFloorsChange: (floors: Floor[]) => void
  onSave: (floors: Floor[]) => Promise<void>
}

export default function ZonesManager({ floors, restaurantId, onFloorsChange, onSave }: ZonesManagerProps) {
  const [open, setOpen] = useState(false)
  const [activeFloorId, setActiveFloorId] = useState<number>(floors[0]?.id ?? 0)
  const [creating, setCreating] = useState(false)
  const [newZoneName, setNewZoneName] = useState('')
  const [newZoneColor, setNewZoneColor] = useState(ZONE_COLORS[0].value)
  const [editingZone, setEditingZone] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [, startTransition] = useTransition()

  const activeFloor = floors.find(f => f.id === activeFloorId) ?? floors[0]
  const zones = activeFloor?.zones ?? []

  function handleCreateZone() {
    if (!newZoneName.trim()) return
    
    const newZone: Zone = {
      id: `zone-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: newZoneName.trim(),
      color: newZoneColor,
      x: 50,
      y: 50,
      w: 300,
      h: 200,
    }

    const updatedFloors = floors.map(f => {
      if (f.id === activeFloorId) {
        return { ...f, zones: [...(f.zones ?? []), newZone] }
      }
      return f
    })

    onFloorsChange(updatedFloors)
    startTransition(async () => {
      await onSave(updatedFloors)
      setNewZoneName('')
      setNewZoneColor(ZONE_COLORS[0].value)
      setCreating(false)
    })
  }

  function handleRenameZone(zoneId: string) {
    if (!editingName.trim()) return

    const updatedFloors = floors.map(f => {
      if (f.id === activeFloorId) {
        return {
          ...f,
          zones: f.zones?.map(z => z.id === zoneId ? { ...z, name: editingName.trim() } : z) ?? []
        }
      }
      return f
    })

    onFloorsChange(updatedFloors)
    startTransition(async () => {
      await onSave(updatedFloors)
      setEditingZone(null)
      setEditingName('')
    })
  }

  function handleDeleteZone(zoneId: string) {
    const zone = zones.find(z => z.id === zoneId)
    if (!zone) return
    if (!confirm(`Supprimer la zone "${zone.name}" ? Les tables de cette zone ne seront pas supprimées.`)) return

    const updatedFloors = floors.map(f => {
      if (f.id === activeFloorId) {
        return { ...f, zones: f.zones?.filter(z => z.id !== zoneId) ?? [] }
      }
      return f
    })

    onFloorsChange(updatedFloors)
    startTransition(async () => {
      await onSave(updatedFloors)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
          </svg>
          Gérer les zones
        </span>
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="px-3 py-3 bg-zinc-900 border border-zinc-800 rounded-lg mb-2">
          {/* Sélecteur de niveau */}
          {floors.length > 1 && (
            <div className="mb-3">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-1 block">Niveau</label>
              <select
                value={activeFloorId}
                onChange={(e) => setActiveFloorId(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
              >
                {floors.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Liste des zones */}
          {zones.length > 0 && (
            <div className="mb-3 space-y-1">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-1">Zones existantes</p>
              {zones.map(zone => (
                <div key={zone.id} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: zone.color }} />
                  {editingZone === zone.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleRenameZone(zone.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameZone(zone.id)
                        if (e.key === 'Escape') { setEditingZone(null); setEditingName('') }
                      }}
                      autoFocus
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                  ) : (
                    <span className="flex-1 text-xs text-zinc-300">{zone.name}</span>
                  )}
                  <button
                    onClick={() => { setEditingZone(zone.id); setEditingName(zone.name) }}
                    className="shrink-0 p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
                    title="Renommer"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteZone(zone.id)}
                    className="shrink-0 p-1 text-zinc-600 hover:text-red-400 transition-colors"
                    title="Supprimer"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Formulaire de création */}
          {!creating ? (
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Créer une zone
            </button>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                placeholder="Nom de la zone (ex: Terrasse)"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateZone()
                  if (e.key === 'Escape') { setCreating(false); setNewZoneName('') }
                }}
              />
              <div className="flex gap-1.5 flex-wrap">
                {ZONE_COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setNewZoneColor(color.value)}
                    className={`w-5 h-5 rounded border-2 transition-all ${
                      newZoneColor === color.value ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setCreating(false); setNewZoneName(''); setNewZoneColor(ZONE_COLORS[0].value) }}
                  className="flex-1 px-3 py-1.5 text-xs text-zinc-500 hover:text-white border border-zinc-700 hover:border-zinc-600 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateZone}
                  disabled={!newZoneName.trim()}
                  className="flex-1 px-3 py-1.5 text-xs font-medium bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Créer
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
