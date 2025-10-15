# PropAd Zimbabwe

PropAd Zimbabwe is a production-ready MVP for a zero-fee property marketplace focused on Zimbabwean renters, buyers, and landlords. Agents are rewarded from an ads-funded pool, listings are verified, and a policy engine blocks fee-based abuse.

## Features
- **FastAPI backend** with JWT auth, policy enforcement, audit logs, reward pool accounting, and admin endpoints.
- **React + Vite PWA frontend** optimised for low-data users, offline caching, and WhatsApp/Facebook sharing funnels.
- **Policy engine** that blocks mentions of viewing fees, tenant registration fees, and 10% sale commissions.
- **Reward pool** management paying agents from platform funds without charging tenants or sellers.
- **Auditable logs** and moderation workflows with transparent admin tools.
- **Dockerised deployment** with Postgres, backend API, and Nginx-served frontend.

## Getting Started

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend expects `VITE_API_BASE_URL` to point to the FastAPI server (defaults to `http://localhost:8000/api/v1`).

### Seed Data
```bash
cd backend
python seed_data.py
```
Creates default admin/agent/landlord accounts with password `PropAd123!` and a verified listing.

### Tests
```bash
cd backend
pytest
```

### Docker Compose
```bash
cd infrastructure
docker compose up --build
```
Services:
- `backend`: FastAPI at `http://localhost:8000`
- `frontend`: Nginx serving the built PWA at `http://localhost:4173`
- `db`: PostgreSQL for production-like data persistence

## Documentation
- [Architecture overview](docs/ARCHITECTURE.md)

## Credentials
Seeded accounts (after running `seed_data.py`):
- Admin: `admin@propad.co.zw`
- Agent: `agent@propad.co.zw`
- Landlord: `landlord@propad.co.zw`
Password for all: `PropAd123!`

## Compliance Promise
- No viewing fees, tenant registration fees, or 10% commissions.
- All moderation events are logged and auditable.
- Agents are compensated from PropAd’s reward pool funded by ads and partners.
