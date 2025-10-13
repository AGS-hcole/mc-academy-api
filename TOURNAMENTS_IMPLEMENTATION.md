# Tournaments Feature - Implementation Guide

## Overview

This document describes the implementation of the Tournaments feature in the MyCenter Academy API. The feature allows admins to manage tournaments (tournament rosters) where they can add academy users, auto-generate homogeneous pairs based on ranking, reorder pairs, publish tournaments, and let users confirm participation and submit feedback.

## Architecture

### Module Structure

```
src/
└── tournaments/
    ├── dto/
    │   ├── create-tournament.dto.ts
    │   ├── update-tournament.dto.ts
    │   ├── replace-participants.dto.ts
    │   ├── reorder-teams.dto.ts
    │   ├── update-placement.dto.ts
    │   ├── tournament-rsvp.dto.ts
    │   ├── tournament-feedback.dto.ts
    │   └── index.ts
    ├── tournaments.controller.ts      # Admin endpoints
    ├── my-tournaments.controller.ts   # User endpoints
    ├── tournaments.service.ts         # Business logic
    ├── tournaments.module.ts
    └── tournaments.service.spec.ts    # Unit tests
```

### Database Schema

**Enums:**
- `TournamentType`: P250, P500, P1000, P1500, P2000
- `TournamentStatus`: DRAFT, PUBLISHED, ARCHIVED
- `ParticipationStatus`: PENDING, CONFIRMED, DECLINED

**Models:**
- `Tournament`: Main tournament entity with address and date information
- `TournamentParticipant`: Links users to tournaments with RSVP status and feedback
- `TournamentTeam`: Represents teams with orderIndex for manual reordering
- `TournamentTeamMember`: Links participants to teams

**User Model Changes:**
- Added `currentRanking: Int?` field for tournament pairing

## Endpoints

### Admin Endpoints (require AdminGuard)

#### 1. POST /api/v1/tournaments
Create a new tournament (DRAFT status by default).

**Request:**
```json
{
  "title": "Spring Championship 2025",
  "type": "P1000",
  "addressLine1": "123 Tennis Avenue",
  "addressLine2": "Building A",
  "postalCode": "75001",
  "city": "Paris",
  "country": "France",
  "latitude": 48.8566,
  "longitude": 2.3522,
  "startsAt": "2025-06-01T09:00:00Z",
  "endsAt": "2025-06-01T18:00:00Z"
}
```

**Response:** Tournament object with `status: "DRAFT"`

---

#### 2. GET /api/v1/tournaments
List all tournaments with optional filters.

**Query Parameters:**
- `status`: Filter by TournamentStatus (DRAFT, PUBLISHED, ARCHIVED)
- `type`: Filter by TournamentType
- `from`: Filter by start date (ISO string)
- `to`: Filter by end date (ISO string)
- `q`: Search in title, city, country

**Response:** Array of tournaments with participant and team counts

---

#### 3. GET /api/v1/tournaments/:id
Get detailed tournament information including participants and teams.

**Response:**
```json
{
  "id": "tournament-id",
  "title": "Spring Championship 2025",
  "status": "PUBLISHED",
  "participants": [
    {
      "id": "participant-id",
      "status": "CONFIRMED",
      "user": {
        "id": "user-id",
        "displayName": "John Doe",
        "currentRanking": 1000,
        "avatarUrl": "data:image/jpeg;base64,..."
      }
    }
  ],
  "teams": [
    {
      "id": "team-id",
      "orderIndex": 0,
      "placement": 1,
      "members": [...]
    }
  ]
}
```

---

#### 4. PUT /api/v1/tournaments/:id
Update tournament details (does not affect participants or teams).

**Request:** Partial tournament data (same as create)

---

#### 5. DELETE /api/v1/tournaments/:id
Delete a tournament. **Only allowed for DRAFT tournaments.**

**Response:** 400 Bad Request if tournament is not in DRAFT status

---

#### 6. PUT /api/v1/tournaments/:id/publish
Publish a tournament (set status to PUBLISHED).

**Requirements:**
- At least 2 participants
- Teams must be generated

**Response:** 400 Bad Request if requirements not met

---

#### 7. PUT /api/v1/tournaments/:id/archive
Archive a tournament (set status to ARCHIVED).

---

#### 8. PUT /api/v1/tournaments/:id/participants
Replace participant list with array of user IDs.

**Request:**
```json
{
  "userIds": ["user-id-1", "user-id-2", "user-id-3"]
}
```

**Behavior:**
- Removes participants not in the list
- Adds new participants with status PENDING
- Keeps existing participants
- **Clears all teams** to avoid stale pairings

---

#### 9. POST /api/v1/tournaments/:id/generate-teams
Auto-generate homogeneous teams based on current ranking.

**Algorithm:**
1. Load all participants with user.currentRanking
2. Treat null rankings as 0
3. Sort by currentRanking descending
4. Pair adjacent users (1-2, 3-4, 5-6, ...)
5. Create teams with incremental orderIndex
6. If odd number of participants, create a "bye" team with single member

**Response:** Array of created teams

---

#### 10. PUT /api/v1/tournaments/:id/reorder-teams
Manually reorder teams (for drag & drop UI).

**Request:**
```json
{
  "teamOrder": ["team-id-3", "team-id-1", "team-id-2"]
}
```

**Validation:**
- All team IDs must belong to the tournament
- Must include all teams

---

#### 11. PUT /api/v1/tournaments/:id/teams/:teamId/placement
Set final placement for a team.

**Request:**
```json
{
  "placement": 1
}
```

**Note:** Set to null to clear placement

---

### User Endpoints (require AuthGuard)

#### 12. GET /api/v1/my/tournaments
List user's tournaments (only PUBLISHED tournaments).

**Query Parameters:**
- `scope`: Filter by time
  - `upcoming`: startsAt >= today
  - `past`: endsAt < today
  - `all`: default, all tournaments

**Response:** Array of tournaments with user's participation status

---

#### 13. PUT /api/v1/tournaments/:id/rsvp
Confirm or decline participation.

**Request:**
```json
{
  "status": "CONFIRMED"
}
```

**Values:** "CONFIRMED" or "DECLINED"

**Security:** Users can only update their own participation

---

#### 14. PUT /api/v1/tournaments/:id/feedback
Submit feedback about tournament participation.

**Request:**
```json
{
  "feedback": "Great tournament, really enjoyed the competition!"
}
```

**Security:** Users can only submit feedback for their own participation

---

## Security

**Guards:**
- `AdminGuard`: Extends AuthGuard, checks user.role === 'admin'
- `AuthGuard`: Verifies JWT token, attaches user to request

**Authorization:**
- All admin endpoints: AdminGuard
- User endpoints: AuthGuard with user ID validation

## Validation

All DTOs use class-validator decorators:
- `@IsString()`, `@IsEnum()`, `@IsDateString()`
- `@IsLatitude()`, `@IsLongitude()` for coordinates
- `@IsOptional()` for optional fields
- `@IsArray()`, `@IsInt()`, `@Min()` for arrays and numbers

## Swagger Documentation

**Access:** `/swagger` (when ENABLE_SWAGGER=true)

**Tags:**
- `v1/tournaments`: Admin endpoints
- `v1/my/tournaments`: User endpoints

All endpoints documented with:
- @ApiOperation: Summary and description
- @ApiResponse: Success and error responses
- @ApiQuery: Query parameters
- @ApiBearerAuth: JWT authentication requirement

## Database Migrations

Migration file: `prisma/migrations/20251013000000_add_tournaments_feature/migration.sql`

**Changes:**
- Created 3 new enums
- Added currentRanking to User table
- Created 4 new tables with indexes and foreign keys

**Apply migrations:**
```bash
npx prisma migrate deploy  # Production
npx prisma migrate dev     # Development
```

## Testing

### Unit Tests

Location: `src/tournaments/tournaments.service.spec.ts`

**Coverage:**
- Team generation with even number of participants
- Team generation with odd number (bye team)
- Null ranking handling (treated as 0)
- Error cases (not found, insufficient participants)

**Run:**
```bash
npm test -- tournaments.service.spec.ts
```

### E2E Tests

Location: `test/tournaments.e2e-spec.ts`

**Coverage:**
- Admin tournament creation and management
- Permission enforcement (admin vs user)
- RSVP functionality
- Feedback submission
- My tournaments listing
- Team placement updates
- Publishing validation

**Run:**
```bash
npm run test:e2e -- tournaments.e2e-spec.ts
```

## Business Rules

1. **Tournament Lifecycle:**
   - Created in DRAFT status
   - Can only be published with ≥2 participants and generated teams
   - Can only be deleted in DRAFT status
   - Can be archived from any status

2. **Team Generation:**
   - Requires at least 2 participants
   - Sorts by currentRanking descending
   - Null rankings treated as 0
   - Pairs adjacent users (homogeneous pairing)
   - Creates "bye" team for odd numbers

3. **Participant Management:**
   - Replacing participants clears all teams
   - All participants start with PENDING status
   - Users can update their own status via RSVP

4. **Data Integrity:**
   - Cascade deletes on tournament removal
   - Unique constraints on tournament-user pairs
   - Team members must reference valid participants

## Frontend Integration Tips

**Creating a Tournament:**
1. POST /v1/tournaments (admin)
2. PUT /v1/tournaments/:id/participants with user IDs
3. POST /v1/tournaments/:id/generate-teams
4. (Optional) PUT /v1/tournaments/:id/reorder-teams
5. PUT /v1/tournaments/:id/publish

**User Flow:**
1. GET /v1/my/tournaments?scope=upcoming
2. User sees tournament and can RSVP
3. PUT /v1/tournaments/:id/rsvp with status
4. After tournament: PUT /v1/tournaments/:id/feedback

**Results Entry (Admin):**
1. GET /v1/tournaments/:id to see teams
2. For each team: PUT /v1/tournaments/:id/teams/:teamId/placement

## Support

- Check Swagger documentation at `/swagger`
- Review E2E tests for usage examples
- Verify database state with: `npx prisma studio`
- Check implementation tests for edge cases
