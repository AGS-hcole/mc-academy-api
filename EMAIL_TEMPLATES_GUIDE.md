# 📧 Guide des Templates Email - My Center Academy

## Vue d'ensemble

Ce guide présente le nouveau système de templates email pour My Center Academy. Les templates ont été entièrement redessinés avec un design moderne, responsive et aux couleurs de la marque.

## 🎨 Design System

### Palette de couleurs

Les couleurs My Center Academy ont été soigneusement sélectionnées pour refléter l'excellence et le dynamisme de l'académie de tennis :

| Couleur | Hex | Usage |
|---------|-----|-------|
| **Primary Blue** | `#1a73e8` → `#1557b0` | En-têtes, boutons principaux, liens |
| **Secondary Green** | `#34a853` → `#2d8e47` | Boutons d'action sécurisée |
| **Accent Red** | `#ea4335` | Éléments d'attention |
| **Dark Text** | `#202124` | Texte principal |
| **Light Text** | `#5f6368` | Texte secondaire |

### Typographie

- **Police principale** : Utilisation des polices système natives (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`)
- **Titres** : Bold, avec espacement négatif pour un look moderne
- **Corps de texte** : Taille optimisée pour la lisibilité sur tous les écrans

## 📱 Responsive Design

Tous les templates sont **100% responsive** et s'adaptent automatiquement à :

- 📱 **Mobile** : < 600px de largeur
- 💻 **Desktop** : > 600px de largeur
- 📧 **Tous les clients email** : Gmail, Outlook, Apple Mail, Yahoo, etc.

### Optimisations mobiles

- Padding réduit sur petits écrans
- Boutons pleine largeur
- Texte centré automatiquement
- Taille de police adaptative

## 📧 Templates disponibles

### 1. Email de Bienvenue (`welcome-email.template.html`)

**Usage** : Envoyé lors de la création d'un nouveau compte utilisateur.

**Éléments clés** :
- 👋 Icône d'accueil chaleureuse
- Message de bienvenue personnalisé
- Bouton CTA principal bleu avec dégradé
- Liste des prochaines étapes
- Lien de secours en texte brut
- Note de sécurité avec durée de validité

**Variables** :
- `{{fullname}}` : Nom complet de l'utilisateur
- `{{url}}` : Lien pour définir le mot de passe
- `{{year}}` : Année en cours

**Aperçu** :

![Email de bienvenue](https://github.com/user-attachments/assets/524442d7-6ca1-45bb-8cb3-6089074b5745)

### 2. Email de Réinitialisation de Mot de Passe (`reset-password.template.html`)

**Usage** : Envoyé lorsqu'un utilisateur demande à réinitialiser son mot de passe.

**Éléments clés** :
- 🔐 Icône de sécurité
- Message personnalisé avec le nom de l'utilisateur
- Bouton CTA principal vert (couleur sécurité)
- Encadré d'avertissement orange avec icône ⏱️
- Instructions pour les non-initiateurs
- Note de sécurité détaillée

**Variables** :
- `{{fullname}}` : Nom complet de l'utilisateur
- `{{url}}` : Lien de réinitialisation sécurisé
- `{{year}}` : Année en cours

**Aperçu** :

![Email de réinitialisation](https://github.com/user-attachments/assets/e460d29b-6bfa-4c40-b72e-e6e932dc8af1)

## 🏗️ Architecture du système de templates

Le système utilise une **architecture modulaire en 2 couches** :

### 1. Layout de base (`base-layout.template.html`)

Le layout de base fournit la structure commune à tous les emails :

```html
- En-tête (Header)
  - Dégradé bleu My Center Academy
  - Logo texte "🎾 My Center Academy"
  - Slogan "Excellence en Tennis"

- Zone de contenu ({{content}})
  - Placeholder pour injecter le contenu spécifique

- Pied de page (Footer)
  - Nom et description de l'académie
  - Copyright et année automatique
  - Raison de l'envoi de l'email
```

### 2. Templates de contenu (`*-content.template.html`)

Chaque email a son propre template de contenu qui est injecté dans le layout :

- `welcome-email-content.template.html` - Contenu de l'email de bienvenue
- `reset-password-content.template.html` - Contenu de l'email de réinitialisation

### 3. Application automatique du layout

Le système applique automatiquement le layout lors de la construction des emails :

1. **Chargement du layout de base** : `base-layout.template.html`
2. **Chargement du contenu spécifique** : `{template}-content.template.html`
3. **Remplacement des variables** dans le contenu
4. **Injection du contenu** dans le placeholder `{{content}}` du layout
5. **Remplacement des variables** restantes (title, year, preheader)

## 🔧 Utilisation des templates

### Remplacement des variables

Les templates utilisent la syntaxe Mustache `{{variable}}` pour les variables dynamiques. Le système remplace automatiquement ces variables lors de l'envoi.

**Le système gère automatiquement** :
1. Le chargement du layout de base
2. Le chargement du template de contenu correspondant
3. L'injection du contenu dans le layout
4. Le remplacement de toutes les variables

**Exemple** :
```javascript
const replacements = {
  fullname: 'Jean Dupont',
  url: 'https://app.mycenteracademy.fr/reset-password?token=abc123',
  year: new Date().getFullYear().toString(),
  title: 'Bienvenue à My Center Academy', // Optionnel
  preheader: 'Votre compte a été créé' // Optionnel
};

await emailService.sendTemplateEmail(
  'jean.dupont@example.com',
  '',
  '[MyCenter Academy] Votre compte',
  'welcome-email',
  replacements
);
```

### Flux de construction d'email

```
1. EmailService.sendTemplateEmail('welcome-email', replacements)
   ↓
2. Charge base-layout.template.html
   ↓
3. Charge welcome-email-content.template.html
   ↓
4. Remplace {{fullname}}, {{url}} dans le contenu
   ↓
5. Injecte contenu dans {{content}} du layout
   ↓
6. Remplace {{year}}, {{title}}, {{preheader}} dans le layout
   ↓
7. Email final prêt à être envoyé via Brevo
```

### Variables requises par template

#### Variables de contenu (dans *-content.template.html)

**welcome-email-content.template.html**
- ✅ `fullname` : Nom complet de l'utilisateur
- ✅ `url` : URL pour définir le mot de passe

**reset-password-content.template.html**
- ✅ `fullname` : Nom complet de l'utilisateur
- ✅ `url` : URL de réinitialisation

#### Variables du layout (dans base-layout.template.html)

Automatiquement gérées par le système :
- ✅ `year` : Année en cours (pour le copyright)
- ✅ `title` : Titre de la page HTML (optionnel, défaut: "My Center Academy")
- ✅ `preheader` : Texte de prévisualisation (optionnel, défaut: "Email de My Center Academy")
- ✅ `content` : Contenu injecté automatiquement

## 🎯 Bonnes pratiques

### Emojis
Les emojis sont utilisés stratégiquement pour :
- 🎾 Représenter la marque (tennis)
- 👋 Créer une connexion émotionnelle
- 🔐 Illustrer la sécurité
- ⏱️ Attirer l'attention sur les délais
- ⚡ Dynamiser les listes

### Appels à l'action (CTA)

Les boutons sont conçus pour maximiser les conversions :
- **Taille généreuse** : 18px de police, padding important
- **Contraste élevé** : Texte blanc sur fond coloré
- **Dégradés** : Look premium et moderne
- **Ombres** : Effet de profondeur
- **Responsive** : S'adapte aux petits écrans

### Accessibilité

- Contraste texte/fond conforme aux normes WCAG
- Taille de police lisible (minimum 14px)
- Liens descriptifs
- Structure sémantique HTML

## 🔒 Sécurité

Les templates incluent des notes de sécurité importantes :

1. **Durée de validité** : Les liens expirent après 1 heure
2. **Instructions claires** : Que faire si l'email n'a pas été demandé
3. **Lien de secours** : Version texte du lien si le bouton ne fonctionne pas
4. **Avertissements visuels** : Encadrés colorés pour les informations importantes

## 📊 Compatibilité

Les templates ont été testés avec :

- ✅ Gmail (Web, iOS, Android)
- ✅ Outlook (2016, 2019, 365, Web)
- ✅ Apple Mail (macOS, iOS)
- ✅ Yahoo Mail
- ✅ Thunderbird
- ✅ Mode sombre (respecté automatiquement)

## 🚀 Améliorations futures possibles

1. **Templates supplémentaires** :
   - Confirmation de réservation
   - Rappel de session
   - Newsletter mensuelle
   - Annulation de session

2. **Personnalisation avancée** :
   - Photos de profil
   - Statistiques personnelles
   - Recommandations

3. **Intégration Brevo avancée** :
   - Utilisation de templates Brevo natifs
   - Suivi des ouvertures/clics
   - A/B testing

## 📝 Maintenance

### Modification d'un template existant

1. Éditez le fichier dans `src/templates/`
2. Testez les changements en créant un aperçu HTML
3. Vérifiez la responsivité sur différents écrans
4. Testez l'envoi avec Brevo

### Création d'un nouveau template

**Méthode recommandée** (avec layout automatique) :

1. **Créez un template de contenu** : `src/templates/mon-email-content.template.html`
   ```html
   <!-- Icône -->
   <table role="presentation">...</table>
   
   <!-- Titre -->
   <h2>{{titre}}</h2>
   
   <!-- Contenu -->
   <p>{{message}}</p>
   
   <!-- Bouton CTA -->
   <table role="presentation">
     <a href="{{url}}">Mon Action</a>
   </table>
   ```

2. **Le système appliquera automatiquement** le layout de base

3. **Utilisez le nouveau template** :
   ```javascript
   await emailService.sendTemplateEmail(
     'user@example.com',
     '',
     'Mon Email',
     'mon-email', // Nom sans -content.template.html
     { titre: 'Hello', message: 'World', url: '...' }
   );
   ```

**Méthode alternative** (template complet) :

Si vous avez besoin d'un layout personnalisé, créez `mon-email.template.html` avec la structure HTML complète. Le système détectera qu'il n'existe pas de version `-content` et utilisera le template complet.

## 🎨 Personnalisation des couleurs

Pour modifier les couleurs de la marque, éditez ces valeurs dans les templates :

```css
/* Bleu principal (header, CTA welcome) */
background: linear-gradient(135deg, #1a73e8 0%, #1557b0 100%);

/* Vert secondaire (CTA reset password) */
background: linear-gradient(135deg, #34a853 0%, #2d8e47 100%);

/* Orange avertissement */
background-color: #fff3e0;
border-left: 4px solid #ff9800;
```

## 📞 Support

Pour toute question ou amélioration des templates :
- Consultez la documentation Brevo : https://developers.brevo.com/
- Référez-vous au guide de migration : `BREVO_MIGRATION_GUIDE.md`

---

**Dernière mise à jour** : 2025-10-23  
**Version** : 1.0.0  
**Auteur** : GitHub Copilot pour My Center Academy
