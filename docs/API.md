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

## Properties

### `GET /properties/search`

Public endpoint returning verified listings. Supported query params:

- `type` (`ROOM`, `COTTAGE`, `HOUSE`, `PLOT`, `SALE`)
- `suburb`
- `city`
- `priceMin`
- `priceMax`
- `limit` (default 20, max 50)

Returns an array of property objects including up to three media items each.

### `GET /properties/:id`

Returns full property details for verified listings. Responds with `404` if the listing is not verified or missing.

## Advertising

### `POST /ads/impressions`

Records an ad view with optional `propertyId`, `userId`, and `source` metadata.

Request body:

```json
{
  "route": "/listings",
  "sessionId": "c0ffee-session",
  "source": "feed",
  "propertyId": "clx..."
}
```

Response includes the stored impression and the `revenueMicros` estimate (auto-populated in non-production environments).

## Shortlinks

### `POST /shortlinks`

Creates a tracked shortlink for any URL with optional UTM metadata.

### `GET /shortlinks/:code`

Returns the shortlink record, including the original `targetUrl`.

### `POST /shortlinks/:code/click`

Increments the click counter and, for WhatsApp-sourced links with a `propertyId`, automatically creates a `Lead` record attributed to `WHATSAPP`.

## WhatsApp Bot

### `POST /whatsapp/inbound`

Accepts `{ "from": "2637...", "message": "rooms in Budiriro under 150" }` and responds with a canned reply plus up to three listing previews containing shortlinks to the property pages.

## Facebook Auto-poster

### `POST /facebook/publish`

Publishes a preview message and PropAd shortlink to the configured Facebook Page and optional groups. When Facebook credentials are not present the endpoint returns a simulated payload so operators can verify copy.

## Health

### `GET /health`

Public health check returning `{ "status": "ok" }`.

## Error handling

Errors follow NestJS defaults with JSON payloads containing `statusCode`, `message`, and `error` fields.
