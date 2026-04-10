'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import FloorPlan, { type Floor } from './FloorPlan'
import TableAddForm from './TableAddForm'
import QRExportButton from './QRExportButton'
import { deleteTableById } from '@/app/actions/restaurant'

export type FloorTable = {
  id: string
  number: number
  label: string | null
  pos_x: number
  pos_y: number
  floor: number
}

export default function TablesClientLayout({
  tables,
  floors,
  restaurantId,
  restaurantSlug,
  siteUrl,
}: {
  tables: FloorTable[]
  floors: Floor[]
  restaurantId: string
  restaurantSlug: string
  siteUrl: string
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [currentFloors, setCurrentFloors] = useState<Floor[]>(floors)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [activeTableIds, setActiveTableIds] = useState<Set<string>>(new Set())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function fetchActive() {
      try {
        const res = await fetch(`/api/orders/active-tables?restaurantId=${restaurantId}`)
        if (!res.ok) return
        const data = await res.json()
        setActiveTableIds(new Set(data.tableIds ?? []))
      } catch { /* silently ignore */ }
    }
    fetchActive()
    intervalRef.current = setInterval(fetchActive, 8000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [restaurantId])

  function handleDelete(e: React.MouseEvent, tableId: string) {
    e.stopPropagation()
    setDeletingId(tableId)
    startTransition(async () => {
      await deleteTableById(tableId, restaurantId)
      setDeletingId(null)
      if (selectedId === tableId) setSelectedId(null)
    })
  }

  const hasTables = tables.length > 0

  // Group tables by floor name
  const floorMap = new Map(floors.map((f) => [f.id, f.name]))
  const grouped = floors
    .map((f) => ({
      floor: f,
      tables: tables.filter((t) => t.floor === f.id).sort((a, b) => a.number - b.number),
    }))
    .filter((g) => g.tables.length > 0)
  // Tables with unknown floor
  const unknownFloor = tables.filter((t) => !floorMap.has(t.floor))
  if (unknownFloor.length > 0) {
    grouped.push({ floor: { id: -1, name: 'Autre', walls: [], zones: [] }, tables: unknownFloor })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold flex-1">Plan de salle</h1>
        {hasTables && (
          <QRExportButton
            tables={tables.map((t) => ({ id: t.id, number: t.number, label: t.label }))}
            siteUrl={siteUrl}
            restaurantSlug={restaurantSlug}
          />
        )}
      </div>

      <div className="flex gap-6 items-start">
        {/* ── Colonne gauche : liste des tables ── */}
        <div className="w-48 shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 px-3 mb-2">
            Tables
          </p>

          {!hasTables ? (
            <p className="text-xs text-zinc-600 px-3 py-2">Aucune table</p>
          ) : (
            <ul className="space-y-0.5 mb-2">
              {grouped.map(({ floor, tables: floorTables }) => (
                <li key={floor.id}>
                  {floors.length > 1 && (
                    <p className="text-[10px] text-zinc-600 px-3 pt-2 pb-1 font-medium uppercase tracking-wider">
                      {floor.name}
                    </p>
                  )}
                  <ul className="space-y-0.5">
                    {floorTables.map((table) => {
                      const isActive = table.id === selectedId
                      const isDeleting = deletingId === table.id
                      const hasOrder = activeTableIds.has(table.id)
                      return (
                        <li key={table.id} className="group">
                          <button
                            onClick={() => setSelectedId(isActive ? null : table.id)}
                            disabled={isDeleting}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                              isActive
                                ? 'bg-white/8 text-white font-medium'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                            } ${isDeleting ? 'opacity-40' : ''}`}
                          >
                            <span className={`text-base font-black tabular-nums leading-none w-6 text-center shrink-0 ${isActive ? 'text-orange-400' : ''}`}>
                              {table.number}
                            </span>
                            <span className="truncate flex-1 text-xs">
                              {isDeleting ? <span className="text-red-400 italic">Suppression…</span> : (table.label ?? `Table ${table.number}`)}
                            </span>
                            {hasOrder && (
                              <span className="shrink-0 relative flex h-2 w-2 mr-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                              </span>
                            )}
                            <span
                              role="button"
                              onClick={(e) => handleDelete(e, table.id)}
                              className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-zinc-700 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                              title="Supprimer"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}

          {/* Ajouter une table */}
          <TableAddForm
            restaurantId={restaurantId}
            floors={currentFloors}
            defaultOpen={!hasTables}
          />
        </div>

        {/* ── Colonne droite ── */}
        <div className="flex-1 min-w-0 bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
          {hasTables ? (
            /* Plan de salle — cliquer une table dans la liste la centre ici */
            <FloorPlan
              initialTables={tables}
              initialFloors={floors}
              restaurantId={restaurantId}
              restaurantSlug={restaurantSlug}
              siteUrl={siteUrl}
              centerOnTableId={selectedId}
              onFloorsChange={setCurrentFloors}
            />
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              </div>
              <p className="text-sm font-medium text-zinc-400">Aucune table</p>
              <p className="text-xs text-zinc-600 mt-1">Ajoutez votre première table dans la colonne de gauche</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
