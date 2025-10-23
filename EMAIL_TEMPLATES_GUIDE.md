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

## 🏗️ Structure commune

Tous les templates partagent une structure cohérente :

### 1. En-tête (Header)
```html
- Dégradé bleu My Center Academy
- Logo texte "🎾 My Center Academy"
- Slogan "Excellence en Tennis"
```

### 2. Contenu principal (Main Content)
```html
- Fond blanc
- Padding généreux
- Icône contextuelle en haut
- Titre principal
- Contenu spécifique
- Bouton CTA proéminent
- Informations complémentaires
```

### 3. Pied de page (Footer)
```html
- Fond gris clair
- Nom et description de l'académie
- Copyright et année automatique
- Raison de l'envoi de l'email
```

## 🔧 Utilisation des templates

### Remplacement des variables

Les templates utilisent la syntaxe Mustache `{{variable}}` pour les variables dynamiques. Le système remplace automatiquement ces variables lors de l'envoi.

**Exemple** :
```javascript
const replacements = {
  fullname: 'Jean Dupont',
  url: 'https://app.mycenteracademy.fr/reset-password?token=abc123',
  year: new Date().getFullYear().toString()
};

await emailService.sendTemplateEmail(
  'jean.dupont@example.com',
  '',
  '[MyCenter Academy] Votre compte',
  'welcome-email',
  replacements
);
```

### Variables requises par template

#### welcome-email.template.html
- ✅ `fullname` : Nom complet de l'utilisateur
- ✅ `url` : URL pour définir le mot de passe
- ✅ `year` : Année en cours

#### reset-password.template.html
- ✅ `fullname` : Nom complet de l'utilisateur
- ✅ `url` : URL de réinitialisation
- ✅ `year` : Année en cours

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

1. Copiez un template existant comme base
2. Modifiez le contenu principal
3. Ajustez les couleurs des boutons CTA si nécessaire
4. Ajoutez les variables Mustache requises
5. Documentez les nouvelles variables

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
