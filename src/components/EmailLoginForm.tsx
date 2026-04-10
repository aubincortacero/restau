'use client'

import { useFormStatus } from 'react-dom'
import { signInWithEmail } from '@/app/actions/auth'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full px-4 py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors duration-150 cursor-pointer"
    >
      {pending ? 'Connexion…' : 'Se connecter'}
    </button>
  )
}

export default function EmailLoginForm() {
  return (
    <form action={signInWithEmail} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-xs font-medium text-zinc-400">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="vous@restaurant.fr"
          className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 focus:border-zinc-500 outline-none text-sm text-white placeholder:text-zinc-600 rounded-xl transition-colors"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-xs font-medium text-zinc-400">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 focus:border-zinc-500 outline-none text-sm text-white placeholder:text-zinc-600 rounded-xl transition-colors"
        />
      </div>
      <SubmitButton />
    </form>
  )
}
