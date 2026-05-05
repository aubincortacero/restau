# Configuration Apple Pay / Google Pay

## ⚠️ Prérequis essentiels

Pour qu'Apple Pay et Google Pay fonctionnent, il faut **obligatoirement** :

### 1. **HTTPS uniquement** 
- ❌ **Ne fonctionne PAS sur localhost** (même avec Safari/Chrome)
- ❌ Ne fonctionne PAS sur HTTP
- ✅ **Fonctionne uniquement sur HTTPS** (domaine en production)

### 2. **Vérifier le domaine dans Stripe**

#### Étape 1 : Aller dans Stripe Dashboard
1. Connectez-vous sur https://dashboard.stripe.com
2. Allez dans **Settings** → **Payment methods**
3. Trouvez la section **Apple Pay** 
4. Cliquez sur **Add domain**

#### Étape 2 : Ajouter votre domaine
- Exemple : `votre-site.com` (sans https://)
- Stripe va générer un fichier de vérification

#### Étape 3 : Vérifier le domaine
Stripe va vérifier automatiquement que le domaine est accessible en HTTPS

### 3. **Configuration de l'appareil**

#### Sur iPhone/iPad :
- Avoir au moins une carte configurée dans **Wallet**
- Aller dans Réglages → Wallet et Apple Pay
- Ajouter une carte si ce n'est pas déjà fait

#### Sur Android :
- Avoir Google Pay installé
- Avoir au moins une carte configurée dans Google Pay

## 🧪 Comment tester

### En développement (localhost) :
❌ **Apple Pay/Google Pay ne sera PAS disponible**
- Seules les cartes bancaires classiques fonctionneront
- C'est normal et attendu

### En production (HTTPS) :
✅ Une fois le domaine vérifié dans Stripe :
- Apple Pay apparaîtra automatiquement sur Safari (iOS/macOS)
- Google Pay apparaîtra automatiquement sur Chrome (Android)
- Les cartes classiques restent disponibles partout

## 🔧 Vérification technique

Pour vérifier si votre domaine est bien configuré :

1. **Dans Stripe Dashboard** :
   - Settings → Payment methods → Apple Pay
   - Vous devriez voir votre domaine avec un ✅ vert

2. **Test sur appareil réel** :
   - Ouvrir le site en HTTPS sur iPhone avec Safari
   - Le bouton Apple Pay devrait apparaître automatiquement
   - Si ce n'est pas le cas, vérifier que vous avez une carte dans Wallet

## 📱 Comportement attendu

| Navigateur | Appareil | Affichage |
|------------|----------|-----------|
| Safari | iPhone/iPad | 🍎 Apple Pay |
| Chrome | Android | 📱 Google Pay |
| Safari | Mac | 🍎 Apple Pay |
| Chrome | Windows/Mac | 💳 Carte uniquement |
| Autre | Tout | 💳 Carte uniquement |

## ❓ FAQ

**Q: Pourquoi Apple Pay n'apparaît pas sur localhost ?**
R: Apple Pay ne fonctionne que sur HTTPS. Localhost est considéré comme non sécurisé.

**Q: J'ai vérifié le domaine mais ça ne marche toujours pas**
R: Vérifiez que :
- Vous êtes bien sur HTTPS (pas HTTP)
- Vous utilisez Safari sur iOS/macOS
- Vous avez une carte configurée dans Wallet
- Le cache du navigateur est vidé (Cmd+Shift+R)

**Q: Combien de temps pour que le domaine soit vérifié ?**
R: La vérification est instantanée si votre site est accessible en HTTPS.

## 🚀 Déploiement recommandé

1. Déployez votre site sur Vercel/Netlify (HTTPS automatique)
2. Vérifiez le domaine dans Stripe
3. Testez sur un iPhone/iPad réel
4. Apple Pay devrait apparaître immédiatement
