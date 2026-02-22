# Company Profile RBAC

## Public endpoints

- `GET /v1/companies/:id`
- `GET /v1/companies/:id/summary`

These responses only include public company fields (name, description, listings, reviews, trust score). KYC identity, documents, and audit logs are never returned.

## Admin endpoints (RBAC enforced)

- `GET /v1/admin/companies/:id/kyc` (ADMIN, VERIFIER, MODERATOR)
- `POST /v1/admin/companies/:id/kyc/action`
- `POST /v1/admin/documents/:id/verify`
- `GET /v1/admin/documents/:id/signed`

These endpoints return sensitive KYC identity and document metadata. Document access is gated by signed URLs (`/v1/admin/documents/:id/file`).

## Signed document access

- Signed URLs are generated server-side and expire.
- Access requires a valid signature + expiry; no public endpoint exposes raw document paths.

## UI behavior

- Public users see marketing + trust content only.
- Admin/Verifier/Moderator sessions see the KYC tab with identity + documents + audit log.
