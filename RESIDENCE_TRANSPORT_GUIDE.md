# Residence & Transport Weekly Planning Guide

This guide explains how the Residence (Manor) and Transport weekly planning system works for sport-study students.

## Overview

The system allows students to plan their residence nights and transport needs for the upcoming week during a configurable weekend planning window. Admins can manage plans, generate transport runs, and track presence.

## Key Concepts

### Planning Window

- **Configurable Weekend Window**: By default, Saturday 00:00 to Sunday 23:59 (Europe/Paris timezone)
- **Target Week**: Students can only plan for the **next week** (Monday through Sunday)
- **Student Access**: Regular students can only create/update plans during the weekend window
- **Admin Access**: Admins can create/update plans at any time

### Residence Planning

Students declare which nights they will sleep at the manor for the upcoming week:

- Submit a list of dates (nights) during the weekend window
- Plans are locked after the window closes
- Admins can mark actual presence confirmation per night

### Transport Planning

Students request transport for the upcoming week by selecting:

- A **Transport Template** (e.g., "Manor → School A - Morning GO")
- Specific dates matching the template's active weekdays
- Direction (GO or RETURN)

After the window closes, the system:

- Generates **Transport Runs** for each day/template combination
- Auto-assigns students respecting capacity limits
- Marks overflow students as **WAITLISTED**

## Configuration

### App Settings

The planning window is configured via the `AppSetting` table:

```typescript
planWindowOpenWeekday: 6,        // 6 = Saturday (ISO weekday)
planWindowOpenHourLocal: 0,      // 00:00 local time
planWindowCloseWeekday: 7,       // 7 = Sunday
planWindowCloseHourLocal: 23,    // 23:59
planWindowCloseMinuteLocal: 59
```

To update these settings, use the database or create an admin endpoint.

### Transport Templates

Admins create **Transport Templates** that define:

- **Name**: e.g., "Manor to School A - Morning"
- **Direction**: GO (Manor → School) or RETURN (School → Manor)
- **Target Time**: Departure time in HH:mm format (Europe/Paris)
- **Capacity**: Maximum number of seats
- **Days of Week**: ISO weekdays (1=Monday, 7=Sunday)
- **Active Period**: Optional start/end dates
- **Default Driver & Vehicle**: Optional defaults

Example:
```json
{
  "name": "Manor to School A - Morning",
  "direction": "GO",
  "originLabel": "Manor",
  "destinationId": "<school-id>",
  "targetTime": "07:45",
  "capacity": 8,
  "daysOfWeek": [1, 2, 3, 4, 5],
  "defaultDriverId": "<admin-user-id>",
  "defaultVehicle": "Van 1"
}
```

## API Endpoints

### Residence Endpoints

#### Create/Update Residence Week Plan
```http
POST /residence/week-plans
Authorization: Bearer <token>

{
  "studentId": "<student-id>",  // Optional, admin only
  "weekStartDate": "2025-11-17", // Optional, defaults to next week
  "nights": [
    "2025-11-17",
    "2025-11-18",
    "2025-11-19"
  ]
}
```

#### Get Current User's Plan
```http
GET /residence/week-plans/me?weekStart=2025-11-17
Authorization: Bearer <token>
```

#### Get Student's Plan (Admin)
```http
GET /residence/week-plans/<student-id>?weekStart=2025-11-17
Authorization: Bearer <token>
```

#### Confirm Presence (Admin)
```http
PATCH /residence/confirm
Authorization: Bearer <token>

{
  "studentId": "<student-id>",
  "date": "2025-11-17",
  "confirmedPresent": true
}
```

### Transport Template Endpoints (Admin Only)

#### Create Template
```http
POST /transport/templates
Authorization: Bearer <token>

{
  "name": "Manor to School A - Morning",
  "direction": "GO",
  "originLabel": "Manor",
  "destinationId": "<school-id>",
  "targetTime": "07:45",
  "capacity": 8,
  "daysOfWeek": [1, 2, 3, 4, 5]
}
```

#### List Templates
```http
GET /transport/templates
Authorization: Bearer <token>
```

#### Update Template
```http
PATCH /transport/templates/<template-id>
Authorization: Bearer <token>

{
  "capacity": 10
}
```

#### Delete Template
```http
DELETE /transport/templates/<template-id>
Authorization: Bearer <token>
```

### Transport Plan Endpoints

#### Create/Update Transport Week Plan
```http
POST /transport/week-plans
Authorization: Bearer <token>

{
  "studentId": "<student-id>",  // Optional, admin only
  "weekStartDate": "2025-11-17", // Optional, defaults to next week
  "entries": [
    {
      "templateId": "<template-id>",
      "date": "2025-11-17",
      "direction": "GO"
    },
    {
      "templateId": "<template-id>",
      "date": "2025-11-17",
      "direction": "RETURN"
    }
  ]
}
```

#### Get Current User's Plan
```http
GET /transport/week-plans/me?weekStart=2025-11-17
Authorization: Bearer <token>
```

#### Get Student's Plan (Admin)
```http
GET /transport/week-plans/<student-id>?weekStart=2025-11-17
Authorization: Bearer <token>
```

### Transport Run Endpoints (Admin Only)

#### Generate Runs for a Week
```http
POST /transport/runs/generate
Authorization: Bearer <token>

{
  "weekStart": "2025-11-17"
}
```

This endpoint:
- Creates runs for each template/day combination
- Auto-assigns students based on their week plans
- Respects capacity limits (ASSIGNED vs WAITLISTED)
- Is idempotent (safe to run multiple times)

#### List Runs
```http
GET /transport/runs?from=2025-11-17&to=2025-11-23
Authorization: Bearer <token>
```

#### Get Run Details
```http
GET /transport/runs/<run-id>
Authorization: Bearer <token>
```

#### Assign Student to Run
```http
POST /transport/runs/<run-id>/assign
Authorization: Bearer <token>

{
  "studentId": "<student-id>",
  "status": "ASSIGNED"  // or "WAITLISTED" or "DROPPED"
}
```

#### Remove Student Assignment
```http
DELETE /transport/runs/<run-id>/assign/<student-id>
Authorization: Bearer <token>
```

#### Check-in Presences
```http
POST /transport/runs/<run-id>/checkin
Authorization: Bearer <token>

{
  "presences": [
    {
      "studentId": "<student-id>",
      "mark": "PRESENT",
      "notes": "On time"
    },
    {
      "studentId": "<student-id>",
      "mark": "ABSENT",
      "notes": "Called in sick"
    }
  ]
}
```

## Automated Scheduling

The system includes an automated cron job that runs every Sunday at 23:59 (Europe/Paris):

```typescript
@Cron('59 23 * * 0', { timeZone: 'Europe/Paris' })
async autoGenerateRuns()
```

This job:
- Automatically generates transport runs for the next week
- Assigns students based on their submitted week plans
- Runs after the planning window closes

## Timezone Handling

All date/time operations use **Europe/Paris** timezone for business logic:

- Week calculations (Monday start)
- Planning window open/close
- Template target times
- Day-of-week matching

Dates are stored in UTC in the database but converted to Europe/Paris for all validations and comparisons.

## Capacity Management

When generating runs, the system:

1. Collects all students who requested a specific template on a specific date
2. Assigns up to `capacity` students with status `ASSIGNED`
3. Marks remaining students as `WAITLISTED`
4. Creates presence records for all assigned/waitlisted students

Admins can:
- Manually reassign students between runs
- Change assignment status (ASSIGNED ↔ WAITLISTED ↔ DROPPED)
- Split or merge runs as needed

## Presence Tracking

### Residence
- Admin marks `confirmedPresent: true/false` per night
- Simple boolean flag for intendant to track who actually slept at the manor

### Transport
- Admin/intendant marks presence per run using:
  - `PRESENT`: Student was on the transport
  - `ABSENT`: Student was assigned but didn't show up
  - `EXCUSED`: Student was absent but excused
- Optional notes field for additional context

## Error Handling

Common validation errors:

- **403 Forbidden**: Student trying to create/update outside planning window
- **400 Bad Request**: Date not within target week
- **400 Bad Request**: Template not active on requested weekday
- **404 Not Found**: Template, student, or run not found

## Best Practices

1. **Create Templates First**: Set up all transport templates before students start planning
2. **Test Planning Window**: Verify the window times work with your schedule
3. **Monitor Capacity**: Check waitlisted students and create additional runs if needed
4. **Regular Presence Tracking**: Mark presences daily for accurate records
5. **Backup Generation**: Manually run generation if the cron job fails

## Database Schema

Key models:

- `School`: Transport destinations
- `TransportTemplate`: Traject types (templates)
- `TransportWeekPlan` + `TransportPlanEntry`: Student transport requests
- `TransportRun`: Generated runs for specific dates
- `TransportRunAssignment`: Student assignments to runs
- `TransportPresence`: Presence tracking per run
- `ResidenceWeekPlan` + `ResidenceNight`: Residence night planning
- `AppSetting`: Configuration including planning window

## Seeding Data

The seed script creates:
- Sample schools (School A, B, C)
- Sample transport templates (GO and RETURN for weekdays)
- Configured app settings with planning window
- Test users (admin and students)

Run the seed:
```bash
npm run seed
```

## Support

For questions or issues, contact the development team or refer to the API documentation at `/api` (Swagger UI).
