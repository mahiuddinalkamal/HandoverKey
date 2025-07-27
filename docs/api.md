# HandoverKey - API Reference

## 1. Introduction

This document provides a comprehensive reference for the HandoverKey RESTful API. The API is designed to be secure, efficient, and easy to integrate with various client applications (web, mobile, CLI). All API interactions are secured with JWT authentication and TLS encryption.

## 2. Base URL

`https://api.handoverkey.com/v1` (Production)
`http://localhost:3000/api/v1` (Local Development)

## 3. Authentication

All API requests require a JSON Web Token (JWT) in the `Authorization` header.

```
Authorization: Bearer <YOUR_JWT_TOKEN>
```

### 3.1 Register User

`POST /auth/register`

Registers a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!",
  "confirmPassword": "StrongPassword123!"
}
```

**Response:**
```json
{
  "message": "User registered successfully. Please verify your email."
}
```

### 3.2 Login User

`POST /auth/login`

Authenticates a user and returns an access token and refresh token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1Ni...",
  "refreshToken": "eyJhbGciOiJIUzI1Ni...",
  "expiresIn": 3600
}
```

### 3.3 Refresh Token

`POST /auth/refresh`

Obtains a new access token using a refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1Ni..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1Ni...",
  "expiresIn": 3600
}
```

## 4. User Management

### 4.1 Get User Profile

`GET /users/profile`

Retrieves the authenticated user's profile information.

**Response:**
```json
{
  "id": "uuid-user-id",
  "email": "user@example.com",
  "createdAt": "2023-01-01T12:00:00Z",
  "lastLogin": "2023-07-26T10:30:00Z"
}
```

### 4.2 Update User Profile

`PUT /users/profile`

Updates the authenticated user's profile information.

**Request Body:**
```json
{
  "email": "new_email@example.com",
  "password": "NewStrongPassword456!"
}
```

**Response:**
```json
{
  "message": "Profile updated successfully."
}
```

## 5. Vault Management

### 5.1 Create Vault Entry

`POST /vault/entries`

Creates a new encrypted vault entry. The `encryptedData` must be AES-256-GCM encrypted client-side.

**Request Body:**
```json
{
  "encryptedData": "base64_encoded_encrypted_data",
  "iv": "base64_encoded_iv",
  "algorithm": "AES-GCM",
  "category": "Passwords",
  "tags": ["social", "login"]
}
```

**Response:**
```json
{
  "id": "uuid-entry-id",
  "message": "Vault entry created successfully."
}
```

### 5.2 Get All Vault Entries

`GET /vault/entries`

Retrieves a list of all encrypted vault entries for the authenticated user.

**Query Parameters:**
- `category`: Filter by category (optional)
- `tag`: Filter by tag (optional)
- `search`: Search within encrypted data (server-side encrypted search, if implemented)

**Response:**
```json
[
  {
    "id": "uuid-entry-id-1",
    "encryptedData": "base64_encoded_encrypted_data_1",
    "iv": "base64_encoded_iv_1",
    "algorithm": "AES-GCM",
    "category": "Passwords",
    "tags": ["social", "login"],
    "createdAt": "2023-01-01T12:00:00Z",
    "updatedAt": "2023-01-01T12:00:00Z"
  },
  {
    "id": "uuid-entry-id-2",
    "encryptedData": "base64_encoded_encrypted_data_2",
    "iv": "base64_encoded_iv_2",
    "algorithm": "AES-GCM",
    "category": "Documents",
    "tags": ["legal"],
    "createdAt": "2023-01-02T12:00:00Z",
    "updatedAt": "2023-01-02T12:00:00Z"
  }
]
```

### 5.3 Get Single Vault Entry

`GET /vault/entries/:id`

Retrieves a single encrypted vault entry by ID.

**Response:**
```json
{
  "id": "uuid-entry-id",
  "encryptedData": "base64_encoded_encrypted_data",
  "iv": "base64_encoded_iv",
  "algorithm": "AES-GCM",
  "category": "Passwords",
  "tags": ["social", "login"],
  "createdAt": "2023-01-01T12:00:00Z",
  "updatedAt": "2023-01-01T12:00:00Z"
}
```

### 5.4 Update Vault Entry

`PUT /vault/entries/:id`

Updates an existing encrypted vault entry.

**Request Body:**
```json
{
  "encryptedData": "base64_encoded_updated_encrypted_data",
  "iv": "base64_encoded_updated_iv",
  "algorithm": "AES-GCM",
  "category": "Updated Category",
  "tags": ["new", "tags"]
}
```

**Response:**
```json
{
  "message": "Vault entry updated successfully."
}
```

### 5.5 Delete Vault Entry

`DELETE /vault/entries/:id`

Deletes a vault entry.

**Response:**
```json
{
  "message": "Vault entry deleted successfully."
}
```

## 6. Successor Management

### 6.1 Add Successor

`POST /users/successors`

Adds a new successor to the user's account.

**Request Body:**
```json
{
  "email": "successor@example.com",
  "name": "John Doe",
  "handoverDelayDays": 90,
  "requiredShares": 1 // For Shamir's Secret Sharing
}
```

**Response:**
```json
{
  "id": "uuid-successor-id",
  "message": "Successor added. Verification email sent."
}
```

### 6.2 Get All Successors

`GET /users/successors`

Retrieves a list of all successors for the authenticated user.

**Response:**
```json
[
  {
    "id": "uuid-successor-id-1",
    "email": "successor1@example.com",
    "name": "John Doe",
    "verified": true,
    "handoverDelayDays": 90,
    "createdAt": "2023-01-01T12:00:00Z"
  },
  {
    "id": "uuid-successor-id-2",
    "email": "successor2@example.com",
    "name": "Jane Smith",
    "verified": false,
    "handoverDelayDays": 120,
    "createdAt": "2023-01-02T12:00:00Z"
  }
]
```

### 6.3 Update Successor

`PUT /users/successors/:id`

Updates an existing successor's information.

**Request Body:**
```json
{
  "name": "Jonathan Doe",
  "handoverDelayDays": 60
}
```

**Response:**
```json
{
  "message": "Successor updated successfully."
}
```

### 6.4 Delete Successor

`DELETE /users/successors/:id`

Deletes a successor.

**Response:**
```json
{
  "message": "Successor deleted successfully."
}
```

## 7. Dead Man's Switch & Handover

### 7.1 Check-in

`POST /handover/check-in`

Records a user activity to reset the dead man's switch timer.

**Response:**
```json
{
  "message": "Activity recorded. Dead man's switch timer reset."
}
```

### 7.2 Get Handover Status

`GET /handover/status`

Retrieves the current status of the dead man's switch for the authenticated user.

**Response:**
```json
{
  "lastActivity": "2023-07-26T10:30:00Z",
  "inactivityThresholdDays": 90,
  "daysUntilHandover": 89,
  "handoverTriggered": false,
  "remindersSent": 0
}
```

### 7.3 Get Audit Logs

`GET /handover/audit-logs`

Retrieves a list of audit logs related to handover events.

**Response:**
```json
[
  {
    "id": "uuid-log-id-1",
    "eventType": "INACTIVITY_REMINDER_SENT",
    "timestamp": "2023-07-20T10:00:00Z",
    "metadata": { "reminderNumber": 1 }
  },
  {
    "id": "uuid-log-id-2",
    "eventType": "USER_CHECK_IN",
    "timestamp": "2023-07-26T10:30:00Z",
    "metadata": {}
  }
]
```

## 8. Error Handling

API errors are returned with appropriate HTTP status codes and a JSON error object.

**Example Error Response:**
```json
{
  "error": "Invalid credentials",
  "statusCode": 401
}
```

## 9. Webhooks (Future)

HandoverKey will support webhooks for real-time notifications on critical events (e.g., handover triggered, successor verified).

## 10. GraphQL (Future)

A GraphQL API will be provided for more flexible data querying.

---

**Last Updated**: July 26, 2025
**Version**: 1.0
