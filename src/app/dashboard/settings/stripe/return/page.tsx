import { redirect } from 'next/navigation'

// Page de retour après l'onboarding Stripe — Stripe redirige ici quand l'utilisateur termine (ou quitte) le flux
export default function StripeConnectReturnPage() {
  redirect('/dashboard/settings/stripe')
}
