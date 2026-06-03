'use client'

import { useState } from 'react'
import type QRCodeLib from 'qrcode'

type TableForExport = { id: string; number: number; label: string | null }

// Sticker horizontal layout: 85mm × 28mm
const STICKER_W = 85      // mm - largeur totale
const STICKER_H = 28      // mm - hauteur
const QR_SECTION_W = 28   // mm - section QR code
const LOGO_SECTION_W = 28 // mm - section logo
const TABLE_SECTION_W = 29 // mm - section numéro table
const QR_SIZE = 22        // mm - taille du QR
const LOGO_SIZE = 20      // mm - taille du logo
const MARGIN_H = 12       // mm - marges horizontales
const MARGIN_V = 15       // mm - marges verticales
const GAP_H = 5           // mm - espacement horizontal entre stickers
const GAP_V = 5           // mm - espacement vertical entre stickers
const PAGE_W = 210        // mm - A4 width
const PAGE_H = 297        // mm - A4 height
const COLS = 2            // 2 stickers par rangée
const ROWS = 9            // 9 rangées par page
const PER_PAGE = COLS * ROWS  // 18 stickers par page

export default function QRExportButton({
  tables,
  siteUrl,
  restaurantSlug,
  restaurantName,
  restaurantLogoUrl,
}: {
  tables: TableForExport[]
  siteUrl: string
  restaurantSlug: string
  restaurantName: string
  restaurantLogoUrl: string | null
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'all' | 'zone' | 'single'>('all')
  const [selectedZone, setSelectedZone] = useState('')
  const [selectedTableId, setSelectedTableId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [bgColor, setBgColor] = useState('#FFFFFF') // Blanc par défaut
  const [fgColor, setFgColor] = useState('#000000') // Noir par défaut

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

  /**
   * Charge une image et la recolore avec la couleur spécifiée
   * Garde la transparence intacte
   */
  async function loadAndRecolorImage(url: string, targetColor: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('No 2d context'))
        
        // Dessiner l'image
        ctx.drawImage(img, 0, 0)
        
        // Obtenir les données de pixels
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        
        // Convertir la couleur cible en RGB
        const hex = targetColor.replace('#', '')
        const r = parseInt(hex.substring(0, 2), 16)
        const g = parseInt(hex.substring(2, 4), 16)
        const b = parseInt(hex.substring(4, 6), 16)
        
        // Parcourir tous les pixels
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3]
          
          // Si le pixel n'est pas transparent
          if (alpha > 0) {
            // Remplacer par la couleur cible en gardant l'opacité
            data[i] = r      // Rouge
            data[i + 1] = g  // Vert
            data[i + 2] = b  // Bleu
            // data[i + 3] reste inchangé (alpha)
          }
        }
        
        // Remettre les données modifiées
        ctx.putImageData(imageData, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = url
    })
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

      // Charger le logo si disponible et le recolorer
      let logoDataUrl: string | null = null
      if (restaurantLogoUrl) {
        try {
          logoDataUrl = await loadAndRecolorImage(restaurantLogoUrl, fgColor)
        } catch (err) {
          console.warn('Logo load failed:', err)
        }
      }

      // Calculer les couleurs RGB une fois pour toutes
      const bgHex = bgColor.replace('#', '')
      const bgR = parseInt(bgHex.substring(0, 2), 16)
      const bgG = parseInt(bgHex.substring(2, 4), 16)
      const bgB = parseInt(bgHex.substring(4, 6), 16)
      
      const fgHex = fgColor.replace('#', '')
      const fgR = parseInt(fgHex.substring(0, 2), 16)
      const fgG = parseInt(fgHex.substring(2, 4), 16)
      const fgB = parseInt(fgHex.substring(4, 6), 16)

      type Group = { title: string; tables: TableForExport[] }
      let groups: Group[]

      if (mode === 'single') {
        const t = tables.find((t) => t.id === selectedTableId)!
        groups = [{ title: `Table ${t.number}`, tables: [t] }]
      } else if (mode === 'zone') {
        groups = [{ title: `Stickers tables – ${selectedZone}`, tables: targetTables }]
      } else {
        const byZone = new Map<string, TableForExport[]>()
        for (const t of [...tables].sort((a, b) => a.number - b.number)) {
          const k = t.label ?? 'Sans zone'
          if (!byZone.has(k)) byZone.set(k, [])
          byZone.get(k)!.push(t)
        }
        groups = [...byZone.entries()].map(([zone, tbls]) => ({
          title: `Stickers tables – ${zone}`,
          tables: tbls,
        }))
      }

      for (const group of groups) {
        const pages = Math.ceil(group.tables.length / PER_PAGE)
        for (let p = 0; p < pages; p++) {
          if (!firstPage) doc.addPage()
          firstPage = false
          const pageTables = group.tables.slice(p * PER_PAGE, (p + 1) * PER_PAGE)

          // Page title (petit en haut)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(120, 120, 120)
          const titleText = pages > 1
            ? `${group.title}  (${p + 1}/${pages})`
            : group.title
          doc.text(titleText, PAGE_W / 2, 8, { align: 'center' })

          // Lignes de découpe
          doc.setDrawColor(200, 200, 200)
          doc.setLineWidth(0.15)

          for (let i = 0; i < pageTables.length; i++) {
            const t = pageTables[i]
            const col = i % COLS
            const row = Math.floor(i / COLS)
            
            // Position du sticker
            const x = MARGIN_H + col * (STICKER_W + GAP_H)
            const y = MARGIN_V + row * (STICKER_H + GAP_V)

            // Fond du sticker (couleur de fond personnalisée)
            doc.setFillColor(bgR, bgG, bgB)
            doc.rect(x, y, STICKER_W, STICKER_H, 'F')
            
            // Bordure du sticker
            doc.setDrawColor(200, 200, 200)
            doc.setLineWidth(0.3)
            doc.rect(x, y, STICKER_W, STICKER_H)

            // Séparateurs verticaux internes (lignes fines)
            doc.setDrawColor(220, 220, 220)
            doc.setLineWidth(0.15)
            doc.line(x + QR_SECTION_W, y, x + QR_SECTION_W, y + STICKER_H)
            doc.line(x + QR_SECTION_W + LOGO_SECTION_W, y, x + QR_SECTION_W + LOGO_SECTION_W, y + STICKER_H)

            // === SECTION 1: QR CODE ===
            const url = `${siteUrl}/menu/${restaurantSlug}?table=${t.id}`
            const qrDataUrl = await QRCode.toDataURL(url, {
              width: 400,
              margin: 1,
              errorCorrectionLevel: 'L', // ← LOW pour QR plus simple
              color: { dark: fgColor, light: bgColor },
            })
            
            const qrX = x + (QR_SECTION_W - QR_SIZE) / 2
            const qrY = y + 2.5
            doc.addImage(qrDataUrl, 'PNG', qrX, qrY, QR_SIZE, QR_SIZE)
            
            // "NOTRE CARTE" sous le QR
            doc.setFontSize(6)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(fgR, fgG, fgB)
            doc.text('NOTRE CARTE', x + QR_SECTION_W / 2, y + STICKER_H - 2, { align: 'center' })

            // === SECTION 2: LOGO ===
            if (logoDataUrl) {
              const logoX = x + QR_SECTION_W + (LOGO_SECTION_W - LOGO_SIZE) / 2
              const logoY = y + (STICKER_H - LOGO_SIZE) / 2
              try {
                doc.addImage(logoDataUrl, 'PNG', logoX, logoY, LOGO_SIZE, LOGO_SIZE)
              } catch (err) {
                console.warn('Failed to add logo to PDF:', err)
              }
            }

            // === SECTION 3: TABLE ===
            const tableSectionX = x + QR_SECTION_W + LOGO_SECTION_W
            const tableCenterX = tableSectionX + TABLE_SECTION_W / 2
            
            // "Table" en petit
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(fgR, fgG, fgB)
            doc.text('Table', tableCenterX, y + 10, { align: 'center' })
            
            // Numéro en gros
            doc.setFontSize(18)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(fgR, fgG, fgB)
            doc.text(`${t.number}`, tableCenterX, y + 19, { align: 'center' })
          }
        }
      }

      // Filename
      let filename = 'stickers-tables.pdf'
      if (mode === 'zone') filename = `stickers-${slugify(selectedZone)}.pdf`
      if (mode === 'single') {
        const t = tables.find((t) => t.id === selectedTableId)
        filename = `sticker-table-${t?.number ?? 'x'}.pdf`
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
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors cursor-pointer shrink-0"
      >
        {/* QR icon */}
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 18.75h.75v.75h-.75v-.75ZM18.75 13.5h.75v.75h-.75v-.75ZM18.75 18.75h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
        </svg>
        Stickers tables
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
            <h2 className="text-base font-semibold text-white mb-5">Exporter les stickers</h2>

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

            {/* Couleurs personnalisées */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-zinc-400">Personnaliser les couleurs</label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => { setBgColor('#FFFFFF'); setFgColor('#000000') }}
                    className="px-2 py-0.5 text-[10px] rounded bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-600 transition-colors"
                    title="Noir sur blanc (défaut)"
                  >
                    Défaut
                  </button>
                  <button
                    type="button"
                    onClick={() => { setBgColor('#000000'); setFgColor('#FFFFFF') }}
                    className="px-2 py-0.5 text-[10px] rounded bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-600 transition-colors"
                    title="Blanc sur noir"
                  >
                    Inversé
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Fond</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-2 border-zinc-700 bg-transparent"
                    />
                    <input
                      type="text"
                      value={bgColor.toUpperCase()}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Éléments (QR, texte, logo)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-2 border-zinc-700 bg-transparent"
                    />
                    <input
                      type="text"
                      value={fgColor.toUpperCase()}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className={`rounded-xl px-4 py-3 mb-5 text-sm transition-colors ${canGenerate ? 'bg-zinc-800/60 text-zinc-400' : 'bg-zinc-800/30 text-zinc-600'}`}>
              {canGenerate ? (
                <>
                  <span className="text-white font-medium">{targetTables.length}</span> sticker{targetTables.length > 1 ? 's' : ''}
                  {mode !== 'single' && (
                    <> · <span className="text-white font-medium">{pageCount}</span> feuille{pageCount > 1 ? 's' : ''} A4 (18/page)</>
                  )}
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
