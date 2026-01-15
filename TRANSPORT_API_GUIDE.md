# Guide API Transport

## Vue d'ensemble

Le module Transport permet de gérer des trajets récurrents (templates) qui génèrent des occurrences de transport que les utilisateurs peuvent réserver.

## Règles métier importantes

### Deadline de réservation
- **Les réservations sont autorisées jusqu'à minuit (00:00) le jour du transport**
- Exemple : Pour un transport le 20/01/2026 à 14h50, les réservations sont possibles jusqu'au 19/01/2026 à 23h59:59
- Le calcul se fait dans le fuseau horaire du template (par défaut : Europe/Paris)

### Gestion de la capacité
- Chaque occurrence a une capacité définie dans le template
- `allowOverbook=false` : Les réservations sont refusées si la capacité est dépassée
- `allowOverbook=true` : Réservations illimitées autorisées
- Les réservations utilisent des transactions Prisma pour éviter les conflits

### Permissions
- **Admin uniquement** : CRUD templates, générer occurrences, annuler occurrences
- **Utilisateurs authentifiés** : Voir les occurrences, réserver, annuler ses propres réservations
- **Admins** : Peuvent annuler n'importe quelle réservation

---

## Endpoints API

### 1. Templates (Admin uniquement)

#### 1.1 Créer un template
```http
POST /transport-templates
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Payload :**
```json
{
  "name": "Paris → Bordeaux",
  "description": "Transport hebdomadaire vers le centre d'entraînement de Bordeaux",
  "fromLabel": "Paris Gare de Lyon",
  "fromAddress": "Place Louis Armand, 75012 Paris",
  "fromLat": 48.8449,
  "fromLng": 2.3736,
  "toLabel": "Bordeaux St-Jean",
  "toAddress": "Rue Charles Domercq, 33800 Bordeaux",
  "toLat": 44.8262,
  "toLng": -0.5560,
  "timezone": "Europe/Paris",
  "capacity": 4,
  "allowOverbook": false,
  "isActive": true,
  "recurrenceType": "WEEKLY",
  "daysOfWeek": [1, 3, 5],
  "timeOfDay": "14:50"
}
```

**Champs obligatoires :**
- `name` : Nom du template
- `fromLabel` : Libellé du point de départ
- `toLabel` : Libellé du point d'arrivée
- `daysOfWeek` : Tableau d'entiers 1-7 (1=Lundi, 7=Dimanche)
- `timeOfDay` : Heure au format HH:mm (24h)

**Champs optionnels :**
- `description` : Description du transport
- `fromAddress`, `fromLat`, `fromLng` : Adresse et coordonnées du départ
- `toAddress`, `toLat`, `toLng` : Adresse et coordonnées de l'arrivée
- `timezone` : Fuseau horaire (défaut: "Europe/Paris")
- `capacity` : Nombre de places (défaut: 4, min: 1)
- `allowOverbook` : Autoriser le surbooking (défaut: false)
- `isActive` : Template actif (défaut: true)
- `recurrenceType` : Type de récurrence (défaut: "WEEKLY")

**Réponse (201) :**
```json
{
  "id": "cm5a1b2c3d4e5f6g7h8i9j0k",
  "name": "Paris → Bordeaux",
  "description": "Transport hebdomadaire vers le centre d'entraînement de Bordeaux",
  "fromLabel": "Paris Gare de Lyon",
  "toLabel": "Bordeaux St-Jean",
  "timezone": "Europe/Paris",
  "capacity": 4,
  "allowOverbook": false,
  "isActive": true,
  "recurrenceType": "WEEKLY",
  "daysOfWeek": [1, 3, 5],
  "timeOfDay": "14:50",
  "createdAt": "2026-01-15T14:30:00.000Z",
  "updatedAt": "2026-01-15T14:30:00.000Z"
}
```

---

#### 1.2 Lister les templates
```http
GET /transport-templates?isActive=true
Authorization: Bearer <admin_token>
```

**Query parameters :**
- `isActive` : Filtrer par statut actif (optionnel : true, false)

**Réponse (200) :**
```json
[
  {
    "id": "cm5a1b2c3d4e5f6g7h8i9j0k",
    "name": "Paris → Bordeaux",
    "fromLabel": "Paris Gare de Lyon",
    "toLabel": "Bordeaux St-Jean",
    "capacity": 4,
    "allowOverbook": false,
    "isActive": true,
    "daysOfWeek": [1, 3, 5],
    "timeOfDay": "14:50",
    "createdAt": "2026-01-15T14:30:00.000Z"
  }
]
```

---

#### 1.3 Obtenir un template
```http
GET /transport-templates/:id
Authorization: Bearer <admin_token>
```

**Réponse (200) :**
```json
{
  "id": "cm5a1b2c3d4e5f6g7h8i9j0k",
  "name": "Paris → Bordeaux",
  "description": "Transport hebdomadaire",
  "fromLabel": "Paris Gare de Lyon",
  "toLabel": "Bordeaux St-Jean",
  "capacity": 4,
  "allowOverbook": false,
  "isActive": true,
  "daysOfWeek": [1, 3, 5],
  "timeOfDay": "14:50",
  "occurrences": [
    {
      "id": "occ1",
      "departureAt": "2026-01-20T13:50:00.000Z",
      "status": "SCHEDULED"
    }
  ],
  "createdAt": "2026-01-15T14:30:00.000Z",
  "updatedAt": "2026-01-15T14:30:00.000Z"
}
```

---

#### 1.4 Mettre à jour un template
```http
PATCH /transport-templates/:id
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Payload (tous les champs sont optionnels) :**
```json
{
  "capacity": 6,
  "allowOverbook": true,
  "isActive": true
}
```

**Réponse (200) :**
Template mis à jour avec tous les champs.

---

#### 1.5 Supprimer un template (soft delete)
```http
DELETE /transport-templates/:id
Authorization: Bearer <admin_token>
```

**Réponse (200) :**
Le template est désactivé (`isActive=false`) mais pas supprimé de la base.

---

#### 1.6 Générer les occurrences
```http
POST /transport-templates/:id/generate
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Payload :**
```json
{
  "fromDate": "2026-01-15",
  "toDate": "2026-02-15"
}
```

**Champs obligatoires :**
- `fromDate` : Date de début (format YYYY-MM-DD, inclusive)
- `toDate` : Date de fin (format YYYY-MM-DD, inclusive)

**Validation :**
- `fromDate` doit être <= `toDate`

**Réponse (200) :**
```json
{
  "generated": 13,
  "occurrences": [
    {
      "id": "occ1",
      "templateId": "cm5a1b2c3d4e5f6g7h8i9j0k",
      "departureAt": "2026-01-20T13:50:00.000Z",
      "capacitySnapshot": 4,
      "allowOverbookSnapshot": false,
      "status": "SCHEDULED",
      "createdAt": "2026-01-15T14:30:00.000Z"
    }
  ]
}
```

**Notes :**
- Génération idempotente (utilise upsert) : sans danger d'appeler plusieurs fois
- Génère uniquement les jours qui correspondent à `daysOfWeek`
- Les occurrences capturent la capacité et le paramètre overbook du template au moment de la génération

---

### 2. Occurrences (Utilisateurs authentifiés)

#### 2.1 Lister les occurrences
```http
GET /transport-occurrences?from=2026-01-15&to=2026-02-15&status=SCHEDULED
Authorization: Bearer <user_token>
```

**Query parameters obligatoires :**
- `from` : Date de début (format YYYY-MM-DD)
- `to` : Date de fin (format YYYY-MM-DD)

**Query parameters optionnels :**
- `templateId` : Filtrer par template
- `status` : Filtrer par statut (SCHEDULED ou CANCELLED)

**Réponse (200) :**
```json
[
  {
    "id": "occ1",
    "templateId": "cm5a1b2c3d4e5f6g7h8i9j0k",
    "departureAt": "2026-01-20T13:50:00.000Z",
    "capacitySnapshot": 4,
    "allowOverbookSnapshot": false,
    "status": "SCHEDULED",
    "cancelReason": null,
    "template": {
      "id": "cm5a1b2c3d4e5f6g7h8i9j0k",
      "name": "Paris → Bordeaux",
      "fromLabel": "Paris Gare de Lyon",
      "toLabel": "Bordeaux St-Jean",
      "timezone": "Europe/Paris"
    },
    "bookedSeats": 2,
    "availableSeats": 2
  }
]
```

**Notes :**
- `bookedSeats` : Nombre de places réservées (confirmées)
- `availableSeats` : Places restantes (null si `allowOverbookSnapshot=true`)

---

#### 2.2 Obtenir une occurrence
```http
GET /transport-occurrences/:id
Authorization: Bearer <user_token>
```

**Réponse (200) pour un utilisateur :**
```json
{
  "id": "occ1",
  "templateId": "cm5a1b2c3d4e5f6g7h8i9j0k",
  "departureAt": "2026-01-20T13:50:00.000Z",
  "capacitySnapshot": 4,
  "allowOverbookSnapshot": false,
  "status": "SCHEDULED",
  "template": {
    "id": "cm5a1b2c3d4e5f6g7h8i9j0k",
    "name": "Paris → Bordeaux",
    "fromLabel": "Paris Gare de Lyon",
    "toLabel": "Bordeaux St-Jean"
  },
  "bookedSeats": 2,
  "availableSeats": 2,
  "myBooking": {
    "id": "booking1",
    "seats": 1,
    "status": "CONFIRMED",
    "createdAt": "2026-01-16T10:00:00.000Z"
  }
}
```

**Réponse (200) pour un admin :**
Même chose + champ `bookings` avec la liste de toutes les réservations :
```json
{
  ...
  "bookings": [
    {
      "id": "booking1",
      "seats": 1,
      "status": "CONFIRMED",
      "createdAt": "2026-01-16T10:00:00.000Z",
      "user": {
        "id": "user1",
        "firstname": "Jean",
        "lastname": "Dupont",
        "email": "jean.dupont@example.com"
      }
    }
  ]
}
```

---

#### 2.3 Réserver un transport
```http
POST /transport-occurrences/:id/book
Authorization: Bearer <user_token>
Content-Type: application/json
```

**Payload :**
```json
{
  "seats": 2
}
```

**Champs optionnels :**
- `seats` : Nombre de places à réserver (défaut: 1, min: 1, max: 10)

**Réponse (201) :**
```json
{
  "id": "booking1",
  "occurrenceId": "occ1",
  "userId": "user1",
  "seats": 2,
  "status": "CONFIRMED",
  "createdAt": "2026-01-16T10:00:00.000Z",
  "occurrence": {
    "id": "occ1",
    "departureAt": "2026-01-20T13:50:00.000Z",
    "template": {
      "name": "Paris → Bordeaux"
    }
  }
}
```

**Erreurs possibles :**
- **400 Bad Request** : Deadline dépassée (après minuit le jour du transport)
  ```json
  {
    "statusCode": 400,
    "message": "Booking deadline has passed. Bookings must be made before midnight on the day of transport."
  }
  ```

- **400 Bad Request** : Pas assez de places
  ```json
  {
    "statusCode": 400,
    "message": "Not enough seats available. Requested: 3, Available: 2"
  }
  ```

- **404 Not Found** : Occurrence introuvable
  ```json
  {
    "statusCode": 404,
    "message": "Transport occurrence with ID occ1 not found"
  }
  ```

- **409 Conflict** : Réservation déjà existante
  ```json
  {
    "statusCode": 409,
    "message": "You already have a booking for this transport"
  }
  ```

**Validations effectuées :**
1. L'occurrence existe et n'est pas annulée
2. La deadline n'est pas dépassée (avant 00:00 le jour du transport)
3. L'utilisateur n'a pas déjà une réservation pour cette occurrence
4. Capacité suffisante (si `allowOverbook=false`)

---

#### 2.4 Annuler une occurrence (Admin uniquement)
```http
POST /transport-occurrences/:id/cancel
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Payload :**
```json
{
  "reason": "Conditions météorologiques défavorables"
}
```

**Champs optionnels :**
- `reason` : Raison de l'annulation

**Réponse (200) :**
```json
{
  "id": "occ1",
  "status": "CANCELLED",
  "cancelReason": "Conditions météorologiques défavorables",
  "updatedAt": "2026-01-17T08:00:00.000Z"
}
```

---

### 3. Réservations (Utilisateurs authentifiés)

#### 3.1 Annuler une réservation
```http
POST /transport-bookings/:id/cancel
Authorization: Bearer <user_token>
```

**Réponse (200) :**
```json
{
  "id": "booking1",
  "occurrenceId": "occ1",
  "userId": "user1",
  "seats": 2,
  "status": "CANCELLED",
  "updatedAt": "2026-01-17T09:00:00.000Z",
  "occurrence": {
    "id": "occ1",
    "departureAt": "2026-01-20T13:50:00.000Z",
    "template": {
      "name": "Paris → Bordeaux"
    }
  }
}
```

**Erreurs possibles :**
- **403 Forbidden** : Vous ne pouvez annuler que vos propres réservations
  ```json
  {
    "statusCode": 403,
    "message": "You can only cancel your own bookings"
  }
  ```

- **404 Not Found** : Réservation introuvable
  ```json
  {
    "statusCode": 404,
    "message": "Booking with ID booking1 not found"
  }
  ```

**Permissions :**
- Les utilisateurs peuvent annuler uniquement leurs propres réservations
- Les admins peuvent annuler n'importe quelle réservation

---

## Convention des jours de la semaine

Le champ `daysOfWeek` utilise la convention ISO 8601 :
- **1** = Lundi
- **2** = Mardi
- **3** = Mercredi
- **4** = Jeudi
- **5** = Vendredi
- **6** = Samedi
- **7** = Dimanche

**Exemple :** `[1, 3, 5]` = Tous les lundis, mercredis et vendredis

---

## Format de l'heure

Le champ `timeOfDay` utilise le format 24 heures : **HH:mm**

**Valide :**
- "14:50"
- "09:00"
- "23:59"

**Invalide :**
- "9:00" (zéro manquant)
- "14:5" (zéro manquant)
- "25:00" (heure invalide)

---

## Gestion des fuseaux horaires

- Tous les calculs de date/heure utilisent le fuseau horaire du template (défaut : "Europe/Paris")
- La vérification de la deadline convertit l'heure actuelle et l'heure de départ dans le fuseau du template
- La génération des occurrences combine la date + `timeOfDay` dans le fuseau horaire spécifié

---

## Workflow typique

### Pour un administrateur :

1. **Créer un template de transport**
   ```http
   POST /transport-templates
   ```

2. **Générer les occurrences pour les 30 prochains jours**
   ```http
   POST /transport-templates/:id/generate
   Body: { "fromDate": "2026-01-15", "toDate": "2026-02-15" }
   ```

3. **Consulter les réservations d'une occurrence**
   ```http
   GET /transport-occurrences/:id
   ```

4. **Annuler une occurrence si nécessaire**
   ```http
   POST /transport-occurrences/:id/cancel
   ```

5. **Annuler une réservation d'un utilisateur**
   ```http
   POST /transport-bookings/:id/cancel
   ```

### Pour un utilisateur :

1. **Consulter les transports disponibles**
   ```http
   GET /transport-occurrences?from=2026-01-15&to=2026-02-15&status=SCHEDULED
   ```

2. **Voir les détails d'un transport**
   ```http
   GET /transport-occurrences/:id
   ```

3. **Réserver un transport**
   ```http
   POST /transport-occurrences/:id/book
   Body: { "seats": 1 }
   ```

4. **Annuler sa réservation**
   ```http
   POST /transport-bookings/:booking_id/cancel
   ```

---

## Codes de statut HTTP

| Code | Signification | Utilisation |
|------|---------------|-------------|
| 200 | OK | Succès (GET, PATCH, DELETE, POST cancel) |
| 201 | Created | Ressource créée (POST) |
| 400 | Bad Request | Erreur de validation, deadline dépassée, capacité insuffisante |
| 403 | Forbidden | Accès interdit (pas admin ou pas propriétaire) |
| 404 | Not Found | Ressource introuvable |
| 409 | Conflict | Conflit (réservation déjà existante) |

---

## Notes techniques

### Transactions Prisma
L'endpoint de réservation utilise `$transaction` pour garantir l'atomicité :
1. Verrouillage de l'occurrence
2. Calcul des places réservées
3. Validation de la capacité
4. Création de la réservation

Cela empêche les conditions de course où plusieurs utilisateurs réserveraient la dernière place disponible simultanément.

### Génération idempotente
La génération d'occurrences utilise `upsert` avec la contrainte unique `(templateId, departureAt)`. Il est donc sans danger d'appeler l'endpoint plusieurs fois avec les mêmes dates.

### Snapshots de capacité
Lors de la génération, les occurrences capturent (`snapshot`) la capacité et le paramètre `allowOverbook` du template. Cela permet de modifier le template sans affecter les occurrences déjà créées.
