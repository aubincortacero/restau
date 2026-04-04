'use client'

import { useState } from 'react'
import type QRCodeLib from 'qrcode'

type TableForExport = { id: string; number: number; label: string | null }

// A4 grid: 3 cols × 4 rows @ 60×65mm per cell
const COLS = 3
const ROWS = 4
const CELL_W = 60      // mm
const CELL_H = 65      // mm
const QR_SIZE = 52     // mm — QR image within cell
const MARGIN_H = 15    // mm — left & right
const MARGIN_TOP = 20  // mm — space for page title
const PAGE_W = 210     // A4 width mm
const PER_PAGE = COLS * ROWS  // 12

export default function QRExportButton({
  tables,
  siteUrl,
  restaurantSlug,
}: {
  tables: TableForExport[]
  siteUrl: string
  restaurantSlug: string
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'all' | 'zone' | 'single'>('all')
  const [selectedZone, setSelectedZone] = useState('')
  const [selectedTableId, setSelectedTableId] = useState('')
  const [generating, setGenerating] = useState(false)

  if (tables.length === 0) return null

  const zones = [...new Set(tables.map((t) => t.label).filter((l): l is string => !!l))].sort()
  const hasUnlabeled = tables.some((t) => !t.label)
  const allGroupKeys = [...zones, ...(hasUnlabeled ? ['Sans zone'] : [])]

  function getTargetTables(): TableForExport[] {
    if (mode === 'all') return tables
    if (mode === 'zone') {
      if (!selectedZone) return []
      if (selectedZone === 'Sans zone') return tables.filter((t) => !t.label)
      return tables.filter((t) => t.label === selectedZone)
    }
    return tables.filter((t) => t.id === selectedTableId)
  }

  const targetTables = getTargetTables()

  function getPageCount(): number {
    if (!targetTables.length) return 0
    if (mode === 'single') return 1
    if (mode === 'all') {
      // Sum pages per group
      const counts = new Map<string, number>()
      for (const t of tables) {
        const k = t.label ?? 'Sans zone'
        counts.set(k, (counts.get(k) ?? 0) + 1)
      }
      let total = 0
      for (const n of counts.values()) total += Math.ceil(n / PER_PAGE)
      return total
    }
    return Math.ceil(targetTables.length / PER_PAGE)
  }

  const pageCount = getPageCount()
  const canGenerate = targetTables.length > 0

  function slugify(str: string) {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  }

  async function generate() {
    if (!canGenerate) return
    setGenerating(true)
    try {
      const [{ jsPDF }, qrcodeModule] = await Promise.all([
        import('jspdf'),
        import('qrcode'),
      ])
      const QRCode = ((qrcodeModule as { default: typeof QRCodeLib }).default ?? qrcodeModule) as typeof QRCodeLib
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      let firstPage = true

      type Group = { title: string; tables: TableForExport[] }
      let groups: Group[]

      if (mode === 'single') {
        const t = tables.find((t) => t.id === selectedTableId)!
        groups = [{ title: `Table ${t.number}`, tables: [t] }]
      } else if (mode === 'zone') {
        groups = [{ title: `QR codes tables – ${selectedZone}`, tables: targetTables }]
      } else {
        const byZone = new Map<string, TableForExport[]>()
        for (const t of [...tables].sort((a, b) => a.number - b.number)) {
          const k = t.label ?? 'Sans zone'
          if (!byZone.has(k)) byZone.set(k, [])
          byZone.get(k)!.push(t)
        }
        groups = [...byZone.entries()].map(([zone, tbls]) => ({
          title: `QR codes tables – ${zone}`,
          tables: tbls,
        }))
      }

      for (const group of groups) {
        if (mode === 'single') {
          // Full-page single QR
          if (!firstPage) doc.addPage()
          firstPage = false
          const t = group.tables[0]
          const url = `${siteUrl}/menu/${restaurantSlug}?table=${t.id}`
          const dataUrl = await QRCode.toDataURL(url, {
            width: 600, margin: 1, color: { dark: '#000000', light: '#ffffff' },
          })
          const size = 120
          const cx = (PAGE_W - size) / 2
          const cy = 75
          // Table title
          doc.setFontSize(20)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(0, 0, 0)
          doc.text(`Table ${t.number}`, PAGE_W / 2, cy - 14, { align: 'center' })
          if (t.label) {
            doc.setFontSize(11)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(100, 100, 100)
            doc.text(t.label, PAGE_W / 2, cy - 8, { align: 'center' })
          }
          doc.addImage(dataUrl, 'PNG', cx, cy, size, size)
          // Large number below
          doc.setFontSize(28)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(0, 0, 0)
          doc.text(`${t.number}`, PAGE_W / 2, cy + size + 14, { align: 'center' })
        } else {
          // Grid layout
          const pages = Math.ceil(group.tables.length / PER_PAGE)
          for (let p = 0; p < pages; p++) {
            if (!firstPage) doc.addPage()
            firstPage = false
            const pageTables = group.tables.slice(p * PER_PAGE, (p + 1) * PER_PAGE)

            // Page title
            doc.setFontSize(11)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(20, 20, 20)
            const titleText = pages > 1
              ? `${group.title}  (${p + 1}/${pages})`
              : group.title
            doc.text(titleText, PAGE_W / 2, 13, { align: 'center' })

            // Cut-line grid
            doc.setDrawColor(200, 200, 200)
            doc.setLineWidth(0.2)

            for (let i = 0; i < pageTables.length; i++) {
              const t = pageTables[i]
              const col = i % COLS
              const row = Math.floor(i / COLS)
              const x = MARGIN_H + col * CELL_W
              const y = MARGIN_TOP + row * CELL_H

              const url = `${siteUrl}/menu/${restaurantSlug}?table=${t.id}`
              const dataUrl = await QRCode.toDataURL(url, {
                width: 300, margin: 1, color: { dark: '#000000', light: '#ffffff' },
              })

              // Cell border
              doc.rect(x, y, CELL_W, CELL_H)

              // QR image centered horizontally, 3mm from top
              const qx = x + (CELL_W - QR_SIZE) / 2
              const qy = y + 3
              doc.addImage(dataUrl, 'PNG', qx, qy, QR_SIZE, QR_SIZE)

              // Table number — below QR
              doc.setFontSize(14)
              doc.setFont('helvetica', 'bold')
              doc.setTextColor(0, 0, 0)
              doc.text(`${t.number}`, x + CELL_W / 2, y + 3 + QR_SIZE + 7, { align: 'center' })
            }
          }
        }
      }

      // Filename
      let filename = 'qr-tables.pdf'
      if (mode === 'zone') filename = `qr-tables-${slugify(selectedZone)}.pdf`
      if (mode === 'single') {
        const t = tables.find((t) => t.id === selectedTableId)
        filename = `qr-table-${t?.number ?? 'x'}.pdf`
      }
      doc.save(filename)
    } catch (err) {
      console.error('PDF generation error:', err)
    } finally {
      setGenerating(false)
      setOpen(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-600 px-3 py-2 rounded-xl transition-colors cursor-pointer"
      >
        {/* QR icon */}
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 18.75h.75v.75h-.75v-.75ZM18.75 13.5h.75v.75h-.75v-.75ZM18.75 18.75h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
        </svg>
        Exporter QR
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => !generating && setOpen(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-white mb-5">Exporter les QR codes</h2>

            {/* Mode */}
            <div className="flex bg-zinc-800 rounded-xl p-0.5 mb-4">
              {(['all', 'zone', 'single'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 text-xs py-2 rounded-lg transition-colors cursor-pointer font-medium ${
                    mode === m ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {m === 'all' ? 'Tous' : m === 'zone' ? 'Par zone' : '1 table'}
                </button>
              ))}
            </div>

            {/* Zone selector */}
            {mode === 'zone' && (
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
              >
                <option value="">Choisir une zone…</option>
                {allGroupKeys.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            )}

            {/* Table selector */}
            {mode === 'single' && (
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
              >
                <option value="">Choisir une table…</option>
                {[...tables].sort((a, b) => a.number - b.number).map((t) => (
                  <option key={t.id} value={t.id}>
                    Table {t.number}{t.label ? ` — ${t.label}` : ''}
                  </option>
                ))}
              </select>
            )}

            {/* Summary */}
            <div className={`rounded-xl px-4 py-3 mb-5 text-sm transition-colors ${canGenerate ? 'bg-zinc-800/60 text-zinc-400' : 'bg-zinc-800/30 text-zinc-600'}`}>
              {canGenerate ? (
                <>
                  <span className="text-white font-medium">{targetTables.length}</span> QR code{targetTables.length > 1 ? 's' : ''}
                  {mode !== 'single' && (
                    <> · <span className="text-white font-medium">{pageCount}</span> feuille{pageCount > 1 ? 's' : ''} A4 (3 × 4)</>
                  )}
                  {mode === 'single' && <> · pleine page A4</>}
                  {mode === 'all' && zones.length > 0 && <> · groupés par zone</>}
                </>
              ) : (
                <>Sélectionnez une {mode === 'zone' ? 'zone' : 'table'}</>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={generating}
                className="flex-1 text-sm text-zinc-500 hover:text-white border border-zinc-700 hover:border-zinc-600 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={generate}
                disabled={!canGenerate || generating}
                className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                {generating ? 'Génération…' : 'Générer le PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
