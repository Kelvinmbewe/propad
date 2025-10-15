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

### Startup checklist

Follow this order to boot the full environment after cloning or unpacking the repository:

1. Install dependencies with `npm install` (workspace aware).
2. Copy the sample environment files from `apps/web`, `apps/api`, and `infrastructure` into their runtime names (`.env.local`, `.env`).
3. Apply database migrations via `npx prisma migrate dev` (or `docker compose exec api npx prisma migrate deploy` inside containers).
4. Seed baseline data using `npm --workspace scripts run seed`.
5. Launch Docker Compose from the `infrastructure/` directory or run the API and web workspaces individually using the commands above.

### Create a zipped demo artifact

Package the repository (excluding build outputs and dependencies) into a timestamped zip that you can hand over to reviewers:

```bash
npm --workspaces=false run artifact
```

The archive is written to `dist/` and contains everything required to run the Docker stack or development servers after extraction.

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
