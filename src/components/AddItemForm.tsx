'use client'

import { useTransition, useState, useRef, useEffect } from 'react'
import { createItem } from '@/app/actions/restaurant'
import { CATEGORY_ATTRIBUTES } from '@/lib/category-types'
import type { CategoryTypeId } from '@/lib/category-types'
import { IconPlus } from './icons'

const INPUT = "bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 w-full"

type Size = { label: string; price: string }

interface Props {
  categoryId: string
  categoryType: CategoryTypeId
}

export default function AddItemForm({ categoryId, categoryType }: Props) {
  const fields = CATEGORY_ATTRIBUTES[categoryType] ?? []
  const [open, setOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const previewUrlRef = useRef<string | null>(null)
  const [useSizes, setUseSizes] = useState(false)
  const [sizes, setSizes] = useState<Size[]>([{ label: '', price: '' }])

  // Slider values — tracked in state for live display
  const [sliders, setSliders] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    fields.forEach((f) => {
      if (f.type === 'slider') init[f.key] = f.min
    })
    return init
  })

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image trop grande — maximum 5 Mo')
        e.target.value = ''
        return
      }
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
    // Override slider values from React state (in case browser didn't update FormData)
    fields.forEach((f) => {
      if (f.type === 'slider') {
        formData.set(f.key, String(sliders[f.key] ?? f.min))
      }
    })
    startTransition(async () => {
      await createItem(formData)
      const resetSliders: Record<string, number> = {}
      fields.forEach((f) => { if (f.type === 'slider') resetSliders[f.key] = f.min })
      setSliders(resetSliders)
      setImagePreview(null)
      previewUrlRef.current = null
      setUseSizes(false)
      setSizes([{ label: '', price: '' }])
      setFormKey((k) => k + 1)
      setOpen(false)
    })
  }

  if (!open) {
    return (
      <div className="px-5 py-3 bg-zinc-950/30 border-t border-zinc-800">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-orange-400 transition-colors cursor-pointer"
        >
          <IconPlus className="w-3.5 h-3.5" />
          Ajouter un plat
        </button>
      </div>
    )
  }

  return (
    <div className="border-t border-zinc-800 bg-zinc-950/30">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/60">
        <span className="text-xs font-medium text-zinc-300">Nouveau plat</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
          aria-label="Fermer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form key={formKey} onSubmit={handleSubmit} className="p-5 space-y-4">
        <input type="hidden" name="category_id" value={categoryId} />

        {/* Nom + Prix */}
        <div className="grid grid-cols-3 gap-2">
          <input
            name="name"
            required
            placeholder="Nom du plat *"
            className={INPUT + ' col-span-2'}
          />
          {!useSizes && (
            <div className="relative">
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="Prix *"
                className={INPUT + ' pr-6'}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 pointer-events-none">€</span>
            </div>
          )}
          {useSizes && (
            <input type="hidden" name="price" value="0" />
          )}
        </div>

        {/* Tailles / Variantes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-zinc-500">Plusieurs tailles</label>
            <button
              type="button"
              onClick={() => setUseSizes(v => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors ${
                useSizes ? 'bg-orange-500' : 'bg-zinc-700'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                useSizes ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
          </div>
          {useSizes && (
            <div className="space-y-1.5">
              {sizes.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    value={s.label}
                    onChange={e => setSizes(prev => prev.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))}
                    placeholder="Label (25cl, 50cl…)"
                    className={INPUT + ' flex-1'}
                  />
                  <div className="relative w-24 shrink-0">
                    <input
                      value={s.price}
                      onChange={e => setSizes(prev => prev.map((x, idx) => idx === i ? { ...x, price: e.target.value } : x))}
                      type="number" step="0.01" min="0"
                      placeholder="Prix"
                      className={INPUT + ' pr-5'}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 pointer-events-none">€</span>
                  </div>
                  {sizes.length > 1 && (
                    <button type="button" onClick={() => setSizes(prev => prev.filter((_, idx) => idx !== i))}
                      className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-red-900/40 text-zinc-500 hover:text-red-400 flex items-center justify-center transition-colors shrink-0">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setSizes(prev => [...prev, { label: '', price: '' }])}
                className="text-xs text-zinc-500 hover:text-orange-400 transition-colors flex items-center gap-1 mt-0.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Ajouter une taille
              </button>
              <input
                type="hidden"
                name="sizes"
                value={JSON.stringify(
                  sizes.filter(s => s.label && s.price).map(s => ({ label: s.label, price: parseFloat(s.price) }))
                )}
              />
            </div>
          )}
        </div>

        {/* Description */}
        <input
          name="description"
          placeholder="Description (optionnel)"
          className={INPUT}
        />

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
            <input
              type="file"
              name="image"
              accept="image/*"
              className="sr-only"
              onChange={handleImageChange}
            />
          </label>
        </div>

        {/* Allergènes */}
        <input
          name="allergens"
          placeholder="Allergènes : gluten, lactose, arachides…"
          className={INPUT}
        />

        {/* Attributs spécifiques au type */}
        {fields.map((attr) => (
          <div key={attr.key}>
            <p className="text-xs text-zinc-500 mb-2">{attr.label}</p>

            {/* Multiselect → checkboxes visuels */}
            {attr.type === 'multiselect' && (
              <div className="flex flex-wrap gap-1.5">
                {attr.options.map((opt) => (
                  <label key={opt} className="cursor-pointer select-none">
                    <input type="checkbox" name={attr.key} value={opt} className="sr-only peer" />
                    <span className="block text-xs px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 peer-checked:border-orange-500/50 peer-checked:bg-orange-500/12 peer-checked:text-orange-300 transition-colors">
                      {opt}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Select → radio visuels */}
            {attr.type === 'select' && (
              <div className="flex flex-wrap gap-1.5">
                {attr.options.map((opt) => (
                  <label key={opt} className="cursor-pointer select-none">
                    <input type="radio" name={attr.key} value={opt} className="sr-only peer" />
                    <span className="block text-xs px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 peer-checked:border-orange-500/50 peer-checked:bg-orange-500/12 peer-checked:text-orange-300 transition-colors">
                      {opt}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Slider */}
            {attr.type === 'slider' && (
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  name={attr.key}
                  min={attr.min}
                  max={attr.max}
                  step={attr.step}
                  value={sliders[attr.key] ?? attr.min}
                  onChange={(e) =>
                    setSliders((prev) => ({
                      ...prev,
                      [attr.key]: parseFloat(e.target.value),
                    }))
                  }
                  className="flex-1 accent-orange-500"
                />
                <span className="text-sm font-semibold text-orange-400 tabular-nums w-14 text-right shrink-0">
                  {(sliders[attr.key] ?? attr.min).toFixed(attr.step < 1 ? 1 : 0)}
                  {attr.unit}
                </span>
              </div>
            )}
          </div>
        ))}

        {/* Végé / Vegan */}
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer select-none">
            <input type="checkbox" name="is_vegetarian" className="sr-only peer" />
            <span className="block text-xs px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600 peer-checked:border-lime-500/40 peer-checked:bg-lime-500/10 peer-checked:text-lime-400 transition-colors">
              🌿 Végétarien
            </span>
          </label>
          <label className="cursor-pointer select-none">
            <input type="checkbox" name="is_vegan" className="sr-only peer" />
            <span className="block text-xs px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600 peer-checked:border-pink-500/40 peer-checked:bg-pink-500/10 peer-checked:text-pink-400 transition-colors">
              🫘 Vegan
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer"
          >
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
    </div>
  )
}
