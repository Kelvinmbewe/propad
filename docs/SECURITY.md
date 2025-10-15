# Security & Compliance

PropAd is built with renter safety and fee-free access in mind. The following controls are implemented or planned.

## Authentication & Authorisation

- **NextAuth** handles email magic links and Google OAuth for the web app.
- **JWT** secures API endpoints with a 15-minute access token.
- **RBAC** roles (`ADMIN`, `VERIFIER`, `AGENT`, `LANDLORD`, `USER`) restrict sensitive routes using Nest guards and client-side helpers.

### RBAC matrix (API surface)

| Capability | Admin | Verifier | Agent | Landlord | Public/User |
| --- | --- | --- | --- | --- | --- |
| Login / refresh (`/auth/*`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Metrics dashboard | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create/update properties | ✅ | ❌ | ✅ (own) | ✅ (own) | ❌ |
| Submit for verification | ✅ | ❌ | ✅ (own) | ✅ (own) | ❌ |
| Verification queue & decisions | ✅ | ✅ | ❌ | ❌ | ❌ |
| Reward event creation | ✅ | ❌ | ❌ | ❌ | ❌ |
| Reward history (self) | ✅ | ❌ | ✅ | ❌ | ❌ |
| Promo creation | ✅ | ❌ | ✅ | ❌ | ❌ |
| Promo activation / rebates | ✅ | ❌ | ❌ | ❌ | ❌ |
| Lead analytics | ✅ | ❌ | ✅ | ❌ | ❌ |
| Payout request | ✅ | ❌ | ✅ (self) | ❌ | ❌ |
| Payout approval / mark paid | ✅ | ❌ | ❌ | ❌ | ❌ |
| Admin strikes, exports, feature flags | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ads, shortlinks, WhatsApp inbound | ✅ | ✅ | ✅ | ✅ | ✅ |
| Health probe | ✅ | ✅ | ✅ | ✅ | ✅ |

Role enforcement is centralised via `JwtAuthGuard` and `RolesGuard`, with decorators ensuring compile-time discoverability.

## Rate limiting

- **Global throttle:** `ThrottlerModule` configured at `ttl=60s`, `limit=120` requests per key.
- **Key derivation:** `RateLimitGuard` hashes the caller’s IP (`x-forwarded-for` aware) plus authenticated user ID, providing stricter limits for multi-login abuse.
- **Burst mitigation:** Sensitive POST routes (auth, leads, ads) inherit the same guard; adjust per-route throttles with `@SkipThrottle()` or custom metadata when needed.

## Banned phrases & policy strikes

- **Trigger phrases:** Listings are scanned for banned fee language such as “viewing fee”, “tenant registration fee”, and excessive commission claims. The policy engine (planned for integration with the listings service) raises `PolicyStrike` records with reasons mapped to the Prisma enum: `VIEWING_FEE`, `SCAM`, `MISREPRESENTATION`.
- **Strike actions:** Admins can issue manual strikes via `POST /admin/strikes`, recording severity, notes, and reason. Strikes increase the agent’s `strikesCount` and surface in the admin backlog.
- **Content hygiene:** Seed data includes sample strikes to validate dashboards; future work involves integrating NLP classifiers to expand the banned phrase list and escalate repeat offenders.

## Audit logging coverage

Audit trails are persisted through `AuditService`, invoked by the following modules:

| Domain | Events logged |
| --- | --- |
| Properties | `property.create`, `property.update`, `property.delete`, `property.submitForVerification`, media upload signing |
| Verifications | `verification.approve`, `verification.reject` (with verification IDs & outcomes) |
| Admin | `admin.strike`, `admin.featureFlag` |
| Rewards | `reward.create` |
| Promos | `promo.create`, `promo.activate`, `promo.rebate` |
| Leads | `lead.create`, `lead.statusChange` |
| Payouts | `payout.request`, `payout.approve`, `payout.markPaid`, `payout.webhook` |

Each log captures `actorId` when available, target identifiers, and contextual metadata for forensic analysis.

## Data protection

- **PostgreSQL** stores application data; Prisma migrations provide schema auditing.
- **S3-compatible storage** (MinIO/R2) holds media via signed URLs to avoid exposing credentials.
- **Redis** caches non-sensitive data and powers background queues.

## Logging & monitoring

- **Pino HTTP logs** include request IDs for traceability.
- **Audit logs** persist sensitive actions such as moderation events and reward disbursements.
- `/health` endpoint supports uptime checks; Prometheus metrics integration is planned.

## Compliance posture

- Policy engine prohibits listings mentioning viewing fees, tenant registration fees, or 10% sale commissions (to be enforced in listings module).
- Magic link flows and Google sign-in reduce password reuse risks.
- Seeded accounts use strong defaults (`PropAd123!`) for demo only; rotate secrets in production.

## Hardening recommendations

- Enable HTTPS termination (e.g., via Nginx or Cloudflare) in production.
- Configure rate limiting and IP allowlists for admin routes.
- Add Web Application Firewall (WAF) rules blocking fee-based keyword abuse at the edge.
- Integrate with a monitoring stack (Grafana/Loki/Prometheus) for security observability.
