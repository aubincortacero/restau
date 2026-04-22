# Qomand — Document de brief Landing Page

---

## PROMPT LOVABLE

> Copie-colle tout ce bloc dans Lovable.

---

### Contexte produit

Crée une landing page moderne, épurée et très attractive pour **Qomand**, une SaaS destinée aux restaurateurs indépendants.

**Tagline principale :** *Votre menu en QR code. Vos commandes en ligne. En 10 minutes.*

**Sous-titre :** *La solution tout-en-un pour les restaurants qui veulent travailler mieux — sans changer de métier.*

**Ton :** Chaleureux, direct, moderne. Pas de jargon tech. On parle au restaurateur, pas à un DSI. Style visuel sombre et premium (dark mode), touches dorées/orangées, typographie bold. Inspiré de Linear, Stripe, Vercel.

---

### Sections à créer

#### 1. Hero (plein écran)
- Titre H1 : **"Votre menu devient une expérience."**
- Sous-titre : *Créez votre menu en scannant votre carte papier, activez les commandes depuis table et encaissez en ligne — en moins de 10 minutes.*
- CTA principal : **"Créer mon menu gratuit"** (bouton orange/brand)
- CTA secondaire : **"Voir une démo"** (lien texte)
- Illustration : mockup phone affichant un menu QR code sur fond sombre, ou animation subtile de scan → menu généré

#### 2. Barre de réassurance (logos / stats)
- "Fonctionne avec Stripe • Supabase • iOS & Android"
- Stats inventées mais réalistes : "< 10 min pour créer son menu" · "0 application à télécharger pour vos clients" · "1% de commission sur les paiements en ligne"

#### 3. Fonctionnalités — blocs alternes (texte + visuel)

**Bloc A — Scan IA de la carte**
- Titre : *Créez votre menu en prenant une photo*
- Texte : Photographiez votre carte papier ou PDF existant. Notre IA détecte les catégories, les plats, les prix et les importe automatiquement. Plus besoin de tout retaper.
- Visuel : animation ou screenshot de l'IA qui détecte les plats

**Bloc B — Plan de salle interactif**
- Titre : *Dessinez votre salle en quelques clics*
- Texte : Créez votre plan de table visuellement, générez un QR code unique par table. Vos clients scannent, commandent et paient directement depuis leur smartphone.
- Visuel : screenshot du plan de salle avec tables numérotées et QR codes

**Bloc C — Commandes & paiement en ligne**
- Titre : *Encaissez sans quitter la cuisine*
- Texte : Les commandes arrivent en temps réel sur votre dashboard. Paiement par carte sécurisé via Stripe, ou règlement à la caisse — vous choisissez. Notifications sonores, tickets imprimables, historique complet.
- Visuel : mockup du dashboard commandes (tickets en temps réel)

**Bloc D — Votre vitrine sur internet**
- Titre : *Un mini-site à votre image, sans coder*
- Texte : Chaque restaurant dispose d'une vitrine publique accessible depuis le QR code. Ajoutez vos horaires, votre histoire, une galerie photo, des sections personnalisées. Le tout cohérent avec votre menu.
- Visuel : mockup de vitrine client sur mobile

**Bloc E — Support humain et local**
- Titre : *On vous accompagne pour de vrai*
- Texte : Pas de chatbot, pas de ticket perdu. Un interlocuteur dédié, basé en France, joignable par téléphone ou WhatsApp. On vous aide à configurer, à former votre équipe, à tout personnaliser.
- Visuel : illustration d'une conversation WhatsApp amicale

#### 4. Tarifs (simple, 1 seule offre)
- Fond légèrement différent (gris très sombre)
- Titre : *Une offre simple, sans surprise*
- **Carte unique** : **20 € / mois** — puis 1% sur les paiements en ligne uniquement
- Liste d'inclus : Menu QR code illimité · Plan de salle · Commandes en ligne · Vitrine web · Support humain · Mises à jour incluses · Sans engagement
- Note bas de carte : *"Sur un ticket moyen de 30€, vous payez environ 1€ de frais en tout."*
- CTA : "Démarrer gratuitement 14 jours"

#### 5. Objections / FAQ (accordéon)
- Mes clients auront-ils besoin de télécharger une application ? → Non, le menu s'ouvre directement dans le navigateur.
- Est-ce que ça marche sans internet à la table ? → Le menu est mis en cache, mais les commandes nécessitent une connexion.
- Je change souvent ma carte, c'est simple à modifier ? → Oui, en quelques secondes depuis le dashboard, les changements sont instantanés.
- Est-ce que je peux garder le paiement à la caisse ? → Absolument, vous choisissez les modes de paiement acceptés.
- Et si j'ai besoin d'aide pour la mise en place ? → On prend la main avec vous, par téléphone ou screen share.

#### 6. CTA final (plein écran, fond brand)
- Titre : *Prêt à moderniser votre restaurant ?*
- Sous-titre : *Créez votre menu en 10 minutes. Aucune carte bancaire requise.*
- Bouton : "Créer mon compte gratuit"

#### 7. Footer
- Logo Qomand
- Liens : CGU · Politique de confidentialité · Contact
- "Made in France 🇫🇷"

---

### Contraintes design
- Dark mode obligatoire (fond #0a0908 ou similaire)
- Couleur d'accent : orange (#F07A4F) de la charte graphique
- Typographie : Inter ou Geist, titres très bold (800-900)
- Coins arrondis généreux (radius 16-20px)
- Animations d'entrée subtiles au scroll (pas d'excès)
- 100% responsive mobile-first
- Pas de cookie banner, pas de newsletter popup

---

---

## HÉBERGEMENT & CONFIGURATION DU DOMAINE

*(Section séparée du prompt Lovable — à faire manuellement)*

---

### Architecture cible

| Sous-domaine | Contenu | Hébergeur suggéré |
|---|---|---|
| `qomand.fr` | Landing page (Lovable) | Lovable Hosting ou Vercel |
| `app.qomand.fr` | Application Next.js | Vercel |

---

### Étape 1 — Héberger la landing page sur `qomand.fr`

**Option A (recommandée) : Lovable Hosting**
Lovable propose son propre hébergement. Dans Lovable, va dans *Settings → Custom Domain* et saisis `qomand.fr`. Il te donnera un CNAME ou des records DNS à ajouter chez ton registrar (OVH, Gandi, Namecheap…).

**Option B : Exporter vers Vercel**
Exporte le projet Lovable sur GitHub → connecte-le à Vercel → ajoute le domaine `qomand.fr` dans *Vercel → Domains*.

Dans les deux cas, chez ton registrar, tu ajouteras :
```
Type    Nom   Valeur
A       @     76.76.21.21          ← IP Vercel (ou celle que te donne Lovable)
CNAME   www   cname.vercel-dns.com
```

---

### Étape 2 — Déployer l'app sur `app.qomand.fr`

1. Sur [vercel.com](https://vercel.com), ouvre ton projet Next.js
2. Va dans *Settings → Domains* → ajouter `app.qomand.fr`
3. Vercel te donne un CNAME à créer chez ton registrar :
```
Type    Nom   Valeur
CNAME   app   cname.vercel-dns.com
```
4. Dans les variables d'environnement Vercel, mets à jour :
```
NEXT_PUBLIC_SITE_URL=https://app.qomand.fr
```

---

### Étape 3 — Mettre à jour Supabase

Dans ton dashboard Supabase → *Authentication → URL Configuration* :

- **Site URL** : `https://app.qomand.fr`
- **Redirect URLs** (ajoute) :
  - `https://app.qomand.fr/auth/callback`
  - `https://app.qomand.fr/**`

> Garde aussi `http://localhost:3000/**` pour le dev local.

---

### Étape 4 — Mettre à jour Stripe

**Oui, tu dois mettre à jour 2 endroits dans Stripe :**

**4a. Le webhook**
Dans [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks) :
- Modifie l'URL de ton endpoint :
  - Avant : `https://ton-ancien-domaine.vercel.app/api/stripe/webhook`
  - Après : `https://app.qomand.fr/api/stripe/webhook`

**4b. Les URLs de retour (si tu as configuré des Success/Cancel URLs hardcodées)**
Dans ton code, cherche `return_url` ou `success_url` — mais dans ce projet ils utilisent `window.location.origin` dynamiquement, donc **aucune modif de code nécessaire**. Juste le webhook.

> ⚠️ Jusqu'à ce que le DNS se propage (jusqu'à 24h), les paiements existants resteront sur l'ancien domaine. Change le webhook **après** que `app.qomand.fr` fonctionne.

---

### Étape 5 — Vérifier les liens de la landing vers l'app

Dans Lovable, dans ton code, assure-toi que tous les boutons CTA pointent vers :
```
https://app.qomand.fr/login     ← page login/signup de l'app
```

---

### Récap des actions dans l'ordre

- [ ] 1. Créer la landing sur Lovable
- [ ] 2. Configurer domaine `qomand.fr` → Lovable ou Vercel
- [ ] 3. Ajouter `app.qomand.fr` dans Vercel (projet Next.js)
- [ ] 4. Mettre à jour `NEXT_PUBLIC_SITE_URL` dans Vercel env vars
- [ ] 5. Mettre à jour Site URL + Redirect URLs dans Supabase
- [ ] 6. Mettre à jour l'URL du webhook dans Stripe Dashboard
- [ ] 7. Vérifier les CTA de la landing pointent vers `app.qomand.fr`
