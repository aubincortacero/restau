'use client'

import { useState, useRef, useEffect } from 'react'
import QRCode from 'qrcode'
import { saveFloorPlan, deleteTableById } from '@/app/actions/restaurant'

const CW = 1100 // canvas width
const CH = 640  // canvas height
const TW = 76   // table width
const TH = 60   // table height
const MIN_W = 24
const MIN_H = 24

export type FloorTable = {
  id: string
  number: number
  label: string | null
  pos_x: number
  pos_y: number
}

export type Wall = {
  id: string
  x: number
  y: number
  w: number
  h: number
}

type DragState = {
  kind: 'table' | 'wall' | 'resize'
  id: string
  offsetX: number
  offsetY: number
} | null

export default function FloorPlan({
  initialTables,
  initialWalls,
  restaurantId,
  restaurantSlug,
  siteUrl,
}: {
  initialTables: FloorTable[]
  initialWalls: Wall[]
  restaurantId: string
  restaurantSlug: string
  siteUrl: string
}) {
  const [tables, setTables] = useState<FloorTable[]>(initialTables)
  const [walls, setWalls] = useState<Wall[]>(initialWalls)
  const [drag, setDrag] = useState<DragState>(null)
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set())
  const [qrTable, setQrTable] = useState<FloorTable | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const dragRef = useRef<DragState>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const startPosRef = useRef({ x: 0, y: 0 })
  const hasMoved = useRef(false)
  const pendingClickRef = useRef<FloorTable | null>(null)

  // Poll tables actives
  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch(`/api/orders/active-tables?restaurantId=${restaurantId}`)
        if (res.ok) {
          const { tableIds } = await res.json()
          setActiveIds(new Set(tableIds))
        }
      } catch { /* silent */ }
    }
    poll()
    const iv = setInterval(poll, 8000)
    return () => clearInterval(iv)
  }, [restaurantId])

  // Listeners globaux pendant le drag
  useEffect(() => {
    if (!drag) return
    dragRef.current = drag

    function onMove(e: PointerEvent) {
      const d = dragRef.current
      if (!d) return
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      if (
        Math.abs(cx - startPosRef.current.x) > 3 ||
        Math.abs(cy - startPosRef.current.y) > 3
      ) hasMoved.current = true

      if (d.kind === 'table') {
        setTables((prev) =>
          prev.map((t) =>
            t.id !== d.id
              ? t
              : {
                  ...t,
                  pos_x: Math.round(Math.max(0, Math.min(CW - TW, cx - d.offsetX))),
                  pos_y: Math.round(Math.max(0, Math.min(CH - TH, cy - d.offsetY))),
                },
          ),
        )
      } else if (d.kind === 'wall') {
        setWalls((prev) =>
          prev.map((w) =>
            w.id !== d.id
              ? w
              : {
                  ...w,
                  x: Math.round(Math.max(0, Math.min(CW - w.w, cx - d.offsetX))),
                  y: Math.round(Math.max(0, Math.min(CH - w.h, cy - d.offsetY))),
                },
          ),
        )
      } else if (d.kind === 'resize') {
        setWalls((prev) =>
          prev.map((w) =>
            w.id !== d.id
              ? w
              : {
                  ...w,
                  w: Math.round(Math.max(MIN_W, Math.min(CW - w.x, cx - w.x))),
                  h: Math.round(Math.max(MIN_H, Math.min(CH - w.y, cy - w.y))),
                },
          ),
        )
      }
    }

    function onUp() {
      dragRef.current = null
      setDrag(null)
      if (!hasMoved.current && pendingClickRef.current) {
        setQrTable(pendingClickRef.current)
      }
      pendingClickRef.current = null
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [drag])

  function startDrag(
    e: React.PointerEvent,
    kind: 'table' | 'wall' | 'resize',
    id: string,
    offsetX: number,
    offsetY: number,
    clickTarget?: FloorTable,
  ) {
    e.preventDefault()
    e.stopPropagation()
    const rect = canvasRef.current!.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    startPosRef.current = { x: cx, y: cy }
    hasMoved.current = false
    pendingClickRef.current = clickTarget ?? null
    setDrag({ kind, id, offsetX, offsetY })
  }

  function addWall() {
    setWalls((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        x: Math.round(CW / 2 - 90),
        y: Math.round(CH / 2 - 28),
        w: 180,
        h: 56,
      },
    ])
  }

  async function handleSave() {
    setSaving(true)
    try {
      await saveFloorPlan(
        restaurantId,
        tables.map((t) => ({ id: t.id, pos_x: t.pos_x, pos_y: t.pos_y })),
        walls.map((w) => ({ id: w.id, x: w.x, y: w.y, w: w.w, h: w.h })),
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTable(id: string) {
    await deleteTableById(id)
    setTables((prev) => prev.filter((t) => t.id !== id))
    setQrTable(null)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={addWall}
          className="flex items-center gap-2 text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 px-3 py-2 rounded-xl transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Ajouter un mur
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
        <p className="ml-auto text-xs text-zinc-600 hidden sm:block">
          Cliquez sur une table pour afficher son QR code
        </p>
      </div>

      {/* Canvas */}
      <div className="overflow-auto rounded-2xl border border-zinc-800 shadow-inner">
        <div
          ref={canvasRef}
          className="relative bg-zinc-900 select-none"
          style={{
            width: CW,
            height: CH,
            backgroundImage: 'radial-gradient(circle, #3f3f46 1.5px, transparent 1.5px)',
            backgroundSize: '32px 32px',
          }}
        >
          {/* Murs */}
          {walls.map((wall) => (
            <div
              key={wall.id}
              className="absolute rounded-lg bg-zinc-600/70 border border-zinc-500 cursor-move group"
              style={{
                left: wall.x,
                top: wall.y,
                width: wall.w,
                height: wall.h,
                touchAction: 'none',
              }}
              onPointerDown={(e) => {
                const rect = canvasRef.current!.getBoundingClientRect()
                startDrag(e, 'wall', wall.id, e.clientX - rect.left - wall.x, e.clientY - rect.top - wall.y)
              }}
            >
              <span className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400 pointer-events-none font-medium tracking-wide uppercase">
                Mur
              </span>
              {/* Supprimer */}
              <button
                className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-red-500 hover:bg-red-400 rounded-full text-white text-xs leading-none hidden group-hover:flex items-center justify-center cursor-pointer z-10"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setWalls((prev) => prev.filter((w) => w.id !== wall.id))}
              >
                ×
              </button>
              {/* Resize handle */}
              <div
                className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'linear-gradient(135deg, transparent 40%, #a1a1aa 40%)' }}
                onPointerDown={(e) => {
                  const rect = canvasRef.current!.getBoundingClientRect()
                  startDrag(e, 'resize', wall.id, 0, 0)
                }}
              />
            </div>
          ))}

          {/* Tables */}
          {tables.map((table) => {
            const isActive = activeIds.has(table.id)
            return (
              <div
                key={table.id}
                className={`absolute rounded-2xl flex flex-col items-center justify-center border-2 cursor-grab active:cursor-grabbing select-none ${
                  isActive
                    ? 'bg-orange-500/15 border-orange-500 shadow-[0_0_24px_rgba(249,115,22,0.4)]'
                    : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500 hover:shadow-lg'
                }`}
                style={{
                  left: table.pos_x,
                  top: table.pos_y,
                  width: TW,
                  height: TH,
                  touchAction: 'none',
                }}
                onPointerDown={(e) => {
                  const rect = canvasRef.current!.getBoundingClientRect()
                  startDrag(
                    e,
                    'table',
                    table.id,
                    e.clientX - rect.left - table.pos_x,
                    e.clientY - rect.top - table.pos_y,
                    table,
                  )
                }}
              >
                <span className={`text-sm font-bold leading-none ${isActive ? 'text-orange-300' : 'text-white'}`}>
                  {table.number}
                </span>
                {table.label && (
                  <span className="text-[10px] text-zinc-400 leading-tight truncate max-w-[68px] px-1 text-center mt-0.5">
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
      <div className="flex items-center gap-4 text-xs text-zinc-600">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border-2 border-zinc-700 bg-zinc-800 inline-block" />
          Table normale
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border-2 border-orange-500 bg-orange-500/15 inline-block" />
          Commande en cours
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-3 rounded bg-zinc-600/70 border border-zinc-500 inline-block" />
          Mur
        </span>
      </div>

      {/* Modal QR */}
      {qrTable && (
        <QRModal
          table={qrTable}
          siteUrl={siteUrl}
          slug={restaurantSlug}
          isActive={activeIds.has(qrTable.id)}
          onClose={() => setQrTable(null)}
          onDelete={handleDeleteTable}
        />
      )}
    </div>
  )
}

// ─── QR Modal ─────────────────────────────────────────────────

function QRModal({
  table,
  siteUrl,
  slug,
  isActive,
  onClose,
  onDelete,
}: {
  table: FloorTable
  siteUrl: string
  slug: string
  isActive: boolean
  onClose: () => void
  onDelete: (id: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [deleting, setDeleting] = useState(false)
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

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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

        {/* QR Code */}
        <div className="flex justify-center mb-4">
          <canvas ref={canvasRef} className="rounded-xl" />
        </div>

        {/* Download */}
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

        <p className="text-xs text-zinc-600 break-all text-center mb-5">{url}</p>

        {/* Supprimer */}
        <div className="border-t border-zinc-800 pt-4">
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
