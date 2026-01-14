# Residence Management Quick Reference

## Overview
The Residence Management system handles housing (manors) and night stays for MC Academy students.

## Key Concepts

### Manors
- Housing locations with configurable capacity
- Admin-managed only (CRUD operations)
- Soft-delete support (isActive flag)
- Capacity can be enforced or tracked for reporting

### Night Stays
- Students register for specific nights at specific manors
- Subject to cutoff time (12:00 Europe/Paris on the same day)
- Capacity enforcement per manor configuration
- Audit trail (status: PLANNED/CANCELED)

## Business Rules

### 1. Cutoff Time
- **Users**: Can register/cancel only before 12:00 Europe/Paris on the same day
- **Admins**: Can always register/cancel (bypass cutoff)
- Cutoff time is configurable in `AppSetting.residenceCutoffHourLocal` and `residenceCutoffMinuteLocal`

### 2. Capacity Enforcement
- **enforceCapacity=true**: Reject user registration when full (admins can force with `force=true`)
- **enforceCapacity=false**: Allow registration but mark as `overCapacity=true` for reporting

### 3. Date Format
- All dates use `YYYY-MM-DD` format (e.g., "2026-01-14")
- Stored as UTC midnight but interpreted as Europe/Paris calendar days
- Luxon library handles timezone conversions

## API Endpoints

### Admin - Manor Management

#### List Manors
```http
GET /api/residence/manors?activeOnly=true
Authorization: Bearer {admin_token}
```

#### Create Manor
```http
POST /api/residence/manors
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Manoir Principal",
  "address": "1 rue des Écoles",
  "city": "Montpellier",
  "capacity": 30,
  "enforceCapacity": true,
  "isActive": true
}
```

#### Update Manor
```http
PATCH /api/residence/manors/{id}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "capacity": 35,
  "enforceCapacity": false
}
```

#### Delete Manor (Soft Delete)
```http
DELETE /api/residence/manors/{id}
Authorization: Bearer {admin_token}
```

### User - Night Stays

#### Get My Stays
```http
GET /api/residence/stays/me?from=2026-01-01&to=2026-01-31&includeCanceled=false
Authorization: Bearer {user_token}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "date": "2026-01-14",
    "status": "PLANNED",
    "overCapacity": false,
    "manor": {
      "id": "uuid",
      "name": "Manoir Principal",
      "address": "1 rue des Écoles",
      "city": "Montpellier"
    },
    "createdAt": "2026-01-10T10:00:00.000Z"
  }
]
```

#### Register a Stay
```http
POST /api/residence/stays
Authorization: Bearer {user_token}
Content-Type: application/json

{
  "manorId": "manor-uuid",
  "date": "2026-01-14"
}
```

**Admin - Register for Another User:**
```json
{
  "manorId": "manor-uuid",
  "userId": "user-uuid",
  "date": "2026-01-14",
  "force": true  // bypass capacity if enforceCapacity=true
}
```

#### Cancel a Stay
```http
POST /api/residence/stays/cancel
Authorization: Bearer {user_token}
Content-Type: application/json

{
  "manorId": "manor-uuid",
  "date": "2026-01-14"
}
```

**Admin - Cancel for Another User:**
```json
{
  "manorId": "manor-uuid",
  "userId": "user-uuid",
  "date": "2026-01-14"
}
```

### Admin - Reporting

#### Get Manor Occupancy Report
```http
GET /api/residence/stays?manorId={manor-uuid}&date=2026-01-14
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "manor": {
    "id": "uuid",
    "name": "Manoir Principal",
    "capacity": 30,
    "enforceCapacity": true
  },
  "date": "2026-01-14",
  "counts": {
    "planned": 28,
    "canceled": 2,
    "overCapacity": 0
  },
  "stays": [
    {
      "id": "uuid",
      "status": "PLANNED",
      "overCapacity": false,
      "createdByAdmin": false,
      "user": {
        "id": "uuid",
        "firstname": "John",
        "lastname": "Doe",
        "email": "john@example.com"
      },
      "createdAt": "2026-01-10T10:00:00.000Z"
    }
  ]
}
```

## Error Responses

### 400 Bad Request
- Invalid date format (not YYYY-MM-DD)
- Invalid input data

### 403 Forbidden
- Cutoff time passed (users only)
- User trying to register/cancel for another user
- Non-admin accessing admin endpoints

### 404 Not Found
- Manor not found
- Stay not found

### 409 Conflict
- Capacity reached (when enforceCapacity=true)

## Database Schema

### Manor
```prisma
model Manor {
  id              String   @id @default(uuid())
  name            String
  address         String?
  city            String?
  capacity        Int      @default(0)
  enforceCapacity Boolean  @default(true)
  isActive        Boolean  @default(true)
  stays           ResidenceStay[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### ResidenceStay
```prisma
model ResidenceStay {
  id             String              @id @default(uuid())
  manorId        String
  userId         String
  date           DateTime
  status         ResidenceStayStatus @default(PLANNED)
  overCapacity   Boolean             @default(false)
  createdByAdmin Boolean             @default(false)
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt
  
  @@unique([manorId, userId, date])
}
```

### ResidenceStayStatus
```prisma
enum ResidenceStayStatus {
  PLANNED
  CANCELED
}
```

## Configuration

### AppSetting
The cutoff time is stored in the `AppSetting` model (singleton with id=1):
- `residenceCutoffHourLocal`: Hour of cutoff (default: 12)
- `residenceCutoffMinuteLocal`: Minute of cutoff (default: 0)

To change the cutoff time, update these values in the database.

## Testing

Run the e2e tests:
```bash
npm run test:e2e -- residence.e2e-spec.ts
```

The test suite covers:
- Manor CRUD operations
- Stay registration and cancellation
- Cutoff time enforcement
- Capacity enforcement
- Permission checks
- Date validation

## Development Notes

### Timezone Service
The `ResidenceTimeService` provides helper methods:
- `nowParis()`: Current time in Europe/Paris
- `parseLocalDate(dateStr)`: Parse YYYY-MM-DD as Paris time
- `localDateToUtcMidnight(dateStr)`: Convert to UTC for DB storage
- `cutoffInstant(dateStr)`: Get cutoff DateTime for a date
- `isBeforeCutoff(dateStr)`: Check if before cutoff
- `formatDateParis(date)`: Format Date to YYYY-MM-DD

### Concurrency Safety
Capacity checks use Prisma transactions to prevent race conditions:
```typescript
await this.prisma.$transaction(async (tx) => {
  // Count planned stays
  // Check capacity
  // Create/update stay
});
```

### Idempotency
Creating the same stay twice uses upsert to prevent duplicates:
- Unique constraint: `[manorId, userId, date]`
- Upsert reactivates canceled stays
