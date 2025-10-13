# Reporting Endpoints - Testing Guide

## Overview

This guide provides information on how to test the new reporting endpoints for session analytics.

## Authentication

All reporting endpoints require **admin authentication**. You must include a valid JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

Only users with the `admin` role can access these endpoints.

## Endpoints

### 1. Session Summary

**Endpoint:** `GET /api/reports/sessions/summary`

**Description:** Returns summary statistics for sessions within a date range.

**Query Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| from | ISO 8601 DateTime | Yes | Start date (inclusive) | `2024-01-01T00:00:00Z` |
| to | ISO 8601 DateTime | Yes | End date (exclusive) | `2024-12-31T23:59:59Z` |
| userId | UUID | No | Filter by specific user | `123e4567-e89b-12d3-a456-426614174000` |
| contractScope | String | No | Filter by contract type: `all`, `under`, `off` | `under` |

**Example Request:**

```bash
curl -X GET 'http://localhost:3000/api/reports/sessions/summary?from=2024-01-01T00:00:00Z&to=2024-12-31T23:59:59Z&contractScope=all' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**Example Response:**

```json
{
  "period": {
    "from": "2024-01-01T00:00:00Z",
    "to": "2024-12-31T23:59:59Z",
    "timezone": "Europe/Paris"
  },
  "totals": {
    "sessions": 150,
    "underContract": 120,
    "offContract": 30,
    "uniqueUsers": 45
  }
}
```

### 2. Session Time Series

**Endpoint:** `GET /api/reports/sessions/timeseries`

**Description:** Returns time series data bucketed by day in Europe/Paris timezone.

**Query Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| from | ISO 8601 DateTime | Yes | Start date (inclusive) | `2024-01-01T00:00:00Z` |
| to | ISO 8601 DateTime | Yes | End date (exclusive) | `2024-01-31T23:59:59Z` |
| userId | UUID | No | Filter by specific user | `123e4567-e89b-12d3-a456-426614174000` |
| contractScope | String | No | Filter by contract type: `all`, `under`, `off` | `under` |
| bucket | String | No | Bucket type (only `daily` supported) | `daily` |

**Example Request:**

```bash
curl -X GET 'http://localhost:3000/api/reports/sessions/timeseries?from=2024-01-01T00:00:00Z&to=2024-01-31T23:59:59Z&bucket=daily' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**Example Response:**

```json
{
  "buckets": [
    {
      "date": "2024-01-01",
      "total": 5,
      "underContract": 4,
      "offContract": 1
    },
    {
      "date": "2024-01-02",
      "total": 0,
      "underContract": 0,
      "offContract": 0
    },
    {
      "date": "2024-01-03",
      "total": 8,
      "underContract": 6,
      "offContract": 2
    }
  ]
}
```

**Note:** The response includes all days in the range, even if there are no sessions (zeros).

### 3. Session List (Paginated)

**Endpoint:** `GET /api/reports/sessions/list`

**Description:** Returns a paginated list of sessions with details.

**Query Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| from | ISO 8601 DateTime | Yes | Start date (inclusive) | `2024-01-01T00:00:00Z` |
| to | ISO 8601 DateTime | Yes | End date (exclusive) | `2024-12-31T23:59:59Z` |
| userId | UUID | No | Filter by specific user | `123e4567-e89b-12d3-a456-426614174000` |
| contractScope | String | No | Filter by contract type: `all`, `under`, `off` | `under` |
| page | Number | No | Page number (default: 1) | `1` |
| pageSize | Number | No | Items per page (default: 25, max: 100) | `25` |
| sort | String | No | Sort order: `date:asc` or `date:desc` (default: `date:desc`) | `date:desc` |

**Example Request:**

```bash
curl -X GET 'http://localhost:3000/api/reports/sessions/list?from=2024-01-01T00:00:00Z&to=2024-12-31T23:59:59Z&page=1&pageSize=10&sort=date:desc' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**Example Response:**

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "date": "2024-01-15T09:00:00.000Z",
      "title": "Site Name - AM",
      "contractType": "UNDER",
      "attendeesCount": 12,
      "status": "PUBLISHED"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "date": "2024-01-14T14:00:00.000Z",
      "title": "Site Name - PM",
      "contractType": "OFF",
      "attendeesCount": 8,
      "status": "CANCELLED"
    }
  ],
  "total": 150,
  "page": 1,
  "pageSize": 10
}
```

### 4. User Lookup

**Endpoint:** `GET /api/users/lookup`

**Description:** Lookup users with optional filters (Admin only).

**Query Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| role | String | No | Filter by role: `admin`, `user` | `user` |
| search | String | No | Search by name or email | `john` |
| page | Number | No | Page number (default: 1) | `1` |
| pageSize | Number | No | Items per page (default: 20) | `20` |

**Example Request:**

```bash
curl -X GET 'http://localhost:3000/api/users/lookup?role=user&search=john&page=1&pageSize=20' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**Example Response:**

```json
{
  "items": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "firstname": "John",
      "lastname": "Doe",
      "email": "john.doe@example.com",
      "role": "user"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

## Contract Scope Filter

The `contractScope` parameter determines which sessions are included based on attendance contract status:

- **`all`** (or omitted): Returns all sessions regardless of contract status
- **`under`**: Returns only sessions where **NO** attendance has `outOfContract = true`
  - These are sessions fully covered by user contracts
- **`off`**: Returns only sessions where **AT LEAST ONE** attendance has `outOfContract = true`
  - These are sessions that include out-of-contract attendance

## Timezone Handling

- All input dates should be in UTC (ISO 8601 format)
- Internal date bucketing uses **Europe/Paris** timezone
- Time series buckets are aligned to calendar days in Europe/Paris timezone
- The `period.timezone` field in responses indicates `Europe/Paris`

## Error Responses

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "from date must be before to date",
  "error": "Bad Request"
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Missing authorization header",
  "error": "Unauthorized"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "Admin access required",
  "error": "Forbidden"
}
```

## Performance Considerations

1. **Indexes**: The following indexes have been added to optimize query performance:
   - `Session.startTime` - For efficient time range queries
   - `Attendance.sessionId` - For efficient joins

2. **Raw SQL Queries**: Time series and contract filtering use optimized PostgreSQL queries with `AT TIME ZONE` for accurate timezone handling

3. **Pagination**: The list endpoint supports pagination to handle large result sets

4. **Caching**: Consider implementing short-lived caching (60-120s) for summary and timeseries endpoints if needed

## Testing Steps

1. **Ensure you have admin credentials** to obtain a JWT token
2. **Create test data** with sessions and attendance records spanning different dates
3. **Test each endpoint** with various combinations of filters
4. **Verify timezone handling** by checking that sessions are bucketed correctly for Europe/Paris
5. **Test edge cases**:
   - Empty date ranges (should return zeros)
   - Date ranges with no sessions
   - Contract scope filtering with mixed attendance
   - Pagination edge cases (first/last page, empty results)

## Swagger Documentation

If Swagger is enabled (`ENABLE_SWAGGER=true`), you can access interactive API documentation at:

```
http://localhost:3000/swagger
```

The endpoints are documented under the **reports** and **Users** tags.
