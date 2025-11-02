# Naira Bank Mobile Backend

Backend service for the Naira Bank Mobile app with Attestation support. This minimal Express server validates attestation tokens and returns user data enriched with forge properties from the Attest Backend SDK.

## Features

- ✅ Attestation token validation using Attest Backend SDK
- ✅ User identification with forge properties
- ✅ CORS support for mobile app requests
- ✅ Health check endpoint
- ✅ Error handling and logging

## Setup

### Prerequisites

- Node.js >= 18.0.0
- Running Attest Backend (default: `http://localhost:4000`)

### Installation

```bash
npm install
```

### Configuration

Copy `env.example` to `.env` and configure:

```bash
cp env.example .env
```

Environment variables:

- `PORT` - Server port (default: 3007)
- `NODE_ENV` - Environment (development/production)
- `ATTEST_API_URL` - Attest Backend API URL (default: http://localhost:4000)
- `CORS_ORIGIN` - CORS origin (default: *)

## Running

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

### Build Check

```bash
npm run build
```

## API Endpoints

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "naira-bank-mobile-backend"
}
```

### GET /api/auth/login

Mobile app login endpoint with attestation validation.

**Required Headers:**
- `X-Attestation-Token` - JWT token from mobile attestation flow

**Response (Success):**
```json
{
  "success": true,
  "message": "Authentication successful",
  "token": "mock_token_...",
  "user": {
    "id": "user_...",
    "keyId": "...",
    "signatureId": "...",
    "discoveryId": "...",
    "accountNumber": "1234567890",
    "accountType": "Personal",
    "forgeContributions": [
      {
        "forgePropertyId": "firstName",
        "sources": {
          "nimc": { "value": "John" }
        }
      }
    ]
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Missing X-Attestation-Token header"
}
```

## Integration with Mobile App

The mobile app should:

1. Complete attestation flow to get `attestationToken`
2. Send POST/GET request to `/api/auth/login` with header:
   ```
   X-Attestation-Token: <attestationToken>
   ```
3. Backend validates token against original API call
4. Backend retrieves user data from forge properties
5. Response includes `user.forgeContributions` for display

## Architecture

```
Mobile App
    ↓
    └─→ /api/auth/login (with X-Attestation-Token header)
            ↓
        Backend (this service)
            ↓
        Attest SDK
            ├─→ verifyAttestation()
            └─→ identifyUser() → Forge Properties
            ↓
        Return enriched user data
```

## License

MIT
