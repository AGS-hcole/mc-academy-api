# Residence & Transport Weekly Planning - Implementation Summary

## Overview

This document summarizes the implementation of the Residence (Manor) and Transport weekly planning feature for sport-study students in the MC Academy API.

## What Was Implemented

### 1. Database Schema (Prisma)

#### New Enums
- `TransportDirection`: GO (Manor → School), RETURN (School → Manor)
- `TransportRunStatus`: PLANNED, IN_PROGRESS, DONE, CANCELLED
- `TransportAssignmentStatus`: ASSIGNED, WAITLISTED, DROPPED
- `PresenceMark`: PRESENT, ABSENT, EXCUSED

#### New Models (9 total)
1. **School**: Transport destinations with address and status
2. **TransportTemplate**: Reusable transport configurations (traject types)
   - Name, direction, origin/destination, target time, capacity
   - Days of week (1=Mon...7=Sun), active period
   - Default driver and vehicle
3. **TransportWeekPlan**: Student's weekly transport requests
4. **TransportPlanEntry**: Individual transport requests per day/template
5. **TransportRun**: Generated transport runs for specific dates
6. **TransportRunAssignment**: Student assignments to runs with status
7. **TransportPresence**: Presence tracking per run (PRESENT/ABSENT/EXCUSED)
8. **ResidenceWeekPlan**: Student's weekly residence plan
9. **ResidenceNight**: Individual nights the student plans to stay

#### AppSetting Extensions
Added planning window configuration:
- `planWindowOpenWeekday`: 6 (Saturday)
- `planWindowOpenHourLocal`: 0 (00:00)
- `planWindowCloseWeekday`: 7 (Sunday)
- `planWindowCloseHourLocal`: 23
- `planWindowCloseMinuteLocal`: 59

### 2. Time Service Module

Created `TimeService` with Europe/Paris timezone handling:

**Key Methods:**
- `getCurrentParisDateTime()`: Get current time in Europe/Paris
- `getNextIsoWeekStart()`: Calculate next Monday 00:00
- `isWithinPlanningWindow()`: Check if current time is within weekend window
- `getTargetWeekForWindow()`: Get the target week (next week) date range
- `isDateWithinWeek()`: Validate if a date falls within a specific week
- `localDateToUtcMidnight()`: Convert YYYY-MM-DD to UTC midnight
- `combineLocalDateAndTimeToUtc()`: Combine date + HH:mm to UTC
- `getParisWeekday()`: Get ISO weekday (1=Mon, 7=Sun) in Paris
- `formatAsLocalDate()`: Format Date as YYYY-MM-DD in Paris timezone

**Testing:** 23 unit tests covering all methods, edge cases, and timezone logic.

### 3. Residence Module

#### Controller Endpoints (`/residence`)
- `POST /residence/week-plans`: Create/update residence week plan
- `GET /residence/week-plans/me`: Get current user's plan
- `GET /residence/week-plans/:studentId`: Get student's plan (admin)
- `GET /residence/week-plans`: Get all plans for a week (admin)
- `PATCH /residence/confirm`: Confirm presence for a night (admin)

#### Service Features
- Weekend window enforcement (non-admins)
- Validation: all nights must be within target week
- Upsert pattern for plan updates
- Admin confirmation of actual presence per night

#### DTOs
- `CreateResidenceWeekPlanDto`: studentId?, weekStartDate?, nights[]
- `ConfirmPresenceDto`: studentId, date, confirmedPresent

### 4. Transport Templates Module

#### Controller Endpoints (`/transport/templates`)
- `POST /transport/templates`: Create template (admin)
- `GET /transport/templates`: List all templates (admin)
- `GET /transport/templates/:id`: Get template by ID (admin)
- `PATCH /transport/templates/:id`: Update template (admin)
- `DELETE /transport/templates/:id`: Delete template (admin)

#### Service Features
- Full CRUD for transport templates
- Validation: daysOfWeek (1-7), targetTime (HH:mm), capacity > 0
- Check destination school and default driver exist
- Query active templates by weekday and date range

#### DTOs
- `CreateTransportTemplateDto`: name, direction, originLabel, destinationId, targetTime, capacity, daysOfWeek, activeFrom?, activeTo?, defaultDriverId?, defaultVehicle?
- `UpdateTransportTemplateDto`: Partial update

### 5. Transport Plans Module

#### Controller Endpoints (`/transport/week-plans`)
- `POST /transport/week-plans`: Create/update transport week plan
- `GET /transport/week-plans/me`: Get current user's plan
- `GET /transport/week-plans/:studentId`: Get student's plan (admin)
- `GET /transport/week-plans`: Get all plans for a week (admin)

#### Service Features
- Weekend window enforcement (non-admins)
- Validation: entries match template active days and date range
- Template availability checking (activeFrom/activeTo)
- Weekday matching (entry date must be in template's daysOfWeek)

#### DTOs
- `CreateTransportWeekPlanDto`: studentId?, weekStartDate?, entries[]
- `TransportPlanEntryDto`: templateId, date, direction?

### 6. Transport Runs Module

#### Controller Endpoints (`/transport/runs`)
- `POST /transport/runs/generate`: Generate runs for a week (admin)
- `GET /transport/runs?from=...&to=...`: List runs in date range (admin)
- `GET /transport/runs/:id`: Get run details (admin)
- `POST /transport/runs/:id/assign`: Assign student to run (admin)
- `DELETE /transport/runs/:id/assign/:studentId`: Remove assignment (admin)
- `POST /transport/runs/:id/checkin`: Check-in presences (admin)

#### Service Features - Run Generation
- Loops through each day of the target week
- Finds active templates for each weekday
- Collects student requests from TransportWeekPlan
- Creates one run per template/day combination
- Assigns students respecting capacity:
  - First N students: ASSIGNED
  - Remaining: WAITLISTED
- Creates presence records for all students
- Idempotent (safe to run multiple times)

#### Service Features - Management
- Manual student assignment/reassignment
- Update assignment status (ASSIGNED/WAITLISTED/DROPPED)
- Presence check-in with marks (PRESENT/ABSENT/EXCUSED)
- Remove student assignments

#### DTOs
- `GenerateRunsDto`: weekStart
- `AssignStudentDto`: studentId, status?
- `CheckinPresenceDto`: presences[]
- `PresenceEntryDto`: studentId, mark, notes?

### 7. Scheduling & Automation

**Transport Runs Cron** (`TransportRunsCron`)
- Runs every Sunday at 23:59 (Europe/Paris)
- Automatically generates runs for next week after window closes
- Uses configured app settings
- Logs all actions and errors
- Idempotent execution

### 8. Seed Data

Enhanced seed script includes:
- Sample users (admin + 2 students)
- App settings with planning window configuration
- 3 sample schools (School A, B, C)
- 4 transport templates (GO and RETURN for 2 schools, weekdays Mon-Fri)

Run with: `npm run seed`

### 9. Documentation

Created comprehensive guides:
- **RESIDENCE_TRANSPORT_GUIDE.md**: Complete user and developer guide
  - API endpoint documentation
  - Configuration instructions
  - Usage examples
  - Best practices
- **IMPLEMENTATION_SUMMARY.md**: This document

## File Structure

```
src/
├── time/
│   ├── time.service.ts           # Timezone utilities
│   ├── time.service.spec.ts      # 23 unit tests
│   └── time.module.ts
├── residence/
│   ├── dto/
│   │   ├── create-residence-week-plan.dto.ts
│   │   ├── confirm-presence.dto.ts
│   │   └── index.ts
│   ├── residence.controller.ts
│   ├── residence.service.ts
│   └── residence.module.ts
├── transport-templates/
│   ├── dto/
│   │   ├── create-template.dto.ts
│   │   ├── update-template.dto.ts
│   │   └── index.ts
│   ├── transport-templates.controller.ts
│   ├── transport-templates.service.ts
│   └── transport-templates.module.ts
├── transport-plans/
│   ├── dto/
│   │   ├── create-transport-week-plan.dto.ts
│   │   └── index.ts
│   ├── transport-plans.controller.ts
│   ├── transport-plans.service.ts
│   └── transport-plans.module.ts
└── transport-runs/
    ├── dto/
    │   ├── generate-runs.dto.ts
    │   ├── assign-student.dto.ts
    │   ├── checkin-presence.dto.ts
    │   └── index.ts
    ├── transport-runs.controller.ts
    ├── transport-runs.service.ts
    ├── transport-runs.cron.ts
    └── transport-runs.module.ts

prisma/
├── schema.prisma                 # Updated with 9 new models, 4 enums
└── seed/
    └── seed.ts                   # Enhanced with sample data

RESIDENCE_TRANSPORT_GUIDE.md      # User/developer guide
IMPLEMENTATION_SUMMARY.md         # This file
```

## Key Design Decisions

### 1. Timezone Handling
- All business logic uses **Europe/Paris** timezone
- Dates stored as UTC in database
- Conversion happens at service layer using luxon
- DST-aware calculations

### 2. Planning Window Enforcement
- Configurable via AppSetting (weekend by default)
- Enforced at service layer before database operations
- Admins bypass window restrictions
- Students can only plan for **next week** (Mon-Sun)

### 3. Capacity Management
- First-come, first-served during window
- Automatic ASSIGNED/WAITLISTED assignment
- Admins can manually reassign after generation
- Presence records created for all students

### 4. Idempotency
- Run generation uses unique constraints
- Safe to run generation multiple times
- Upsert patterns for plan updates
- No duplicate runs or assignments

### 5. Validation Strategy
- DTOs with class-validator decorators
- Business logic validation in services
- Template availability checking
- Weekday matching for entries
- Date range validation

### 6. Security
- JWT authentication required (AuthGuard)
- Admin-only endpoints (AdminGuard)
- Users can only manage own plans
- No sensitive data exposure
- CodeQL scan: 0 issues found

## Testing

### Unit Tests
- **TimeService**: 23 tests covering all methods
  - Timezone conversions
  - Week calculations
  - Planning window logic
  - Weekday operations
  - Date formatting
- **All tests passing** (100% pass rate)

### Integration
- No breaking changes to existing tests
- 1 pre-existing failure (unrelated)
- Build successful
- Linter compliant

## API Security

All endpoints require authentication:
- `@UseGuards(AuthGuard)` on all controllers
- `@UseGuards(AdminGuard)` for admin-only operations
- User context via `@GetUser()` decorator
- Permission checks in service layer

## Performance Considerations

### Database Indexes
- Composite indexes on frequently queried fields
- `weekStartDate` indexed for plan lookups
- `date` indexed for run queries
- `templateId + date` for plan entry lookups

### Query Optimization
- Eager loading with `include` for related data
- Batch operations for run generation
- Pagination support where needed

## Migration Path

To deploy this feature:

1. **Apply Prisma Migration**
   ```bash
   npx prisma migrate deploy
   ```

2. **Run Seed Script** (optional, for testing)
   ```bash
   npm run seed
   ```

3. **Configure Planning Window** (if needed)
   - Update AppSetting via database or admin endpoint
   - Default: Saturday 00:00 - Sunday 23:59

4. **Create Schools and Templates**
   - Use POST /transport/templates endpoints
   - Set up traject types for your organization

5. **Test with Users**
   - Students can access during weekend window
   - Admins can test outside window

## Known Limitations

1. **No Real-time Notifications**: Students aren't notified of assignment status changes
2. **No Automatic Run Splitting**: If over capacity, waitlisted students aren't auto-assigned to new runs
3. **Single Run Per Template/Day**: May need multiple runs if demand exceeds capacity
4. **No Parent Portal Integration**: Parents can't view/manage plans

## Future Enhancements

Suggested improvements:
1. Email/SMS notifications for waitlisted students
2. Automatic run splitting when over capacity
3. Parent portal access
4. Real-time capacity monitoring
5. Student cancellation workflow
6. Driver mobile app for check-ins
7. Route optimization for multiple stops
8. Integration with school calendars for holidays

## Acceptance Criteria Met

✅ Students can only create/update plans during weekend window (403 otherwise)
✅ Admins can CRUD templates, manage plans anytime, generate runs, assign/reassign students, check-in presences
✅ After generation, runs include ASSIGNED/WAITLISTED students according to capacity
✅ Time & week calculations work correctly in Europe/Paris (including DST)
✅ Comprehensive Swagger documentation on all endpoints
✅ Exhaustive input validation with class-validator
✅ Guards enforce authentication and authorization
✅ Repository pattern using Prisma
✅ Unit tests for time service (23 tests, 100% passing)
✅ Seed script with sample data
✅ No security vulnerabilities (CodeQL: 0 alerts)
✅ Build successful, linter compliant

## Statistics

- **New Files**: 28
- **New Lines of Code**: ~4,500
- **New Models**: 9
- **New Enums**: 4
- **New Endpoints**: 20
- **New Tests**: 23 (all passing)
- **Security Issues**: 0
- **Build Status**: ✅ Success
- **Linter Status**: ✅ Pass

## Conclusion

This implementation provides a complete, production-ready weekly planning system for residence and transport management. The code follows NestJS best practices, includes comprehensive validation and error handling, proper timezone support, automated scheduling, and thorough documentation.

All acceptance criteria have been met, and the feature is ready for code review and deployment.
