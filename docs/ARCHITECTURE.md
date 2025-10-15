# PropAd Zimbabwe Architecture

## Overview
PropAd Zimbabwe is a full-stack property marketplace designed for low-data users in Zimbabwe. It provides a FastAPI backend, a React + Vite progressive web app frontend, and infrastructure tooling for containerised deployments.

## Backend
- **Framework:** FastAPI with SQLAlchemy 2.x async ORM.
- **Database:** PostgreSQL in production (SQLite for local tests).
- **Key modules:**
  - `auth.py` handles JWT-based authentication, password hashing, and role enforcement.
  - `routers/` contains feature-specific API endpoints (listings, agents, rewards, inquiries, policy checks, admin tooling).
  - `utils/policy.py` enforces the non-negotiable fee policy with configurable block/flag lists and persistence of policy events.
  - `services/rewards.py` manages the reward pool and payout allocation with audit logging.
  - `models.py` defines core entities such as users, property listings, policy events, reward pools, and audit logs.
- **Security:** JWT authentication, role-based access control, auditable logs, and policy event tracking.
- **Testing:** `pytest` with async fixtures hitting the FastAPI app using an in-memory SQLite database.
- **Seed data:** `seed_data.py` bootstraps default admin/agent/landlord accounts and a sample approved listing.

## Frontend (PWA)
- **Framework:** React 18 with TypeScript and Vite.
- **State/Data:** React Query for data fetching, Zustand for auth state, TailwindCSS for styling.
- **Features:**
  - Hero landing page emphasising the no-fees promise.
  - Listing grid fed by the `/listings` API.
  - Policy badges, reward pool messaging, and WhatsApp/Facebook share links.
  - Agent and admin resource pages.
  - Google AdSense-ready ad banner component, service worker caching, and web manifest icons.

## Infrastructure
- **Docker:** Separate Dockerfiles for backend (FastAPI + Uvicorn) and frontend (Node build + Nginx serve).
- **Compose:** `infrastructure/docker-compose.yml` wires Postgres, backend API, and frontend static hosting.
- **Environment:** `.env.example` files for backend and frontend show required configuration (secret key, database URL, AdSense client ID).

## Logging & Auditability
- Every privileged or state-changing action writes to `audit_logs` via `utils/audit.py`.
- Policy violations are recorded in `policy_events` for traceability.
- Admin endpoints expose audit log retrieval for regulator reviews.

## Reward Pool Mechanics
- Reward pool seeded from configuration (`REWARD_POOL_AMOUNT`).
- Admins allocate payouts using `/rewards/payouts`, automatically reducing the available balance and recording audit entries.

## Deployment Flow
1. Copy `.env.example` to `.env` within `backend/` and adjust secrets.
2. Run `docker compose` from `infrastructure/` to start Postgres, backend API, and frontend PWA.
3. Run `backend/seed_data.py` (optional) to populate demo users and listings.
4. Access the frontend via `http://localhost:4173` and the API via `http://localhost:8000/docs`.

## Testing & Quality
- Run `pytest` from the `backend/` directory for backend validation.
- Run `npm run lint` and `npm run build` from `frontend/` for static analysis and bundle generation.
- Service worker ensures offline caching of the landing page for low-data scenarios.
