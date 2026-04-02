import Link from 'next/link'

export const metadata = { title: 'Politique de confidentialité — Qomand' }

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-300 py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard/settings" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-8 inline-block">
          ← Retour aux paramètres
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2">Politique de Confidentialité</h1>
        <p className="text-sm text-zinc-500 mb-10">Dernière mise à jour : avril 2026</p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-white mb-3">1. Responsable du traitement</h2>
            <p>Le responsable du traitement des données est Aubin Cortacero, éditeur de la plateforme Qomand. Contact : <a href="mailto:contact@qomand.fr" className="text-orange-400 hover:text-orange-300 underline">contact@qomand.fr</a></p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">2. Données collectées</h2>
            <p>Nous collectons les données suivantes :</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
              <li><strong className="text-zinc-300">Restaurateurs :</strong> adresse email (via Google OAuth), nom affiché, avatar, informations du restaurant (nom, adresse, téléphone)</li>
              <li><strong className="text-zinc-300">Clients finaux :</strong> adresse email (optionnelle, pour reçu de commande), contenu des commandes passées</li>
              <li><strong className="text-zinc-300">Données de paiement :</strong> traitées directement par Stripe — Qomand ne stocke aucune donnée bancaire</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">3. Finalités du traitement</h2>
            <p>Les données sont utilisées pour :</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
              <li>L'authentification et la gestion des comptes restaurateurs</li>
              <li>La gestion et l'affichage des menus et commandes</li>
              <li>L'envoi de reçus de commande aux clients (si email fourni)</li>
              <li>La génération de statistiques de ventes pour les restaurateurs</li>
              <li>L'amélioration du service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">4. Base légale</h2>
            <p>Le traitement est fondé sur l'exécution du contrat (article 6.1.b RGPD) pour les données nécessaires au fonctionnement du service, et sur le consentement (article 6.1.a) pour l'envoi d'emails de confirmation aux clients.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">5. Sous-traitants</h2>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
              <li><strong className="text-zinc-300">Supabase</strong> — hébergement de la base de données (UE)</li>
              <li><strong className="text-zinc-300">Stripe</strong> — traitement des paiements</li>
              <li><strong className="text-zinc-300">Vercel</strong> — hébergement de l'application</li>
              <li><strong className="text-zinc-300">Resend</strong> — envoi d'emails transactionnels</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">6. Durée de conservation</h2>
            <p>Les données des restaurateurs sont conservées pendant la durée d'utilisation du service, puis supprimées dans les 30 jours suivant la résiliation du compte. Les données de commandes sont conservées 3 ans à des fins comptables et légales.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">7. Vos droits</h2>
            <p>Conformément au RGPD, vous disposez des droits d'accès, de rectification, d'effacement, de portabilité et d'opposition sur vos données. Pour exercer ces droits : <a href="mailto:contact@qomand.fr" className="text-orange-400 hover:text-orange-300 underline">contact@qomand.fr</a></p>
            <p className="mt-2">Vous pouvez également introduire une réclamation auprès de la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline">CNIL</a>.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">8. Cookies</h2>
            <p>Qomand utilise uniquement des cookies de session nécessaires à l'authentification (via Supabase Auth). Aucun cookie tiers à des fins publicitaires n'est utilisé.</p>
          </section>
        </div>
      </div>
    </main>
  )
}
