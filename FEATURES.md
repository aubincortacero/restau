# Qomand — Résumé des fonctionnalités

> **Pitch** : Votre restaurant, version digitale. Menus, tables, commandes et paiements depuis un simple QR code posé sur vos tables.

---

## 🍽️ Menu digital

- Création de catégories et d'articles (nom, description, prix, allergènes, photo)
- Import IA : scan photo ou PDF de menu → carte générée automatiquement
- Prix Happy Hour par article (s'active automatiquement sur le menu client)
- Timer Happy Hour visible côté client avec compte à rebours

## 🪑 Plan de salle

- Plan de salle interactif avec drag & drop
- Multi-niveaux (Salle, Terrasse, Bar…) et zones personnalisées
- Numérotation et étiquetage libre des tables
- Ajout rapide de tables par formulaire

## 📱 QR Codes

- QR code unique par table, généré automatiquement
- Export PDF en masse (format A4, 3×4 par page)
- 3 modes d'export : QR seul, avec numéro de table, avec nom du restaurant
- Les clients scannent → menu s'ouvre directement dans le navigateur

## 🛒 Commande client

- Panier avec notes par article
- Choix du mode de service : livré à la table ou retrait au comptoir
- Paiement en ligne par carte (Stripe) ou au comptoir en espèces
- Email de confirmation avec code de retrait (pickup)

## 💳 Paiement Stripe

- Connexion Stripe Connect en quelques minutes
- Paiement direct sur le compte du restaurateur
- Les fonds arrivent sur l'IBAN sous 2 jours ouvrés
- Tickets caisse téléchargeables (TVA 10% incluse)

## 📊 Dashboard analytics

- CA total, panier moyen, nombre de commandes
- Comparaison avec période précédente (↑↓%)
- Top plats vendus
- Taux d'annulation
- Sélecteur de période : aujourd'hui, 7j, 30j, personnalisé

## 🎫 Gestion des commandes

- Vue temps réel des commandes en cours
- Statuts : En attente → Prête → Envoyée
- Code de retrait pickup affiché au restaurateur + envoyé par email au client
- Email automatique "Votre commande est prête" (pickup)
- Archives consultables
- Timer par commande (durée depuis la prise de commande)

## ⏰ Horaires d'ouverture

- Horaires par jour de la semaine
- Plage Happy Hour avec jours activables
- Seuil d'urgence configurable (alerte si commandes non traitées)

## ⚙️ Paramètres

- Informations restaurant (nom, slug, logo)
- Modes de service configurables (table / comptoir)
- Gestion Stripe (connexion, déconnexion, accès tableau de bord)
- Abonnement (portail client Stripe pour gestion/résiliation)
- Suppression du compte

## 💰 Tarification

- **20€/mois** (abonnement mensuel, sans engagement)
- **+ 1% sur les paiements en ligne** (s'ajoute aux frais Stripe : ~1.5% + 0.25€)
- Essai gratuit 14 jours
- Sur un ticket moyen de 30€ : ~1€ de frais en tout

---

## Stack technique

- **Frontend** : Next.js 15 (App Router), TypeScript, TailwindCSS
- **Backend** : Supabase (PostgreSQL, Auth, Storage)
- **Paiements** : Stripe Connect (charges directes)
- **Emails** : Resend
- **IA menu** : API scan (photo/PDF → items)
- **Déploiement** : Vercel
