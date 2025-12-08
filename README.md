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
2. Start services with Docker Compose:
   ```bash
   cd infrastructure
   docker compose up --build
   ```
3. Run the web app in development mode:
   ```bash
   pnpm --filter apps/web dev
   ```
4. Run the API in watch mode:
   ```bash
   pnpm --filter apps/api start:dev
   ```

### Startup checklist

Follow this order to boot the full environment after cloning or unpacking the repository:

1. Install dependencies with `pnpm install` (workspace aware).
2. Copy the sample environment files from `apps/web`, `apps/api`, and `infrastructure` into their runtime names (`.env.local`, `.env`).
3. Apply database migrations via `npx prisma migrate dev` (or `docker compose exec api npx prisma migrate deploy` inside containers).
4. Seed baseline data using `pnpm --filter @propad/scripts seed`.
5. Launch Docker Compose from the `infrastructure/` directory or run the API and web workspaces individually using the commands above.
6. **Important**: If you encounter login errors like "An error occurred", your local database schema might be out of sync. Run `npx prisma db push` from the root or `apps/web` to synchronize it.

### Database Management

- **Migration**: Use `npx prisma migrate dev` to create and apply migrations for schema changes.
- **Push**: Use `npx prisma db push` to push the schema state to the database without creating a migration file. This is useful for rapid local development or fixing schema drift (e.g., missing columns).
- **Studio**: Run `npx prisma studio` to view and edit database content via a GUI.


### Create a zipped demo artifact

Package the repository (excluding build outputs and dependencies) into a timestamped zip that you can hand over to reviewers:

```bash
pnpm run artifact
```

The archive is written to `dist/` and contains everything required to run the Docker stack or development servers after extraction.

### Seeding

Populate the database with baseline roles and demo data:
```bash
pnpm --filter @propad/scripts seed
```

**Default Credentials:**
- **Admin**: `admin@propad.co.zw` / `Admin@123`
- **Agents**: `agent1@propad.co.zw` through `agent30@propad.co.zw` / `PropAd123!`
- **Landlords**: `landlord1@propad.co.zw` / `PropAd123!`
- **Verifiers**: `verifier1@propad.co.zw` / `PropAd123!`

*Note: The seed script uses `upsert` but does **not** update passwords for existing users. If you cannot log in with the default password, it may have been changed manually or seeded differently previously.*

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
