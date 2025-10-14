# Ratings API - Quick Reference

## Base URL
```
/api/ratings
```

## Authentication
All endpoints require Bearer token authentication.
Admin endpoints require `admin` role.

---

## Overview

The Ratings system allows administrators to evaluate participants' performance during training sessions. Each participant present at a session can receive a rating from 0 to 10 (stars) along with an optional comment.

### Key Features
- ⭐ Score-based ratings (0-10)
- 💬 Optional comments for detailed feedback
- 📊 Automatic statistics calculation (average, count, distribution)
- 🔒 Admin-only write/delete operations
- ✅ Only participants marked as present can be rated
- 🔄 Idempotent upsert (one rating per participant per session)

---

## Admin Endpoints

### Create or Update Rating
```http
PUT /api/ratings/sessions/{sessionId}/users/{userId}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "score": 8,
  "comment": "Great performance during the session"
}
```

**Request Body**
| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| score | number | ✅ | 0-10 | Rating score (integer) |
| comment | string | ❌ | max 2000 chars | Optional feedback comment |

**Response (200 OK)**
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "sessionId": "abc123-def456-ghi789",
  "userId": "user-uuid",
  "raterId": "admin-uuid",
  "score": 8,
  "comment": "Great performance during the session",
  "createdAt": "2025-10-14T10:00:00.000Z",
  "updatedAt": "2025-10-14T10:00:00.000Z",
  "rater": {
    "id": "admin-uuid",
    "firstname": "John",
    "lastname": "Doe"
  }
}
```

**Business Rules**
- ✅ User must be present at the session (Attendance.status === 'YES')
- 🔄 Creating the same rating again will update it (upsert)
- 👤 Current admin user is automatically set as rater

**Error Responses**
- `400 Bad Request` - Invalid score (not 0-10) or comment too long
- `403 Forbidden` - User is not an admin
- `404 Not Found` - Session not found, user not found, or user not present at session

---

### Delete Rating
```http
DELETE /api/ratings/sessions/{sessionId}/users/{userId}
Authorization: Bearer {admin_token}
```

**Response (200 OK)**
```json
{
  "message": "Rating deleted successfully"
}
```

**Error Responses**
- `403 Forbidden` - User is not an admin
- `404 Not Found` - Rating not found

---

## Authenticated User Endpoints

### Get Session Ratings with Statistics
```http
GET /api/ratings/sessions/{sessionId}
Authorization: Bearer {token}
```

**Response (200 OK)**
```json
{
  "ratings": [
    {
      "id": "rating-uuid-1",
      "sessionId": "session-uuid",
      "userId": "user-uuid-1",
      "raterId": "admin-uuid",
      "score": 9,
      "comment": "Excellent technique",
      "createdAt": "2025-10-14T10:00:00.000Z",
      "updatedAt": "2025-10-14T10:00:00.000Z",
      "rater": {
        "id": "admin-uuid",
        "firstname": "John",
        "lastname": "Doe"
      }
    },
    {
      "id": "rating-uuid-2",
      "sessionId": "session-uuid",
      "userId": "user-uuid-2",
      "raterId": "admin-uuid-2",
      "score": 7,
      "comment": "Good effort, keep practicing",
      "createdAt": "2025-10-14T11:00:00.000Z",
      "updatedAt": "2025-10-14T11:00:00.000Z",
      "rater": {
        "id": "admin-uuid-2",
        "firstname": "Jane",
        "lastname": "Smith"
      }
    }
  ],
  "stats": {
    "average": 7.4,
    "count": 12,
    "distribution": {
      "0": 0,
      "1": 0,
      "2": 1,
      "3": 0,
      "4": 1,
      "5": 2,
      "6": 3,
      "7": 2,
      "8": 1,
      "9": 1,
      "10": 1
    }
  }
}
```

**Statistics Explained**
- `average` - Mean rating score rounded to 1 decimal place
- `count` - Total number of ratings for the session
- `distribution` - Count of ratings for each score (0-10)

**Error Responses**
- `404 Not Found` - Session not found

---

### Get User Ratings
```http
GET /api/ratings/users/{userId}
Authorization: Bearer {token}
```

**Optional Query Parameters**
| Parameter | Type | Format | Description |
|-----------|------|--------|-------------|
| from | string | YYYY-MM-DD | Start date (inclusive) |
| to | string | YYYY-MM-DD | End date (inclusive) |

**Examples**
```bash
# Get all ratings for a user
GET /api/ratings/users/{userId}

# Get ratings for a specific date range
GET /api/ratings/users/{userId}?from=2025-01-01&to=2025-12-31

# Get ratings from a start date
GET /api/ratings/users/{userId}?from=2025-01-01

# Get ratings up to an end date
GET /api/ratings/users/{userId}?to=2025-12-31
```

**Response (200 OK)**
```json
{
  "average": 7.8,
  "count": 15,
  "ratings": [
    {
      "id": "rating-uuid",
      "sessionId": "session-uuid",
      "userId": "user-uuid",
      "raterId": "admin-uuid",
      "score": 8,
      "comment": "Great performance",
      "createdAt": "2025-10-14T10:00:00.000Z",
      "updatedAt": "2025-10-14T10:00:00.000Z",
      "rater": {
        "id": "admin-uuid",
        "firstname": "John",
        "lastname": "Doe"
      },
      "session": {
        "id": "session-uuid",
        "date": "2025-10-14T00:00:00.000Z",
        "slot": "AM",
        "site": {
          "id": "site-uuid",
          "name": "Tennis Club Paris"
        }
      }
    }
  ]
}
```

**Error Responses**
- `404 Not Found` - User not found

---

## Integration Examples

### Frontend UI Flow

#### 1. Display Session Ratings (Admin/User View)
```typescript
// Fetch session ratings
const response = await fetch(`/api/ratings/sessions/${sessionId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();

// Display average rating
console.log(`Average: ${data.stats.average}/10`);
console.log(`Total ratings: ${data.stats.count}`);

// Display distribution chart
data.stats.distribution; // Use for bar chart or histogram

// Display individual ratings
data.ratings.forEach(rating => {
  console.log(`${rating.rater.firstname}: ${rating.score}/10 - ${rating.comment}`);
});
```

#### 2. Rate a Participant (Admin Only)
```typescript
// Rate a participant after a session
const response = await fetch(`/api/ratings/sessions/${sessionId}/users/${userId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    score: 8,
    comment: 'Great performance today!'
  })
});

if (response.ok) {
  const rating = await response.json();
  console.log('Rating saved:', rating);
}
```

#### 3. View User Progress (User Profile)
```typescript
// Display user's rating history
const response = await fetch(
  `/api/ratings/users/${userId}?from=2025-01-01&to=2025-12-31`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const data = await response.json();

// Show average performance
console.log(`Average performance: ${data.average}/10`);
console.log(`Total sessions rated: ${data.count}`);

// Display rating timeline
data.ratings.forEach(rating => {
  console.log(`${rating.session.date} (${rating.session.slot}): ${rating.score}/10`);
});
```

#### 4. Delete a Rating (Admin Only)
```typescript
// Remove a rating
const response = await fetch(`/api/ratings/sessions/${sessionId}/users/${userId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});

if (response.ok) {
  console.log('Rating deleted successfully');
}
```

---

## Common Use Cases

### Use Case 1: Admin rates all participants after a session
```bash
# For each participant present at the session
PUT /api/ratings/sessions/{sessionId}/users/{userId1}
{ "score": 8, "comment": "Excellent technique" }

PUT /api/ratings/sessions/{sessionId}/users/{userId2}
{ "score": 7, "comment": "Good effort, keep practicing" }

PUT /api/ratings/sessions/{sessionId}/users/{userId3}
{ "score": 9, "comment": "Outstanding performance" }
```

### Use Case 2: Display session performance dashboard
```bash
# Get all ratings and statistics for the session
GET /api/ratings/sessions/{sessionId}

# UI displays:
# - Average score: 8.0/10
# - Number of participants rated: 12
# - Distribution bar chart
# - List of individual ratings with comments
```

### Use Case 3: User views their progress over time
```bash
# Get user's ratings for the current year
GET /api/ratings/users/{userId}?from=2025-01-01&to=2025-12-31

# UI displays:
# - Overall average: 7.8/10
# - Line chart showing progress over time
# - Table of individual session ratings
# - Comments from coaches
```

### Use Case 4: Admin corrects a rating
```bash
# Update an existing rating (same endpoint)
PUT /api/ratings/sessions/{sessionId}/users/{userId}
{ "score": 9, "comment": "Updated: Excellent improvement shown" }
```

---

## Data Validation

### Score Validation
- **Type**: Integer
- **Range**: 0-10 (inclusive)
- **Examples**:
  - ✅ Valid: 0, 5, 10
  - ❌ Invalid: -1, 11, 5.5, "8", null

### Comment Validation
- **Type**: String (optional)
- **Max Length**: 2000 characters
- **Examples**:
  - ✅ Valid: "", "Good work", null, undefined
  - ❌ Invalid: String longer than 2000 characters

---

## Error Handling

### HTTP Status Codes

| Code | Description | When it occurs |
|------|-------------|----------------|
| 200 | Success | Request completed successfully |
| 400 | Bad Request | Invalid score (not 0-10) or comment too long |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Non-admin user attempting admin operation |
| 404 | Not Found | Session, user, or rating not found; or user not present at session |

### Error Response Format
```json
{
  "statusCode": 404,
  "message": "User is not registered as present for this session",
  "error": "Not Found"
}
```

---

## Tips for Frontend Development

1. **Permission Checks**: Hide/disable rating input fields for non-admin users
2. **Validation**: Validate score range (0-10) client-side before submitting
3. **Optimistic Updates**: Update UI immediately, then sync with server
4. **Statistics**: Use the distribution data to create visual charts (bar, pie, histogram)
5. **Date Filtering**: Implement date range pickers for user rating history
6. **Error Handling**: Display user-friendly messages for common errors:
   - "You must be an admin to rate participants"
   - "This participant was not present at the session"
   - "Score must be between 0 and 10"

---

## Notes

- Ratings are tied to attendance records - only participants marked as present (status === 'YES') can be rated
- Each participant can only have one rating per session (upsert behavior)
- The rater is automatically set to the current authenticated admin user
- Ratings are deleted automatically if the associated session or user is deleted (cascade)
- All GET endpoints return ratings sorted by creation date (newest first)
- Statistics are calculated in real-time when fetching session ratings
