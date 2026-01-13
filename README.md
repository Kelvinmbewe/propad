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
- pnpm 10+ (install via Corepack with `corepack enable`)
- Docker (for running the full stack)

### Installation

```bash
corepack enable
pnpm install
```

### Running the stack locally

1. Copy environment templates:
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   cp apps/api/.env.example apps/api/.env
   cp infrastructure/.env.example infrastructure/.env
   ```
   *Tip: Ensure your `.env` files contain the correct database credentials found in `infrastructure/docker-compose.yml`.*

2. Start services with Docker Compose:
   ```bash
   cd infrastructure
   docker compose up --build
   ```

3. Run the web app in development mode (optional, if not using Docker for web):
   ```bash
   pnpm --filter apps/web dev
   ```

4. Run the API in watch mode (optional, if not using Docker for api):
   ```bash
   pnpm --filter apps/api start:dev
   ```

### Startup checklist

Follow this order to boot the full environment after cloning or unpacking the repository:

1. Install dependencies with `pnpm install` (workspace aware).
2. Copy the sample environment files into their runtime names (`.env.local`, `.env`) and verify DB credentials match `infrastructure/docker-compose.yml`.
3. Launch Docker Compose from the `infrastructure/` directory: `cd infrastructure && docker compose up -d`.
4. Apply database migrations (inside API container):
   ```bash
   docker compose exec api pnpm prisma migrate deploy
   ```

5. Seed baseline database state (canonical Prisma seed):
   ```bash
   docker compose exec api pnpm prisma db seed
   ```
6. Access the web application at `http://localhost:3000`.

**Important**: If you encounter login errors like "An error occurred", ensure your local database schema is synced and seeded.

### Database Management

- **Migration**: Use `npx prisma migrate dev` to create and apply migrations for schema changes.
- **Push**: Use `npx prisma db push` to push the schema state to the database without creating a migration file. This is useful for rapid local development or fixing schema drift (e.g., missing columns).
- **Studio**: Run `npx prisma studio` to view and edit database content via a GUI.

### Seeding (baseline)

Populate the database with the baseline schema state using Prisma’s canonical seed entrypoint:

```bash
docker compose exec api pnpm prisma db seed
```

- Prisma schema: `apps/api/prisma/schema.prisma`
- Seed entrypoint: `apps/api/prisma/seed.js`
- Seeds are idempotent and safe to run multiple times.

> Optional demo or randomized data may be layered on top via scripts, but Prisma seed is the required baseline for all environments.

### Create a zipped demo artifact

Package the repository (excluding build outputs and dependencies) into a timestamped zip that you can hand over to reviewers:

```bash
pnpm run artifact
```

The archive is written to `dist/` and contains everything required to run the Docker stack or development servers after extraction.

### Testing

- Web unit tests: `pnpm --filter apps/web test`
- API unit tests: `pnpm --filter apps/api test`
- Shared packages: `pnpm --recursive lint`

End-to-end Playwright tests are planned under `apps/web/tests/e2e`.

## Documentation
Comprehensive documentation lives under `docs/`:
- `SETUP.md` – Local environment setup details
- `ARCHITECTURE.md` – System design and domain architecture
- `API.md` – REST API contract
- `SECURITY.md` – Security model, RBAC, and compliance notes

## Contributing
Pull requests are welcome! Please ensure tests pass and follow the repository linting rules before submitting changes.
