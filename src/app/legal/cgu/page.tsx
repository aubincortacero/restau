import Link from 'next/link'

export const metadata = { title: 'CGU — Qomand' }

export default function CGUPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-300 py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard/settings" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-8 inline-block">
          ← Retour aux paramètres
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2">Conditions Générales d'Utilisation</h1>
        <p className="text-sm text-zinc-500 mb-10">Dernière mise à jour : avril 2026</p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-white mb-3">1. Objet</h2>
            <p>Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme Qomand, éditée par Aubin Cortacero, permettant aux restaurateurs de gérer leurs menus, tables et commandes en ligne.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">2. Accès au service</h2>
            <p>L'accès à Qomand est réservé aux professionnels de la restauration disposant d'un compte créé via Google OAuth. L'utilisateur est responsable de la confidentialité de ses identifiants et de toute activité réalisée depuis son compte.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">3. Description du service</h2>
            <p>Qomand met à disposition :</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
              <li>Un espace de gestion de menus, catégories et articles</li>
              <li>Un plan de salle interactif avec QR codes par table</li>
              <li>Un système de commandes en ligne et en caisse</li>
              <li>Une intégration de paiement en ligne via Stripe Connect</li>
              <li>Des statistiques de ventes et rapports</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">4. Tarification</h2>
            <p>L'utilisation de Qomand est soumise à un abonnement mensuel de <strong className="text-white">20 € HT/mois</strong> ainsi qu'une commission de <strong className="text-white">1 %</strong> sur les paiements en ligne encaissés via la plateforme. Les frais de traitement Stripe sont à la charge du restaurateur.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">5. Obligations de l'utilisateur</h2>
            <p>L'utilisateur s'engage à :</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
              <li>Fournir des informations exactes sur son établissement</li>
              <li>Ne pas utiliser le service à des fins frauduleuses ou illicites</li>
              <li>Respecter les conditions d'utilisation de Stripe</li>
              <li>Informer ses clients de l'utilisation d'un outil tiers de commande</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">6. Propriété intellectuelle</h2>
            <p>Tous les éléments de la plateforme Qomand (logo, design, code, textes) sont la propriété exclusive de l'éditeur. Toute reproduction ou utilisation sans autorisation est interdite.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">7. Limitation de responsabilité</h2>
            <p>Qomand ne peut être tenu responsable des dysfonctionnements liés à des services tiers (Stripe, Supabase, Google), des interruptions de service temporaires, ou des pertes de données résultant d'un usage incorrect de la plateforme.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">8. Résiliation</h2>
            <p>L'utilisateur peut résilier son compte à tout moment depuis les paramètres de son espace. La suppression est irréversible et entraîne la suppression de toutes les données associées dans un délai de 30 jours.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">9. Droit applicable</h2>
            <p>Les présentes CGU sont soumises au droit français. Tout litige sera porté devant les juridictions compétentes du ressort du siège social de l'éditeur.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">10. Contact</h2>
            <p>Pour toute question relative aux présentes CGU : <a href="mailto:contact@qomand.fr" className="text-orange-400 hover:text-orange-300 underline">contact@qomand.fr</a></p>
          </section>
        </div>
      </div>
    </main>
  )
}
