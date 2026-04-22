'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import QRCode from 'qrcode'
import { saveFloorPlan, deleteTableById, updateTable } from '@/app/actions/restaurant'

const CW = 2000       // canvas logical width
const CH = 1200       // canvas logical height
const TW = 76         // table width (logical px)
const TH = 60         // table height (logical px)
const MIN_W = 24
const MIN_H = 24
const SCALE_MIN = 0.12
const SCALE_MAX = 3
const CANVAS_H = 640  // outer container height in screen px

type View = { scale: number; x: number; y: number }

export type FloorTable = {
  id: string
  number: number
  label: string | null
  pos_x: number
  pos_y: number
  floor: number
}

export type Wall = {
  id: string
  x: number
  y: number
  w: number
  h: number
}

export type Zone = {
  id: string
  name: string
  color: string
  x: number
  y: number
  w: number
  h: number
}

export type Floor = {
  id: number
  name: string
  walls: Wall[]
  zones: Zone[]
}

const ZONE_COLORS = [
  { label: 'Orange',    color: '#F07A4F' },
  { label: 'Bleu',      color: '#3b82f6' },
  { label: 'Vert',      color: '#22c55e' },
  { label: 'Violet',    color: '#a855f7' },
  { label: 'Rose',      color: '#ec4899' },
  { label: 'Jaune',     color: '#eab308' },
  { label: 'Turquoise', color: '#14b8a6' },
  { label: 'Rouge',     color: '#ef4444' },
] as const

type DragState = {
  kind: 'table' | 'wall' | 'zone' | 'resize' | 'zone-resize'
  id: string
  offsetX: number
  offsetY: number
} | null

export default function FloorPlan({
  initialTables,
  initialFloors,
  restaurantId,
  restaurantSlug,
  siteUrl,
  centerOnTableId,
  onFloorsChange,
}: {
  initialTables: FloorTable[]
  initialFloors: Floor[]
  restaurantId: string
  restaurantSlug: string
  siteUrl: string
  centerOnTableId?: string | null
  onFloorsChange?: (floors: Floor[]) => void
}) {
  const seedFloors = initialFloors.length > 0
    ? initialFloors.map((f) => ({ ...f, zones: f.zones ?? [] }))
    : [{ id: 0, name: 'RDC', walls: [], zones: [] }]

  const [tables, setTables] = useState<FloorTable[]>(initialTables)
  const [floors, setFloors] = useState<Floor[]>(seedFloors)
  const [activeFloor, setActiveFloorState] = useState<number>(seedFloors[0].id)
  const [drag, setDrag] = useState<DragState>(null)
  const [view, setView] = useState<View>({ scale: 0.6, x: 40, y: 40 })
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set())
  const [qrTable, setQrTable] = useState<FloorTable | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [flashId, setFlashId] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<number | null>(null)
  const [renamingValue, setRenamingValue] = useState('')
  const [addingZone, setAddingZone] = useState(false)
  const [newZoneName, setNewZoneName] = useState('')
  const [newZoneColor, setNewZoneColor] = useState<string>(ZONE_COLORS[0].color)
  const [renamingZone, setRenamingZone] = useState<string | null>(null)
  const [renamingZoneValue, setRenamingZoneValue] = useState('')

  const dragRef = useRef<DragState>(null)
  const viewRef = useRef<View>({ scale: 0.6, x: 40, y: 40 })
  const containerRef = useRef<HTMLDivElement>(null)
  const spacePanRef = useRef(false)
  const panOriginRef = useRef<{ sx: number; sy: number; vx: number; vy: number } | null>(null)
  const startScreenRef = useRef({ x: 0, y: 0 })
  const hasMoved = useRef(false)
  const pendingClickRef = useRef<FloorTable | null>(null)
  const pointerScreenRef = useRef({ x: 0, y: 0 })
  const edgePanFrameRef = useRef<number | null>(null)
  const tablesRef = useRef<FloorTable[]>(initialTables)
  const activeFloorRef = useRef<number>(seedFloors[0].id)
  // wallsRef tracks the current floor's walls for use inside closures
  const wallsRef = useRef<Wall[]>(seedFloors[0]?.walls ?? [])
  // zonesRef tracks the current floor's zones for use inside closures
  const zonesRef = useRef<Zone[]>(seedFloors[0]?.zones ?? [])

  // Derived: walls for the active floor
  const walls = floors.find((f) => f.id === activeFloor)?.walls ?? []
  // Derived: zones for the active floor
  const zones = floors.find((f) => f.id === activeFloor)?.zones ?? []

  // Keep mutable refs in sync
  useEffect(() => { tablesRef.current = tables }, [tables])
  useEffect(() => { wallsRef.current = walls }, [walls])
  useEffect(() => { zonesRef.current = zones }, [zones])

  function switchFloor(id: number) {
    activeFloorRef.current = id
    setActiveFloorState(id)
  }

  // setWalls updates the current floor's walls inside the floors array
  function setWalls(updater: Wall[] | ((prev: Wall[]) => Wall[])) {
    const fid = activeFloorRef.current
    setFloors((prev) =>
      prev.map((f) =>
        f.id !== fid ? f : {
          ...f,
          walls: typeof updater === 'function' ? updater(f.walls) : updater,
        },
      ),
    )
  }

  // setZones updates the current floor's zones inside the floors array
  function setZones(updater: Zone[] | ((prev: Zone[]) => Zone[])) {
    const fid = activeFloorRef.current
    setFloors((prev) =>
      prev.map((f) =>
        f.id !== fid ? f : {
          ...f,
          zones: typeof updater === 'function' ? updater(f.zones ?? []) : updater,
        },
      ),
    )
  }

  // Detect newly added tables from RSC refresh
  useEffect(() => {
    const currentIds = new Set(tablesRef.current.map((t) => t.id))
    const newTables = initialTables.filter((t) => !currentIds.has(t.id))
    if (newTables.length === 0) return

    setTables((prev) => [...prev, ...newTables])

    const target = newTables[0]
    // Switch to the new table's floor if needed
    if (target.floor !== activeFloorRef.current) switchFloor(target.floor)

    const el = containerRef.current
    if (el) {
      const { scale } = viewRef.current
      const x = el.clientWidth / 2 - (target.pos_x + TW / 2) * scale
      const y = el.clientHeight / 2 - (target.pos_y + TH / 2) * scale
      applyView({ ...viewRef.current, x, y })
    }
    setFlashId(target.id)
    setTimeout(() => setFlashId(null), 1500)
  }, [initialTables]) // eslint-disable-line react-hooks/exhaustive-deps

  // Centre la vue sur la table demandée depuis la sidebar
  useEffect(() => {
    if (!centerOnTableId) return
    const target = tablesRef.current.find((t) => t.id === centerOnTableId)
    if (!target) return
    if (target.floor !== activeFloorRef.current) switchFloor(target.floor)
    const el = containerRef.current
    if (el) {
      const { scale } = viewRef.current
      const x = el.clientWidth / 2 - (target.pos_x + TW / 2) * scale
      const y = el.clientHeight / 2 - (target.pos_y + TH / 2) * scale
      applyView({ ...viewRef.current, x, y })
    }
    setFlashId(centerOnTableId)
    setTimeout(() => setFlashId(null), 1500)
  }, [centerOnTableId]) // eslint-disable-line react-hooks/exhaustive-deps

  function applyView(next: View) {
    viewRef.current = next
    setView({ ...next })
  }

  function screenToCanvas(sx: number, sy: number) {
    const rect = containerRef.current!.getBoundingClientRect()
    const { scale, x, y } = viewRef.current
    return { x: (sx - rect.left - x) / scale, y: (sy - rect.top - y) / scale }
  }

  function fitToContent() {
    const el = containerRef.current
    if (!el) return
    const cw = el.clientWidth
    const ch = el.clientHeight
    const currentFloorId = activeFloorRef.current
    const items = [
      ...tablesRef.current
        .filter((t) => t.floor === currentFloorId)
        .map((t) => ({ x: t.pos_x, y: t.pos_y, w: TW, h: TH })),
      ...wallsRef.current.map((w) => ({ x: w.x, y: w.y, w: w.w, h: w.h })),
      ...zonesRef.current.map((z) => ({ x: z.x, y: z.y, w: z.w, h: z.h })),
    ]
    if (items.length === 0) { applyView({ scale: 0.6, x: 40, y: 40 }); return }
    const minX = Math.min(...items.map((i) => i.x))
    const maxX = Math.max(...items.map((i) => i.x + i.w))
    const minY = Math.min(...items.map((i) => i.y))
    const maxY = Math.max(...items.map((i) => i.y + i.h))
    const pad = 80
    const contentW = maxX - minX + pad * 2
    const contentH = maxY - minY + pad * 2
    const scale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.min(cw / contentW, ch / contentH) * 0.9))
    const x = (cw - contentW * scale) / 2 - minX * scale + pad * scale
    const y = (ch - contentH * scale) / 2 - minY * scale + pad * scale
    applyView({ scale, x, y })
  }

  useLayoutEffect(() => { fitToContent() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Notify parent when floors (zones/walls) change
  useEffect(() => { onFloorsChange?.(floors) }, [floors, onFloorsChange])

  // Wheel: Ctrl/Cmd = zoom toward cursor, else = pan
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const { scale, x, y } = viewRef.current
      if (e.ctrlKey || e.metaKey) {
        const rect = el!.getBoundingClientRect()
        const px = e.clientX - rect.left
        const py = e.clientY - rect.top
        const factor = 1 - e.deltaY * 0.004
        const newScale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, scale * factor))
        const r = newScale / scale
        applyView({ scale: newScale, x: px - r * (px - x), y: py - r * (py - y) })
      } else {
        applyView({ scale, x: x - e.deltaX * 0.8, y: y - e.deltaY * 0.8 })
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Space bar pan mode
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space' && !e.repeat && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        spacePanRef.current = true
        if (containerRef.current) containerRef.current.style.cursor = 'grab'
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') {
        spacePanRef.current = false
        panOriginRef.current = null
        if (containerRef.current) containerRef.current.style.cursor = ''
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp) }
  }, [])

  // Poll active tables
  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch(`/api/orders/active-tables?restaurantId=${restaurantId}`)
        if (res.ok) { const { tableIds } = await res.json(); setActiveIds(new Set(tableIds)) }
      } catch { /* silent */ }
    }
    poll()
    const iv = setInterval(poll, 8000)
    return () => clearInterval(iv)
  }, [restaurantId])

  // Edge auto-pan while dragging
  useEffect(() => {
    if (!drag) {
      if (edgePanFrameRef.current) { cancelAnimationFrame(edgePanFrameRef.current); edgePanFrameRef.current = null }
      return
    }
    const EDGE = 64, SPEED = 7
    function loop() {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const { x: px, y: py } = pointerScreenRef.current
      let dx = 0, dy = 0
      if (px - rect.left < EDGE) dx = -SPEED * (1 - (px - rect.left) / EDGE)
      if (rect.right - px < EDGE) dx = SPEED * (1 - (rect.right - px) / EDGE)
      if (py - rect.top < EDGE) dy = -SPEED * (1 - (py - rect.top) / EDGE)
      if (rect.bottom - py < EDGE) dy = SPEED * (1 - (rect.bottom - py) / EDGE)
      if (dx !== 0 || dy !== 0) applyView({ ...viewRef.current, x: viewRef.current.x - dx, y: viewRef.current.y - dy })
      edgePanFrameRef.current = requestAnimationFrame(loop)
    }
    edgePanFrameRef.current = requestAnimationFrame(loop)
    return () => { if (edgePanFrameRef.current) { cancelAnimationFrame(edgePanFrameRef.current); edgePanFrameRef.current = null } }
  }, [drag])

  // Global pointer listeners during element drag
  useEffect(() => {
    if (!drag) return
    dragRef.current = drag

    function onMove(e: PointerEvent) {
      pointerScreenRef.current = { x: e.clientX, y: e.clientY }
      const d = dragRef.current
      if (!d) return
      if (
        Math.abs(e.clientX - startScreenRef.current.x) > 4 ||
        Math.abs(e.clientY - startScreenRef.current.y) > 4
      ) hasMoved.current = true

      const cp = screenToCanvas(e.clientX, e.clientY)
      if (d.kind === 'table') {
        setTables((prev) => prev.map((t) => t.id !== d.id ? t : {
          ...t,
          pos_x: Math.round(Math.max(0, Math.min(CW - TW, cp.x - d.offsetX))),
          pos_y: Math.round(Math.max(0, Math.min(CH - TH, cp.y - d.offsetY))),
        }))
      } else if (d.kind === 'wall') {
        setWalls((prev) => prev.map((w) => w.id !== d.id ? w : {
          ...w,
          x: Math.round(Math.max(0, Math.min(CW - w.w, cp.x - d.offsetX))),
          y: Math.round(Math.max(0, Math.min(CH - w.h, cp.y - d.offsetY))),
        }))
      } else if (d.kind === 'resize') {
        setWalls((prev) => prev.map((w) => w.id !== d.id ? w : {
          ...w,
          w: Math.round(Math.max(MIN_W, Math.min(CW - w.x, cp.x - w.x))),
          h: Math.round(Math.max(MIN_H, Math.min(CH - w.y, cp.y - w.y))),
        }))
      } else if (d.kind === 'zone') {
        setZones((prev) => prev.map((z) => z.id !== d.id ? z : {
          ...z,
          x: Math.round(Math.max(0, Math.min(CW - z.w, cp.x - d.offsetX))),
          y: Math.round(Math.max(0, Math.min(CH - z.h, cp.y - d.offsetY))),
        }))
      } else if (d.kind === 'zone-resize') {
        setZones((prev) => prev.map((z) => z.id !== d.id ? z : {
          ...z,
          w: Math.round(Math.max(100, Math.min(CW - z.x, cp.x - z.x))),
          h: Math.round(Math.max(60, Math.min(CH - z.y, cp.y - z.y))),
        }))
      }
    }

    function onUp() {
      dragRef.current = null
      setDrag(null)
      if (!hasMoved.current && pendingClickRef.current) setQrTable(pendingClickRef.current)
      pendingClickRef.current = null
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
  }, [drag])

  function startDrag(
    e: React.PointerEvent,
    kind: 'table' | 'wall' | 'zone' | 'resize' | 'zone-resize',
    id: string,
    elemX: number,
    elemY: number,
    clickTarget?: FloorTable,
  ) {
    if (spacePanRef.current) return
    e.preventDefault()
    e.stopPropagation()
    startScreenRef.current = { x: e.clientX, y: e.clientY }
    pointerScreenRef.current = { x: e.clientX, y: e.clientY }
    hasMoved.current = false
    pendingClickRef.current = clickTarget ?? null
    if (kind === 'resize') {
      setDrag({ kind, id, offsetX: 0, offsetY: 0 })
    } else {
      const cp = screenToCanvas(e.clientX, e.clientY)
      setDrag({ kind, id, offsetX: cp.x - elemX, offsetY: cp.y - elemY })
    }
  }

  function onContainerPointerDown(e: React.PointerEvent) {
    if (!spacePanRef.current && e.button !== 1) return
    e.preventDefault()
    panOriginRef.current = { sx: e.clientX, sy: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y }
    containerRef.current?.setPointerCapture(e.pointerId)
    if (containerRef.current) containerRef.current.style.cursor = 'grabbing'
  }
  function onContainerPointerMove(e: React.PointerEvent) {
    if (!panOriginRef.current) return
    const dx = e.clientX - panOriginRef.current.sx
    const dy = e.clientY - panOriginRef.current.sy
    applyView({ ...viewRef.current, x: panOriginRef.current.vx + dx, y: panOriginRef.current.vy + dy })
  }
  function onContainerPointerUp() {
    if (!panOriginRef.current) return
    panOriginRef.current = null
    if (containerRef.current) containerRef.current.style.cursor = spacePanRef.current ? 'grab' : ''
  }

  function addWall() {
    const el = containerRef.current
    const { scale, x, y } = viewRef.current
    const cx = el ? (el.clientWidth / 2 - x) / scale - 90 : CW / 2 - 90
    const cy = el ? (CANVAS_H / 2 - y) / scale - 28 : CH / 2 - 28
    setWalls((prev) => [...prev, { id: crypto.randomUUID(), x: Math.round(cx), y: Math.round(cy), w: 180, h: 56 }])
  }

  function addFloor() {
    const nextId = floors.length === 0 ? 0 : Math.max(...floors.map((f) => f.id)) + 1
    const name = nextId === 0 ? 'RDC' : `Étage ${nextId}`
    setFloors((prev) => [...prev, { id: nextId, name, walls: [], zones: [] }])
    switchFloor(nextId)
  }

  function commitRename(floorId: number) {
    const name = renamingValue.trim()
    if (name) setFloors((prev) => prev.map((f) => f.id !== floorId ? f : { ...f, name }))
    setRenaming(null)
  }

  function createZone() {
    if (!newZoneName.trim()) return
    const el = containerRef.current
    const { scale, x, y } = viewRef.current
    const cx = el ? (el.clientWidth / 2 - x) / scale - 150 : CW / 2 - 150
    const cy = el ? (CANVAS_H / 2 - y) / scale - 100 : CH / 2 - 100
    setZones((prev) => [...prev, {
      id: crypto.randomUUID(),
      name: newZoneName.trim(),
      color: newZoneColor,
      x: Math.round(Math.max(0, cx)),
      y: Math.round(Math.max(0, cy)),
      w: 300,
      h: 200,
    }])
    setNewZoneName('')
    setAddingZone(false)
  }

  function commitZoneRename(zoneId: string) {
    const name = renamingZoneValue.trim()
    if (name) setZones((prev) => prev.map((z) => z.id !== zoneId ? z : { ...z, name }))
    setRenamingZone(null)
  }

  function floorIcon(idx: number) {
    if (idx === 0) return '🟫'
    if (floors.length >= 3 && idx === floors.length - 1) return '🏠'
    return '🏢'
  }

  async function handleSave() {
    setSaving(true)
    try {
      await saveFloorPlan(
        restaurantId,
        tables.map((t) => ({ id: t.id, pos_x: t.pos_x, pos_y: t.pos_y })),
        floors.map((f) => ({ id: f.id, name: f.name, walls: f.walls, zones: f.zones ?? [] })),
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTable(id: string) {
    await deleteTableById(id, restaurantId)
    setTables((prev) => prev.filter((t) => t.id !== id))
    setQrTable(null)
  }

  async function handleUpdateTable(id: string, data: { number: number; label: string | null }) {
    await updateTable(id, restaurantId, data)
    setTables((prev) => prev.map((t) => t.id === id ? { ...t, ...data } : t))
    setQrTable((prev) => prev?.id === id ? { ...prev, ...data } : prev)
  }

  const scalePct = Math.round(view.scale * 100)
  const currentFloorTables = tables.filter((t) => t.floor === activeFloor)

  // Map floorId:zoneName → color pour colorier les tables
  const zoneColorMap = new Map<string, string>()
  for (const f of floors) {
    for (const z of f.zones ?? []) {
      zoneColorMap.set(`${f.id}:${z.name}`, z.color)
    }
  }

  return (
    <div className="space-y-4 p-4">
      {/* Sélecteur de niveaux */}
      <div className="flex items-center gap-1 flex-wrap">
        {floors.map((floor, i) => (
          <div key={floor.id} className="inline-flex items-center">
            {renaming === floor.id ? (
              <input
                value={renamingValue}
                onChange={(e) => setRenamingValue(e.target.value)}
                onBlur={() => commitRename(floor.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename(floor.id)
                  if (e.key === 'Escape') setRenaming(null)
                }}
                autoFocus
                className="text-xs bg-zinc-700 border border-orange-500/60 text-white px-2 py-1.5 rounded-lg w-28 focus:outline-none"
              />
            ) : (
              <button
                onClick={() => { switchFloor(floor.id); fitToContent() }}
                onDoubleClick={() => { setRenaming(floor.id); setRenamingValue(floor.name) }}
                title="Double-clic pour renommer"
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer border ${
                  activeFloor === floor.id
                    ? 'bg-zinc-700 text-white border-zinc-600'
                    : 'text-zinc-500 hover:text-zinc-300 border-transparent hover:bg-zinc-800'
                }`}
              >
                <span role="img" aria-label="niveau">{floorIcon(i)}</span>
                <span>{floor.name}</span>
                {tablesCount(tables, floor.id) > 0 && (
                  <span className="text-[10px] text-zinc-500 tabular-nums">
                    {tablesCount(tables, floor.id)}
                  </span>
                )}
                {tables.some((t) => t.floor === floor.id && activeIds.has(t.id)) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shrink-0" />
                )}
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addFloor}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 border border-transparent hover:border-zinc-700 hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Ajouter un niveau"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Niveau
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={addWall}
            className="flex items-center gap-2 text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 px-3 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Mur
          </button>
          <button
            onClick={() => setAddingZone((v) => !v)}
            className={`flex items-center gap-2 text-sm border px-3 py-2 rounded-xl transition-colors cursor-pointer ${
              addingZone
                ? 'bg-zinc-700 border-zinc-600 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            </svg>
            Zone
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 text-sm bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            {saving ? 'Enregistrement…' : saved ? '✓ Enregistré' : 'Enregistrer le plan'}
          </button>
          {activeIds.size > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs text-orange-400 font-semibold">
                {activeIds.size} table{activeIds.size > 1 ? 's' : ''} en commande
              </span>
            </div>
          )}
          {/* Zoom controls */}
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => applyView({ ...viewRef.current, scale: Math.max(SCALE_MIN, Math.round((viewRef.current.scale - 0.1) * 10) / 10) })}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm cursor-pointer transition-colors"
              title="Dézoomer (−)"
            >−</button>
            <button
              onClick={fitToContent}
              className="px-2 h-7 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 text-xs font-mono cursor-pointer transition-colors min-w-[3rem]"
              title="Ajuster à la vue"
            >{scalePct}%</button>
            <button
              onClick={() => applyView({ ...viewRef.current, scale: Math.min(SCALE_MAX, Math.round((viewRef.current.scale + 0.1) * 10) / 10) })}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm cursor-pointer transition-colors"
              title="Zoomer (+)"
            >+</button>
          </div>
        </div>

        {/* Formulaire inline d’ajout de zone */}
        {addingZone && (
          <div className="bg-zinc-800/80 border border-zinc-700 rounded-xl p-3 flex flex-col gap-2.5">
            <input
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createZone(); if (e.key === 'Escape') setAddingZone(false) }}
              placeholder="Nom de la zone (ex : Terrasse, Bar, Salle…)"
              autoFocus
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 shrink-0">Couleur :</span>
              <div className="flex gap-1.5 flex-wrap">
                {ZONE_COLORS.map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => setNewZoneColor(c.color)}
                    title={c.label}
                    className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${
                      newZoneColor === c.color ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-zinc-800' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.color }}
                  />
                ))}
              </div>
              <div className="ml-auto flex gap-2">
                <button type="button" onClick={() => setAddingZone(false)} className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer px-2">Annuler</button>
                <button
                  type="button"
                  onClick={createZone}
                  disabled={!newZoneName.trim()}
                  className="text-xs bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg cursor-pointer font-medium"
                >
                  Créer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="rounded-2xl border border-zinc-800 shadow-inner overflow-hidden relative select-none bg-zinc-900"
        style={{ height: CANVAS_H }}
        onPointerDown={onContainerPointerDown}
        onPointerMove={onContainerPointerMove}
        onPointerUp={onContainerPointerUp}
      >
        {/* Grille de fond */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #3f3f46 1.5px, transparent 1.5px)',
            backgroundSize: `${32 * view.scale}px ${32 * view.scale}px`,
            backgroundPosition: `${view.x % (32 * view.scale)}px ${view.y % (32 * view.scale)}px`,
          }}
        />

        {/* Contenu transformé */}
        <div
          style={{
            position: 'absolute',
            width: CW,
            height: CH,
            transformOrigin: '0 0',
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          }}
        >
          {/* Zones du niveau actif (en dessous des murs et tables) */}
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="absolute rounded-xl group cursor-move"
              style={{
                left: zone.x, top: zone.y, width: zone.w, height: zone.h,
                backgroundColor: zone.color + '1a',
                border: `2px dashed ${zone.color}99`,
                touchAction: 'none',
              }}
              onPointerDown={(e) => startDrag(e, 'zone', zone.id, zone.x, zone.y)}
            >
              {/* Label de zone */}
              {renamingZone === zone.id ? (
                <input
                  value={renamingZoneValue}
                  onChange={(e) => setRenamingZoneValue(e.target.value)}
                  onBlur={() => commitZoneRename(zone.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitZoneRename(zone.id)
                    if (e.key === 'Escape') setRenamingZone(null)
                  }}
                  autoFocus
                  onPointerDown={(e) => e.stopPropagation()}
                  className="absolute top-2 left-2 text-xs bg-zinc-900 border border-zinc-600 text-white px-2 py-1 rounded-md focus:outline-none w-32"
                />
              ) : (
                <span
                  className="absolute top-2 left-3 text-xs font-semibold px-1.5 py-0.5 rounded text-white select-none"
                  style={{ backgroundColor: zone.color + 'cc' }}
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    setRenamingZone(zone.id)
                    setRenamingZoneValue(zone.name)
                  }}
                >
                  {zone.name}
                </span>
              )}
              {/* Supprimer */}
              <button
                className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-red-500 hover:bg-red-400 rounded-full text-white text-xs leading-none hidden group-hover:flex items-center justify-center cursor-pointer z-10"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setZones((prev) => prev.filter((z) => z.id !== zone.id))}
              >×</button>
              {/* Redimensionner */}
              <div
                className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
                style={{ background: `linear-gradient(135deg, transparent 40%, ${zone.color} 40%)`, borderBottomRightRadius: 8 }}
                onPointerDown={(e) => { e.stopPropagation(); startDrag(e, 'zone-resize', zone.id, 0, 0) }}
              />
            </div>
          ))}

          {/* Murs du niveau actif */}
          {walls.map((wall) => (
            <div
              key={wall.id}
              className="absolute rounded-lg bg-zinc-600/70 border border-zinc-500 cursor-move group"
              style={{ left: wall.x, top: wall.y, width: wall.w, height: wall.h, touchAction: 'none' }}
              onPointerDown={(e) => startDrag(e, 'wall', wall.id, wall.x, wall.y)}
            >
              <span className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400 pointer-events-none font-medium tracking-wide uppercase">
                Mur
              </span>
              <button
                className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-red-500 hover:bg-red-400 rounded-full text-white text-xs leading-none hidden group-hover:flex items-center justify-center cursor-pointer z-10"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setWalls((prev) => prev.filter((w) => w.id !== wall.id))}
              >×</button>
              <div
                className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'linear-gradient(135deg, transparent 40%, #a1a1aa 40%)' }}
                onPointerDown={(e) => startDrag(e, 'resize', wall.id, 0, 0)}
              />
            </div>
          ))}

          {/* Tables du niveau actif */}
          {currentFloorTables.map((table) => {
            const isActive = activeIds.has(table.id)
            const isNew = flashId === table.id
            const zoneColor = table.label ? zoneColorMap.get(`${table.floor}:${table.label}`) : undefined
            const inZone = !!zoneColor && !isNew && !isActive
            return (
              <div
                key={table.id}
                className={`absolute rounded-2xl flex flex-col items-center justify-center border-2 cursor-grab active:cursor-grabbing select-none transition-shadow ${
                  isNew
                    ? 'bg-green-500/20 border-green-400 shadow-[0_0_28px_rgba(74,222,128,0.6)]'
                    : isActive
                    ? 'bg-orange-500/15 border-orange-500 shadow-[0_0_24px_rgba(249,115,22,0.4)]'
                    : inZone
                    ? 'hover:shadow-lg'
                    : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500 hover:shadow-lg'
                }`}
                style={{
                  left: table.pos_x, top: table.pos_y, width: TW, height: TH, touchAction: 'none',
                  ...(inZone ? { backgroundColor: 'rgba(0,0,0,0.5)', borderColor: zoneColor } : {}),
                }}
                onPointerDown={(e) => startDrag(e, 'table', table.id, table.pos_x, table.pos_y, table)}
              >
                <span className={`text-sm font-bold leading-none ${isNew ? 'text-green-300' : isActive ? 'text-orange-300' : 'text-white'}`}>
                  {table.number}
                </span>
                {table.label && (
                  <span className="text-[10px] leading-tight truncate max-w-[68px] px-1 text-center mt-0.5" style={inZone ? { color: zoneColor } : { color: '#a1a1aa' }}>
                    {table.label}
                  </span>
                )}
                {isActive && (
                  <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-orange-500 rounded-full animate-pulse border-2 border-zinc-900" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 text-xs text-zinc-600 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border-2 border-zinc-700 bg-zinc-800 inline-block" />
          Table
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border-2 border-orange-500 bg-orange-500/15 inline-block" />
          Commande en cours
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-3 rounded bg-zinc-600/70 border border-zinc-500 inline-block" />
          Mur
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-3 rounded border-2 inline-block" style={{ borderColor: '#22c55e99', backgroundColor: '#22c55e1a' }} />
          Zone
        </span>
        <span className="ml-auto hidden sm:block">
          Scroll = déplacer · Ctrl+Scroll = zoom · Espace+glisser = panoramique · Double-clic zone = renommer
        </span>
      </div>

      {/* Modal QR */}
      {qrTable && (
        <QRModal
          table={qrTable}
          siteUrl={siteUrl}
          slug={restaurantSlug}
          restaurantId={restaurantId}
          isActive={activeIds.has(qrTable.id)}
          onClose={() => setQrTable(null)}
          onDelete={handleDeleteTable}
          onUpdate={handleUpdateTable}
        />
      )}
    </div>
  )
}

function tablesCount(tables: FloorTable[], floorId: number) {
  return tables.filter((t) => t.floor === floorId).length
}

// ─── QR Modal ─────────────────────────────────────────────────

function QRModal({
  table,
  siteUrl,
  slug,
  restaurantId,
  isActive,
  onClose,
  onDelete,
  onUpdate,
}: {
  table: FloorTable
  siteUrl: string
  slug: string
  restaurantId: string
  isActive: boolean
  onClose: () => void
  onDelete: (id: string) => void
  onUpdate: (id: string, data: { number: number; label: string | null }) => Promise<void>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editNumber, setEditNumber] = useState(String(table.number))
  const [editLabel, setEditLabel] = useState(table.label ?? '')
  const [saving, setSaving] = useState(false)
  const url = `${siteUrl}/menu/${slug}?table=${table.id}`

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 220,
        margin: 2,
        color: { dark: '#ffffff', light: '#18181b' },
      })
    }
  }, [url])

  function download(variant: 'white' | 'black') {
    const offscreen = document.createElement('canvas')
    const size = 500
    offscreen.width = size
    offscreen.height = size
    QRCode.toCanvas(
      offscreen,
      url,
      {
        width: size,
        margin: 2,
        color:
          variant === 'white'
            ? { dark: '#ffffff', light: '#18181b' }
            : { dark: '#000000', light: '#ffffff' },
      },
      (err) => {
        if (err) return
        const link = document.createElement('a')
        link.download = `table-${table.number}-qr.png`
        link.href = offscreen.toDataURL('image/png')
        link.click()
      },
    )
  }

  async function handleDelete() {
    setDeleting(true)
    await onDelete(table.id)
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    const num = parseInt(editNumber)
    if (!num || num < 1) return
    setSaving(true)
    await onUpdate(table.id, { number: num, label: editLabel.trim() || null })
    setSaving(false)
    setEditing(false)
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div>
              <p className="font-semibold text-white">Table {table.number}</p>
              {table.label && <p className="text-xs text-zinc-400">{table.label}</p>}
            </div>
            {isActive && (
              <span className="flex items-center gap-1 text-xs font-medium text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                En commande
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex justify-center mb-4">
          <canvas ref={canvasRef} className="rounded-xl" />
        </div>

        <div className="flex gap-2 mb-5">
          <button
            onClick={() => download('white')}
            className="flex-1 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-2 rounded-lg transition-colors cursor-pointer"
          >
            ⬜ Blanc
          </button>
          <button
            onClick={() => download('black')}
            className="flex-1 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-2 rounded-lg transition-colors cursor-pointer"
          >
            ⬛ Noir
          </button>
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full text-xs font-semibold text-white bg-orange-500 hover:bg-orange-400 px-3 py-2.5 rounded-lg transition-colors mb-5"
        >
          Voir la vitrine
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>

        <div className="border-t border-zinc-800 pt-4 space-y-2">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="w-full text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Modifier la table
            </button>
          ) : (
            <form onSubmit={handleSaveEdit} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  value={editNumber}
                  onChange={(e) => setEditNumber(e.target.value)}
                  placeholder="N°"
                  className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-zinc-500"
                />
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="Zone (Terrasse, Salle…)"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 text-xs text-white bg-zinc-700 hover:bg-zinc-600 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full text-xs text-red-500/70 hover:text-red-400 border border-red-900/40 hover:border-red-800 px-3 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            {deleting ? 'Suppression…' : 'Supprimer cette table'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── QR Modal ─────────────────────────────────────────────────