'use client'

import { useState } from 'react'
import { startTrial, createCheckoutSession } from '@/app/actions/subscription'

type Plan = 'monthly' | 'yearly'

interface Props {
  expired: boolean
  isAdmin: boolean
  adminSkipAction: () => Promise<void>
}

const FEATURES = [
  'Menus digitaux illimités',
  'Plan de salle & QR codes par table',
  'Commandes en temps réel',
  'Paiements en ligne via Stripe',
  'Statistiques et rapports',
  'Maintenance & mises à jour incluses',
]

export default function PricingToggle({ expired, isAdmin, adminSkipAction }: Props) {
  const [plan, setPlan] = useState<Plan>('monthly')

  return (
    <div className="w-full max-w-md flex flex-col items-center">

      {/* Toggle mensuel / annuel */}
      <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl mb-8 w-full">
        <button
          type="button"
          onClick={() => setPlan('monthly')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
            plan === 'monthly'
              ? 'bg-zinc-700 text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Mensuel
        </button>
        <button
          type="button"
          onClick={() => setPlan('yearly')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors relative ${
            plan === 'yearly'
              ? 'bg-zinc-700 text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Annuel
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white whitespace-nowrap">
            2 mois offerts
          </span>
        </button>
      </div>

      {/* Carte prix */}
      <div className="w-full bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-3xl p-8 mb-8 shadow-2xl">
        {plan === 'monthly' ? (
          <>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-extrabold text-white">20 €</span>
              <span className="text-zinc-400 text-sm">/mois HT</span>
            </div>
            <p className="text-zinc-500 text-xs mb-6">+ 1 % de commission sur les paiements en ligne</p>
          </>
        ) : (
          <>
            <div className="flex items-end gap-3 mb-1">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-white">200 €</span>
                  <span className="text-zinc-400 text-sm">/an HT</span>
                </div>
                <p className="text-sm text-orange-400 font-medium mt-0.5">
                  soit 16,67 € / mois — économisez 40 €
                </p>
              </div>
            </div>
            <p className="text-zinc-500 text-xs mb-6">+ 1 % de commission sur les paiements en ligne</p>
          </>
        )}

        <ul className="space-y-3">
          {FEATURES.map((feat) => (
            <li key={feat} className="flex items-center gap-2.5 text-sm text-zinc-300">
              <svg className="w-4 h-4 text-orange-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {feat}
            </li>
          ))}
        </ul>
      </div>

      {/* CTAs */}
      <div className="w-full flex flex-col gap-3">
        {!expired && (
          <form action={startTrial}>
            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold text-base py-4 rounded-2xl transition-colors shadow-lg shadow-orange-900/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Démarrer l&apos;essai gratuit — 7 jours
            </button>
          </form>
        )}

        <form action={createCheckoutSession}>
          <input type="hidden" name="plan" value={plan} />
          <button
            type="submit"
            className="w-full border border-zinc-700 hover:border-zinc-500 text-white font-semibold text-sm py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
            </svg>
            {expired ? 'S\'abonner' : 'S\'abonner directement'} —{' '}
            {plan === 'monthly' ? '20 €/mois' : '200 €/an'}
          </button>
        </form>
      </div>

      {/* Bouton admin */}
      {isAdmin && (
        <div className="mt-10 pt-6 border-t border-zinc-800/60 w-full flex flex-col items-center gap-2">
          <p className="text-xs text-zinc-600">Mode administrateur</p>
          <form action={adminSkipAction}>
            <button
              type="submit"
              className="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-700 px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
              Passer (mode test admin)
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
