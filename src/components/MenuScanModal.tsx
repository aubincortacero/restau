'use client'

import { useRef, useState, useTransition } from 'react'
import { bulkImportMenu, type BulkImportCategory } from '@/app/actions/restaurant'
import type { ScanResult } from '@/app/api/menu/scan/route'
import { CATEGORY_TYPES } from '@/lib/category-types'
import type { CategoryTypeId } from '@/lib/category-types'

type Props = {
  restaurantId: string
  onClose: () => void
  onSuccess: () => void
}

type Step = 'upload' | 'scanning' | 'preview' | 'importing' | 'done' | 'error'

// Types pour l'état local du preview (modifiable par l'utilisateur)
type PreviewItem = {
  name: string
  description: string
  price: number
  sizes: { label: string; price: number }[]
  confidence: 'high' | 'low'
}

type PreviewCategory = {
  name: string
  category_type: CategoryTypeId
  items: PreviewItem[]
  selected: boolean
}

export default function MenuScanModal({ restaurantId, onClose, onSuccess }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [previewFile, setPreviewFile] = useState<string | null>(null)
  const [categories, setCategories] = useState<PreviewCategory[]>([])
  const [lowConfidenceItems, setLowConfidenceItems] = useState<string[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setPreviewFile(url)
  }

  async function handleScan() {
    if (!selectedFile) return
    setStep('scanning')
    setErrorMsg(null)

    const fd = new FormData()
    fd.append('image', selectedFile)

    try {
      const res = await fetch('/api/menu/scan', { method: 'POST', body: fd })
      const data: ScanResult & { error?: string } = await res.json()

      if (!res.ok || data.error) {
        setErrorMsg(data.error ?? 'Erreur lors de l\'analyse.')
        setStep('error')
        return
      }

      const mapped: PreviewCategory[] = data.categories.map((cat) => ({
        name: cat.name,
        category_type: cat.category_type as CategoryTypeId,
        selected: true,
        items: cat.items.map((item) => ({
          name: item.name,
          description: item.description ?? '',
          price: item.price,
          sizes: item.sizes ?? [],
          confidence: item.confidence,
        })),
      }))
      setCategories(mapped)
      setLowConfidenceItems(data.low_confidence_items ?? [])
      setStep('preview')
    } catch {
      setErrorMsg('Impossible de contacter le serveur. Vérifiez votre connexion.')
      setStep('error')
    }
  }

  function toggleCategory(idx: number) {
    setCategories((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, selected: !c.selected } : c)),
    )
  }

  function updateCategoryType(idx: number, type: CategoryTypeId) {
    setCategories((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, category_type: type } : c)),
    )
  }

  function removeItem(catIdx: number, itemIdx: number) {
    setCategories((prev) =>
      prev.map((c, i) =>
        i === catIdx
          ? { ...c, items: c.items.filter((_, j) => j !== itemIdx) }
          : c,
      ),
    )
  }

  function handleImport() {
    const toImport: BulkImportCategory[] = categories
      .filter((c) => c.selected && c.items.length > 0)
      .map((c) => ({
        name: c.name,
        category_type: c.category_type,
        items: c.items.map((i) => ({
          name: i.name,
          description: i.description,
          price: i.price,
          sizes: i.sizes.length > 0 ? i.sizes : undefined,
        })),
      }))

    if (toImport.length === 0) return

    startTransition(async () => {
      setStep('importing')
      const result = await bulkImportMenu(restaurantId, toImport)
      if (result.error) {
        setErrorMsg(result.error)
        setStep('error')
      } else {
        setStep('done')
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 1500)
      }
    })
  }

  const selectedCount = categories.filter((c) => c.selected).length
  const totalItems = categories
    .filter((c) => c.selected)
    .reduce((acc, c) => acc + c.items.length, 0)
  const hasLowConfidence = lowConfidenceItems.length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center">
              <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Import IA depuis une photo</p>
              <p className="text-xs text-zinc-500">Photographiez votre menu papier</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-zinc-800 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── UPLOAD ── */}
          {(step === 'upload') && (
            <div className="flex flex-col items-center gap-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={handleFileChange}
              />

              {previewFile ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewFile}
                    alt="Aperçu du menu"
                    className="max-h-64 rounded-xl object-contain border border-zinc-700"
                  />
                  <button
                    onClick={() => { setPreviewFile(null); setSelectedFile(null) }}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-zinc-700 hover:border-violet-500/50 rounded-2xl p-10 flex flex-col items-center gap-3 transition-colors cursor-pointer group"
                >
                  <svg className="w-10 h-10 text-zinc-600 group-hover:text-violet-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  <div className="text-center">
                    <p className="text-sm font-medium text-zinc-300">Choisir une photo</p>
                    <p className="text-xs text-zinc-600 mt-1">JPEG, PNG, WEBP — max 10 Mo</p>
                  </div>
                </button>
              )}

              <p className="text-xs text-zinc-500 text-center max-w-sm">
                Plus la photo est nette et bien cadrée, meilleure sera la détection.
                L&apos;IA peut analyser un menu complet en une seule photo.
              </p>
            </div>
          )}

          {/* ── SCANNING ── */}
          {step === 'scanning' && (
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
                <div className="absolute inset-0 rounded-full border-t-2 border-violet-500 animate-spin" />
                <div className="absolute inset-3 flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white">Analyse en cours…</p>
                <p className="text-xs text-zinc-500 mt-1">Gemini lit votre menu et détecte les plats</p>
              </div>
            </div>
          )}

          {/* ── PREVIEW ── */}
          {step === 'preview' && (
            <div className="flex flex-col gap-4">

              {/* Avertissement items incertains */}
              {hasLowConfidence && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <div>
                    <p className="text-xs font-medium text-amber-300">Items à vérifier ({lowConfidenceItems.length})</p>
                    <p className="text-xs text-amber-400/70 mt-0.5">{lowConfidenceItems.join(' · ')}</p>
                  </div>
                </div>
              )}

              {categories.map((cat, catIdx) => {
                const typeMeta = CATEGORY_TYPES.find((t) => t.id === cat.category_type) ?? CATEGORY_TYPES[0]
                return (
                  <div
                    key={catIdx}
                    className={`rounded-xl border transition-colors ${cat.selected ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-800 bg-zinc-900/50 opacity-50'}`}
                  >
                    {/* Header catégorie */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-700/50">
                      <input
                        type="checkbox"
                        checked={cat.selected}
                        onChange={() => toggleCategory(catIdx)}
                        className="rounded accent-violet-500 cursor-pointer"
                      />
                      <span className="text-base leading-none">{typeMeta.emoji}</span>
                      <span className="text-sm font-medium text-white flex-1">{cat.name}</span>
                      <select
                        value={cat.category_type}
                        onChange={(e) => updateCategoryType(catIdx, e.target.value as CategoryTypeId)}
                        className="text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-zinc-300 cursor-pointer"
                        disabled={!cat.selected}
                      >
                        {CATEGORY_TYPES.map((t) => (
                          <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Items */}
                    <div className="divide-y divide-zinc-700/30">
                      {cat.items.map((item, itemIdx) => (
                        <div
                          key={itemIdx}
                          className={`flex items-center gap-3 px-4 py-2.5 ${item.confidence === 'low' ? 'bg-amber-500/5' : ''}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-white">{item.name}</span>
                              {item.confidence === 'low' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 shrink-0">
                                  à vérifier
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-zinc-500 truncate">{item.description}</p>
                            )}
                            {item.sizes.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.sizes.map((s, si) => (
                                  <span key={si} className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700">
                                    {s.label} — {s.price.toFixed(2)} €
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="text-sm font-medium text-zinc-300 shrink-0">
                            {item.sizes.length > 0
                              ? <span className="text-zinc-500 text-xs">dès {Math.min(...item.sizes.map(s => s.price)).toFixed(2)} €</span>
                              : item.price > 0 ? `${item.price.toFixed(2)} €` : <span className="text-amber-400">—</span>
                            }
                          </span>
                          <button
                            onClick={() => removeItem(catIdx, itemIdx)}
                            className="text-zinc-600 hover:text-red-400 transition-colors cursor-pointer p-1 rounded"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── IMPORTING ── */}
          {step === 'importing' && (
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
                <div className="absolute inset-0 rounded-full border-t-2 border-violet-500 animate-spin" />
              </div>
              <p className="text-sm text-white">Importation en cours…</p>
            </div>
          )}

          {/* ── DONE ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white">Menu importé avec succès !</p>
                <p className="text-xs text-zinc-500 mt-1">{totalItems} plats ajoutés dans {selectedCount} catégories.</p>
              </div>
            </div>
          )}

          {/* ── ERROR ── */}
          {step === 'error' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white">Analyse échouée</p>
                <p className="text-xs text-red-400/80 mt-1 max-w-sm">{errorMsg}</p>
              </div>
              <button
                onClick={() => { setStep('upload'); setPreviewFile(null); setSelectedFile(null) }}
                className="text-xs text-zinc-400 hover:text-white transition-colors underline cursor-pointer"
              >
                Réessayer avec une autre photo
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'upload' || step === 'preview') && (
          <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between gap-3 shrink-0">
            <button
              onClick={onClose}
              className="text-sm text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              Annuler
            </button>

            {step === 'upload' && (
              <button
                onClick={handleScan}
                disabled={!selectedFile}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
                Analyser avec l&apos;IA
              </button>
            )}

            {step === 'preview' && (
              <button
                onClick={handleImport}
                disabled={selectedCount === 0 || isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors cursor-pointer"
              >
                Importer {totalItems} plats ({selectedCount} catégories)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
