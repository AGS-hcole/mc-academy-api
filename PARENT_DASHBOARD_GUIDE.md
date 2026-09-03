# Parent Dashboard API - Guide Frontend

## Base URL
```
GET /parent/dashboard
```

## Authentification
Cet endpoint nécessite une authentification Bearer (`Authorization: Bearer <token>`).
Il est réservé aux utilisateurs connectés ayant le rôle **`parent`**. Toute autre requête reçoit une erreur `403 Forbidden`.

---

## Objectif

Cet endpoint retourne, pour **chaque enfant lié au parent connecté** (relation `ParentChild`), un ensemble d'indicateurs calculés sur une **période donnée** :

- 🎾 Nombre de sessions d'entraînement effectuées (passées)
- ⭐ Moyenne des notes reçues lors de ces entraînements (passées)
- 🚐 Nombre de transports/trajets effectués (passés)
- 🌙 Nombre de nuits dormies (passées)
- 🏆 Nombre de tournois effectués (passés) / à venir

Les enfants retournés sont exactement ceux liés au parent via la table `ParentChild` (mêmes enfants que ceux renvoyés par `GET /users/:id` pour ce parent, dans `childrenLinks`).

---

## Requête

### Query Parameters

| Param  | Type   | Requis | Format        | Description |
|--------|--------|--------|---------------|--------------|
| `from` | string | ❌     | ISO 8601      | Début de la période. Par défaut : le 1er jour du mois en cours (Europe/Paris). |
| `to`   | string | ❌     | ISO 8601      | Fin de la période. Par défaut : maintenant. Sert aussi de borne "aujourd'hui" pour distinguer le passé de l'à-venir. |

### Exemple de requête

```http
GET /parent/dashboard?from=2026-01-01T00:00:00.000Z&to=2026-01-31T23:59:59.999Z
Authorization: Bearer <token>
```

Sans paramètres, la période par défaut couvre le mois en cours jusqu'à maintenant :

```http
GET /parent/dashboard
Authorization: Bearer <token>
```

---

## Réponse (200 OK)

### Structure

```json
{
  "period": {
    "from": "2026-01-01T00:00:00.000Z",
    "to": "2026-01-31T23:59:59.999Z",
    "timezone": "Europe/Paris"
  },
  "children": [
    {
      "child": {
        "id": "b3f1c2a0-...",
        "firstname": "Lucas",
        "lastname": "Martin",
        "birthDate": "2014-05-12T00:00:00.000Z"
      },
      "trainingSessions": {
        "completedCount": 8
      },
      "ratings": {
        "average": 7.5,
        "count": 6
      },
      "transports": {
        "completedCount": 4
      },
      "residence": {
        "nightsCount": 2
      },
      "tournaments": {
        "completedCount": 1,
        "upcomingCount": 2
      }
    }
  ]
}
```

### Détail des champs

#### `period`
| Champ      | Type   | Description |
|------------|--------|-------------|
| `from`     | string | Début de la période utilisée pour le calcul (ISO 8601, toujours renvoyé même si non fourni en query). |
| `to`       | string | Fin de la période utilisée pour le calcul. |
| `timezone` | string | Fuseau horaire utilisé pour calculer les valeurs par défaut (`Europe/Paris`). |

#### `children[].child`
| Champ       | Type            | Description |
|-------------|-----------------|-------------|
| `id`        | string          | ID du `User` enfant. |
| `firstname` | string          | Prénom de l'enfant. |
| `lastname`  | string          | Nom de l'enfant. |
| `birthDate` | string \| null  | Date de naissance (ISO 8601) ou `null`. |

#### `children[].trainingSessions`
| Champ           | Type   | Description |
|-----------------|--------|-------------|
| `completedCount` | number | Nombre de sessions d'entraînement **passées** où l'enfant était présent (`Attendance.status = 'YES'`), sur une session non annulée, dont la date est comprise dans la période (`from` ≤ date ≤ `to`/maintenant). |

#### `children[].ratings`
| Champ     | Type            | Description |
|-----------|-----------------|-------------|
| `average` | number \| null  | Moyenne des notes (0 à 10) reçues par l'enfant lors des sessions **passées** de la période. `null` si aucune note. |
| `count`   | number          | Nombre de notes utilisées pour calculer la moyenne. |

#### `children[].transports`
| Champ            | Type   | Description |
|------------------|--------|-------------|
| `completedCount` | number | Nombre de trajets **passés** confirmés (`TransportBooking.status = 'CONFIRMED'`) dont le départ (`departureAt`) est compris dans la période. |

#### `children[].residence`
| Champ        | Type   | Description |
|--------------|--------|-------------|
| `nightsCount` | number | Nombre de nuits **passées** en internat (`ResidenceStay`, hors statut `CANCELED`) dont la date est comprise dans la période. |

#### `children[].tournaments`
| Champ            | Type   | Description |
|------------------|--------|-------------|
| `completedCount` | number | Nombre de tournois **terminés** (participation `CONFIRMED`, `Tournament.endsAt` compris dans la période et déjà passé). |
| `upcomingCount`  | number | Nombre de tournois **à venir** (participation `CONFIRMED`, `Tournament.startsAt` postérieur à la borne "maintenant" de la période, **sans limite haute** — un tournoi à venir reste compté même s'il est après `to`). |

---

## Règles de calcul importantes

- La borne « maintenant » utilisée pour distinguer passé/à-venir est `min(to, date actuelle du serveur)`. Ainsi, si `to` est dans le futur, on ne compte pas des événements qui n'ont pas encore eu lieu comme "effectués".
- Les compteurs "passés" (sessions, transports, nuits, tournois terminés) sont **bornés à la fois par `from` et par la borne "maintenant"**.
- Le compteur `tournaments.upcomingCount` n'est borné que par la borne basse "maintenant" : il retourne tous les tournois futurs auxquels l'enfant est inscrit, indépendamment de `to`, afin de permettre au frontend d'afficher "les prochains tournois" même hors période sélectionnée.
- Si le parent n'a aucun enfant lié, `children` est un tableau vide `[]`.
- Si un enfant n'a aucune donnée sur la période, tous les compteurs valent `0` et `ratings.average` vaut `null`.

---

## Erreurs

| Code | Cas |
|------|-----|
| `401 Unauthorized` | Token manquant ou invalide. |
| `403 Forbidden`    | L'utilisateur connecté n'a pas le rôle `parent`. |

---

## Exemple d'intégration frontend (TypeScript)

```ts
interface ParentDashboardResponse {
  period: { from: string; to: string; timezone: string };
  children: Array<{
    child: {
      id: string;
      firstname: string;
      lastname: string;
      birthDate: string | null;
    };
    trainingSessions: { completedCount: number };
    ratings: { average: number | null; count: number };
    transports: { completedCount: number };
    residence: { nightsCount: number };
    tournaments: { completedCount: number; upcomingCount: number };
  }>;
}

async function fetchParentDashboard(
  from?: string,
  to?: string,
): Promise<ParentDashboardResponse> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const res = await fetch(`/parent/dashboard?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error('Failed to load parent dashboard');
  return res.json();
}
```
