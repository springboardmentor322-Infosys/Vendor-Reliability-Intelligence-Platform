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

- Frontend: http://localhost:18080
- Backend API: http://localhost:18081
- Interactive API docs (Swagger UI): http://localhost:18081/docs

The local Docker setup creates a demonstration account for each of the six
roles.  Sign in at http://localhost:18080 with any email below and password
`Demo12`: `demo.admin@vendoriq-app.org`, `demo.procurement@vendoriq-app.org`,
`demo.supplychain@vendoriq-app.org`, `demo.vendor@vendoriq-app.org`,
`demo.finance@vendoriq-app.org`, or `demo.auditor@vendoriq-app.org`.
Each account opens its own role dashboard.  You may also register a new
account from http://localhost:18080/register.html and choose its role.

The supplied local Docker mode also creates idempotent supporting business
records (vendors, products, orders, deliveries, invoices, contracts, quality
inspections and performance history), so all six dashboards have meaningful
PostgreSQL data on a fresh demonstration run. It does **not** copy or download
the external DataCo CSV; import that primary dataset separately from **Data
Management** when you have downloaded it from Kaggle.

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

uvicorn app.main:app --reload --port 18081
```

### 3. Frontend
No build step needed — it's static files. Serve them with any simple HTTP
server (opening the HTML files directly via `file://` will NOT work, because
the browser blocks the API requests):
```bash
cd frontend-web
python3 -m http.server 18080
```
Then open http://localhost:18080

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
- **Predictive delivery-risk watch** — forecasts each vendor's next-delivery
  delay probability from their stored delivery history using a documented
  smoothed statistical model. It is intentionally presented as a forecast, not
  as a trained ML model; it can be replaced by supervised ML after enough
  labelled organisation history has accumulated.
- **Contracts & Compliance** — tracking with auto-derived status
  (active / expiring soon / expired) based on dates
- **Notifications** — in-app notifications (e.g. on PO status changes)
- **Email notifications (SMTP)** — optional email delivery for vendor approval,
  delayed delivery, contract-expiry, and paid-invoice events. PostgreSQL
  notifications remain available even when SMTP is not configured.
- **Reports & Export** — CSV, Excel, and PDF vendor-performance exports,
  purchase-order and contract reports, plus a reliability ranking view
- **Dashboards & Metrics** — six role dashboards, overview stats, recent
  vendors, reliability ranking, risk recommendations, and calculated metrics

## SMTP email setup (optional)

Email is off by default, so the project runs without any personal mail
credentials. To enable it, edit the root `.env` file (never commit this file)
and add your mail provider values. For a Gmail account, first enable two-step
verification and create a **Google App Password**; do not use your normal Gmail
password.

```env
SMTP_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-16-character-google-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=VendorIQ
SMTP_USE_TLS=true
SMTP_USE_SSL=false
```

Then restart VendorIQ with `START_VENDORIZ.bat`. The settings are passed only
to the VendorIQ backend container. If no SMTP values are supplied, the alerts
continue to appear inside the Notifications page and the business action still
completes normally.

## What's intentionally left as environment-specific configuration

These need real third-party credentials that only you can provide, so
they're wired as clear extension points rather than guessed at:

- **Cloud deployment (AWS/Azure/Kubernetes)** — the Dockerfile and
  docker-compose.yml work locally as-is; deploying to a specific cloud
  account needs your account details and is a separate, environment-specific
  step.
- **SMS delivery** — SMTP email is supported. SMS needs organisation-owned
  Twilio (or equivalent) credentials and is intentionally not enabled.

## Default local ports

| Service   | Port |
|-----------|------|
| Frontend  | 18080 |
| Backend   | 18081 |
| PostgreSQL| 5432 |
| Redis     | 6379 |

## Current runnable version

Run [START_VENDORIZ.bat](START_VENDORIZ.bat) with Docker Desktop open. VendorIQ
is deliberately isolated on frontend port `18080`, API port `18081`, the
`vendoriq-complete` Docker network, and its own PostgreSQL volume. This lets it
run beside another local Docker project without sharing containers or ports.

For the required primary data source, download the **DataCo Smart Supply Chain
Dataset** CSV from Kaggle and, as an Administrator or Procurement Manager, open
**Data Management** in the app to import it. Supporting vendor, contract,
invoice and quality records are generated automatically in the local demo and
can also be safely regenerated from that page.
