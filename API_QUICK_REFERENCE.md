# API Quick Reference - MyCenter Academy

## 🔐 Authentification

Tous les appels nécessitent un token JWT :
```http
Authorization: Bearer <jwt_token>
```

---

## 📋 Endpoints Résumé

### Sites

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/sites` | GET | ✅ | Tous les sites |
| `/sites/active` | GET | ✅ | Sites actifs uniquement |
| `/sites/:id` | GET | ✅ | Détails d'un site |
| `/sites` | POST | 🔒 Admin | Créer un site |
| `/sites/:id` | PUT | 🔒 Admin | Modifier un site |
| `/sites/:id` | DELETE | 🔒 Admin | Supprimer un site |

### Sessions (Public)

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/sessions/upcoming` | GET | ✅ | Sessions à venir |
| `/sessions` | GET | ✅ | Sessions avec filtres |
| `/sessions/:id` | GET | ✅ | Détails d'une session |
| `/sessions/:id/rsvp` | POST | ✅ | S'inscrire à une session |

### Sessions (Admin)

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/sessions` | POST | 🔒 Admin | Créer une session |
| `/sessions/:id` | PUT | 🔒 Admin | Modifier une session |
| `/sessions/:id` | DELETE | 🔒 Admin | Supprimer une session |
| `/sessions/:id/admin-register` | POST | 🔒 Admin | Inscrire un utilisateur |

---

## 🎯 Exemples Rapides

### Sites

```javascript
// 1. Récupérer tous les sites
fetch('/sites', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(res => res.json())
.then(sites => console.log(sites));

// 2. Récupérer les sites actifs
fetch('/sites/active', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// 3. Créer un site (Admin)
fetch('/sites', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Centre Paris 15',
    address: '123 Rue de Vaugirard',
    city: 'Paris',
    isActive: true
  })
});

// 4. Modifier un site (Admin)
fetch(`/sites/${siteId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Nouveau nom',
    address: '456 Rue Neuve',
    city: 'Lyon',
    isActive: false
  })
});

// 5. Supprimer un site (Admin)
fetch(`/sites/${siteId}`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Sessions

### 1. Récupérer les sessions à venir

```javascript
fetch('/sessions/upcoming', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(res => res.json())
.then(sessions => console.log(sessions));
```

### 2. Filtrer les sessions

```javascript
// Sessions du matin en mars 2024
const params = new URLSearchParams({
  slot: 'AM',
  startDate: '2024-03-01',
  endDate: '2024-03-31',
  isPublished: 'true'
});

fetch(`/sessions?${params}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### 3. S'inscrire à une session

```javascript
fetch(`/sessions/${sessionId}/rsvp`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'YES',
    comment: 'Je serai présent !'
  })
});
```

### 4. Créer une session (Admin)

```javascript
fetch('/sessions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    siteId: 'uuid-du-site',
    date: '2024-03-20T00:00:00.000Z',
    slot: 'AM',
    startTime: '2024-03-20T09:30:00.000Z',
    endTime: '2024-03-20T11:30:00.000Z',
    notes: 'Session spéciale',
    isPublished: true
  })
});
```

### 5. Inscription admin (bypass restrictions)

```javascript
fetch(`/sessions/${sessionId}/admin-register`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'uuid-utilisateur',
    status: 'YES',
    comment: 'Inscription manuelle'
  })
});
```

---

## 📊 Modèles de Données

### Site
```typescript
{
  id: string;
  name: string;              // Unique
  address: string | null;    // Adresse
  city: string | null;       // Ville
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  _count?: { sessions: number; };
  sessions?: Session[];      // 10 dernières sessions
}
```

### Session
```typescript
{
  id: string;
  siteId: string;
  date: string;              // ISO 8601
  slot: 'AM' | 'PM';
  startTime: string | null;  // ISO 8601
  endTime: string | null;    // ISO 8601
  isPublished: boolean;
  isCanceled: boolean;
  notes: string | null;
  site: { id: string; name: string; };
  attendances: Attendance[];
}
```

### Attendance
```typescript
{
  id: string;
  userId: string;
  status: 'YES' | 'NO';
  comment: string | null;
  outOfContract: boolean;
  createdByAdmin: boolean;
  user: User;
}
```

### User
```typescript
{
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  role: 'user' | 'admin';
  formula: 'MORNING' | 'AFTERNOON' | 'FULL' | null;
}
```

---

## ⚙️ Règles Métier

### Heures par défaut
- **AM** : 9h00 - 12h00
- **PM** : 14h00 - 17h00

### Cutoff
- **Date limite** : Vendredi 18h00 de la semaine de la session
- Les admins peuvent bypasser le cutoff

### Formules
- **MORNING** → Sessions AM seulement
- **AFTERNOON** → Sessions PM seulement
- **FULL** → Toutes les sessions
- Inscription hors formule → `outOfContract: true`

### Permissions
- **Utilisateurs** : Consulter et s'inscrire (avec restrictions)
- **Admins** : Toutes les opérations sans restrictions

---

## ❌ Codes d'Erreur

| Code | Message | Action |
|------|---------|--------|
| 400 | Bad Request | Vérifier les données |
| 401 | Unauthorized | Se reconnecter |
| 403 | Forbidden | Cutoff passé ou pas les droits |
| 404 | Not Found | Ressource inexistante |
| 500 | Server Error | Réessayer plus tard |

---

## 🔍 Filtres Disponibles

```
GET /sessions?
  siteId={uuid}              # Filtrer par site
  &startDate={ISO}           # Date de début
  &endDate={ISO}             # Date de fin
  &slot=AM|PM                # Créneau
  &isPublished=true|false    # Publiée ?
  &isCanceled=true|false     # Annulée ?
```

---

## 💡 Tips

1. **Cache les sessions** pour éviter trop de requêtes
2. **Vérifie le cutoff** côté client avant d'afficher le bouton d'inscription
3. **Valide la formule** avant de permettre l'inscription
4. **Affiche des messages clairs** pour les erreurs (cutoff, formule, etc.)
5. **Utilise les filtres** pour optimiser les performances
6. **Gère le loading** pendant les requêtes
7. **Formate les dates** en français pour l'utilisateur

---

## 📞 Support

**Email** : hubert.cole@devolut.fr  
**Docs complètes** : Voir `FRONTEND_DEVELOPER_GUIDE.md`
