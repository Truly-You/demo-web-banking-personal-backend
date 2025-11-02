# Naira Bank Mobile Backend - Setup Guide

## Overview

This is a minimal Express backend for the Naira Bank Mobile app that:
1. Receives attestation tokens from the mobile SDK
2. Validates them using the Attest Backend SDK
3. Retrieves user data from forge properties
4. Returns enriched user data to the mobile app

## Environment Variables

Set these in your `.env` file (or copy from `env.example`):

### `PORT` (default: 3007)
The port the server will listen on. The mobile app will use this URL.

Example:
```
PORT=3007
```

### `ATTEST_API_URL` (default: http://localhost:4000)
The URL of the running Attest Backend that this service connects to.

Example:
```
ATTEST_API_URL=http://localhost:4000
```

### `NODE_ENV` (default: development)
Environment mode. Use `development` for local debugging, `production` for deployment.

Example:
```
NODE_ENV=development
```

### `CORS_ORIGIN` (default: *)
CORS origin for the mobile app. Set to the mobile app URL if restricting.

Example:
```
CORS_ORIGIN=*
```

## Configuration in Mobile App

The mobile app uses this environment variable to know where the backend is:

### `EXPO_PUBLIC_API_URL`
Set this in your mobile app's `.env` to the backend URL.

Example (in mobile app `.env`):
```
EXPO_PUBLIC_API_URL=http://localhost:3007
```

## Startup Sequence

For the full system to work, start services in this order:

1. **Attest Backend**
   ```bash
   cd attest/backend
   npm run dev
   # Runs on http://localhost:4000
   ```

2. **Mobile App Backend** (this service)
   ```bash
   cd demos/banking/naira-bank-mobile-backend
   npm run dev
   # Runs on http://localhost:3007
   ```

3. **Mobile App**
   - Set `EXPO_PUBLIC_API_URL=http://localhost:3007` in mobile app `.env`
   - Start the Expo app

## How It Works

### Flow Diagram

```
┌─────────────────┐
│  Mobile App     │
│   (Expo)        │
└────────┬────────┘
         │
         │ 1. Starts Discovery/Attestation
         │ 2. Opens Custom Tab for signing
         │ 3. Gets attestation token
         │
         ├──────────────────────────────────┐
         │                                  │
         ▼                                  ▼
    ┌──────────────────────────────┐  ┌──────────────┐
    │ This Backend                 │  │ Attest UI    │
    │ (naira-bank-mobile-backend)  │  │ (Frontend)   │
    │ Port: 3007                   │  │              │
    │ /api/auth/login              │  │ - Discovery  │
    └──────┬───────────────────────┘  │ - Attestation│
           │                           └──────────────┘
           │ 4. POST /api/auth/login
           │    + X-Attestation-Token header
           │
           ▼
    ┌──────────────────────────────┐
    │ Attest Backend               │
    │ (attest/backend)             │
    │ Port: 4000                   │
    │                              │
    │ ├─ Verify Attestation        │
    │ ├─ Identify User             │
    │ └─ Get Forge Properties      │
    └──────────────────────────────┘
           │
           │ 5. Return user data + forge contributions
           │
    ┌──────┴───────────────────────┐
    │                              │
    ▼                              ▼
┌─────────────────────────┐  ┌──────────────────┐
│ Mobile Backend          │  │ Attest Database  │
│ (this service)          │  │ (MongoDB)        │
│ - Validates token       │  │ - Signatures     │
│ - Gets forge props      │  │ - User Data      │
│ - Returns user data     │  │ - Forge Props    │
└────────┬────────────────┘  └──────────────────┘
         │
         │ 6. Return success + user + forge properties
         │
         ▼
    Mobile App Dashboard
    ├─ User Profile
    ├─ Account Info
    └─ Forge Properties (firstName, lastName, phone, etc.)
```

## API Endpoint Details

### POST /api/auth/login

**Request:**
```bash
curl -X POST http://localhost:3007/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Attestation-Token: <JWT_FROM_MOBILE_SDK>"
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Authentication successful",
  "token": "mock_token_abc123...",
  "user": {
    "id": "user_68f623542b24b29c963f90df",
    "keyId": "MSfd3IJppF5DPS6l4lWCe35VTQU",
    "signatureId": "sig_123456789",
    "discoveryId": "disc_123456789",
    "accountNumber": "1234567890",
    "accountType": "Personal",
    "forgeContributions": [
      {
        "forgePropertyId": "firstName",
        "sources": {
          "nimc": { "value": "John" }
        }
      },
      {
        "forgePropertyId": "lastName",
        "sources": {
          "nimc": { "value": "Doe" }
        }
      }
    ]
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Missing X-Attestation-Token header"
}
```

## Troubleshooting

### "Cannot reach http://localhost:4000"
- Make sure Attest Backend is running
- Check the `ATTEST_API_URL` is correct

### "Attestation verification failed"
- The token may be invalid or expired
- Check mobile app logs for token generation issues
- Verify the token is being sent in the correct header

### Mobile app shows network error
- Check mobile app's `EXPO_PUBLIC_API_URL` is set correctly
- Ensure CORS is configured properly
- On physical device, use machine IP instead of localhost

### Database connection errors
- The Attest Backend database must be running
- Check MongoDB connection in Attest Backend

## Development Tips

### View Real-time Logs
```bash
npm run dev
# Logs will show:
# - Attestation verification status
# - Forge property retrieval
# - User identification results
```

### Test with cURL
```bash
# Health check
curl http://localhost:3007/health

# Login with mock token (will fail but shows server is running)
curl -X GET http://localhost:3007/api/auth/login \
  -H "X-Attestation-Token: dummy_token"
```

### Integration Checklist
- [ ] Attest Backend running on http://localhost:4000
- [ ] Mobile Backend running on http://localhost:3007
- [ ] Mobile app has `EXPO_PUBLIC_API_URL=http://localhost:3007` in `.env`
- [ ] Complete a discovery flow in mobile app
- [ ] Complete an attestation flow in mobile app
- [ ] Check Dashboard displays forge properties
