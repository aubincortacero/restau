'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deletePageById } from '@/app/actions/restaurant'

export default function DeletePageButton({ pageId, title }: { pageId: string; title: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Supprimer la page "${title}" ?`)) return
    startTransition(async () => {
      await deletePageById(pageId)
      router.push('/dashboard/website')
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      className="text-xs text-zinc-600 hover:text-red-400 disabled:opacity-50 transition-colors px-2 py-1 rounded-lg"
    >
      {pending ? 'Suppression…' : 'Supprimer'}
    </button>
  )
}
