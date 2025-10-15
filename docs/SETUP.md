# Setup Guide

This guide walks through configuring the PropAd monorepo for local development.

## 1. Install dependencies

- Node.js 20+
- npm 10+
- Docker Desktop or Docker Engine

Install workspace dependencies:

```bash
npm install
```

## 2. Environment variables

Copy the example environment files and adjust values as needed.

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cp infrastructure/.env.example infrastructure/.env
```

Ensure `DATABASE_URL`, `REDIS_URL`, and S3 credentials reflect your local setup.

## 3. Database setup

Run Prisma migrations and generate the client:

```bash
npx prisma migrate dev
npx prisma generate
```

Seed baseline data (admin, verifier, agent, landlord):

```bash
npm --workspace scripts run seed
```

## 4. Start the stack

Run everything via Docker Compose:

```bash
cd infrastructure
docker compose up --build
```

This exposes services on the following ports:

- Web: http://localhost:3000
- API: http://localhost:3001
- Postgres: 5432
- Redis: 6379
- MinIO: 9000 (console 9001)

Alternatively, start apps individually:

```bash
npm --workspace apps/api run start:dev
npm --workspace apps/web run dev
```

## 5. Testing

- API unit tests: `npm --workspace apps/api run test`
- Web unit tests: `npm --workspace apps/web run test`
- Playwright (web): `npx playwright test` (from `apps/web`)

## 6. Service worker & PWA

The web app registers a service worker in production builds. To test offline caching locally, run `npm run build && npm start` within `apps/web`.
