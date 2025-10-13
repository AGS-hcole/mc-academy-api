# Tournaments API - Quick Reference

## Base URL
```
/api/tournaments
/api/v1/my/tournaments
```

## Authentication
All endpoints require Bearer token authentication.
Admin endpoints require `admin` role.

---

## Admin Endpoints

### Create Tournament
```http
POST /tournaments
Authorization: Bearer {admin_token}

{
  "title": "Spring Championship",
  "type": "P1000",
  "addressLine1": "123 Tennis Ave",
  "postalCode": "75001",
  "city": "Paris",
  "country": "France",
  "startsAt": "2025-06-01T09:00:00Z",
  "endsAt": "2025-06-01T18:00:00Z"
}
```

### List Tournaments
```http
GET /tournaments?status=PUBLISHED&type=P1000&q=Paris
Authorization: Bearer {admin_token}
```

### Get Tournament Details
```http
GET /tournaments/{id}
Authorization: Bearer {admin_token}
```

### Update Tournament
```http
PUT /tournaments/{id}
Authorization: Bearer {admin_token}

{
  "title": "Updated Title",
  "city": "Lyon"
}
```

### Delete Tournament (DRAFT only)
```http
DELETE /tournaments/{id}
Authorization: Bearer {admin_token}
```

### Publish Tournament
```http
PUT /tournaments/{id}/publish
Authorization: Bearer {admin_token}
```

### Archive Tournament
```http
PUT /tournaments/{id}/archive
Authorization: Bearer {admin_token}
```

---

## Participant Management (Admin)

### Replace Participants
```http
PUT /tournaments/{id}/participants
Authorization: Bearer {admin_token}

{
  "userIds": ["user-1", "user-2", "user-3"]
}
```

⚠️ **Note:** This clears all existing teams

---

## Team Management (Admin)

### Generate Teams
```http
POST /tournaments/{id}/generate-teams
Authorization: Bearer {admin_token}
```

Algorithm: Sorts by ranking (desc) → pairs adjacent (1-2, 3-4, ...)

### Reorder Teams
```http
PUT /tournaments/{id}/reorder-teams
Authorization: Bearer {admin_token}

{
  "teamOrder": ["team-3", "team-1", "team-2"]
}
```

### Update Team Placement
```http
PUT /tournaments/{id}/teams/{teamId}/placement
Authorization: Bearer {admin_token}

{
  "placement": 1
}
```

---

## User Endpoints

### My Tournaments
```http
GET /v1/my/tournaments?scope=upcoming
Authorization: Bearer {token}
```

**Scopes:** `upcoming`, `past`, `all` (default)

### RSVP
```http
PUT /tournaments/{id}/rsvp
Authorization: Bearer {token}

{
  "status": "CONFIRMED"
}
```

**Values:** `CONFIRMED`, `DECLINED`

### Submit Feedback
```http
PUT /tournaments/{id}/feedback
Authorization: Bearer {token}

{
  "feedback": "Great tournament!"
}
```

---

## Enums

### TournamentType
- `P250`
- `P500`
- `P1000`
- `P1500`
- `P2000`

### TournamentStatus
- `DRAFT` - Initial state, editable
- `PUBLISHED` - Visible to users
- `ARCHIVED` - Finished/historical

### ParticipationStatus
- `PENDING` - Default, awaiting user response
- `CONFIRMED` - User will participate
- `DECLINED` - User won't participate

---

## Typical Workflows

### Admin: Create and Publish Tournament
```bash
# 1. Create
POST /tournaments → {id}

# 2. Add participants
PUT /tournaments/{id}/participants
{
  "userIds": ["user1", "user2", "user3", "user4"]
}

# 3. Generate teams
POST /tournaments/{id}/generate-teams

# 4. (Optional) Reorder teams
PUT /tournaments/{id}/reorder-teams

# 5. Publish
PUT /tournaments/{id}/publish
```

### User: View and RSVP
```bash
# 1. List my tournaments
GET /v1/my/tournaments?scope=upcoming

# 2. Confirm participation
PUT /tournaments/{id}/rsvp
{
  "status": "CONFIRMED"
}

# 3. After tournament, submit feedback
PUT /tournaments/{id}/feedback
{
  "feedback": "Great experience!"
}
```

### Admin: Enter Results
```bash
# 1. Get tournament details
GET /tournaments/{id}

# 2. Set placements for each team
PUT /tournaments/{id}/teams/{team1}/placement
{ "placement": 1 }

PUT /tournaments/{id}/teams/{team2}/placement
{ "placement": 2 }

# 3. Archive
PUT /tournaments/{id}/archive
```

---

## Common Errors

### 400 Bad Request
- Cannot publish without ≥2 participants
- Cannot publish without generated teams
- Cannot delete non-DRAFT tournament
- Invalid team IDs in reorder

### 403 Forbidden
- User trying to access admin endpoint
- Admin role required

### 404 Not Found
- Tournament not found
- Participant not found (for RSVP/feedback)
- Team not found (for placement)

---

## Business Rules

✅ **Allowed:**
- Create tournaments in DRAFT
- Edit DRAFT tournaments
- Replace participants anytime (clears teams)
- Generate teams multiple times (replaces existing)
- Publish with ≥2 participants + teams
- Archive from any status
- Users RSVP to their own participation
- Users submit feedback for themselves

❌ **Not Allowed:**
- Delete published/archived tournaments
- Publish without teams
- Publish with <2 participants
- Users modify other users' RSVP
- Non-admins manage tournaments

---

## Testing

```bash
# Unit tests
npm test -- tournaments.service.spec.ts

# E2E tests
npm run test:e2e -- tournaments.e2e-spec.ts

# All tests
npm test
```

---

## Database

```bash
# View data
npx prisma studio

# Apply migrations
npx prisma migrate deploy

# Generate client after schema changes
npx prisma generate
```

---

## Swagger Documentation

Access: `http://localhost:3000/swagger` (when ENABLE_SWAGGER=true)

Look for tags:
- `v1/tournaments` - Admin endpoints
- `v1/my/tournaments` - User endpoints
