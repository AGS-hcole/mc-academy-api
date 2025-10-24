# Migration vers Brevo pour l'envoi d'emails

## Vue d'ensemble

L'application a été migrée de l'ancien système d'envoi d'emails (nodemailer avec SMTP Office365) vers **Brevo** (anciennement Sendinblue), un service d'envoi d'emails transactionnels plus moderne et fiable.

## Changements effectués

### Services modifiés

1. **EmailService** (`src/common/email.service.ts`)
   - Remplace nodemailer par l'API Brevo
   - Utilisé pour les emails transactionnels (bienvenue, réinitialisation de mot de passe)

2. **NotificationsService** (`src/notifications/notifications.service.ts`)
   - Remplace nodemailer par l'API Brevo
   - Utilisé pour les notifications de sessions et rappels

### Dépendances

- **Ajoutée**: `@getbrevo/brevo` v3.0.1
- **Conservée**: `nodemailer` (pour compatibilité, peut être retirée dans le futur)

## Configuration requise

### Nouvelles variables d'environnement

Avant de déployer cette version, vous devez configurer les variables d'environnement suivantes :

```bash
# Clé API Brevo (obligatoire)
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxx

# Email de l'expéditeur (obligatoire)
BREVO_SENDER_EMAIL=noreply@mycenteracademy.fr

# Nom de l'expéditeur (optionnel, par défaut: "MyCenter Academy")
BREVO_SENDER_NAME=MyCenter Academy
```

### Comment obtenir une clé API Brevo

1. Créez un compte sur [Brevo](https://www.brevo.com/) (ou connectez-vous si vous en avez déjà un)
2. Allez dans **Paramètres** → **Clés API SMTP & API**
3. Cliquez sur **Générer une nouvelle clé API**
4. Donnez un nom à votre clé (par exemple: "MC Academy API")
5. Copiez la clé API générée (elle commence par `xkeysib-`)
6. Ajoutez la clé à votre fichier `.env` ou configuration d'environnement

### Configurer l'email expéditeur

1. Dans Brevo, allez dans **Expéditeurs** → **Expéditeurs & Domaines**
2. Ajoutez et vérifiez votre domaine d'email
3. Ou utilisez un email fourni par Brevo pour les tests

### Variables obsolètes

Les variables suivantes ne sont plus utilisées et peuvent être supprimées après validation du déploiement :

```bash
# Obsolète - ne plus utiliser
M365_EMAIL=
M365_EMAIL_PASSWORD=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

## Fonctionnalités conservées

Toutes les fonctionnalités d'envoi d'email existantes continuent de fonctionner :

- ✅ Email de bienvenue lors de la création d'un utilisateur
- ✅ Email de réinitialisation de mot de passe
- ✅ Notifications de sessions publiées
- ✅ Rappels de sessions
- ✅ Utilisation de templates HTML existants
- ✅ Support CC (copie carbone)

## Avantages de Brevo

1. **Fiabilité améliorée** : Meilleure délivrabilité des emails
2. **Monitoring** : Tableau de bord pour suivre les emails envoyés
3. **API moderne** : API RESTful bien documentée
4. **Gestion des templates** : Possibilité de créer des templates dans Brevo
5. **Analytics** : Statistiques sur les ouvertures et clics
6. **Support multi-canaux** : Email, SMS, WhatsApp depuis la même plateforme

## Tests

Avant de déployer en production, testez l'envoi d'emails :

1. **Création d'utilisateur** : Créez un nouvel utilisateur via l'API
2. **Réinitialisation de mot de passe** : Testez la fonctionnalité "Mot de passe oublié"
3. **Notifications** : Vérifiez que les notifications de sessions fonctionnent

## Rollback

Si vous devez revenir à l'ancien système :

1. Restaurez l'ancienne version du code
2. Reconfigurez les variables d'environnement SMTP/M365
3. Redémarrez l'application

## Support

En cas de problème avec Brevo :

- Documentation : https://developers.brevo.com/
- Support Brevo : https://help.brevo.com/
- Code source : Consultez les fichiers modifiés dans ce commit

## Notes de sécurité

- ⚠️ La clé API Brevo est sensible - ne la commitez jamais dans le code
- ✅ Utilisez des variables d'environnement ou un gestionnaire de secrets
- ✅ Limitez les permissions de la clé API aux fonctionnalités nécessaires (emails transactionnels uniquement)
