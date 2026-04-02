import { createConnectOnboardingLink } from '@/app/actions/stripe-connect'

// Page de refresh — Stripe redirige ici si le lien d'onboarding a expiré
// On génère automatiquement un nouveau lien
export default async function StripeConnectRefreshPage() {
  await createConnectOnboardingLink()
}
