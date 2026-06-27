# AURA API Reference

Base URL: `http://localhost:3001/api`

All responses follow the format:
```json
{
  "data": { ... },       // on success
  "error": "message",    // on error
  "details": [ ... ]     // validation error details (optional)
}
```

---

## Authentication

### POST `/auth/register`
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "Jane Doe"
}
```

**Validation:**
- `email`: valid email format, required
- `password`: min 8 characters, required
- `name`: string, 1-100 chars, optional (defaults to "Zen User")

**Success Response:** `201 Created`
```json
{
  "data": {
    "user": {
      "id": "clx1abc...",
      "email": "user@example.com",
      "name": "Jane Doe",
      "avatarSeed": "aura-seed-zen",
      "bio": "Pristine habit tracker command center.",
      "dailyGoal": 50,
      "timezone": "UTC",
      "createdAt": "2025-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

**Error Responses:**
- `400` — validation errors (missing/invalid fields)
- `409` — email already registered

---

### POST `/auth/login`
Authenticate with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Success Response:** `200 OK`
```json
{
  "data": {
    "user": { ... },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

**Error Responses:**
- `400` — validation errors
- `401` — invalid credentials

---

### POST `/auth/refresh`
Exchange a refresh token for a new access token. Rotates the refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

**Success Response:** `200 OK`
```json
{
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

**Error Responses:**
- `401` — invalid or expired refresh token

---

### POST `/auth/logout`
Invalidate the current refresh token. **Requires authentication.**

**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

**Success Response:** `200 OK`
```json
{
  "data": { "message": "Logged out successfully" }
}
```

---

### GET `/auth/me`
Get the authenticated user's profile. **Requires authentication.**

**Headers:** `Authorization: Bearer <accessToken>`

**Success Response:** `200 OK`
```json
{
  "data": {
    "id": "clx1abc...",
    "email": "user@example.com",
    "name": "Jane Doe",
    "avatarSeed": "aura-seed-zen",
    "bio": "...",
    "dailyGoal": 50,
    "timezone": "America/New_York",
    "createdAt": "..."
  }
}
```

**Error Responses:**
- `401` — missing or invalid token

---

### PATCH `/auth/me`
Update the authenticated user's profile. **Requires authentication.**

**Headers:** `Authorization: Bearer <accessToken>`

**Request Body** (all fields optional):
```json
{
  "name": "New Name",
  "bio": "Updated bio",
  "avatarSeed": "new-seed",
  "dailyGoal": 75,
  "timezone": "America/Los_Angeles"
}
```

**Success Response:** `200 OK` — returns updated user object

---

## Habits

All habit endpoints require authentication via `Authorization: Bearer <accessToken>` header.

### GET `/habits`
List all habits for the authenticated user.

**Query Parameters:**
- `archived` (boolean, optional) — if `true`, include archived habits

**Success Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "clx2def...",
      "name": "Morning Meditation",
      "color": "#10B981",
      "icon": "Leaf",
      "frequency": { "type": "daily" },
      "archived": false,
      "sortOrder": 0,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

### POST `/habits`
Create a new habit.

**Request Body:**
```json
{
  "name": "Morning Meditation",
  "color": "#10B981",
  "icon": "Leaf",
  "frequency": { "type": "daily" }
}
```

**Frequency formats:**
```json
{ "type": "daily" }
{ "type": "specific_days", "days": [1, 3, 5] }   // Mon, Wed, Fri (0=Sun..6=Sat)
{ "type": "weekly", "timesPerWeek": 3 }
```

**Validation:**
- `name`: string, 1-100 chars, required
- `color`: hex color string, optional
- `icon`: string, optional
- `frequency`: object with valid type, required

**Success Response:** `201 Created` — returns created habit

**Error Responses:**
- `400` — validation errors

---

### PATCH `/habits/:id`
Update a habit. Only fields provided are updated.

**Request Body** (all optional):
```json
{
  "name": "Updated Name",
  "color": "#EF4444",
  "archived": true,
  "frequency": { "type": "specific_days", "days": [1, 3, 5] }
}
```

**Success Response:** `200 OK` — returns updated habit

**Error Responses:**
- `400` — validation errors
- `404` — habit not found or doesn't belong to user

---

### DELETE `/habits/:id`
Permanently delete a habit and all its logs.

**Success Response:** `204 No Content`

**Error Responses:**
- `404` — habit not found or doesn't belong to user

---

## Habit Logs

All log endpoints require authentication.

### GET `/logs`
Get habit logs within a date range.

**Query Parameters:**
- `from` (string, required) — start date `YYYY-MM-DD`
- `to` (string, required) — end date `YYYY-MM-DD`

**Success Response:** `200 OK`
```json
{
  "data": {
    "2025-01-15": {
      "clx2def...": {
        "id": "clx3ghi...",
        "habitId": "clx2def...",
        "date": "2025-01-15",
        "status": "completed",
        "notes": "Great session today!"
      }
    }
  }
}
```

---

### PUT `/logs/:habitId/:date`
Create or update a habit log entry. Used for toggling completion status.

**URL Parameters:**
- `habitId` — the habit's ID
- `date` — date in `YYYY-MM-DD` format

**Request Body:**
```json
{
  "status": "completed",
  "notes": "Optional note"
}
```

**Status values:** `"completed"`, `"partial"`, `"missed"`

**Success Response:** `200 OK` — returns upserted log

**Error Responses:**
- `400` — invalid status or date format
- `404` — habit not found or doesn't belong to user

---

### PATCH `/logs/:habitId/:date`
Update only the notes on an existing log entry.

**Request Body:**
```json
{
  "notes": "Updated notes"
}
```

**Success Response:** `200 OK` — returns updated log

**Error Responses:**
- `404` — log entry not found

---

## Stats

All stats endpoints require authentication.

### GET `/stats/streaks`
Get streak information for all habits.

**Success Response:** `200 OK`
```json
{
  "data": {
    "overall": {
      "currentStreak": 12,
      "longestStreak": 45,
      "totalCompletions": 230,
      "completionRate": 87
    },
    "habits": {
      "clx2def...": {
        "currentStreak": 12,
        "longestStreak": 45,
        "totalCompletions": 120,
        "completionRate": 92
      }
    }
  }
}
```

---

### GET `/stats/habits`
Get per-habit statistics.

**Success Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "clx2def...",
      "name": "Morning Meditation",
      "color": "#10B981",
      "completedCount": 120,
      "partialCount": 15,
      "missedCount": 8,
      "completionRate": 92,
      "currentStreak": 12
    }
  ]
}
```

---

## Error Response Format

All errors follow a consistent format:

```json
{
  "error": "Human-readable error message",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

**Standard HTTP Status Codes Used:**
| Code | Meaning |
|------|---------|
| 200  | OK — request succeeded |
| 201  | Created — resource created |
| 204  | No Content — resource deleted |
| 400  | Bad Request — validation error |
| 401  | Unauthorized — missing/invalid auth |
| 404  | Not Found — resource doesn't exist |
| 409  | Conflict — duplicate resource (e.g., email) |
| 429  | Too Many Requests — rate limited |
| 500  | Internal Server Error |
