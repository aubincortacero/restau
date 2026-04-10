'use client'

import { useTransition, useState } from 'react'
import { createCategory } from '@/app/actions/restaurant'
import { CATEGORY_TYPES, CategoryTypeId } from '@/lib/category-types'
import { IconPlus } from './icons'

export default function AddCategoryForm({ restaurantId }: { restaurantId: string }) {
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [categoryType, setCategoryType] = useState<CategoryTypeId>('standard')
  const [formKey, setFormKey] = useState(0)

  function handleNext(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (name.trim()) setStep(2)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData()
    formData.set('restaurant_id', restaurantId)
    formData.set('name', name.trim())
    formData.set('category_type', categoryType)
    startTransition(async () => {
      await createCategory(formData)
      setName('')
      setCategoryType('standard')
      setStep(1)
      setFormKey((k) => k + 1)
    })
  }

  return (
    <div key={formKey} className="space-y-4">
      {/* ── Indicateur d'étapes ── */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${step >= 1 ? 'bg-orange-500 text-white' : 'bg-zinc-700 text-zinc-400'}`}>1</div>
          <span className={`text-xs transition-colors ${step === 1 ? 'text-white font-medium' : 'text-zinc-500'}`}>Nom</span>
        </div>
        <div className="flex-1 h-px bg-zinc-700 mx-1" />
        <div className="flex items-center gap-1.5">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${step === 2 ? 'bg-orange-500 text-white' : 'bg-zinc-700 text-zinc-400'}`}>2</div>
          <span className={`text-xs transition-colors ${step === 2 ? 'text-white font-medium' : 'text-zinc-500'}`}>Type</span>
        </div>
      </div>

      {/* ── Étape 1 : Nom ── */}
      {step === 1 && (
        <form onSubmit={handleNext} className="space-y-4">
          <div>
            <p className="text-xs text-zinc-400 mb-2">Comment s&apos;appelle cette catégorie ?</p>
            <input
              name="name"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Entrées, Vins rouges, Desserts maison…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Suivant
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </form>
      )}

      {/* ── Étape 2 : Type ── */}
      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-xs text-zinc-400 mb-2.5">
              Quel type de contenu pour <span className="text-white font-medium">&laquo;&nbsp;{name}&nbsp;&raquo;</span> ?
            </p>
            <div className="flex flex-col gap-0.5">
              {CATEGORY_TYPES.map((ct) => (
                <label key={ct.id} className="cursor-pointer select-none">
                  <input
                    type="radio"
                    name="category_type"
                    value={ct.id}
                    checked={categoryType === ct.id}
                    onChange={() => setCategoryType(ct.id)}
                    className="sr-only peer"
                  />
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors hover:bg-zinc-800 peer-checked:bg-orange-500/10">
                    <span className="text-base leading-none shrink-0">{ct.emoji}</span>
                    <span className="text-sm font-medium text-white peer-checked:text-orange-300 truncate">{ct.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
              </svg>
              Retour
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <IconPlus className="w-3.5 h-3.5" />
              {isPending ? 'Création…' : 'Créer la catégorie'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
