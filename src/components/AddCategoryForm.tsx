'use client'

import { useTransition, useState } from 'react'
import { createCategory } from '@/app/actions/restaurant'
import { CATEGORY_TYPES } from '@/lib/category-types'
import { IconPlus } from './icons'

export default function AddCategoryForm({ restaurantId }: { restaurantId: string }) {
  const [isPending, startTransition] = useTransition()
  const [formKey, setFormKey] = useState(0)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await createCategory(formData)
      setFormKey((k) => k + 1)
    })
  }

  return (
    <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="restaurant_id" value={restaurantId} />

      <input
        name="name"
        required
        placeholder="Ex : Entrées, Pizzas, Vins du monde…"
        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
      />

      <div>
        <p className="text-xs text-zinc-500 mb-2.5">Type de catégorie</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CATEGORY_TYPES.map((ct) => (
            <label key={ct.id} className="cursor-pointer select-none">
              <input
                type="radio"
                name="category_type"
                value={ct.id}
                defaultChecked={ct.id === 'standard'}
                className="sr-only peer"
              />
              <div className="border border-zinc-700 bg-zinc-800/50 rounded-xl p-3 hover:border-zinc-600 transition-colors peer-checked:border-orange-500/60 peer-checked:bg-orange-500/8">
                <div className="text-xl mb-1.5 leading-none">{ct.emoji}</div>
                <p className="text-xs font-semibold text-white">{ct.label}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5 leading-snug">{ct.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
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
  )
}
