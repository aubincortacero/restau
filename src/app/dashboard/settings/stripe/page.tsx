import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import {
  createConnectOnboardingLink,
  createStripeLoginLink,
  disconnectStripeAccount,
} from '@/app/actions/stripe-connect'

export default async function SettingsStripePage() {
  // Vérification que la clé Stripe est configurée
  if (!process.env.STRIPE_SECRET_KEY) {
    return (
      <div className="max-w-xl">
        <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-amber-400 mb-1">Configuration manquante</h2>
          <p className="text-xs text-zinc-400">La variable d&apos;environnement <code className="text-amber-300">STRIPE_SECRET_KEY</code> n&apos;est pas définie sur ce déploiement.</p>
        </div>
      </div>
    )
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id, stripe_account_id')
    .eq('owner_id', user.id)
    .single()

  if (restaurantError?.message?.includes('column') || restaurantError?.code === '42703') {
    return (
      <div className="max-w-xl">
        <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-amber-400 mb-2">Migration requise</h2>
          <p className="text-xs text-zinc-400 mb-3">Exécutez cette requête dans Supabase → SQL Editor :</p>
          <pre className="bg-zinc-800 rounded-lg p-3 text-xs text-zinc-300 overflow-x-auto">
            ALTER TABLE restaurants{'\n'}ADD COLUMN IF NOT EXISTS stripe_account_id text;
          </pre>
        </div>
      </div>
    )
  }

  if (!restaurant) redirect('/dashboard/new')

  // Charger le statut du compte Stripe si connecté
  let account: Stripe.Account | null = null
  if (restaurant.stripe_account_id) {
    try {
      account = await stripe.accounts.retrieve(restaurant.stripe_account_id)
    } catch {
      // Compte supprimé ou invalide — on nettoie
      await supabase
        .from('restaurants')
        .update({ stripe_account_id: null })
        .eq('id', restaurant.id)
    }
  }

  const isConnected = !!account
  const chargesEnabled = account?.charges_enabled ?? false
  const payoutsEnabled = account?.payouts_enabled ?? false
  const detailsSubmitted = account?.details_submitted ?? false

  return (
    <div className="max-w-xl space-y-6">
      {/* Statut */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-white">Compte Stripe Connect</h2>
          {isConnected && (
            <StatusBadge chargesEnabled={chargesEnabled} detailsSubmitted={detailsSubmitted} />
          )}
        </div>
        <p className="text-xs text-zinc-500 mb-6">
          Connectez votre compte bancaire pour recevoir les paiements de vos clients directement.
        </p>

        {!isConnected ? (
          /* ── Non connecté ── */
          <div className="space-y-4">
            <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4 text-sm text-zinc-400 leading-relaxed">
              Une fois connecté, les paiements de vos clients seront automatiquement virés sur votre compte bancaire via Stripe.
            </div>
            <form action={createConnectOnboardingLink}>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-[#635BFF] hover:bg-[#5851DB] text-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors cursor-pointer"
              >
                <StripeLogo />
                Connecter mon compte bancaire
              </button>
            </form>
          </div>
        ) : !detailsSubmitted ? (
          /* ── Onboarding incomplet ── */
          <div className="space-y-4">
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-sm text-amber-300 leading-relaxed">
              Votre inscription Stripe est incomplète. Finalisez-la pour commencer à encaisser.
            </div>
            <form action={createConnectOnboardingLink}>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-[#635BFF] hover:bg-[#5851DB] text-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors cursor-pointer"
              >
                <StripeLogo />
                Finaliser l&apos;inscription
              </button>
            </form>
          </div>
        ) : (
          /* ── Connecté et actif ── */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-zinc-800/60 px-4 py-3">
                <p className="text-xs text-zinc-500 mb-1">Paiements</p>
                <p className={`text-sm font-medium ${chargesEnabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {chargesEnabled ? 'Activés' : 'En attente'}
                </p>
              </div>
              <div className="rounded-xl bg-zinc-800/60 px-4 py-3">
                <p className="text-xs text-zinc-500 mb-1">Virements</p>
                <p className={`text-sm font-medium ${payoutsEnabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {payoutsEnabled ? 'Activés' : 'En attente'}
                </p>
              </div>
            </div>

            <form action={createStripeLoginLink}>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors cursor-pointer border border-zinc-700"
              >
                <StripeLogo className="opacity-70" />
                Accéder au tableau de bord Stripe
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Déconnexion */}
      {isConnected && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-1">Déconnecter le compte</h3>
          <p className="text-xs text-zinc-500 mb-4">
            Vous pourrez reconnecter un compte à tout moment. Les paiements en ligne seront désactivés.
          </p>
          <form action={disconnectStripeAccount}>
            <button
              type="submit"
              className="text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Déconnecter
            </button>
          </form>
        </div>
      )}

      {/* Note SQL */}
      {/* 
        Migration Supabase requise :
        ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS stripe_account_id text;
      */}
    </div>
  )
}

function StatusBadge({
  chargesEnabled,
  detailsSubmitted,
}: {
  chargesEnabled: boolean
  detailsSubmitted: boolean
}) {
  if (chargesEnabled) {
    return (
      <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Actif
      </span>
    )
  }
  if (detailsSubmitted) {
    return (
      <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        En vérification
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-zinc-700/50 text-zinc-400 ring-1 ring-zinc-600/30">
      Incomplet
    </span>
  )
}

function StripeLogo({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
    </svg>
  )
}
