# Setup Guide

This guide walks through configuring the PropAd monorepo for local development or demo environments. Follow the **Quick start** section for the fastest bootstrap, then review the remaining steps for manual workflows and troubleshooting.

## Quick start (single command)

With Docker Desktop/Engine running, start the entire stack – database, cache, MinIO, API, and web – from the repo root:

```bash
cd infrastructure
docker compose up --build
```

The compose file waits for Postgres and Redis before booting the API and web containers. Initial builds take ~5 minutes; subsequent runs reuse cached images. Once healthy, navigate to `http://localhost:3000` for the PWA and `http://localhost:3001/health` for the API heartbeat.

If you received a zipped artifact produced with `npm --workspaces=false run artifact`, unzip it, `cd` into the extracted folder, and execute the same command from the `infrastructure/` directory after copying the sample environment files referenced below.

## Workstation prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop or Docker Engine with Compose V2
- OpenSSL (bundled on macOS/Linux) for signing upload URLs

Install workspace dependencies if you intend to run services outside Docker:

```bash
npm install
```

> Tip: regenerate a fresh handover package with `npm --workspaces=false run artifact` – the command writes `dist/propad-<timestamp>.zip` which excludes `node_modules` and cached build outputs for a clean transfer.

## Environment variables

Copy the example environment files and adjust values as needed:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cp infrastructure/.env.example infrastructure/.env
```

Key variables:

- `DATABASE_URL` – Postgres connection string (default uses `postgres://propad:propad@localhost:5432/propad`).
- `REDIS_URL` – Redis endpoint (default `redis://localhost:6379`).
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` – MinIO credentials for media uploads.
- `REWARD_POOL_SHARE` – Fraction of promo revenue credited to the agent reward pool.

## Database migrations & Prisma client

When running locally (outside Compose) ensure your Postgres server is up, then apply migrations and generate the Prisma client:

```bash
npx prisma migrate dev
npx prisma generate
```

You can run the same commands inside the API container:

```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma generate
```

## Seed demo data

Populate the database with agents, landlords, listings, and verification history:

```bash
npm --workspace scripts run seed
```

The seed script provisions the following high-privilege accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@propad.co.zw` | `Admin@123` |
| Verifier | `verifier1@propad.co.zw` | `PropAd123!` |
| Agent | `agent1@propad.co.zw` | `PropAd123!` |

> Rotate credentials before any public demo or production deployment.

## Running the apps individually

If you prefer to run services outside Docker (for faster feedback loops):

```bash
npm --workspace apps/api run start:dev
npm --workspace apps/web run dev
```

The API expects Postgres, Redis, and MinIO to be available (use the Compose file or local services). The web app proxies API calls to `http://localhost:3001` by default; adjust `NEXT_PUBLIC_API_BASE_URL` if necessary.

## Testing

- API unit tests: `npm --workspace apps/api run test`
- Web unit tests: `npm --workspace apps/web run test`
- Playwright journeys (web): `cd apps/web && npx playwright test`

## Troubleshooting

- **Docker resources** – Allocate at least 4GB RAM and 2 CPUs to Docker Desktop for smooth builds.
- **Prisma migrate conflicts** – Reset local state with `npx prisma migrate reset` (drops the database).
- **Port collisions** – Update `docker-compose.yml` port mappings or stop conflicting services before running Compose.
