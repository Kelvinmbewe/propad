# PropAd Zimbabwe Monorepo

This repository contains the PropAd Zimbabwe platform implemented as a TypeScript-first monorepo. It includes a progressive web application for end users, a NestJS API, shared packages, infrastructure as code, and documentation.

## Structure

```
apps/
  web/        Next.js 14 PWA with Tailwind, shadcn/ui, React Query, and NextAuth
  api/        NestJS API server exposing REST endpoints with JWT auth and RBAC
packages/
  config/     Shared runtime + build-time configuration
  sdk/        Typed API client used by the frontend
  ui/         Reusable UI primitives shared across apps
prisma/       Prisma schema and migrations
infrastructure/ Docker + docker-compose setup for local development
scripts/      Seed and maintenance scripts
```

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+
- Docker (for running the full stack)

### Installation

```bash
npm install
```

### Running the stack locally

1. Copy environment templates:
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   cp apps/api/.env.example apps/api/.env
   cp infrastructure/.env.example infrastructure/.env
   ```
2. Start services with Docker Compose:
   ```bash
   cd infrastructure
   docker compose up --build
   ```
3. Run the web app in development mode:
   ```bash
   npm --workspace apps/web run dev
   ```
4. Run the API in watch mode:
   ```bash
   npm --workspace apps/api run start:dev
   ```

### Seeding

Populate the database with baseline roles and demo data:
```bash
npm --workspace scripts run seed
```

### Testing

- Web unit tests: `npm --workspace apps/web run test`
- API unit tests: `npm --workspace apps/api run test`
- Shared packages: `npm --workspaces run lint`

End-to-end Playwright tests are planned under `apps/web/tests/e2e`.

## Documentation
Comprehensive documentation lives under `docs/`:
- `SETUP.md` – Local environment setup details
- `ARCHITECTURE.md` – System design and domain architecture
- `API.md` – REST API contract
- `SECURITY.md` – Security model, RBAC, and compliance notes

## Contributing
Pull requests are welcome! Please ensure tests pass and follow the repository linting rules before submitting changes.
