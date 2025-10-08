# Training Session Management Implementation

This document describes the comprehensive training session management implementation that has been added to the MC Academy API.

## Features Implemented

### 1. Enhanced Session Model
- **Start and End Times**: Sessions now have optional `startTime` and `endTime` fields
- **Default Times**: Automatic sessions get default times (AM: 9:00-12:00, PM: 14:00-17:00)
- **Backward Compatibility**: Existing sessions still work with date + slot

### 2. Manual Session Creation
- **Admin Session Creation**: Admins can manually create sessions with custom times
- **Validation**: Proper validation of start/end times and site existence
- **Conflict Prevention**: Prevents duplicate sessions for same site/date/slot

### 3. Enhanced RSVP System
- **Formula Validation**: Users can only register for sessions matching their formula
- **Cutoff Enforcement**: Friday 18:00 cutoff for regular registrations
- **Admin Override**: Admins can register users bypassing all restrictions

### 4. Comprehensive API Endpoints

#### Session Management
- `GET /sessions` - List sessions with filtering
- `GET /sessions/upcoming` - Get upcoming sessions
- `GET /sessions/:id` - Get specific session
- `POST /sessions` - Create session (admin only)
- `PUT /sessions/:id` - Update session (admin only)
- `DELETE /sessions/:id` - Delete session (admin only)

#### Registration
- `POST /sessions/:id/rsvp` - User registration
- `POST /sessions/:id/admin-register` - Admin registration (bypasses restrictions)

### 5. Query Filters
Sessions can be filtered by:
- Site ID
- Date range (startDate, endDate)
- Slot (AM/PM)
- Published status
- Canceled status

### 6. Database Schema Changes
```sql
-- Added to Session table
startTime   DateTime?    -- specific start time for the session
endTime     DateTime?    -- specific end time for the session
```

## User Registration Logic

### Regular Users
1. Must have a valid formula (MORNING, AFTERNOON, FULL)
2. Can only register for sessions matching their formula:
   - MORNING → AM sessions only
   - AFTERNOON → PM sessions only
   - FULL → Both AM and PM sessions
3. Subject to Friday 18:00 cutoff
4. Registration marked as `outOfContract` if formula doesn't match

### Admin Override
1. Admins can register any user to any session
2. No formula restrictions
3. No cutoff restrictions
4. Registration marked with `createdByAdmin: true`

## Session Times

### Default Times (Auto-generated sessions)
- **AM Sessions**: 9:00 - 12:00
- **PM Sessions**: 14:00 - 17:00

### Custom Times
- Admins can set custom start/end times when creating sessions
- Times are validated (start must be before end)

## API Documentation
- Full Swagger documentation added
- Request/response schemas defined
- Error responses documented
- Query parameters documented

## Backward Compatibility
- Existing sessions without start/end times still work
- Migration updates existing sessions with default times
- All existing functionality preserved

## Usage Examples

### Create a Session
```json
POST /sessions
{
  "siteId": "site-uuid",
  "date": "2024-03-15T00:00:00.000Z",
  "slot": "AM",
  "startTime": "2024-03-15T09:30:00.000Z",
  "endTime": "2024-03-15T11:30:00.000Z",
  "notes": "Special training session",
  "isPublished": true
}
```

### Admin Register User
```json
POST /sessions/:sessionId/admin-register
{
  "userId": "user-uuid",
  "status": "YES",
  "comment": "Registered by admin"
}
```

### Filter Sessions
```
GET /sessions?siteId=uuid&slot=AM&isPublished=true&startDate=2024-03-01&endDate=2024-03-31
```

This implementation provides complete training session management while maintaining backward compatibility and following the existing code patterns.