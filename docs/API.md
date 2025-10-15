# API Reference

The API is hosted by the NestJS application in `apps/api`. All endpoints are prefixed with `/` and secured by JWT unless noted.

## Authentication

### `POST /auth/login`

Request body:
```json
{
  "email": "user@example.com",
  "password": "PropAd123!"
}
```

Response:
```json
{
  "accessToken": "<jwt>",
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "role": "AGENT"
  }
}
```

Use the returned JWT as `Authorization: Bearer <token>` for subsequent requests.

## Metrics

### `GET /metrics/dashboard`

Requires roles: `ADMIN`, `VERIFIER`, `AGENT`, or `LANDLORD`.

Response:
```json
{
  "activeListings": 12,
  "pendingVerifications": 3,
  "rewardPoolUsd": 5000
}
```

## Health

### `GET /health`

Public health check returning `{ "status": "ok" }`.

## Error handling

Errors follow NestJS defaults with JSON payloads containing `statusCode`, `message`, and `error` fields.
