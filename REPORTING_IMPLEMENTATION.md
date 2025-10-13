# Reporting Endpoints - Implementation Notes

## Architecture Overview

This document provides technical details about the implementation of the session analytics reporting endpoints.

## Module Structure

```
src/
├── reports/
│   ├── dto/
│   │   ├── index.ts
│   │   ├── sessions-query.dto.ts           # Base query DTO
│   │   ├── sessions-queries.dto.ts         # Extended DTOs for timeseries and list
│   │   └── sessions-responses.dto.ts       # Response DTOs
│   ├── reports.controller.ts               # REST endpoints
│   ├── reports.module.ts                   # Module definition
│   └── reports.service.ts                  # Business logic
└── auth/
    └── guards/
        └── admin.guard.ts                   # Admin authentication guard
```

## Key Design Decisions

### 1. Contract Type Determination

**Challenge:** The database schema stores `outOfContract` as a boolean flag on the `Attendance` model, not on `Session`.

**Solution:** 
- A session is considered "UNDER contract" if NO attendance has `outOfContract = true`
- A session is considered "OFF contract" if AT LEAST ONE attendance has `outOfContract = true`
- This is implemented using SQL EXISTS clauses for efficient queries

**Code Example:**
```sql
-- Under contract check
NOT EXISTS(
  SELECT 1 FROM "Attendance" att 
  WHERE att."sessionId" = s.id 
    AND att."outOfContract" = true
)

-- Off contract check
EXISTS(
  SELECT 1 FROM "Attendance" att 
  WHERE att."sessionId" = s.id 
    AND att."outOfContract" = true
)
```

### 2. Timezone Handling

**Challenge:** Sessions are stored in UTC, but reporting should bucket by calendar days in Europe/Paris timezone.

**Solution:**
- Convert timestamps using PostgreSQL's `AT TIME ZONE 'Europe/Paris'`
- Use `date_trunc('day', ...)` after timezone conversion for accurate bucketing
- Fill gaps in time series to ensure continuous date ranges

**Code Example:**
```sql
SELECT 
  date_trunc('day', s."startTime" AT TIME ZONE 'Europe/Paris') AS day,
  COUNT(*) as total
FROM "Session" s
GROUP BY day
```

### 3. Performance Optimization

**Indexes Added:**
```sql
CREATE INDEX "Session_startTime_idx" ON "Session"("startTime");
CREATE INDEX "Attendance_sessionId_idx" ON "Attendance"("sessionId");
```

**Query Optimization:**
- Use raw SQL for complex aggregations (time series, contract filtering)
- Leverage PostgreSQL's EXISTS for efficient filtering
- Execute independent queries in parallel using `Promise.all()`
- Implement pagination to limit result set size

### 4. User Filtering

**Challenge:** Filter sessions by user attendance across joins.

**Solution:**
- When `userId` is provided, add JOIN with Attendance table
- Use parameterized queries to prevent SQL injection
- Implement both Prisma and raw SQL variants for different query types

## Service Methods

### `getSessionsSummary()`

Returns aggregate statistics for a date range.

**Key Operations:**
1. Validate date range and user existence
2. Count total sessions (with contract scope filter)
3. Count under-contract sessions (conditional)
4. Count off-contract sessions (conditional)
5. Count unique users with attendance

**Performance:** O(n) where n = number of sessions in range

### `getSessionsTimeseries()`

Returns daily bucketed data for visualization.

**Key Operations:**
1. Validate date range
2. Execute raw SQL query with timezone conversion and grouping
3. Fill gaps to ensure continuous date range
4. Return sorted buckets

**Performance:** O(n + d) where n = number of sessions, d = number of days in range

### `getSessionsList()`

Returns paginated list of sessions with details.

**Key Operations:**
1. Validate date range
2. Apply contract scope filter (if specified) via session ID filtering
3. Fetch paginated sessions with site and attendance counts
4. Transform to response format
5. Return items with total count

**Performance:** O(n) where n = pageSize (plus filtering overhead)

## Helper Methods

### `buildSessionWhereClause()`

Constructs Prisma where clause for basic session filtering (time range, user).

### `buildContractFilter()`

Generates SQL fragment for contract scope filtering.

### `countSessionsByContractType()`

Counts sessions by whether they have off-contract attendance.

### `countSessionsByFilters()`

Counts sessions with all filters applied (time, user, contract scope).

### `countUniqueUsers()`

Counts distinct users with attendance in filtered sessions.

### `fillDateGaps()`

Ensures time series buckets cover entire date range, filling missing dates with zeros.

## Error Handling

### Validation Errors (400)
- Invalid date range (from >= to)
- Invalid UUID format
- Invalid enum values

### Authentication Errors (401)
- Missing authorization header
- Invalid JWT token

### Authorization Errors (403)
- Non-admin user attempting access

### Not Found Errors (404)
- User not found (when userId is provided)

## Testing Considerations

### Unit Tests (Recommended)
- Test helper methods in isolation
- Mock Prisma service
- Test date gap filling logic
- Test contract filter generation

### Integration Tests (Recommended)
- Test with real database
- Seed test data with known patterns
- Verify timezone bucketing
- Test pagination edge cases
- Test contract scope filtering with various attendance patterns

### Manual Testing
- Use the provided `test-reports.sh` script
- Test via Swagger UI (if enabled)
- Verify responses match expected formats

## Future Enhancements

### Short-term
1. **Caching Layer**
   - Implement Redis caching for summary/timeseries (TTL: 60-120s)
   - Invalidate on session/attendance writes

2. **Export Functionality**
   - Add CSV export endpoint mirroring list filters
   - Stream large result sets

3. **Additional Metrics**
   - Attendance rate (YES vs NO)
   - Cancellation rate
   - User engagement metrics

### Long-term
1. **Materialized Views**
   - Create pre-aggregated views for frequently accessed ranges
   - Refresh views on schedule or trigger

2. **Advanced Filtering**
   - Filter by site
   - Filter by session slot (AM/PM)
   - Filter by session status

3. **Real-time Updates**
   - WebSocket support for live dashboard updates
   - Event-driven cache invalidation

## Maintenance Notes

### When Schema Changes
- If `Session` gains a `contractType` field, update contract filtering logic
- If `Attendance` status enum changes, update counting logic
- If timezone requirements change, update all `AT TIME ZONE` clauses

### Performance Monitoring
- Monitor query execution times in production
- Consider adding query logging for slow queries (> 1s)
- Review index usage with `EXPLAIN ANALYZE`

### Security
- Admin guard prevents non-admin access
- Parameterized queries prevent SQL injection
- Input validation via class-validator

## Related Files

- `src/sessions/sessions.service.ts` - Core session management
- `src/user/user.service.ts` - User lookup functionality
- `prisma/schema.prisma` - Database schema
- `REPORTING_ENDPOINTS_GUIDE.md` - User-facing documentation
- `test-reports.sh` - Manual testing script
