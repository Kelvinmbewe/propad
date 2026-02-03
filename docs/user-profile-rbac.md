# User Profile RBAC

## Public endpoint

- `GET /v1/users/:id`

Public responses include safe profile fields only: name, role, location, trust score, listings, reviews, and affiliation summary. KYC identity and documents are never returned.

## Admin endpoints (RBAC enforced)

- `GET /v1/admin/users/:id/kyc` (ADMIN, VERIFIER, MODERATOR)
- `POST /v1/admin/users/:id/kyc/action`
- `POST /v1/admin/documents/:id/verify`

These endpoints return KYC identity, documents, and audit logs.

## Signed document access

- Documents are accessed via signed URLs and expire.
- No public route exposes raw document paths.

## UI behavior

- Public users see marketing + trust content only.
- Admin/Verifier/Moderator sessions see the KYC tab with identity + documents + audit log.
