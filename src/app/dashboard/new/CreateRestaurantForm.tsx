'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { createRestaurant } from '@/app/actions/restaurant'

type State = { error?: string | null }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 rounded-xl transition-colors cursor-pointer mt-2 flex items-center justify-center gap-2"
    >
      {pending && (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {pending ? 'Création…' : 'Créer mon restaurant'}
    </button>
  )
}

const INPUT = 'w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500'

export default function CreateRestaurantForm() {
  const [state, action] = useActionState<State, FormData>(createRestaurant, { error: null })

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      {state.error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-950 border border-red-800 text-sm text-red-300">
          {state.error}
        </div>
      )}

      <form action={action} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Nom du restaurant <span className="text-red-400">*</span>
          </label>
          <input
            name="name"
            required
            placeholder="Le Petit Bistrot"
            className={INPUT}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Adresse
          </label>
          <input
            name="address"
            placeholder="12 rue de la Paix, Paris"
            className={INPUT}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Téléphone
          </label>
          <input
            name="phone"
            type="tel"
            placeholder="06 00 00 00 00"
            className={INPUT}
          />
        </div>

        <SubmitButton />
      </form>
    </div>
  )
}
