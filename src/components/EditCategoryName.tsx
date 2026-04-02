'use client'

import { useRef, useState, useTransition } from 'react'
import { updateCategory } from '@/app/actions/restaurant'

export default function EditCategoryName({ id, name }: { id: string; name: string }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setValue(name)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function cancel() {
    setValue(name)
    setEditing(false)
  }

  function submit() {
    if (!value.trim() || value.trim() === name) { setEditing(false); return }
    const fd = new FormData()
    fd.set('id', id)
    fd.set('name', value.trim())
    startTransition(async () => {
      await updateCategory(fd)
      setEditing(false)
    })
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') submit()
    if (e.key === 'Escape') cancel()
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={submit}
          disabled={isPending}
          autoFocus
          className="bg-zinc-800 border border-orange-500/50 rounded-lg px-2 py-1 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30 w-48"
        />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <h3 className="font-medium text-white">{name}</h3>
      <button
        type="button"
        onClick={startEdit}
        className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer rounded"
        title="Renommer"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
        </svg>
      </button>
    </div>
  )
}
