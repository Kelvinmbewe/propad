# API Reference

The PropAd REST API is implemented in the NestJS service under `apps/api`. Unless otherwise noted, endpoints require a valid JWT (`Authorization: Bearer <token>`) and respect the global rate limit of **120 requests per minute per IP+user** enforced by `RateLimitGuard`.

All responses are JSON and follow NestJS error conventions (`statusCode`, `message`, `error`).

## Authentication

### `POST /auth/login`
- **Access:** Public
- **Description:** Exchange email/password credentials for a short-lived JWT and user profile.

Request:
```json
{
  "email": "admin@propad.co.zw",
  "password": "Admin@123"
}
```

Response:
```json
{
  "accessToken": "<jwt>",
  "user": {
    "id": "clx1a...",
    "email": "admin@propad.co.zw",
    "role": "ADMIN"
  }
}
```

### `GET /auth/session`
- **Access:** Any authenticated user
- **Description:** Returns the hydrated session and role metadata for the current token.

Response:
```json
{
  "id": "clx1a...",
  "email": "agent1@propad.co.zw",
  "role": "AGENT",
  "name": "Harare Agent 1",
  "phone": "+26377100001"
}
```

### `POST /auth/refresh`
- **Access:** Any authenticated user
- **Description:** Issues a new JWT for the same principal.

Response:
```json
{
  "accessToken": "<new-jwt>",
  "expiresIn": 900
}
```

## Metrics

### `GET /metrics/dashboard`
- **Access:** `ADMIN`, `VERIFIER`, `AGENT`, `LANDLORD`
- **Description:** Returns headline KPIs for the platform.

Response:
```json
{
  "activeListings": 42,
  "pendingVerifications": 7,
  "rewardPoolUsd": 5200.5,
  "leads24h": 18
}
```

## Properties

### `GET /properties/search`
- **Access:** Public
- **Query Params:** `type`, `city`, `suburb`, `priceMin`, `priceMax`, `limit`, `page`
- **Description:** Returns paginated verified listings sorted by promo density, verification date, and recency.

Response:
```json
{
  "items": [
    {
      "id": "clxprop1",
      "type": "HOUSE",
      "price": "750.00",
      "currency": "USD",
      "city": "Harare",
      "suburb": "Borrowdale",
      "bedrooms": 4,
      "bathrooms": 3,
      "amenities": ["Solar", "Borehole"],
      "media": [
        { "id": "clxmedia1", "url": "https://cdn.propad.co.zw/p1.jpg", "kind": "IMAGE" }
      ]
    }
  ],
  "page": 1,
  "perPage": 18,
  "total": 72,
  "totalPages": 4,
  "hasNextPage": true
}
```

### `GET /properties/:id`
- **Access:** Public
- **Description:** Returns a fully hydrated verified listing; `404` if not verified.

### `GET /properties/map/bounds`
- **Access:** Public
- **Query Params:** `southWestLat`, `southWestLng`, `northEastLat`, `northEastLng`, optional `type`
- **Description:** Returns verified listings within map bounds for clustering.

### `POST /properties`
- **Access:** `AGENT`, `LANDLORD`, `ADMIN`
- **Description:** Creates a draft property. Landlords/agents automatically become owners when IDs are omitted.

Request:
```json
{
  "type": "COTTAGE",
  "currency": "USD",
  "price": 420,
  "city": "Harare",
  "suburb": "Greendale",
  "latitude": -17.8,
  "longitude": 31.1,
  "bedrooms": 2,
  "bathrooms": 1,
  "amenities": ["WiFi"],
  "description": "Self-contained cottage with prepaid ZESA."
}
```

Response includes the persisted property with status `DRAFT` and generated IDs.

### `PATCH /properties/:id`
- **Access:** `AGENT`, `LANDLORD`, `ADMIN`
- **Description:** Update mutable fields; enforces ownership unless admin.

### `DELETE /properties/:id`
- **Access:** `AGENT`, `LANDLORD`, `ADMIN`
- **Description:** Soft-deletes a draft or unverified listing.

### `POST /properties/:id/submit`
- **Access:** `AGENT`, `LANDLORD`, `ADMIN`
- **Description:** Moves a property into the verification queue.

### `POST /properties/upload-url`
- **Access:** `AGENT`, `LANDLORD`, `ADMIN`
- **Description:** Generates a signed PUT URL for MinIO uploads (valid 15 minutes). Rejects disallowed mime types / extensions.

Request:
```json
{
  "fileName": "kitchen.jpg",
  "mimeType": "image/jpeg",
  "propertyId": "clxprop1"
}
```

Response:
```json
{
  "key": "properties/clxprop1/fb7c....jpg",
  "uploadUrl": "http://localhost:9000/propad/properties/...",
  "method": "PUT",
  "headers": {
    "Content-Type": "image/jpeg",
    "x-upload-signature": "...",
    "x-upload-expires": "1719939000"
  },
  "expiresAt": "2024-07-02T10:30:00.000Z"
}
```

## Conversations

Messaging routes require membership in the target conversation unless otherwise noted. Soft-deleted or archived records continue to be available to admins for dispute resolution.

### `GET /conversations`
- **Access:** Any authenticated user
- **Query Params:** `status`, `propertyId`, `role`, `cursor`, `limit`
- **Description:** Returns the user's conversations ordered by latest message, filtered by optional status or property.

Response:
```json
{
  "items": [
    {
      "id": "clxconv1",
      "subject": "Enquiry: Borrowdale Cottage",
      "status": "OPEN",
      "propertyId": "clxprop1",
      "lastMessagePreview": "Thanks, I'll attend the viewing",
      "lastMessageAt": "2024-07-02T09:10:00.000Z",
      "participants": [
        { "userId": "clxuser1", "role": "TENANT", "muted": false },
        { "userId": "clxuser2", "role": "AGENT", "muted": false }
      ],
      "unreadCount": 2
    }
  ],
  "cursor": "clxconv1",
  "hasNextPage": false
}
```

### `GET /conversations/:id`
- **Access:** Participant or `ADMIN`
- **Description:** Returns conversation metadata, participants, and latest message snapshot. Includes WA deep link metadata when available.

### `GET /conversations/:id/messages`
- **Access:** Participant or `ADMIN`
- **Query Params:** `before`, `after`, `limit`
- **Description:** Paginates message history in descending `sentAt` order.

Response:
```json
{
  "items": [
    {
      "id": "clxmsg1",
      "senderId": "clxuser1",
      "body": "Can I view on Saturday?",
      "attachments": [],
      "sentAt": "2024-07-02T08:55:00.000Z",
      "deliveredAt": "2024-07-02T08:55:02.000Z",
      "readAt": null
    }
  ],
  "nextCursor": "clxmsg1"
}
```

### `POST /conversations/:id/messages`
- **Access:** Participant
- **Description:** Sends a message with optional attachments. Enforces rate limits and banned-phrase checks; flagged content returns `403` with context.

Request:
```json
{
  "body": "Please find my proof of income attached.",
  "attachments": [
    {
      "key": "conversations/clxconv1/123.pdf",
      "fileName": "proof.pdf",
      "mimeType": "application/pdf",
      "size": 382331
    }
  ],
  "clientMessageId": "temp-uuid-123"
}
```

### `POST /conversations/:id/report`
- **Access:** Participant
- **Description:** Flags the latest offending message with a reason (`SPAM`, `ABUSE`, `SCAM`, `CONTACT_INFO_BREACH`). Creates a `MessageFlag` entry and notifies admins.

### `POST /conversations/:id/read`
- **Access:** Participant
- **Description:** Marks messages up to a given ID as read and emits WebSocket `message.read` events to other participants.

### `POST /conversations/:id/participants`
- **Access:** `ADMIN`
- **Description:** Adds a new participant (e.g. landlord or verifier) to an ongoing thread and backfills unread counts.

### WebSocket events
- `conversation.typing` – emitted when a participant starts/stops typing.
- `conversation.message` – pushed when new messages are persisted (includes server-assigned ID and timestamps for optimistic reconciliation).
- `conversation.delivered` / `conversation.read` – track delivery receipts.
- `conversation.updated` – conversation status or subject updates.

## Verifications

All verification routes require `VERIFIER` or `ADMIN` roles.

### `GET /verifications/queue`
- Returns pending properties with landlord, agent, and media context ordered by submission time.

### `POST /verifications/:id/approve`
- Persists a `Verification` record with result `PASS`, marks property `VERIFIED`, and adds an audit log entry.

Request:
```json
{
  "method": "SITE",
  "notes": "Water meter confirmed on site",
  "evidenceUrl": "https://cdn.propad.co.zw/verification/abc123.jpg"
}
```

### `POST /verifications/:id/reject`
- Archives the property and logs the failure with metadata.

## Rewards

Controller enforces `AGENT` or `ADMIN` by default; certain endpoints escalate to admin-only.

### `POST /rewards/events`
- **Access:** `ADMIN`
- **Description:** Logs a reward event and writes audit metadata.

Request:
```json
{
  "agentId": "clxagent1",
  "type": "LISTING_VERIFIED",
  "points": 15,
  "usdCents": 500,
  "refId": "clxprop1"
}
```

Response returns the created reward event record.

### `GET /rewards/events`
- **Access:** `AGENT` (self) or `ADMIN`
- **Query Params:** optional `agentId`
- **Description:** Lists up to 200 reward events. Agents requesting another agent’s history receive `403`.

### `GET /rewards/pool/summary`
- **Access:** `ADMIN`
- **Description:** Aggregates total points/USD and top earning agents.

### `GET /rewards/agents/:agentId/monthly-estimate`
- **Access:** `AGENT` (self) or `ADMIN`
- **Description:** Returns current month projections for an agent.

Response:
```json
{
  "agentId": "clxagent1",
  "monthStart": "2024-07-01T00:00:00.000Z",
  "projectedUsd": 125.5,
  "projectedPoints": 320,
  "events": 18
}
```

## Promotions

### `POST /promos`
- **Access:** `AGENT`, `ADMIN`
- **Description:** Creates a promo boost with tier, property, and schedule.

### `POST /promos/:id/activate`
- **Access:** `ADMIN`
- **Description:** Forces start of a promo window (updates `startAt`/`endAt`).

### `POST /promos/:id/rebate`
- **Access:** `ADMIN`
- **Description:** Logs a rebate event and writes to the audit log.

Request:
```json
{
  "amountUsdCents": 300,
  "reason": "Service outage credit"
}
```

### `GET /promos/suburb-sorting`
- **Access:** `AGENT`, `ADMIN`
- **Description:** Returns active promo counts per suburb ordered by volume.

## Leads

### `POST /leads`
- **Access:** Public
- **Description:** Captures a lead from web, WhatsApp, Facebook, or shortlink channels.

Request:
```json
{
  "propertyId": "clxprop1",
  "source": "WHATSAPP",
  "contact": "+263773300123",
  "message": "Interested in viewing this weekend"
}
```

Response returns the created lead with attribution metadata.

### `PATCH /leads/:id/status`
- **Access:** `AGENT`, `ADMIN`
- **Description:** Updates lead status (`NEW`, `CONTACTED`, `QUALIFIED`, `CLOSED`) and appends an audit log entry.

### `GET /leads/analytics/summary`
- **Access:** `AGENT`, `ADMIN`
- **Description:** Provides aggregated lead funnel counts by source and status.

## Advertising

### `POST /ads/impressions`
- **Access:** Public (throttled)
- **Description:** Records an ad impression with optional property/user attribution and returns the stored payload.

Request:
```json
{
  "route": "/listings",
  "sessionId": "c0ffee-session",
  "source": "feed",
  "propertyId": "clxprop1"
}
```

Response includes `revenueMicros` (mocked in non-production environments).

## Shortlinks

All endpoints are public for ease of link sharing.

- `POST /shortlinks` – Creates a tracked shortlink with optional UTM fields.
- `GET /shortlinks/:code` – Fetches the shortlink metadata and click counters.
- `POST /shortlinks/:code/click` – Increments click counts and, if associated with a WhatsApp lead, auto-creates a `Lead` entry.

## WhatsApp bot

### `POST /whatsapp/inbound`
- **Access:** Public (validate signature at the edge in production)
- **Description:** Parses inbound text, queries listings, creates shortlinks, and responds with templated copy.

Response:
```json
{
  "reply": "Here are 3 rooms in Budiriro under $150. Tap a link to view full details and contact the landlord.",
  "items": [
    {
      "id": "clxprop1",
      "headline": "Room in Budiriro",
      "priceUsd": 120,
      "bedrooms": 1,
      "bathrooms": 1,
      "shortLink": "https://propad.local/s/abc123",
      "previewImage": "https://cdn.propad.co.zw/media/prop1.jpg"
    }
  ]
}
```

## Facebook auto-poster

### `POST /facebook/publish`
- **Access:** Internal automation (protect via API gateway)
- **Description:** Publishes listing copy to the configured Facebook Page/groups. In local/dev environments, returns a simulated payload for verification.

Response:
```json
{
  "status": "simulated",
  "pageId": "1234567890",
  "message": "New verified property in Borrowdale",
  "link": "https://propad.co.zw/listings/clxprop1"
}
```

## Payouts

### `POST /payouts/request`
- **Access:** `AGENT`, `ADMIN`
- **Description:** Agents (self) or admins (any agent) request a payout; creates `PENDING` record.

Request:
```json
{
  "agentId": "clxagent1",
  "amountUsdCents": 7500,
  "method": "ECOCASH"
}
```

### `POST /payouts/:id/approve`
- **Access:** `ADMIN`
- **Description:** Adds a transaction reference before disbursement.

### `POST /payouts/:id/pay`
- **Access:** `ADMIN`
- **Description:** Marks the payout as `PAID` and logs the action.

### `POST /payouts/webhook`
- **Access:** Public (from payment processor)
- **Description:** Reconciles asynchronous payout notifications using `txRef` and updates status.

Request:
```json
{
  "txRef": "TX-12345",
  "status": "PAID"
}
```

## Admin

All endpoints restricted to `ADMIN` role.

- `POST /admin/strikes` – Creates a `PolicyStrike` against an agent with severity + reason.
- `GET /admin/strikes` – Lists strikes, optionally filtered by `agentId`.
- `POST /admin/feature-flags` – Upserts a feature flag (`key`, `enabled`, `description`).
- `GET /admin/feature-flags` – Enumerates flags for toggling features.
- `GET /admin/exports/properties` – Streams CSV export of recent properties.
- `GET /admin/exports/leads` – Streams CSV export of recent leads.
- `GET /admin/analytics/summary` – Aggregated counts for leadership dashboards.

## Health

### `GET /health`
- **Access:** Public
- **Description:** Lightweight probe returning `{ "status": "ok" }` for uptime checks.
