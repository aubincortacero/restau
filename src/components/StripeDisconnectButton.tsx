'use client'

import { useState, useTransition } from 'react'
import { disconnectStripeAccount } from '@/app/actions/stripe-connect'

export default function StripeDisconnectButton() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      await disconnectStripeAccount()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-4 py-2 rounded-lg transition-colors cursor-pointer"
      >
        Déconnecter
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-1">Déconnecter Stripe</h3>
            <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
              Les paiements en ligne seront <strong className="text-white">immédiatement désactivés</strong> pour vos clients. Vous pourrez reconnecter un compte Stripe à tout moment.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="flex-1 text-xs bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                {isPending ? 'Déconnexion…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
