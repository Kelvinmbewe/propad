# Architecture

PropAd is implemented as a TypeScript monorepo with clearly delineated boundaries between the web PWA, API, shared packages, and infrastructure. The solution is optimised for offline-friendly access, verifiable listings, and zero-fee monetisation.

## High level overview

- **Next.js 14 PWA (`apps/web`)** – App Router, Tailwind, shadcn-inspired UI primitives, React Query for data fetching, NextAuth (email OTP + Google), and a service worker for offline caching.
- **NestJS API (`apps/api`)** – REST API with JWT-based auth, RBAC guards, Prisma ORM, BullMQ queue integration, and Pino structured logging.
- **Shared packages** – `@propad/ui`, `@propad/config`, and `@propad/sdk` provide design system primitives, runtime configuration, and a typed API client.
- **Data layer** – PostgreSQL via Prisma, Redis for caching/queues, MinIO (S3-compatible) for asset storage.
- **Infrastructure** – Docker Compose orchestrates the stack for local development with reproducible environments.

## Backend architecture

The NestJS API exposes modular domains:

- **Auth** – JWT issuance for API access, RBAC decorators and guards, NextAuth compatibility for the web app, and support for OTP (email magic links handled by NextAuth).
- **Listings & verifications** – Prisma models ensure every listing is associated with an owner and a verification entry. The metrics service surfaces dashboard KPIs.
- **Queues** – BullMQ is preconfigured for background jobs like media processing and verification workflows.
- **Logging/Monitoring** – Pino HTTP logs include a request ID, and `/health` provides a health check endpoint for orchestration.

## Frontend architecture

The PWA uses the App Router with nested layouts for marketing pages, authentication, and role-restricted dashboards. React Query coordinates server state and caching, while shadcn-style components from `@propad/ui` ensure consistency. A service worker caches the shell for offline resilience.

Forms rely on `react-hook-form` + `zod` for type-safe validation. RBAC is enforced client-side using helper utilities from `@propad/ui` and server-side through NextAuth session roles.

## Shared packages

- `@propad/ui` – Tailwind-powered components, toast notifications, and styling utilities.
- `@propad/config` – Runtime-safe environment handling for both Next.js and NestJS.
- `@propad/sdk` – Ky-powered REST client with Zod validation for typed usage across apps.

## Data model

Prisma models encode key domain entities: `User`, `Listing`, `Verification`, `RewardPool`, and `AuditLog`. Role enums enforce RBAC across both frontend and backend.

## Future enhancements

- Implement Prometheus metrics exporter for API performance insights.
- Extend BullMQ queues for verification notifications and reward disbursements.
- Add Playwright journeys covering listing creation, verification, and reward payout flows.
