'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import OnboardingSlider from '@/components/OnboardingSlider'
import { startTrial, createCheckoutSession, adminSkipSubscription } from '@/app/actions/subscription'

interface Props {
  expired: boolean
  isAdmin: boolean
  email: string
  trialAlreadyUsed: boolean
}

export default function SubscribeWrapper({ expired, isAdmin, email, trialAlreadyUsed }: Props) {
  const [ready, setReady] = useState(false)
  const [showPricing, setShowPricing] = useState(false)

  const onboardingKey = `qomand_onboarding_done_${email}`

  useEffect(() => {
    const done = expired || localStorage.getItem(onboardingKey) === '1'
    setShowPricing(done)
    setReady(true)
  }, [expired, onboardingKey])

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem(onboardingKey, '1')
    setShowPricing(true)
  }, [onboardingKey])

  if (!ready) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!showPricing) {
    return <OnboardingSlider onComplete={handleOnboardingComplete} isAdmin={isAdmin} />
  }

  return (
    <div className="relative min-h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">

      {/* ── Photo hero ────────────────────────────────────────────────────
          Remplacez /restaurant-hero.jpg dans /public par votre propre photo.
          En attendant, un dégradé cinématique est utilisé.
      ─────────────────────────────────────────────────────────────────── */}
      <div className="absolute inset-0">
        {/* Fond photo — remplacer par <Image> quand la photo est dispo */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/restaurant-hero.jpg')",
            backgroundColor: '#0c0a09', // fallback si pas d'image
          }}
        />
        {/* Grain cinématique */}
        <div className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          }}
        />
        {/* Dégradé ambiance restaurant — visible sans photo */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-950/60 via-zinc-950/40 to-zinc-950/80" />
        {/* Overlay fade vers le bas pour lisibilité du texte */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" style={{ top: '30%' }} />
      </div>

      {/* ── Bouton fermer (comme HingeX) ── */}
      <div className="relative z-10 flex justify-end px-5 pt-5">
        <span className="text-xs text-white/40">{email}</span>
      </div>

      {/* ── Contenu bas de page ── */}
      <div className="relative z-10 mt-auto px-6 pb-10 flex flex-col items-center">

        {/* Headline */}
        <h1 className="text-[2.6rem] leading-[1.1] font-extrabold text-center text-white mb-3 max-w-xs">
          {expired
            ? <>Revenez sur<br />Qomand</>
            : <>Votre restaurant,<br />version digitale</>
          }
        </h1>

        {/* Sous-titre */}
        <p className="text-white/60 text-center text-sm max-w-xs mb-8 leading-relaxed">
          {expired
            ? '20 €/mois · abonnez-vous pour continuer à recevoir vos commandes.'
            : '7 jours offerts, puis 20 €/mois. Menus, tables, paiements et commandes depuis un QR code.'
          }
        </p>

        {/* CTA principal */}
        <div className="w-full max-w-sm flex flex-col gap-3">
          {!expired && (
            trialAlreadyUsed ? (
              <div className="w-full flex items-start gap-3 bg-red-950/40 border border-red-800/50 rounded-2xl px-4 py-3.5 text-left mb-1">
                <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                <div>
                  <p className="text-sm font-semibold text-red-300">Essai gratuit déjà utilisé</p>
                  <p className="text-xs text-red-400/80 mt-0.5">Cet email a déjà bénéficié d&apos;un essai gratuit.</p>
                </div>
              </div>
            ) : (
              <form action={startTrial} className="w-full">
                <button
                  type="submit"
                  className="w-full bg-white hover:bg-zinc-100 active:bg-zinc-200 text-zinc-950 font-bold text-base py-4 rounded-2xl transition-colors shadow-xl cursor-pointer"
                >
                  Démarrer gratuitement
                </button>
              </form>
            )
          )}

          <form action={createCheckoutSession} className="w-full">
            <input type="hidden" name="plan" value="monthly" />
            <button
              type="submit"
              className={`w-full font-semibold text-sm py-4 rounded-2xl transition-colors cursor-pointer ${
                expired
                  ? 'bg-white hover:bg-zinc-100 text-zinc-950 shadow-xl'
                  : 'border border-white/25 hover:border-white/50 text-white bg-white/5 hover:bg-white/10 backdrop-blur-sm'
              }`}
            >
              {expired ? "S'abonner — 20 €/mois" : "S'abonner directement — 20 €/mois"}
            </button>
          </form>
        </div>

        {/* Légal */}
        <p className="mt-5 text-xs text-white/30 text-center">
          Sans engagement · Résiliable à tout moment ·{' '}
          <Link href="/legal/cgu" className="hover:text-white/60 transition-colors underline">
            CGV
          </Link>
        </p>

        {/* Admin bypass */}
        {isAdmin && (
          <form action={adminSkipSubscription} className="mt-6">
            <button
              type="submit"
              className="text-xs text-zinc-600 hover:text-zinc-400 border border-zinc-800 hover:border-zinc-700 px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
              Passer (admin)
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
