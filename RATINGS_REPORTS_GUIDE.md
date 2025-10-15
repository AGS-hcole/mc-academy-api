# Ratings Reports Endpoint

## Overview

The ratings reports endpoint provides summary statistics for session ratings within a specified date range.

## Endpoint

`GET /api/reports/ratings/summary`

## Authentication

Requires admin authentication (Bearer token).

## Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| from | ISO 8601 DateTime | Yes | Start date (inclusive) | `2024-01-01T00:00:00Z` |
| to | ISO 8601 DateTime | Yes | End date (exclusive) | `2024-12-31T23:59:59Z` |
| userId | UUID | No | Filter by specific user | `123e4567-e89b-12d3-a456-426614174000` |
| contractScope | String | No | Filter by contract type: `all`, `contract`, `noContract` | `contract` |

## Response Structure

```typescript
interface RatingsSummaryDto {
  period: {
    from: string;
    to: string;
  };
  scope: {
    userId?: string;
    contractScope?: 'all' | 'contract' | 'noContract';
  };
  global: {
    average: number | null;      // null if no ratings
    count: number;               // total ratings
    distribution: Record<'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10', number>;
    ratedSessions: number;       // sessions with >=1 rating
    unratedSessions: number;     // sessions in range with 0 ratings
  };
  perUser?: Array<{
    user: { id: string; firstName: string; lastName: string; avatarUrl?: string };
    average: number;
    count: number;
  }>;
  topUsers?: Array<{ userId: string; average: number; count: number }>;    // top 5 by avg (min count=3)
  bottomUsers?: Array<{ userId: string; average: number; count: number }>; // bottom 5 by avg (min count=3)
  contractSplit: { contractCount: number; nonContractCount: number };
}
```

## Rules and Behavior

### Filtering

1. **Attendance Status**: Only ratings for attendances with status `YES` are considered
2. **Date Range**: Sessions must be within the specified date range (from inclusive, to exclusive)
3. **User Filter**: When `userId` is provided, only ratings for that user are included
4. **Contract Scope**:
   - `all` (default): Include all ratings regardless of contract status
   - `contract`: Only ratings where `outOfContract = false`
   - `noContract`: Only ratings where `outOfContract = true`

### Global Aggregates

- **average**: Mean rating score, or `null` if no ratings exist
- **count**: Total number of ratings
- **distribution**: Count of ratings for each score (1-10)
- **ratedSessions**: Number of distinct sessions with at least one rating
- **unratedSessions**: Number of sessions with attendances but no ratings

### Per-User Aggregates

When `userId` is **not** specified, the response includes:
- **perUser**: Array of all users with ratings, showing their average and count
- **topUsers**: Top 5 users by average rating (only users with 3+ ratings)
- **bottomUsers**: Bottom 5 users by average rating (only users with 3+ ratings)

When `userId` **is** specified, these fields are omitted.

### Contract Split

Shows the breakdown of ratings by contract status:
- **contractCount**: Number of ratings where `outOfContract = false`
- **nonContractCount**: Number of ratings where `outOfContract = true`

## Example Request

```bash
curl -X GET "http://localhost:3000/api/reports/ratings/summary?from=2024-01-01T00:00:00Z&to=2024-12-31T23:59:59Z&contractScope=all" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Example Response

```json
{
  "period": {
    "from": "2024-01-01T00:00:00Z",
    "to": "2024-12-31T23:59:59Z"
  },
  "scope": {
    "contractScope": "all"
  },
  "global": {
    "average": 7.8,
    "count": 150,
    "distribution": {
      "1": 0,
      "2": 1,
      "3": 2,
      "4": 5,
      "5": 10,
      "6": 15,
      "7": 30,
      "8": 40,
      "9": 30,
      "10": 17
    },
    "ratedSessions": 45,
    "unratedSessions": 5
  },
  "perUser": [
    {
      "user": {
        "id": "user-1",
        "firstName": "John",
        "lastName": "Doe"
      },
      "average": 8.5,
      "count": 12
    }
  ],
  "topUsers": [
    {
      "userId": "user-1",
      "average": 9.2,
      "count": 10
    }
  ],
  "bottomUsers": [
    {
      "userId": "user-2",
      "average": 6.1,
      "count": 8
    }
  ],
  "contractSplit": {
    "contractCount": 120,
    "nonContractCount": 30
  }
}
```

## Error Responses

### 400 Bad Request

- Invalid date range (from >= to)
- User not found (when userId is provided)

### 401 Unauthorized

- Missing or invalid authentication token

### 403 Forbidden

- Non-admin user attempting access

## Implementation Notes

### Database Queries

The implementation uses:
1. `SessionRating.findMany()` with joins to Session and Attendance
2. `Session.findMany()` to count total sessions in range

### Performance Considerations

- Indexes exist on:
  - `SessionRating.sessionId`
  - `SessionRating.userId`
  - `Session.date`
- The implementation filters ratings in memory after fetching from database
- For large datasets, consider adding database-level aggregations

### Testing

Comprehensive unit tests cover:
- Empty date ranges
- User filtering
- Contract scope filtering
- Distribution calculations (edge cases: only 10s, mixed scores)
- Per-user aggregates
- Top/bottom users (with min count=3 requirement)
- Attendance status filtering
- Rated/unrated sessions calculation

All tests pass successfully (12 test cases).
