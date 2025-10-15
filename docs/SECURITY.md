# Security & Compliance

PropAd is built with renter safety and fee-free access in mind. The following controls are implemented or planned.

## Authentication & Authorisation

- **NextAuth** handles email magic links and Google OAuth for the web app.
- **JWT** secures API endpoints with a 15-minute access token.
- **RBAC** roles (`ADMIN`, `VERIFIER`, `AGENT`, `LANDLORD`, `USER`) restrict sensitive routes using Nest guards and client-side helpers.

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
