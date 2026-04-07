'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPage } from '@/app/actions/restaurant'

export default function NewPageButton({ restaurantId }: { restaurantId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleCreate() {
    if (!title.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await createPage(restaurantId, title.trim())
      if (result.error) {
        setError(result.error)
      } else if (result.pageId) {
        router.push(`/dashboard/website/${result.pageId}`)
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Nouvelle page
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleCreate()}
        placeholder="Titre de la page…"
        autoFocus
        className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 w-48"
      />
      <button
        onClick={handleCreate}
        disabled={!title.trim() || pending}
        className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
      >
        {pending && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        Créer
      </button>
      <button
        onClick={() => { setOpen(false); setTitle(''); setError(null) }}
        className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 flex items-center justify-center transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
      {error && <p className="w-full text-xs text-red-400">{error}</p>}
    </div>
  )
}
