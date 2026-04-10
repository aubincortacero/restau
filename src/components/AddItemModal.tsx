'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { createItem } from '@/app/actions/restaurant'
import { CATEGORY_ATTRIBUTES } from '@/lib/category-types'
import type { CategoryTypeId } from '@/lib/category-types'
import { IconPlus } from './icons'

const INPUT = "bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 w-full"

interface Props {
  categoryId: string
  categoryType: CategoryTypeId
}

function ModalForm({ categoryId, categoryType, onClose }: Props & { onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)
  const previewUrlRef = useRef<string | null>(null)
  const fields = CATEGORY_ATTRIBUTES[categoryType] ?? []
  const [useSizes, setUseSizes] = useState(false)
  const [sizes, setSizes] = useState<{ label: string; price: string; hhPrice: string }[]>([{ label: '', price: '', hhPrice: '' }])

  const [sliders, setSliders] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    fields.forEach((f) => { if (f.type === 'slider') init[f.key] = f.min })
    return init
  })

  useEffect(() => {
    return () => { if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current) }
  }, [])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { alert('Image trop grande — maximum 5 Mo'); e.target.value = ''; return }
      const url = URL.createObjectURL(file)
      previewUrlRef.current = url
      setImagePreview(url)
    } else {
      setImagePreview(null)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    fields.forEach((f) => {
      if (f.type === 'slider') formData.set(f.key, String(sliders[f.key] ?? f.min))
    })
    startTransition(async () => {
      await createItem(formData)
      setImagePreview(null)
      previewUrlRef.current = null
      setFormKey((k) => k + 1)
      setUseSizes(false)
      setSizes([{ label: '', price: '', hhPrice: '' }])
      onClose()
    })
  }

  return (
    <form key={formKey} onSubmit={handleSubmit} className="p-5 space-y-4">
      <input type="hidden" name="category_id" value={categoryId} />

      {/* Nom + Prix */}
      <div className="grid grid-cols-3 gap-2">
        <input name="name" required placeholder="Nom du plat *" className={INPUT + ' col-span-2'} />
        {!useSizes && (
          <div className="relative">
            <input name="price" type="number" step="0.01" min="0" required placeholder="Prix *" className={INPUT + ' pr-6'} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 pointer-events-none">€</span>
          </div>
        )}
        {useSizes && <input type="hidden" name="price" value="0" />}
      </div>

      {/* Tailles / Variantes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-zinc-500">Plusieurs tailles / formats</label>
          <button
            type="button"
            onClick={() => setUseSizes(v => !v)}
            className={`relative w-9 h-5 rounded-full transition-colors ${useSizes ? 'bg-orange-500' : 'bg-zinc-700'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${useSizes ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>
        {useSizes && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-[1fr_80px_80px_24px] gap-1.5 mb-1">
              <span className="text-[10px] text-zinc-600 px-1">Format</span>
              <span className="text-[10px] text-zinc-600 px-1">Prix</span>
              <span className="text-[10px] text-amber-600 px-1">🍹 HH</span>
              <span />
            </div>
            {sizes.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_80px_24px] gap-1.5 items-center">
                <input
                  value={s.label}
                  onChange={e => setSizes(prev => prev.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))}
                  placeholder="25cl, 50cl…"
                  className={INPUT}
                />
                <div className="relative">
                  <input
                    value={s.price}
                    onChange={e => setSizes(prev => prev.map((x, idx) => idx === i ? { ...x, price: e.target.value } : x))}
                    type="number" step="0.01" min="0" placeholder="Prix"
                    className={INPUT + ' pr-4 text-xs'}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 pointer-events-none">€</span>
                </div>
                <div className="relative">
                  <input
                    value={s.hhPrice}
                    onChange={e => setSizes(prev => prev.map((x, idx) => idx === i ? { ...x, hhPrice: e.target.value } : x))}
                    type="number" step="0.01" min="0" placeholder="—"
                    className={INPUT + ' pr-4 text-xs'}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-amber-600 pointer-events-none">🍹</span>
                </div>
                {sizes.length > 1 ? (
                  <button type="button" onClick={() => setSizes(prev => prev.filter((_, idx) => idx !== i))}
                    className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-red-900/40 text-zinc-500 hover:text-red-400 flex items-center justify-center transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                  </button>
                ) : <span />}
              </div>
            ))}
            <button type="button" onClick={() => setSizes(prev => [...prev, { label: '', price: '', hhPrice: '' }])}
              className="text-xs text-zinc-500 hover:text-orange-400 transition-colors flex items-center gap-1 mt-0.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Ajouter un format
            </button>
            <input
              type="hidden"
              name="sizes"
              value={JSON.stringify(
                sizes.filter(s => s.label && s.price).map(s => ({
                  label: s.label,
                  price: parseFloat(s.price),
                  ...(s.hhPrice ? { happy_hour_price: parseFloat(s.hhPrice) } : {}),
                }))
              )}
            />
          </div>
        )}
      </div>

      {/* Prix Happy Hour (uniquement si pas de tailles) */}
      {!useSizes && (
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Prix Happy Hour <span className="text-zinc-600">(optionnel)</span></label>
          <div className="relative w-40">
            <input
              name="happy_hour_price"
              type="number"
              step="0.01"
              min="0"
              placeholder="—"
              className={INPUT + ' pr-6'}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-500 pointer-events-none">🍹</span>
          </div>
        </div>
      )}

      {/* Description */}
      <input name="description" placeholder="Description (optionnel)" className={INPUT} />

      {/* Image */}
      <div>
        <p className="text-xs text-zinc-500 mb-2">Photo du plat</p>
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="w-14 h-14 rounded-xl bg-zinc-800 border border-zinc-700 group-hover:border-orange-500/40 overflow-hidden shrink-0 transition-colors flex items-center justify-center">
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreview} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-xs text-zinc-300 group-hover:text-white transition-colors">Choisir une image</p>
            <p className="text-xs text-zinc-600 mt-0.5">JPG, PNG, WebP — max 5 Mo</p>
          </div>
          <input type="file" name="image" accept="image/*" className="sr-only" onChange={handleImageChange} />
        </label>
      </div>

      {/* Allergènes */}
      <input name="allergens" placeholder="Allergènes : gluten, lactose, arachides…" className={INPUT} />

      {/* Attributs dynamiques */}
      {fields.map((attr) => (
        <div key={attr.key}>
          <p className="text-xs text-zinc-500 mb-2">{attr.label}</p>

          {attr.type === 'multiselect' && (
            <div className="flex flex-wrap gap-1.5">
              {attr.options.map((opt) => (
                <label key={opt} className="cursor-pointer select-none">
                  <input type="checkbox" name={attr.key} value={opt} className="sr-only peer" />
                  <span className="block text-xs px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 peer-checked:border-orange-500/50 peer-checked:bg-orange-500/12 peer-checked:text-orange-300 transition-colors">{opt}</span>
                </label>
              ))}
            </div>
          )}

          {attr.type === 'select' && (
            <div className="flex flex-wrap gap-1.5">
              {attr.options.map((opt) => (
                <label key={opt} className="cursor-pointer select-none">
                  <input type="radio" name={attr.key} value={opt} className="sr-only peer" />
                  <span className="block text-xs px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 peer-checked:border-orange-500/50 peer-checked:bg-orange-500/12 peer-checked:text-orange-300 transition-colors">{opt}</span>
                </label>
              ))}
            </div>
          )}

          {attr.type === 'slider' && (
            <div className="flex items-center gap-3">
              <input
                type="range"
                name={attr.key}
                min={attr.min}
                max={attr.max}
                step={attr.step}
                value={sliders[attr.key] ?? attr.min}
                onChange={(e) => setSliders((prev) => ({ ...prev, [attr.key]: parseFloat(e.target.value) }))}
                className="flex-1 accent-orange-500"
              />
              <span className="text-sm font-semibold text-orange-400 tabular-nums w-14 text-right shrink-0">
                {(sliders[attr.key] ?? attr.min).toFixed(attr.step < 1 ? 1 : 0)}{attr.unit}
              </span>
            </div>
          )}
        </div>
      ))}

      {/* Végé / Vegan — masqué pour les alcools */}
      {categoryType !== 'alcohol' && (
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer select-none">
            <input type="checkbox" name="is_vegetarian" className="sr-only peer" />
            <span className="block text-xs px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600 peer-checked:border-lime-500/40 peer-checked:bg-lime-500/10 peer-checked:text-lime-400 transition-colors">🌿 Végétarien</span>
          </label>
          <label className="cursor-pointer select-none">
            <input type="checkbox" name="is_vegan" className="sr-only peer" />
            <span className="block text-xs px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600 peer-checked:border-pink-500/40 peer-checked:bg-pink-500/10 peer-checked:text-pink-400 transition-colors">🫘 Vegan</span>
          </label>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <button type="button" onClick={onClose} className="text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer">
          Annuler
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer"
        >
          <IconPlus className="w-3.5 h-3.5" />
          {isPending ? 'Ajout…' : 'Ajouter'}
        </button>
      </div>
    </form>
  )
}

export default function AddItemModal({ categoryId, categoryType }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-4 py-3 text-sm text-zinc-500 hover:text-orange-400 hover:bg-orange-400/5 border border-dashed border-zinc-800 hover:border-orange-500/30 rounded-xl transition-colors cursor-pointer group"
      >
        <IconPlus className="w-3.5 h-3.5 shrink-0 group-hover:text-orange-400" />
        Ajouter un plat
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
              <h2 className="text-sm font-medium text-white">Nouveau plat</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ModalForm categoryId={categoryId} categoryType={categoryType} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
