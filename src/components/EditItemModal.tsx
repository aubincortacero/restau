'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { updateItem } from '@/app/actions/restaurant'
import { CATEGORY_ATTRIBUTES } from '@/lib/category-types'
import type { CategoryTypeId } from '@/lib/category-types'

const INPUT = "bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 w-full"

type Attributes = Record<string, string | string[]>

interface ItemData {
  id: string
  name: string
  description: string | null
  price: number
  happy_hour_price: number | null
  allergens: string[]
  is_vegetarian: boolean
  is_vegan: boolean
  image_url: string | null
  attributes: Attributes | null
}

interface Props {
  item: ItemData
  categoryType: CategoryTypeId
}

function ModalForm({ item, categoryType, onClose }: Props & { onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const previewUrlRef = useRef<string | null>(null)
  const fields = CATEGORY_ATTRIBUTES[categoryType] ?? []

  const [sliders, setSliders] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    fields.forEach((f) => {
      if (f.type === 'slider') {
        const val = item.attributes?.[f.key]
        init[f.key] = typeof val === 'string' ? parseFloat(val) : f.min
      }
    })
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
      await updateItem(formData)
      onClose()
    })
  }

  const currentImage = imagePreview ?? item.image_url

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <input type="hidden" name="id" value={item.id} />

      {/* Nom + Prix */}
      <div className="grid grid-cols-3 gap-2">
        <input name="name" required defaultValue={item.name} placeholder="Nom du plat *" className={INPUT + ' col-span-2'} />
        <div className="relative">
          <input name="price" type="number" step="0.01" min="0" required defaultValue={item.price} placeholder="Prix *" className={INPUT + ' pr-6'} />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 pointer-events-none">€</span>
        </div>
      </div>

      {/* Prix Happy Hour */}
      <div>
        <label className="block text-xs text-zinc-500 mb-1.5">Prix Happy Hour <span className="text-zinc-600">(optionnel)</span></label>
        <div className="relative w-40">
          <input
            name="happy_hour_price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={item.happy_hour_price ?? ''}
            placeholder="—"
            className={INPUT + ' pr-6'}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-500 pointer-events-none">🍹</span>
        </div>
      </div>
      <input name="description" defaultValue={item.description ?? ''} placeholder="Description (optionnel)" className={INPUT} />

      {/* Image */}
      <div>
        <p className="text-xs text-zinc-500 mb-2">Photo du plat</p>
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="w-14 h-14 rounded-xl bg-zinc-800 border border-zinc-700 group-hover:border-orange-500/40 overflow-hidden shrink-0 transition-colors flex items-center justify-center">
            {currentImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-xs text-zinc-300 group-hover:text-white transition-colors">
              {currentImage ? "Changer l'image" : 'Choisir une image'}
            </p>
            <p className="text-xs text-zinc-600 mt-0.5">JPG, PNG, WebP — max 5 Mo</p>
          </div>
          <input type="file" name="image" accept="image/*" className="sr-only" onChange={handleImageChange} />
        </label>
      </div>

      {/* Allergènes */}
      <input name="allergens" defaultValue={item.allergens?.join(', ') ?? ''} placeholder="Allergènes : gluten, lactose, arachides…" className={INPUT} />

      {/* Attributs dynamiques */}
      {fields.map((attr) => (
        <div key={attr.key}>
          <p className="text-xs text-zinc-500 mb-2">{attr.label}</p>

          {attr.type === 'multiselect' && (
            <div className="flex flex-wrap gap-1.5">
              {attr.options.map((opt) => {
                const raw = item.attributes?.[attr.key]
                const checked = Array.isArray(raw) ? raw.includes(opt) : raw === opt
                return (
                  <label key={opt} className="cursor-pointer select-none">
                    <input type="checkbox" name={attr.key} value={opt} defaultChecked={checked} className="sr-only peer" />
                    <span className="block text-xs px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 peer-checked:border-orange-500/50 peer-checked:bg-orange-500/12 peer-checked:text-orange-300 transition-colors">{opt}</span>
                  </label>
                )
              })}
            </div>
          )}

          {attr.type === 'select' && (
            <div className="flex flex-wrap gap-1.5">
              {attr.options.map((opt) => (
                <label key={opt} className="cursor-pointer select-none">
                  <input type="radio" name={attr.key} value={opt} defaultChecked={item.attributes?.[attr.key] === opt} className="sr-only peer" />
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

      {/* Végé / Vegan */}
      <div className="flex flex-wrap gap-2">
        <label className="cursor-pointer select-none">
          <input type="checkbox" name="is_vegetarian" defaultChecked={item.is_vegetarian} className="sr-only peer" />
          <span className="block text-xs px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600 peer-checked:border-lime-500/40 peer-checked:bg-lime-500/10 peer-checked:text-lime-400 transition-colors">🌿 Végétarien</span>
        </label>
        <label className="cursor-pointer select-none">
          <input type="checkbox" name="is_vegan" defaultChecked={item.is_vegan} className="sr-only peer" />
          <span className="block text-xs px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600 peer-checked:border-pink-500/40 peer-checked:bg-pink-500/10 peer-checked:text-pink-400 transition-colors">🫘 Vegan</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <button type="button" onClick={onClose} className="text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer">
          Annuler
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer"
        >
          {isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  )
}

export default function EditItemModal({ item, categoryType }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-1.5 text-zinc-500 hover:text-orange-400 transition-colors cursor-pointer rounded-lg hover:bg-orange-400/10"
        title="Modifier le plat"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
              <h2 className="text-sm font-medium text-white">Modifier — {item.name}</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ModalForm item={item} categoryType={categoryType} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
