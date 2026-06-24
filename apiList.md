<tool_call>
<function=write>
<parameter=content>
# Attendly API Reference

> **Base URL:** `http://localhost:4000/api`
> **Content-Type:** `application/json`
> **Auth:** JWT Bearer token in `Authorization: Bearer <accessToken>` header
> **Server:** Express 4.x | Node ≥ 18 | MongoDB (Mongoose 8.7)
> **Timezone:** Asia/Dhaka
> **CORS:** localhost:4200, localhost:4300, 192.168.0.141 variants

---

## Global Response Format

All endpoints use the uniform response helpers from `apiResponse.js`:

```json
// Success 200
{ "success": true, "message": "...", "data": {...} }

// Created 201
{ "success": true, "message": "...", "data": {...} }

// No Content 204
(empty body)

// Paginated 200
{
  "success": true,
  "data": [...],
  "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}

// Error 400/401/403/404/500
{ "success": false, "message": "Error description" }
```

---

## Global Middleware Chain

- `helmet()` — security headers
- `cors()` — cross-origin with credentials
- `compression()` — gzip responses
- `express.json({ limit: '1mb' })` — JSON body parsing, 1MB limit
- `express.urlencoded({ extended: true })` — URL-encoded body parsing
- `morgan()` — HTTP request logging (`dev` in non-prod, `combined` in prod)
- `errorHandler` — central error handler (last middleware)

---

## Health Check

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/health` |
| **No auth required** | ✅ |

**Request:**
```
curl -X GET http://localhost:4000/health
```

**Response 200:**
```json
{
  "status": "ok",
  "uptime": 12345.67,
  "env": "development"
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Always `"ok"` when healthy |
| `uptime` | number | Process uptime in seconds |
| `env` | string | Current environment (development/production) |

---

## Authentication (`/api/auth`)

> **Base Path:** `/api/auth`
> **Rate Limit:** Login, forgot-password, reset-password, refresh-token endpoints are rate-limited to **10 requests per 15 minutes**
> **General Rate Limit:** 100 requests per 15 minutes applies to all other endpoints

### Endpoints

---

### 1. Login

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/auth/login` |
| **Auth** | None |
| **Rate Limit** | ✅ 10 req/15min |
| **Validation** | `auth.validator.login` |

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | ✅ | Must be a valid email |
| `password` | string | ✅ | Min 8 chars, max 128 chars |

**Example Request:**
```json
{
  "email": "admin@attendly.com",
  "password": "password123"
}
```

**Success Response 200:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": "64abc123def456...",
    "employeeId": "EMP00001",
    "name": "Admin User",
    "email": "admin@attendly.com",
    "role": "admin",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | User MongoDB ObjectId |
| `employeeId` | string | Employee code (e.g., `EMP00001`) |
| `name` | string | Full name |
| `email` | string | User email |
| `role` | string | One of: `admin`, `hr`, `manager`, `employee` |
| `accessToken` | string | JWT access token (1 day expiry) |
| `refreshToken` | string | JWT refresh token (7 day expiry) |

**Error Responses:**
| Status | Condition | Message |
|--------|-----------|---------|
| 400 | Missing/invalid email or password | Validation error |
| 401 | Invalid credentials | `"Invalid email or password"` |
| 429 | Rate limit exceeded | `"Too many login attempts, please try again later"` |

---

### 2. Logout

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/auth/logout` |
| **Auth** | JWT required |

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| `refreshToken` | string | ✅ |

**Example Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response 204:**
```
(empty body)
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | No token / invalid token |
| 400 | `refreshToken` missing |

---

### 3. Refresh Token

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/auth/refresh-token` |
| **Auth** | None |
| **Rate Limit** | ✅ 10 req/15min |
| **Validation** | `auth.validator.refreshToken` |

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| `refreshToken` | string | ✅ |

**Example Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response 200:**
```json
{
  "success": true,
  "message": "Tokens rotated successfully",
  "data": {
    "id": "64abc123def456...",
    "accessToken": "eyJnewAccessToken...",
    "refreshToken": "eyJnewRefreshToken..."
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Invalid or expired refresh token |
| 429 | Rate limit exceeded |

---

### 4. Forgot Password

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/auth/forgot-password` |
| **Auth** | None |
| **Rate Limit** | ✅ 10 req/15min |
| **Validation** | `auth.validator.forgotPassword` |

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| `email` | string | ✅ |

**Example Request:**
```json
{
  "email": "admin@attendly.com"
}
```

**Success Response 200:**
```json
{
  "success": true,
  "message": "If that email exists, reset link has been logged.",
  "data": null
}
```

> **Note:** Always returns success (even for non-existent emails) to prevent email enumeration.

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 429 | Rate limit exceeded |

---

### 5. Reset Password

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/auth/reset-password` |
| **Auth** | None |
| **Rate Limit** | ✅ 10 req/15min |
| **Validation** | `auth.validator.resetPassword` |

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `resetToken` | string | ✅ | Must be valid reset token |
| `newPassword` | string | ✅ | Min 8 chars, max 128 chars |

**Example Request:**
```json
{
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "newSecurePass123"
}
```

**Success Response 200:**
```json
{
  "success": true,
  "message": "Password reset successful",
  "data": null
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Invalid/expired reset token |
| 429 | Rate limit exceeded |

---

### 6. Get My Profile

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/auth/me` |
| **Auth** | JWT required |

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:** None

**Success Response 200:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "64abc123def456...",
    "employeeId": "EMP00001",
    "name": "Admin User",
    "email": "admin@attendly.com",
    "phone": "+8801XXXXXXXXX",
    "designation": "Administrator",
    "salary": 100000,
    "role": "admin",
    "shiftId": "64shift123...",
    "joiningDate": "2024-01-15T00:00:00.000Z",
    "resignationDate": null,
    "status": "active"
  }
}
```

> **Note:** Password hash is excluded from response.

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | No token / invalid/expired token |

---

### 7. Change Password

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/auth/change-password` |
| **Auth** | JWT required |
| **Validation** | `auth.validator.changePassword` |

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `oldPassword` | string | ✅ | Min 8 chars, max 128 chars |
| `newPassword` | string | ✅ | Min 8 chars, max 128 chars |

**Example Request:**
```json
{
  "oldPassword": "password123",
  "newPassword": "newSecurePass456"
}
```

**Success Response 200:**
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": null
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | `oldPassword` or `newPassword` missing/invalid |
| 401 | Current password incorrect |
| 401 | No token / invalid token |

---

## Employees (`/api/employees`)

> **RBAC Roles:** `admin`, `hr`, `manager` (view-only for manager on list)
> **Model:** Employee extends User; `employeeId` is unique alphanumeric code

### Endpoints

---

### 1. List Employees

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/employees` |
| **Auth** | JWT required |
| **RBAC** | `admin`, `hr`, `manager` |
| **Validation** | `employee.validator.list` (query) |

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
| Param | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| `page` | integer | ❌ | `1` | Min 1 |
| `limit` | integer | ❌ | `20` | Min 1, max 200 |
| `search` | string | ❌ | `""` | Trimmed, free text search |
| `status` | string | ❌ | — | Must be `active` or `inactive` |

**Example Request:**
```
GET /api/employees?page=1&limit=20&search=EMP00001&status=active
```

**Success Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64abc123def456...",
      "employeeId": "EMP00001",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+8801XXXXXXXXX",
      "designation": "Developer",
      "salary": 50000,
      "role": "employee",
      "shiftId": "64shift123...",
      "status": "active",
      "joiningDate": "2024-01-15T00:00:00.000Z",
      "resignationDate": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

### 2. Get Employee by ID

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/employees/:id` |
| **Auth** | JWT required |
| **RBAC** | `admin`, `hr` |

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `id` | string (MongoDB ObjectId, 24 hex chars) | User ID |

**Example Request:**
```
GET /api/employees/64abc123def456...
```

**Success Response 200:**
```json
{
  "success": true,
  "data": {
    "_id": "64abc123def456...",
    "employeeId": "EMP00001",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+8801XXXXXXXXX",
    "designation": "Developer",
    "salary": 50000,
    "role": "employee",
    "shiftId": "64shift123...",
    "status": "active",
    "joiningDate": "2024-01-15T00:00:00.000Z",
    "resignationDate": null
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid ObjectId format |
| 401 | No token / invalid token |
| 403 | Insufficient role |
| 404 | Employee not found |

---

### 3. Create Employee

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/employees` |
| **Auth** | JWT required |
| **RBAC** | `admin`, `hr` |
| **Validation** | `employee.validator.create` |

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `employeeId` | string | ❌ | Alphanumeric, 2–20 chars, auto-generated if missing |
| `name` | string | ✅ | 2–120 chars, trimmed |
| `email` | string | ✅ | Valid email format, must be unique |
| `phone` | string | ❌ | Max 30 chars, trimmed |
| `designation` | string | ❌ | Max 120 chars, trimmed |
| `salary` | number | ❌ | Min 0, allows null |
| `role` | string | ❌ | `admin`, `hr`, `manager`, `employee` — default: `employee` |
| `shiftId` | string | ❌ | 24-char hex ObjectId or null |
| `status` | string | ❌ | `active` or `inactive` — default: `active` |
| `joiningDate` | string (ISO date) | ❌ | ISO date format or null |
| `resignationDate` | string (ISO date) | ❌ | ISO date format or null |

**Example Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+8801712345678",
  "designation": "Senior Developer",
  "salary": 75000,
  "role": "employee",
  "shiftId": "64shift123def456789abcdef0",
  "status": "active",
  "joiningDate": "2024-01-15"
}
```

**Success Response 201:**
```json
{
  "success": true,
  "message": "Employee created successfully",
  "data": {
    "_id": "64abc123def456...",
    "employeeId": "EMP00001",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+8801712345678",
    "designation": "Senior Developer",
    "salary": 75000,
    "role": "employee",
    "shiftId": "64shift123def456789abcdef0",
    "status": "active",
    "joiningDate": "2024-01-15T00:00:00.000Z",
    "resignationDate": null,
    "createdAt": "2024-06-25T00:00:00.000Z",
    "updatedAt": "2024-06-25T00:00:00.000Z"
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Validation failure (missing required fields) |
| 409 | Email already exists |
| 409 | Employee ID already exists |
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

### 4. Update Employee

| Property | Value |
|----------|-------|
| **Method** | `PUT` |
| **Path** | `/api/employees/:id` |
| **Auth** | JWT required |
| **RBAC** | `admin`, `hr` |
| **Validation** | `employee.validator.update` |

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `id` | string | 24-char hex MongoDB ObjectId |

**Request Body:** (At least 1 field required — `min(1)` enforced)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | ❌ | 2–120 chars |
| `email` | string | ❌ | Valid email, unique |
| `phone` | string | ❌ | Max 30 chars |
| `designation` | string | ❌ | Max 120 chars |
| `salary` | number | ❌ | Min 0 |
| `role` | string | ❌ | `admin`, `hr`, `manager`, `employee` |
| `shiftId` | string | ❌ | 24-char hex or null |
| `status` | string | ❌ | `active`, `inactive` |
| `password` | string | ❌ | 8–128 chars |
| `joiningDate` | ISO date | ❌ | ISO date or null |
| `resignationDate` | ISO date | ❌ | ISO date or null |

**Example Request:**
```json
{
  "designation": "Lead Developer",
  "salary": 85000,
  "shiftId": "64shift456def789abc0123456"
}
```

**Success Response 200:**
```json
{
  "success": true,
  "message": "Employee updated successfully",
  "data": {
    "_id": "64abc123def456...",
    "name": "John Doe",
    "designation": "Lead Developer",
    "salary": 85000,
    "shiftId": "64shift456def789abc0123456",
    ...
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | No fields provided (at least 1 required) |
| 400 | Invalid ObjectId format |
| 404 | Employee not found |
| 409 | Email already exists (if updating email) |
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

### 5. Delete Employee

| Property | Value |
|----------|-------|
| **Method** | `DELETE` |
| **Path** | `/api/employees/:id` |
| **Auth** | JWT required |
| **RBAC** | `admin` only |

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `id` | string | 24-char hex MongoDB ObjectId |

**Example Request:**
```
DELETE /api/employees/64abc123def456...
```

**Success Response 204:**
```
(empty body)
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid ObjectId |
| 401 | No token / invalid token |
| 403 | Insufficient role (not admin) |
| 404 | Employee not found |

---

### 6. Assign Shift to Employee

| Property | Value |
|----------|-------|
| **Method** | `PUT` |
| **Path** | `/api/employees/:id/shift` |
| **Auth** | JWT required |
| **RBAC** | `admin`, `hr` |
| **Validation** | `employee.validator.assignShift` |

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `id` | string | 24-char hex Employee ObjectId |

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `shiftId` | string | ✅ | 24-char hex ObjectId |

**Example Request:**
```json
{
  "shiftId": "64shift456def789abc0123456"
}
```

**Success Response 200:**
```json
{
  "success": true,
  "message": "Shift assigned successfully",
  "data": {
    "_id": "64abc123def456...",
    "employeeId": "EMP00001",
    "name": "John Doe",
    "shiftId": "64shift456def789abc0123456",
    ...
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | `shiftId` missing or invalid |
| 404 | Employee not found |
| 404 | Shift not found |
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

## Shifts (`/api/shifts`)

> **RBAC Roles:** `admin` (full access), `hr` (read-only)

### Endpoints

---

### 1. List All Shifts

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/shifts` |
| **Auth** | JWT required |
| **RBAC** | `admin`, `hr` |

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:** None

**Example Request:**
```
GET /api/shifts
```

**Success Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64shift123def456789abcdef0",
      "name": "Day Shift",
      "startTime": "09:00",
      "endTime": "18:00",
      "gracePeriod": 15,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "_id": "64shift456def789abc0123456",
      "name": "Night Shift",
      "startTime": "22:00",
      "endTime": "06:00",
      "gracePeriod": 30
    }
  ]
}
```

**Field Descriptions:**
| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Shift name |
| `startTime` | string | HH:mm format (24-hour), e.g., `09:00` |
| `endTime` | string | HH:mm format (24-hour), e.g., `18:00` |
| `gracePeriod` | integer | Allowed late minutes, 0–120 |

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

### 2. Create Shift

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/shifts` |
| **Auth** | JWT required |
| **RBAC** | `admin` only |
| **Validation** | `shift.validator.create` |

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | ✅ | 2–80 chars, trimmed |
| `startTime` | string | ✅ | HH:mm 24-hour pattern, e.g., `09:00` |
| `endTime` | string | ✅ | HH:mm 24-hour pattern, e.g., `18:00` |
| `gracePeriod` | integer | ❌ | 0–120, default: 15 |

**Example Request:**
```json
{
  "name": "Day Shift",
  "startTime": "09:00",
  "endTime": "18:00",
  "gracePeriod": 15
}
```

**Success Response 201:**
```json
{
  "success": true,
  "message": "Shift created",
  "data": {
    "_id": "64shift789abc012345def4567",
    "name": "Day Shift",
    "startTime": "09:00",
    "endTime": "18:00",
    "gracePeriod": 15,
    "createdAt": "2024-06-25T00:00:00.000Z",
    "updatedAt": "2024-06-25T00:00:00.000Z"
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Missing/invalid required fields |
| 401 | No token / invalid token |
| 403 | Insufficient role (not admin) |

---

### 3. Update Shift

| Property | Value |
|----------|-------|
| **Method** | `PUT` |
| **Path** | `/api/shifts/:id` |
| **Auth** | JWT required |
| **RBAC** | `admin` only |
| **Validation** | `shift.validator.update` |

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `id` | string | 24-char hex MongoDB ObjectId |

**Request Body:** (At least 1 field required — `min(1)` enforced)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | ❌ | 2–80 chars |
| `startTime` | string | ❌ | HH:mm 24-hour pattern |
| `endTime` | string | ❌ | HH:mm 24-hour pattern |
| `gracePeriod` | integer | ❌ | 0–120 |

**Example Request:**
```json
{
  "name": "Extended Day Shift",
  "gracePeriod": 20
}
```

**Success Response 200:**
```json
{
  "success": true,
  "message": "Shift updated",
  "data": {
    "_id": "64shift789abc012345def4567",
    "name": "Extended Day Shift",
    "startTime": "09:00",
    "endTime": "18:00",
    "gracePeriod": 20
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | No fields provided |
| 400 | Invalid ObjectId |
| 401 | No token / invalid token |
| 403 | Insufficient role |
| 404 | Shift not found |

---

### 4. Delete Shift

| Property | Value |
|----------|-------|
| **Method** | `DELETE` |
| **Path** | `/api/shifts/:id` |
| **Auth** | JWT required |
| **RBAC** | `admin` only |

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `id` | string | 24-char hex MongoDB ObjectId |

**Example Request:**
```
DELETE /api/shifts/64shift789abc012345def4567
```

**Success Response 204:**
```
(empty body)
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid ObjectId |
| 401 | No token / invalid token |
| 403 | Insufficient role |
| 404 | Shift not found |

---

## Attendance (`/api/attendance`)

> **RBAC Roles:** Employee endpoints accessible to all authenticated users; Admin endpoints require `admin`, `hr`, or `manager`
> **GPS:** Check-in/out require `latitude` and `longitude` (validated before processing)

### Endpoints

---

### 1. Get Attendance Status (Today)

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/attendance/status` |
| **Auth** | JWT required |
| **RBAC** | Any authenticated user (any role) |

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:** None

**Example Request:**
```
GET /api/attendance/status
```

**Success Response 200:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "checkedIn": true,
    "checkedOut": false,
    "checkIn": {
      "time": "2024-06-25T09:01:00.000Z",
      "status": "Late",
      "location": {
        "latitude": 23.8103,
        "longitude": 90.4125
      },
      "lateMinutes": 1
    },
    "checkOut": null
  }
}
```

**`checkIn` object fields:**
| Field | Type | Description |
|-------|------|-------------|
| `time` | string (ISO date) | Check-in timestamp |
| `status` | string | `On Time` or `Late` based on shift grace period |
| `location` | object | GPS coordinates |
| `location.latitude` | number | Latitude, min -90, max 90 |
| `location.longitude` | number | Longitude, min -180, max 180 |
| `lateMinutes` | integer | Minutes late (positive if late, else 0) |

**`checkOut` object fields:**
| Field | Type | Description |
|-------|------|-------------|
| `time` | string (ISO date) | Check-out timestamp |
| `status` | string | `Early`, `On Time`, or `Overtime` |
| `location` | object | GPS coordinates |
| `location.latitude` | number | Latitude |
| `location.longitude` | number | Longitude |

**Scenarios:**
- Before check-in: `checkedIn: false, checkedOut: false, checkIn: null, checkOut: null`
- After check-in (not checked out): `checkedIn: true, checkedOut: false, checkIn: {...}, checkOut: null`
- After both: `checkedIn: true, checkedOut: true, checkIn: {...}, checkOut: {...}`

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | No token / invalid token |

---

### 2. Check In

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/attendance/check-in` |
| **Auth** | JWT required |
| **RBAC** | Any authenticated user |
| **Validation** | `attendance.validator.checkIn` |

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `latitude` | number | ✅ | Min -90, max 90 |
| `longitude` | number | ✅ | Min -180, max 180 |

**Example Request:**
```json
{
  "latitude": 23.8103,
  "longitude": 90.4125
}
```

**Success Response 201:**
```json
{
  "success": true,
  "message": "Check-in successful",
  "data": {
    "_id": "64att123def456789...",
    "userId": "64abc123def456...",
    "employeeId": "EMP00001",
    "attendanceDate": "2024-06-25T00:00:00.000Z",
    "checkIn": {
      "time": "2024-06-25T09:01:00.000Z",
      "status": "Late",
      "location": {
        "latitude": 23.8103,
        "longitude": 90.4125
      },
      "lateMinutes": 1
    },
    "checkOut": null,
    "workingMinutes": 0,
    "createdAt": "2024-06-25T09:01:00.000Z",
    "updatedAt": "2024-06-25T09:01:00.000Z"
  }
}
```

**Business Logic:**
- Creates attendance record for today (upsert behavior)
- Compares check-in time against shift `startTime` + `gracePeriod`
- Status is `"On Time"` if within grace period, `"Late"` otherwise
- `workingMinutes` is 0 until check-out

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid `latitude`/`longitude` |
| 400 | Already checked in today |
| 401 | No token / invalid token |

---

### 3. Check Out

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/attendance/check-out` |
| **Auth** | JWT required |
| **RBAC** | Any authenticated user |
| **Validation** | `attendance.validator.checkOut` |

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `latitude` | number | ✅ | Min -90, max 90 |
| `longitude` | number | ✅ | Min -180, max 180 |

**Example Request:**
```json
{
  "latitude": 23.8103,
  "longitude": 90.4125
}
```

**Success Response 200:**
```json
{
  "success": true,
  "message": "Check-out successful",
  "data": {
    "_id": "64att123def456789...",
    "userId": "64abc123def456...",
    "employeeId": "EMP00001",
    "attendanceDate": "2024-06-25T00:00:00.000Z",
    "checkIn": {
      "time": "2024-06-25T09:01:00.000Z",
      "status": "Late",
      "location": { "latitude": 23.8103, "longitude": 90.4125 },
      "lateMinutes": 1
    },
    "checkOut": {
      "time": "2024-06-25T18:00:00.000Z",
      "status": "On Time",
      "location": { "latitude": 23.8103, "longitude": 90.4125 }
    },
    "workingMinutes": 479,
    "createdAt": "2024-06-25T09:01:00.000Z",
    "updatedAt": "2024-06-25T18:00:00.000Z"
  }
}
```

**Business Logic:**
- Must have already checked in today
- Calculates `workingMinutes` = (checkOut time - checkIn time) in minutes
- Status determined by comparing against shift end time: `Early` / `On Time` / `Overtime`

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid `latitude`/`longitude` |
| 400 | Not checked in yet today |
| 400 | Already checked out today |
| 401 | No token / invalid token |

---

### 4. Get My Attendance History

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/attendance/history` |
| **Auth** | JWT required |
| **RBAC** | Any authenticated user |
| **Validation** | `attendance.validator.history` (query) |

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
| Param | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| `from` | ISO date | ❌ | — | ISO date string |
| `to` | ISO date | ❌ | — | ISO date string |
| `page` | integer | ❌ | `1` | Min 1 |
| `limit` | integer | ❌ | `20` | Min 1, max 200 |

**Example Request:**
```
GET /api/attendance/history?from=2024-01-01&to=2024-12-31&page=1&limit=20
```

**Success Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64att123def456789...",
      "userId": "64abc123def456...",
      "employeeId": "EMP00001",
      "attendanceDate": "2024-06-20T00:00:00.000Z",
      "checkIn": {
        "time": "2024-06-20T09:00:00.000Z",
        "status": "On Time",
        "location": { "latitude": 23.8103, "longitude": 90.4125 },
        "lateMinutes": 0
      },
      "checkOut": {
        "time": "2024-06-20T18:00:00.000Z",
        "status": "On Time",
        "location": { "latitude": 23.8103, "longitude": 90.4125 }
      },
      "workingMinutes": 480
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "totalPages": 2
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid `from`/`to` date format |
| 401 | No token / invalid token |

---

### 5. Get Daily Attendance Report

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/attendance/daily` |
| **Auth** | JWT required |
| **RBAC** | `admin`, `hr`, `manager` |
| **Validation** | `attendance.validator.daily` (query) |

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
| Param | Type | Required | Validation |
|-------|------|----------|------------|
| `date` | ISO date | ✅ | ISO date string, e.g., `2024-06-25` |

**Example Request:**
```
GET /api/attendance/daily?date=2024-06-25
```

**Success Response 200:**
```json
{
  "success": true,
  "data": {
    "date": "2024-06-25",
    "totalEmployees": 50,
    "present": 42,
    "absent": 5,
    "late": 3,
    "onLeave": 3,
    "records": [
      {
        "employeeId": "EMP00001",
        "name": "John Doe",
        "checkIn": { "time": "09:01", "status": "Late", "lateMinutes": 1 },
        "checkOut": { "time": "18:00", "status": "On Time" },
        "workingMinutes": 479
      },
      {
        "employeeId": "EMP00002",
        "name": "Jane Smith",
        "checkIn": null,
        "checkOut": null
      }
    ]
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | `date` parameter missing or invalid |
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

## Reports (`/api/reports`)

> **RBAC Roles:** `admin`, `hr`
> All endpoints require admin or hr role.

### Endpoints

---

### 1. Get Daily Report

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/reports/daily` |
| **Auth** | JWT required |
| **RBAC** | `admin`, `hr` |
| **Validation** | `report.validator.daily` (query) |

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
| Param | Type | Required | Validation |
|-------|------|----------|------------|
| `date` | ISO date | ✅ | ISO date string, e.g., `2024-06-25` |

**Example Request:**
```
GET /api/reports/daily?date=2024-06-25
```

**Success Response 200:**
```json
{
  "success": true,
  "data": {
    "date": "2024-06-25",
    "dateFormatted": "June 25, 2024",
    "summary": {
      "totalEmployees": 50,
      "present": 42,
      "absent": 5,
      "late": 3,
      "onLeave": 3,
      "holiday": false,
      "holidayName": null
    },
    "records": [...]
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | `date` missing or invalid |
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

### 2. Get Monthly Report

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/reports/monthly` |
| **Auth** | JWT required |
| **RBAC** | `admin`, `hr` |
| **Validation** | `report.validator.monthly` (query) |

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
| Param | Type | Required | Validation |
|-------|------|----------|------------|
| `month` | string | ✅ | Format: `YYYY-MM`, e.g., `2024-06` |

**Example Request:**
```
GET /api/reports/monthly?month=2024-06
```

**Success Response 200:**
```json
{
  "success": true,
  "data": {
    "month": "2024-06",
    "totalWorkingDays": 22,
    "summary": {
      "totalEmployees": 50,
      "totalAttendanceDays": 1003,
      "averageAttendance": 20.06
    },
    "employeeStats": [
      {
        "employeeId": "EMP00001",
        "name": "John Doe",
        "attendedDays": 21,
        "lateDays": 2,
        "absentDays": 0,
        "leaveDays": 1,
        "workingMinutes": 10080
      }
    ]
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | `month` missing or invalid format |
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

### 3. Export Report (Excel / CSV / PDF)

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/reports/export` |
| **Auth** | JWT required |
| **RBAC** | `admin`, `hr` |
| **Validation** | `report.validator.exportReport` (query) |

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
| Param | Type | Required | Validation |
|-------|------|----------|------------|
| `format` | string | ✅ | `excel`, `csv`, or `pdf` |
| `from` | ISO date | ✅ | Start of range |
| `to` | ISO date | ✅ | End of range |

**Example Request (Excel):**
```
GET /api/reports/export?format=excel&from=2024-01-01&to=2024-12-31
```

**Example Request (CSV):**
```
GET /api/reports/export?format=csv&from=2024-01-01&to=2024-12-31
```

**Example Request (PDF):**
```
GET /api/reports/export?format=pdf&from=2024-01-01&to=2024-12-31
```

**Success Response — Binary File Download:**
- **`format=excel`:** `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - Header: `Content-Disposition: attachment; filename="report-2024-01-01-2024-12-31.xlsx"`
- **`format=csv`:** `Content-Type: text/csv`
  - Header: `Content-Disposition: attachment; filename="report-2024-01-01-2024-12-31.csv"`
- **`format=pdf`:** `Content-Type: application/pdf`
  - Header: `Content-Disposition: attachment; filename="report-2024-01-01-2024-12-31.pdf"`

> **Note:** The body is binary data (not JSON). It will be downloaded as a file by the client.

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | `format` not one of `excel`, `csv`, `pdf` |
| 400 | `from` or `to` missing or invalid |
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

## Settings (`/api/settings`)

> **RBAC Roles:** `admin` for attendance-rules, company; `admin, hr` for work-calendar write; any auth'd user for work-calendar read.

### Endpoints

---

### 1. Update Attendance Rules

| Property | Value |
|----------|-------|
| **Method** | `PUT` |
| **Path** | `/api/settings/attendance-rules` |
| **Auth** | JWT required |
| **RBAC** | `admin` only |

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `defaultGracePeriodMinutes` | integer | ❌ | 0–120 |
| `defaultTimezone` | string | ❌ | IANA timezone string, e.g., `Asia/Dhaka` |

> **Note:** At least 1 field required — `min(1)` enforced.

**Example Request:**
```json
{
  "defaultGracePeriodMinutes": 15,
  "defaultTimezone": "Asia/Dhaka"
}
```

**Success Response 200:**
```json
{
  "success": true,
  "message": "Attendance rules updated",
  "data": null
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | No fields provided |
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

### 2. Get Company Information

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/settings/company` |
| **Auth** | JWT required |
| **RBAC** | `admin` only |

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:** None

**Example Request:**
```
GET /api/settings/company
```

**Success Response 200:**
```json
{
  "success": true,
  "data": {
    "name": "Attendly Inc",
    "legalName": "Attendly Incorporated",
    "address": "123 Main St, Dhaka, Bangladesh",
    "logoUrl": "https://example.com/logo.png"
  }
}
```

**Data Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Company display name |
| `legalName` | string | Legal company name |
| `address` | string | Company address |
| `logoUrl` | string | URL to company logo image |

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | No token / invalid token |
| 403 | Insufficient role |
| 404 | Company settings not found |

---

### 3. Update Company Information

| Property | Value |
|----------|-------|
| **Method** | `PUT` |
| **Path** | `/api/settings/company` |
| **Auth** | JWT required |
| **RBAC** | `admin` only |
| **Validation** | `settings.validator.updateCompany` |

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | ❌ | 2–160 chars |
| `legalName` | string | ❌ | Max 200 chars |
| `address` | string | ❌ | Max 400 chars |
| `logoUrl` | string | ❌ | Valid URI |

> **Note:** At least 1 field required — `min(1)` enforced.

**Example Request:**
```json
{
  "name": "Attendly Inc",
  "legalName": "Attendly Incorporated",
  "address": "123 Main St, Dhaka, Bangladesh",
  "logoUrl": "https://example.com/logo.png"
}
```

**Success Response 200:**
```json
{
  "success": true,
  "message": "Company information updated",
  "data": null
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | No fields provided / invalid `logoUrl` URI |
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

### 4. Get Work Calendar

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/settings/work-calendar` |
| **Auth** | JWT required |
| **RBAC** | Any authenticated user |

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:** None

**Example Request:**
```
GET /api/settings/work-calendar
```

**Success Response 200:**
```json
{
  "success": true,
  "data": {
    "weekends": ["Friday", "Saturday"],
    "workingHours": {
      "start": "09:00",
      "end": "18:00"
    },
    "effectiveFrom": "2024-01-01"
  }
}
```

**Data Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `weekends` | string[] | Weekend day names, e.g., `["Friday", "Saturday"]` |
| `workingHours.start` | string | Work day start time HH:mm |
| `workingHours.end` | string | Work day end time HH:mm |
| `effectiveFrom` | string | Date when these settings took effect |

> **Note:** Defaults to weekends `["Friday", "Saturday"]` if not configured.

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | No token / invalid token |

---

### 5. Update Work Calendar

| Property | Value |
|----------|-------|
| **Method** | `PUT` |
| **Path** | `/api/settings/work-calendar` |
| **Auth** | JWT required |
| **RBAC** | `admin`, `hr` |

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `weekends` | string[] | ❌ | Weekend day names, e.g., `["Friday", "Saturday"]` |
| `workingHours` | object | ❌ | Optional working hours object |
| `workingHours.start` | string | ❌ | Work day start HH:mm |
| `workingHours.end` | string | ❌ | Work day end HH:mm |
| `effectiveFrom` | string | ❌ | ISO date when settings take effect |

**Example Request:**
```json
{
  "weekends": ["Friday", "Saturday"],
  "workingHours": {
    "start": "09:00",
    "end": "18:00"
  },
  "effectiveFrom": "2024-01-01"
}
```

**Success Response 200:**
```json
{
  "success": true,
  "message": "Work calendar settings updated",
  "data": null
}
```

> **Side Effect:** Triggers asynchronous recalculation for all active employees for the affected month (non-blocking).

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

## Holidays (`/api/holidays`)

> **RBAC Roles:** Read — any authenticated user; Write — `admin`, `hr`
> **Model:** Stored in `holidays` collection, sorted by `date` ascending

### Endpoints

---

### 1. List All Holidays

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/holidays` |
| **Auth** | JWT required |
| **RBAC** | Any authenticated user |

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:** None

**Example Request:**
```
GET /api/holidays
```

**Success Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64hol123def456789...",
      "name": "Independence Day",
      "date": "2024-03-26T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "_id": "64hol456def789abc...",
      "name": "Eid-ul-Fitr",
      "date": "2024-04-10T00:00:00.000Z"
    }
  ]
}
```

**Data Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Holiday name |
| `date` | string (ISO date) | Holiday date (stored at start of day, Asia/Dhaka timezone) |

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | No token / invalid token |

---

### 2. Create Holiday

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/holidays` |
| **Auth** | JWT required |
| **RBAC** | `admin`, `hr` |

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Holiday name |
| `date` | string | ✅ | ISO date string, e.g., `2024-03-26` |

**Example Request:**
```json
{
  "name": "Independence Day",
  "date": "2024-03-26"
}
```

**Success Response 201:**
```json
{
  "success": true,
  "message": "Holiday created successfully",
  "data": {
    "_id": "64hol123def456789...",
    "name": "Independence Day",
    "date": "2024-03-26T00:00:00.000Z",
    "createdAt": "2024-03-25T18:00:00.000Z",
    "updatedAt": "2024-03-25T18:00:00.000Z"
  }
}
```

**Business Logic:**
- Date is parsed and stored at start of day in `Asia/Dhaka` timezone
- Duplicate dates are rejected (400 error)
- Triggers asynchronous salary recalculation for the affected month for all active employees

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | `name` or `date` missing |
| 400 | A holiday already exists on this date |
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

### 3. Delete Holiday

| Property | Value |
|----------|-------|
| **Method** | `DELETE` |
| **Path** | `/api/holidays/:id` |
| **Auth** | JWT required |
| **RBAC** | `admin`, `hr` |

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `id` | string | 24-char hex MongoDB ObjectId |

**Example Request:**
```
DELETE /api/holidays/64hol123def456789...
```

**Success Response 204:**
```
(empty body)
```

**Business Logic:**
- Triggers asynchronous salary recalculation for the holiday's affected month for all active employees

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid ObjectId |
| 404 | Holiday not found |
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

## Salary (`/api/salary`)

> **RBAC Roles:** `admin`, `hr`
> **Models:** `SalaryRecord`, `DeductionLog`
> **Automation:** Salary records are auto-generated as drafts when viewing overview if not already created for the month

### Endpoints

---

### 1. Get Salary Overview

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/salary/overview` |
| **Auth** | JWT required |
| **RBAC** | `admin`, `hr` |

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `month` | string | ❌ | Current month (YYYY-MM) | Filter records by month |

**Example Request:**
```
GET /api/salary/overview?month=2024-06
```

**Success Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64sal123def456789...",
      "employeeId": {
        "_id": "64abc123def456...",
        "name": "John Doe",
        "employeeId": "EMP00001",
        "designation": "Developer",
        "status": "active",
        "email": "john@example.com",
        "salary": 50000
      },
      "month": "2024-06",
      "workingDays": 22,
      "attendedDays": 20,
      "lateDays": 1,
      "deductedDays": 1,
      "approvedLeaveDays": 1,
      "baseSalary": 50000,
      "dailySalary": 2272.73,
      "deductionAmount": 2272.73,
      "leaveEncashmentAmount": 0,
      "finalPayableSalary": 49636.37,
      "status": "Draft",
      "processedAt": null,
      "createdAt": "2024-06-25T00:00:00.000Z",
      "updatedAt": "2024-06-25T00:00:00.000Z"
    }
  ]
}
```

**SalaryRecord Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `month` | string | YYYY-MM format |
| `workingDays` | integer | Total working days in the month (after holidays/weekends) |
| `attendedDays` | integer | Days employee actually attended |
| `lateDays` | integer | Days marked as late |
| `deductedDays` | integer | Days deducted from salary |
| `approvedLeaveDays` | integer | Approved leave days |
| `baseSalary` | number | Employee's base monthly salary |
| `dailySalary` | number | `baseSalary / workingDays` |
| `deductionAmount` | number | Amount deducted for absences/lateness |
| `leaveEncashmentAmount` | number | Amount added for unused leave encashment |
| `finalPayableSalary` | number | `baseSalary - deductionAmount + leaveEncashmentAmount` |
| `status` | string | `Draft` or `Paid` |
| `processedAt` | string (ISO) | Timestamp when marked as Paid |

**Business Logic:**
- Auto-creates draft salary records for all active employees if not already present for the requested month
- Uses automation service to calculate attendance-based deductions

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

### 2. Get Salary Reports

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/salary/reports` |
| **Auth** | JWT required |
| **RBAC** | `admin`, `hr` |

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `month` | string | ❌ | Current month (YYYY-MM) | Filter by month |

**Example Request:**
```
GET /api/salary/reports?month=2024-06
```

**Success Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64sal123def456789...",
      "employeeId": {
        "_id": "64abc123def456...",
        "name": "John Doe",
        "employeeId": "EMP00001",
        "designation": "Developer",
        "status": "active",
        "email": "john@example.com",
        "salary": 50000
      },
      "month": "2024-06",
      "status": "Paid",
      "processedAt": "2024-07-01T00:00:00.000Z"
    }
  ]
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

### 3. Recalculate Salary

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/salary/recalculate` |
| **Auth** | JWT required |
| **RBAC** | `admin`, `hr` |

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body** (or query parameter `month`):
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `month` | string | ❌ | YYYY-MM format |

**Example Request — via body:**
```json
{
  "month": "2024-06"
}
```

**Example Request — via query:**
```
POST /api/salary/recalculate?month=2024-06
```

**Request Body Fields:**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `month` | string | ❌ | Current month (YYYY-MM) | Month to recalculate for |

**Success Response 200:**
```json
{
  "success": true,
  "message": "Payroll calculations refreshed successfully",
  "data": [
    {
      "_id": "64sal123def456789...",
      "employeeId": {
        "_id": "64abc123def456...",
        "name": "John Doe",
        "employeeId": "EMP00001",
        "designation": "Developer",
        "status": "active",
        "email": "john@example.com",
        "salary": 50000
      },
      "month": "2024-06",
      "status": "Draft",
      "finalPayableSalary": 49636.37,
      ...
    }
  ]
}
```

**Business Logic:**
- Triggers `automationService.evaluateAllActive(month)` which recalculates salary for all active employees
- Regenerates salary records with latest attendance, leave, and deduction data

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

### 4. Mark Salary as Paid

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/salary/pay/:id` |
| **Auth** | JWT required |
| **RBAC** | `admin`, `hr` |

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `id` | string | 24-char hex SalaryRecord ObjectId |

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body:** None (optional)

**Example Request:**
```
POST /api/salary/pay/64sal123def456789...
```

**Success Response 200:**
```json
{
  "success": true,
  "message": "Salary marked as Paid successfully",
  "data": {
    "_id": "64sal123def456789...",
    "employeeId": {
      "_id": "64abc123def456...",
      "name": "John Doe",
      "employeeId": "EMP00001",
      "designation": "Developer",
      "status": "active",
      "email": "john@example.com",
      "salary": 50000
    },
    "month": "2024-06",
    "status": "Paid",
    "processedAt": "2024-07-01T12:00:00.000Z",
    "finalPayableSalary": 49636.37,
    ...
  }
}
```

**Business Logic:**
- Sets `status` to `"Paid"`
- Records `processedAt` timestamp (current time)
- Returns the populated record with employee details

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid ObjectId format |
| 404 | Salary record not found |
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

### 5. Get Deduction Logs

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/salary/deductions` |
| **Auth** | JWT required |
| **RBAC** | `admin`, `hr` |

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `month` | string (YYYY-MM) | ❌ | Filter by month |
| `employeeId` | string | ❌ | Filter by employee ObjectId |

**Example Request:**
```
GET /api/salary/deductions?month=2024-06&employeeId=64abc123def456...
```

**Success Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64ded123def456789...",
      "employeeId": {
        "_id": "64abc123def456...",
        "name": "John Doe",
        "employeeId": "EMP00001",
        "designation": "Developer"
      },
      "month": "2024-06",
      "type": "Absence",
      "amount": 2272.73,
      "reason": "Absent on 2024-06-15",
      "linkedAttendance": {
        "_id": "64att123def456789...",
        "attendanceDate": "2024-06-15T00:00:00.000Z",
        "checkIn": null
      },
      "timestamp": "2024-06-25T00:00:00.000Z"
    }
  ]
}
```

**DeductionLog Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Deduction type: `Absence`, `Late`, `UnderHours` |
| `amount` | number | Amount deducted |
| `reason` | string | Human-readable reason |
| `linkedAttendance` | object | Reference to attendance record (if applicable) |
| `timestamp` | string (ISO) | When deduction was created |

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

## Leaves (`/api/leaves`)

> **RBAC Roles:** Admin/HR endpoints — `admin`, `hr`; Employee endpoints — `employee`
> **Rules:**
> - Default annual allocation: 20 days
> - Working days calculated excluding weekends and holidays (based on work-calendar settings)
> - Overlapping leave requests are rejected
> - Insufficient balance results in validation error

### Endpoints

---

### 1. Get All Leave Requests (Admin/HR)

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/leaves/requests` |
| **Auth** | JWT required |
| **RBAC** | `admin`, `hr` |

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:** None

**Example Request:**
```
GET /api/leaves/requests
```

**Success Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64lea123def456789...",
      "employeeId": {
        "_id": "64abc123def456...",
        "name": "John Doe",
        "employeeId": "EMP00001",
        "designation": "Developer",
        "email": "john@example.com"
      },
      "startDate": "2024-07-01T00:00:00.000Z",
      "endDate": "2024-07-05T00:00:00.000Z",
      "leaveType": "Annual",
      "reason": "Vacation",
      "requestedDays": 4,
      "status": "Pending",
      "createdAt": "2024-06-25T00:00:00.000Z",
      "updatedAt": "2024-06-25T00:00:00.000Z"
    }
  ]
}
```

**LeaveRequest Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `employeeId` | object | Populated employee reference |
| `startDate` | string (ISO) | Leave start date (stored at start of day) |
| `endDate` | string (ISO) | Leave end date (stored at end of day) |
| `leaveType` | string | `Annual`, `Sick`, `Casual`, `Unpaid` |
| `reason` | string | Reason for leave |
| `requestedDays` | integer | Calculated working days |
| `status` | string | `Pending`, `Approved`, `Rejected` |

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

### 2. Create Leave Request (Admin/HR — on behalf of employee)

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/leaves/requests` |
| **Auth** | JWT required |
| **RBAC** | `admin`, `hr` |

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `employeeId` | string (ObjectId) | ✅ | Employee to create leave for |
| `startDate` | string (ISO date) | ✅ | Leave start date |
| `endDate` | string (ISO date) | ✅ | Leave end date |
| `leaveType` | string | ✅ | `Annual`, `Sick`, `Casual`, `Unpaid` |
| `reason` | string | ❌ | Reason text |
| `requestedDays` | integer | ❌ | Working days count |

**Example Request:**
```json
{
  "employeeId": "64abc123def456...",
  "startDate": "2024-07-01",
  "endDate": "2024-07-05",
  "leaveType": "Annual",
  "reason": "Vacation",
  "requestedDays": 4
}
```

**Success Response 201:**
```json
{
  "success": true,
  "message": "Leave request created successfully",
  "data": {
    "_id": "64lea123def456789...",
    "employeeId": "64abc123def456...",
    "startDate": "2024-07-01T00:00:00.000Z",
    "endDate": "2024-07-05T00:00:00.000Z",
    "leaveType": "Annual",
    "reason": "Vacation",
    "requestedDays": 4,
    "status": "Pending",
    "createdAt": "2024-06-25T00:00:00.000Z",
    "updatedAt": "2024-06-25T00:00:00.000Z"
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | `employeeId`, `startDate`, `endDate`, or `leaveType` missing |
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

### 3. Update Leave Request Status (Admin/HR)

| Property | Value |
|----------|-------|
| **Method** | `PUT` |
| **Path** | `/api/leaves/requests/:id/status` |
| **Auth** | JWT required |
| **RBAC** | `admin`, `hr` |

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `id` | string | 24-char hex LeaveRequest ObjectId |

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | ✅ | `Approved` or `Rejected` |

**Example Request:**
```json
{
  "status": "Approved"
}
```

**Success Response 200:**
```json
{
  "success": true,
  "message": "Leave request approved",
  "data": {
    "_id": "64lea123def456789...",
    "employeeId": {
      "_id": "64abc123def456...",
      "name": "John Doe",
      "employeeId": "EMP00001",
      "designation": "Developer",
      "email": "john@example.com"
    },
    "startDate": "2024-07-01T00:00:00.000Z",
    "endDate": "2024-07-05T00:00:00.000Z",
    "leaveType": "Annual",
    "reason": "Vacation",
    "requestedDays": 4,
    "status": "Approved"
  }
}
```

**Business Logic:**
- Approving: increments `used` in `LeaveBalance` for that employee/year
- Rejecting (if was previously Approved): decrements `used` in `LeaveBalance`
- Population includes employee reference

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | `status` missing |
| 404 | Leave request not found |
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

### 4. Get All Leave Balances (Admin/HR)

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/leaves/balances` |
| **Auth** | JWT required |
| **RBAC** | `admin`, `hr` |

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `year` | integer | ❌ | Current year | Year to view balances for |

**Example Request:**
```
GET /api/leaves/balances?year=2024
```

**Success Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64bal123def456789...",
      "employeeId": {
        "_id": "64abc123def456...",
        "name": "John Doe",
        "employeeId": "EMP00001",
        "designation": "Developer",
        "email": "john@example.com",
        "status": "active"
      },
      "year": 2024,
      "allocated": 20,
      "used": 4,
      "remaining": 16
    }
  ]
}
```

**LeaveBalance Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `employeeId` | object | Populated employee reference |
| `year` | integer | Year the balance applies to |
| `allocated` | integer | Total days allocated (default 20) |
| `used` | integer | Days taken |
| `remaining` | integer | `allocated - used` |

> **Note:** Returns all active employees. Missing balance entries default to `allocated: 20, used: 0, remaining: 20`.

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

### 5. Update Leave Allocation (Admin/HR)

| Property | Value |
|----------|-------|
| **Method** | `PUT` |
| **Path** | `/api/leaves/balances/allocation` |
| **Auth** | JWT required |
| **RBAC** | `admin`, `hr` |

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `employeeId` | string (ObjectId) | ✅ | Employee to update |
| `year` | integer | ✅ | Year for the allocation |
| `allocated` | integer | ✅ | New allocated days |

**Example Request:**
```json
{
  "employeeId": "64abc123def456...",
  "year": 2024,
  "allocated": 25
}
```

**Success Response 200:**
```json
{
  "success": true,
  "message": "Leave allocation updated",
  "data": {
    "_id": "64bal123def456789...",
    "employeeId": "64abc123def456...",
    "year": 2024,
    "allocated": 25,
    "used": 4,
    "remaining": 21
  }
}
```

**Business Logic:**
- Uses `upsert: true` — creates new balance if not exists for employee/year
- Does not reset `used` — only updates `allocated`

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Missing required fields |
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

### 6. Bulk Update Leave Allocation (Admin/HR)

| Property | Value |
|----------|-------|
| **Method** | `PUT` |
| **Path** | `/api/leaves/balances/bulk-allocation` |
| **Auth** | JWT required |
| **RBAC** | `admin`, `hr` |

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `year` | integer | ✅ | Year to update |
| `allocated` | integer | ✅ | New allocated days for all employees |

**Example Request:**
```json
{
  "year": 2024,
  "allocated": 22
}
```

**Success Response 200:**
```json
{
  "success": true,
  "message": "Leave allocation updated for 48 employees",
  "data": {
    "count": 48
  }
}
```

**Business Logic:**
- Updates all active employees (excluding admin role)
- Uses MongoDB `bulkWrite` for efficiency
- Upserts new balance entries for employees who don't have one yet

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | `year` or `allocated` missing |
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

### 7. Get My Leave Requests (Employee)

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/leaves/me/requests` |
| **Auth** | JWT required |
| **RBAC** | `employee` only |

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:** None

**Example Request:**
```
GET /api/leaves/me/requests
```

**Success Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64lea123def456789...",
      "employeeId": {
        "_id": "64abc123def456...",
        "name": "John Doe",
        "employeeId": "EMP00001",
        "designation": "Developer"
      },
      "startDate": "2024-07-01T00:00:00.000Z",
      "endDate": "2024-07-05T00:00:00.000Z",
      "leaveType": "Annual",
      "reason": "Vacation",
      "requestedDays": 4,
      "status": "Pending",
      "createdAt": "2024-06-25T00:00:00.000Z"
    }
  ]
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | No token / invalid token |
| 403 | Insufficient role (not employee) |

---

### 8. Get My Leave Balance (Employee)

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/leaves/me/balance` |
| **Auth** | JWT required |
| **RBAC** | `employee` only |

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `year` | integer | ❌ | Current year | Year to view balance for |

**Example Request:**
```
GET /api/leaves/me/balance?year=2024
```

**Success Response 200:**
```json
{
  "success": true,
  "data": {
    "year": 2024,
    "allocated": 20,
    "used": 4,
    "remaining": 16
  }
}
```

**Data Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `year` | integer | Year of the balance |
| `allocated` | integer | Total days allocated (default 20 if not explicitly set) |
| `used` | integer | Days taken (approved leaves) |
| `remaining` | integer | `allocated - used` |

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | No token / invalid token |
| 403 | Insufficient role |

---

### 9. Submit Leave Request (Employee)

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/leaves/me/request` |
| **Auth** | JWT required |
| **RBAC** | `employee` only |

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `startDate` | string (ISO date) | ✅ | Leave start date |
| `endDate` | string (ISO date) | ✅ | Leave end date |
| `leaveType` | string | ❌ | `Annual`, `Sick`, `Casual`, `Unpaid` — default: `Annual` |
| `reason` | string | ✅ | Reason text |

**Example Request:**
```json
{
  "startDate": "2024-07-01",
  "endDate": "2024-07-05",
  "leaveType": "Annual",
  "reason": "Planning a family vacation"
}
```

**Success Response 201:**
```json
{
  "success": true,
  "message": "Leave request submitted successfully",
  "data": {
    "_id": "64lea123def456789...",
    "employeeId": {
      "_id": "64abc123def456...",
      "name": "John Doe",
      "employeeId": "EMP00001",
      "designation": "Developer"
    },
    "startDate": "2024-07-01T00:00:00.000Z",
    "endDate": "2024-07-05T00:00:00.000Z",
    "leaveType": "Annual",
    "reason": "Planning a family vacation",
    "requestedDays": 4,
    "status": "Pending",
    "createdAt": "2024-06-25T00:00:00.000Z",
    "updatedAt": "2024-06-25T00:00:00.000Z"
  }
}
```

**Business Logic:**
- Auto-calculates `requestedDays` based on working days between start and end (excludes weekends and holidays per work-calendar)
- Default `leaveType` is `"Annual"` if not provided
- Validates against current leave balance (must have enough `remaining` days)
- Validates against overlapping existing requests (Pending or Approved)
- If no balance record exists, defaults to 20 days allocated

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | `startDate`, `endDate`, or `reason` missing |
| 400 | `endDate` must be after `startDate` |
| 400 | Selected date range contains no working days |
| 400 | Insufficient leave balance (shows how many requested vs remaining) |
| 400 | Overlapping Pending/Approved leave request already exists |
| 401 | No token / invalid token |
| 403 | Insufficient role (requires `employee` role) |

---

## Roles & Access Summary

| Role | Employees | Shifts | Attendance | Reports | Settings | Holidays | Salary | Leaves |
|------|-----------|--------|------------|---------|----------|----------|--------|--------|
| **admin** | Full | Full | Full | Full | Full | Full | Full | Full |
| **hr** | List, Create, Update, Delete, Assign Shift | Read, Write | Status, Check-in/out, History, Daily | Full | Company (read/write), Work-calendar (write) | Create, Delete, List | Full | Full |
| **manager** | List only | Read | Status, Daily | Read | Read (work-calendar) | Read | Read | Read (no leave endpoints) |
| **employee** | None (own only via auth endpoints) | None | Status, Check-in/out, History | None | Read (work-calendar) | Read | None | My requests, My balance, Submit request |

---

## Error Codes Reference

| HTTP Status | Common Cause | Example Message |
|-------------|--------------|-----------------|
| 400 | Validation failure | `"date parameter is required"` |
| 400 | Invalid body params | `"Selected date range contains no working days"` |
| 400 | Conflict | `"A holiday already exists on this date"` |
| 401 | Missing/invalid token | `"Unauthorized"` |
| 403 | Role mismatch | `"Forbidden"` |
| 404 | Resource not found | `"Resource not found"` / `"Salary record not found"` |
| 429 | Rate limit | `"Too many login attempts, please try again later"` |
| 500 | Server error | Handled by `error.middleware.js` |

---

## Configuration Reference

From `apps/api/src/config/index.js`:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | API server port |
| `MONGODB_URI` | `mongodb://localhost:27017/workforce_management` | Database connection string |
| `JWT_ACCESS_SECRET` | — | JWT signing secret for access tokens |
| `JWT_REFRESH_SECRET` | — | JWT signing secret for refresh tokens |
| `JWT_ACCESS_EXPIRY` | `1d` | Access token expiry |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh token expiry |
| `RATE_LIMIT_WINDOW_MS` | `900000` | 15 minutes |
| `RATE_LIMIT_MAX` | `100` | General rate limit per window |
| `RATE_LIMIT_AUTH_MAX` | `10` | Auth endpoint rate limit per window |

---

## Quick Reference: cURL Examples

```bash
# Health check
curl -X GET http://localhost:4000/health

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@attendly.com","password":"password123"}'

# Get profile (replace TOKEN)
curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer TOKEN"

# Check in (replace TOKEN)
curl -X POST http://localhost:4000/api/attendance/check-in \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"latitude":23.8103,"longitude":90.4125}'

# List employees (replace TOKEN)
curl -X GET "http://localhost:4000/api/employees?page=1&limit=20" \
  -H "Authorization: Bearer TOKEN"

# Create employee (replace TOKEN)
curl -X POST http://localhost:4000/api/employees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name":"John Doe","email":"john@example.com","role":"employee","salary":50000}'

# Get attendance status (replace TOKEN)
curl -X GET http://localhost:4000/api/attendance/status \
  -H "Authorization: Bearer TOKEN"

# Get daily report (replace TOKEN)
curl -X GET "http://localhost:4000/api/reports/daily?date=2024-06-25" \
  -H "Authorization: Bearer TOKEN"

# Export report (replace TOKEN)
curl -X GET "http://localhost:4000/api/reports/export?format=excel&from=2024-01-01&to=2024-12-31" \
  -H "Authorization: Bearer TOKEN" \
  -o report.xlsx

# Submit leave request (replace TOKEN)
curl -X POST http://localhost:4000/api/leaves/me/request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"startDate":"2024-07-01","endDate":"2024-07-05","leaveType":"Annual","reason":"Vacation"}'

# Get salary overview (replace TOKEN)
curl -X GET "http://localhost:4000/api/salary/overview?month=2024-06" \
  -H "Authorization: Bearer TOKEN"

# Mark salary as paid (replace TOKEN)
curl -X POST http://localhost:4000/api/salary/pay/64sal123def456789 \
  -H "Authorization: Bearer TOKEN"

# Create holiday (replace TOKEN)
curl -X POST http://localhost:4000/api/holidays \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name":"Independence Day","date":"2024-03-26"}'

# Refresh token
curl -X POST http://localhost:4000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"REFRESH_TOKEN"}'
```

</parameter>
<parameter=filePath>
H:\CODE\Attendly\apiList.md
</parameter>
</function>
</tool_call>