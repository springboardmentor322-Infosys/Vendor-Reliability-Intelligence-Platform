# VendorIQ — Vendor Reliability Intelligence & Procurement Risk Management Platform

A full-stack platform for evaluating vendor reliability, managing procurement,
and tracking contract compliance — built from the project spec you uploaded.

## Tech stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | Plain HTML, CSS, JavaScript (no build step, no framework) |
| Backend   | FastAPI (Python) |
| Database  | PostgreSQL (via SQLAlchemy + Alembic migrations) |
| Cache/Queue | Redis (wired in, ready for background jobs) |
| Deployment | Docker Compose (Postgres + Redis + FastAPI + Nginx) |

## Project structure

```
vendoriq/
├── backend/
│   ├── app/
│   │   ├── core/         # settings, DB session, security (JWT, password hashing)
│   │   ├── models/       # SQLAlchemy tables: User, Vendor, PurchaseOrder, Contract,
│   │   │                 #   PerformanceRecord, Notification
│   │   ├── schemas/      # Pydantic request/response shapes
│   │   ├── services/     # reliability scoring engine, notification helper
│   │   ├── api/routes/   # auth, vendors, purchase_orders, contracts,
│   │   │                 #   performance, notifications, reports
│   │   └── main.py       # FastAPI app entrypoint
│   ├── alembic/          # versioned DB migrations
│   ├── requirements.txt
│   └── Dockerfile
├── frontend-web/
│   ├── index.html            # login
│   ├── register.html
│   ├── dashboard.html
│   ├── vendors.html
│   ├── purchase-orders.html
│   ├── contracts.html
│   ├── reports.html
│   └── assets/
│       ├── css/style.css     # design system (colors, typography, components)
│       └── js/                # config.js, api.js, auth.js, common.js, + one file per page
└── docker-compose.yml
```

## Quick start (Docker — recommended)

This runs Postgres, Redis, the FastAPI backend, and a static server for the
frontend, all wired together with one command.

```bash
cd vendoriq
docker compose up --build
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:8000
- Interactive API docs (Swagger UI): http://localhost:8000/docs

First time only: create your first user by opening http://localhost:8080/register.html
and signing up (pick "Administrator" as the role so you can approve vendors).

## One-command start (no Docker)

If you've already done the manual setup below once (installed backend deps
and have a Postgres database reachable), use these to start both the
backend and frontend together, in one step:

**Mac / Linux:**
```bash
./start.sh
```

**Windows:**
```
start.bat
```

Both print the URLs to open and stop cleanly (Ctrl+C on Mac/Linux, or just
close the two windows on Windows). `start.sh` also auto-activates
`backend/venv` if it exists, so you don't need to activate it yourself first.

## Running without Docker (manual setup, first time)

### 1. Database
Install PostgreSQL locally, then create the database:
```bash
createdb vendoriq
```
Or point `DATABASE_URL` (see below) at any Postgres instance you already have.

### 2. Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env              # then edit DATABASE_URL / SECRET_KEY as needed

# Apply the database schema
alembic upgrade head

uvicorn app.main:app --reload --port 8000
```

### 3. Frontend
No build step needed — it's static files. Serve them with any simple HTTP
server (opening the HTML files directly via `file://` will NOT work, because
the browser blocks the API requests):
```bash
cd frontend-web
python3 -m http.server 8080
```
Then open http://localhost:8080

> If you serve the frontend on a different port, add that origin to
> `CORS_ORIGINS` in `backend/app/core/config.py` (or via the `.env` file),
> or the browser will block the requests.

## Making schema changes going forward

Don't edit the database by hand. Change a model in `app/models/`, then:
```bash
cd backend
alembic revision --autogenerate -m "describe your change"
alembic upgrade head
```

## What's implemented

- **Auth & RBAC** — JWT login/register, 6 roles (Administrator, Procurement
  Manager, Supply Chain Manager, Vendor, Finance Officer, Auditor), route-level
  permission checks
- **Vendor Management** — registration, categorization, approval workflow
- **Procurement / Purchase Orders** — creation, full status lifecycle
  (pending → approved → ordered → delivered → completed / cancelled)
- **Vendor Reliability Scoring** — transparent weighted-average engine using
  delivery history, quality, completion rate, responsiveness, and contract
  compliance (see `app/services/reliability.py`); recalculates automatically
  whenever new performance data or contracts come in
- **Contracts & Compliance** — tracking with auto-derived status
  (active / expiring soon / expired) based on dates
- **Notifications** — in-app notifications (e.g. on PO status changes)
- **Reports & Export** — CSV export for vendor performance and purchase
  orders (opens directly in Excel), plus a reliability ranking view
- **Dashboards** — overview stats, recent vendors, reliability ranking

## What's intentionally left as configuration, not code

These need real third-party credentials that only you can provide, so
they're wired as clear extension points rather than guessed at:

- **Email/SMS delivery** — `app/services/notifications.py` creates in-app
  notification records; plug an SMTP client or Twilio call in right after
  `db.add(notification)` once you have real credentials.
- **Cloud deployment (AWS/Azure/Kubernetes)** — the Dockerfile and
  docker-compose.yml work locally as-is; deploying to a specific cloud
  account needs your account details and is a separate, environment-specific
  step.
- **PDF export** — CSV export is implemented (opens in Excel); PDF report
  generation can be added on top the same way (e.g. with `reportlab`) if
  you want it.

## Default local ports

| Service   | Port |
|-----------|------|
| Frontend  | 8080 |
| Backend   | 8000 |
| PostgreSQL| 5432 |
| Redis     | 6379 |

## Hardened runnable version

Read [RUNBOOK.md](RUNBOOK.md) before starting the current version. It replaces
the older bootstrap guidance above: copy `.env.example` to `.env`, provide a
unique `SECRET_KEY`, start Docker Compose, and create the first Administrator
through the one-time `/api/v1/auth/setup` endpoint. Public registration no
longer permits selection of an administrator or staff role.
