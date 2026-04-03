import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getSubscriptionStatus,
  isAdmin,
  isAccessGranted,
} from '@/lib/subscription'
import { adminSkipSubscription } from '@/app/actions/subscription'
import PricingToggle from './PricingToggle'
import Link from 'next/link'

export default async function SubscribePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { status, trialEndsAt } = await getSubscriptionStatus(user.id)

  // Déjà abonné ou en trial valide → retour au dashboard
  if (isAccessGranted(status)) redirect('/dashboard')

  const expired = status === 'expired'
  const admin = isAdmin(user.email)

  return (
    <div className="relative min-h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">

      {/* ── Background décoratif ── */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
        {/* Grand dégradé chaud centré */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-orange-600/10 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-orange-900/10 blur-[100px]" />
        {/* Grille subtile */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.025]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        {/* Cercles bokeh */}
        <div className="absolute top-1/4 right-10 w-3 h-3 rounded-full bg-orange-500/30 blur-sm" />
        <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 rounded-full bg-orange-400/20" />
        <div className="absolute bottom-1/3 left-1/4 w-2 h-2 rounded-full bg-amber-500/20 blur-sm" />
        <div className="absolute top-2/3 left-10 w-1 h-1 rounded-full bg-orange-300/30" />
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 px-6 pt-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.5 0-2.75.75-3.5 1.9M12 8c1.5 0 2.75.75 3.5 1.9M12 8V5m0 13v-2m-6.5-3H3m18 0h-2.5M6.34 17.66l-1.42 1.42M19.08 5.92l-1.42 1.42M17.66 17.66l1.42 1.42M4.92 5.92l1.42 1.42" />
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight">Qomand</span>
        </div>
        <span className="text-xs text-zinc-500">{user.email}</span>
      </header>

      {/* ── Contenu principal ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">

        {/* Pill badge */}
        <div className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 mb-6">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
          </svg>
          {expired ? 'Votre essai a expiré' : 'Lancez votre restaurant digital'}
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-extrabold text-center leading-tight mb-4 max-w-xl">
          {expired
            ? <>Revenez sur <span className="text-orange-500">Qomand</span></>
            : <>Votre restaurant,<br /><span className="text-orange-500">version digitale</span></>
          }
        </h1>

        <p className="text-zinc-400 text-center text-base max-w-md mb-10 leading-relaxed">
          {expired
            ? 'Votre période d\'essai est terminée. Abonnez-vous pour continuer à recevoir vos commandes.'
            : 'Menus, tables, commandes et paiements. Tout depuis un simple QR code posé sur vos tables.'
          }
        </p>

        <PricingToggle expired={expired} isAdmin={admin} adminSkipAction={adminSkipSubscription} />

        {/* Légal */}
        <p className="mt-4 text-xs text-zinc-600 text-center">
          Sans engagement · Résiliable à tout moment ·{' '}
          <Link href="/legal/cgu" className="hover:text-zinc-400 transition-colors underline">
            CGV
          </Link>
        </p>
      </main>
    </div>
  )
}
