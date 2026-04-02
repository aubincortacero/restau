'use client'

import { useRef, useState, useTransition } from 'react'
import { deleteAccount } from '@/app/actions/auth'

export default function DeleteAccountButton() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const confirmed = value === 'SUPPRIMER'

  function handleOpen() {
    setOpen(true)
    setValue('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleConfirm() {
    if (!confirmed) return
    startTransition(async () => {
      await deleteAccount()
    })
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="text-xs text-red-400 hover:text-red-300 border border-red-900/60 hover:border-red-800 px-4 py-2 rounded-lg transition-colors cursor-pointer"
      >
        Supprimer mon compte
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-zinc-900 border border-red-900/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-1">Supprimer le compte</h3>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Cette action est <strong className="text-red-400">irréversible</strong>. Toutes vos données (restaurant, menu, commandes) seront définitivement supprimées.
            </p>
            <p className="text-xs text-zinc-500 mb-2">
              Tapez <strong className="text-red-400 font-mono">SUPPRIMER</strong> pour confirmer :
            </p>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="SUPPRIMER"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 mb-4 font-mono"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                disabled={!confirmed || isPending}
                className="flex-1 text-xs bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                {isPending ? 'Suppression…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
