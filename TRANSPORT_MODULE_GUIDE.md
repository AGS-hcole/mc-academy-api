# Transport Module API Documentation

## Overview

The Transport module provides functionality for managing recurring transport routes (templates) and individual transport occurrences that users can book.

## Architecture

### Models

1. **TransportTemplate**: Defines a recurring transport route
   - Contains route details (from/to locations)
   - Defines recurrence pattern (days of week + time)
   - Specifies capacity and overbooking settings

2. **TransportOccurrence**: A specific instance of a transport on a given date/time
   - Generated from templates based on recurrence rules
   - Stores snapshot of capacity/overbook settings
   - Can be cancelled by admins

3. **TransportBooking**: A user's reservation for a specific occurrence
   - One booking per user per occurrence (enforced by unique constraint)
   - Includes number of seats requested

### Business Rules

#### Booking Cutoff
- Users can only book transports until **midnight (00:00) on the day of the transport**
- Example: For a transport on 2026-01-20 at 14:50, booking is allowed until 2026-01-19 23:59:59
- Cutoff is calculated in the template's timezone (default: Europe/Paris)

#### Capacity Management
- Each occurrence has a capacity snapshot from the template
- `allowOverbook=false`: Bookings rejected if capacity would be exceeded
- `allowOverbook=true`: Unlimited bookings allowed
- Booking uses Prisma transactions to prevent race conditions

#### Permissions
- **Admin only**: CRUD templates, generate occurrences, cancel occurrences
- **Authenticated users**: View occurrences, book occurrences, cancel own bookings
- **Admins**: Can cancel any booking (not just their own)

## API Endpoints

### Templates (Admin Only)

#### Create Template
```http
POST /transport-templates
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Paris → Bordeaux",
  "description": "Weekly transport to Bordeaux training center",
  "fromLabel": "Paris Gare de Lyon",
  "fromAddress": "Place Louis Armand, 75012 Paris",
  "toLabel": "Bordeaux St-Jean",
  "toAddress": "Rue Charles Domercq, 33800 Bordeaux",
  "timezone": "Europe/Paris",
  "capacity": 4,
  "allowOverbook": false,
  "isActive": true,
  "recurrenceType": "WEEKLY",
  "daysOfWeek": [1, 3, 5],  // Monday, Wednesday, Friday
  "timeOfDay": "14:50"
}
```

#### List Templates
```http
GET /transport-templates?isActive=true
Authorization: Bearer <admin_token>
```

#### Get Template
```http
GET /transport-templates/:id
Authorization: Bearer <admin_token>
```

#### Update Template
```http
PATCH /transport-templates/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "capacity": 6,
  "allowOverbook": true
}
```

#### Soft Delete Template
```http
DELETE /transport-templates/:id
Authorization: Bearer <admin_token>
```
Sets `isActive=false` instead of deleting the record.

#### Generate Occurrences
```http
POST /transport-templates/:id/generate
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "fromDate": "2026-01-15",
  "toDate": "2026-02-15"
}
```

Generates occurrences for the specified date range based on the template's recurrence rules. Uses upsert for idempotence - safe to call multiple times.

### Occurrences (Authenticated)

#### List Occurrences
```http
GET /transport-occurrences?from=2026-01-15&to=2026-02-15&status=SCHEDULED
Authorization: Bearer <token>
```

Query Parameters:
- `from`: Start date (required, YYYY-MM-DD)
- `to`: End date (required, YYYY-MM-DD)
- `templateId`: Filter by template (optional)
- `status`: Filter by status - SCHEDULED or CANCELLED (optional)

Response includes:
- Occurrence details
- Template summary
- `bookedSeats`: Total confirmed bookings
- `availableSeats`: Remaining capacity (null if overbooking allowed)

#### Get Occurrence Details
```http
GET /transport-occurrences/:id
Authorization: Bearer <token>
```

Response includes:
- Full occurrence and template details
- `myBooking`: Current user's booking (if exists)
- `bookings`: All bookings (admin only)

#### Book Occurrence
```http
POST /transport-occurrences/:id/book
Authorization: Bearer <token>
Content-Type: application/json

{
  "seats": 2  // Optional, defaults to 1
}
```

Validates:
- Cutoff time (before midnight on transport day)
- Capacity (if overbooking disabled)
- No existing booking for user

Returns:
- 201: Booking created
- 400: Cutoff passed or insufficient capacity
- 404: Occurrence not found
- 409: User already has a booking

#### Cancel Occurrence (Admin Only)
```http
POST /transport-occurrences/:id/cancel
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "Bad weather conditions"  // Optional
}
```

### Bookings (Authenticated)

#### Cancel Booking
```http
POST /transport-bookings/:id/cancel
Authorization: Bearer <token>
```

Users can cancel their own bookings. Admins can cancel any booking.

## Days of Week Convention

The `daysOfWeek` field uses ISO 8601 convention:
- 1 = Monday
- 2 = Tuesday
- 3 = Wednesday
- 4 = Thursday
- 5 = Friday
- 6 = Saturday
- 7 = Sunday

Example: `[1, 3, 5]` = Every Monday, Wednesday, and Friday

## Time Format

The `timeOfDay` field uses 24-hour format: `HH:mm`
- Valid: "14:50", "09:00", "23:59"
- Invalid: "9:00" (missing leading zero), "14:5" (missing trailing zero)

## Timezone Handling

- All datetime calculations use the template's timezone (default: "Europe/Paris")
- The cutoff check converts current time and departure time to the template's timezone
- Occurrence generation combines date + timeOfDay in the specified timezone

## Prisma Transaction

The booking endpoint uses `$transaction` to ensure atomicity:
1. Lock the occurrence record
2. Calculate current booked seats
3. Validate capacity
4. Create booking

This prevents race conditions where multiple users book the last available seat simultaneously.

## Example Workflow

1. **Admin creates template** (POST /transport-templates)
2. **Admin generates occurrences** (POST /transport-templates/:id/generate)
3. **Users browse occurrences** (GET /transport-occurrences)
4. **User books transport** (POST /transport-occurrences/:id/book)
5. **User views their booking** (GET /transport-occurrences/:id - shows myBooking)
6. **Admin views all bookings** (GET /transport-occurrences/:id - shows bookings array)
7. **User cancels booking** (POST /transport-bookings/:id/cancel)
8. **Admin cancels occurrence** (POST /transport-occurrences/:id/cancel)

## Error Handling

All endpoints return appropriate HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad request (validation error, cutoff passed, insufficient capacity)
- 403: Forbidden (not admin, not your booking)
- 404: Not found
- 409: Conflict (duplicate booking)

Error responses include descriptive messages.
