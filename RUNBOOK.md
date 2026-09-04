# VendorIQ execution and architecture guide

VendorIQ is a browser-based procurement workspace. It tracks suppliers,
purchase orders, contracts, measured supplier performance, reliability scores,
and CSV reports.

## Run with Docker (recommended)

Requirements: Docker Desktop running.

1. Open the VendorIQ project folder in File Explorer.
2. Make sure Docker Desktop says **Engine running**.
3. Double-click `START_VENDORIZ.bat`.
4. Wait for the message **API health check passed**.
5. Open `http://localhost:18080`; API documentation is at
   `http://localhost:18081/docs`.

The launcher also removes an older **VendorIQ-only** Docker stack that used
port `8080`. It does not stop the Brain Fog project, whose Compose project is
named `mindful-mind-main` and uses ports `5173` and `8010`.

Postgres and Redis are intentionally not published to the host. The FastAPI
container runs `alembic upgrade head` before it starts, so a fresh database is
created automatically and existing databases receive the latest migration.

To stop the stack, press Ctrl+C and run `docker compose down`. Add `-v` only
when you deliberately want to delete all local database data.

## First-time setup

VendorIQ has **one sign-in page** and six accounts.  The account role selects
the matching dashboard automatically after login.  The supplied local Docker
setup creates these demonstration accounts on startup; the password for each
is `Demo12` (six characters):

| Dashboard | Email |
| --- | --- |
| Administrator | `demo.admin@vendoriq-app.org` |
| Procurement Manager | `demo.procurement@vendoriq-app.org` |
| Supply Chain Manager | `demo.supplychain@vendoriq-app.org` |
| Vendor | `demo.vendor@vendoriq-app.org` |
| Finance Officer | `demo.finance@vendoriq-app.org` |
| Auditor | `demo.auditor@vendoriq-app.org` |

The same local-demo setting creates idempotent supporting business records so
the dashboards are populated immediately. The external DataCo CSV is not
bundled or silently downloaded; import it from **Data Management** when you
have downloaded it from Kaggle.

You can also create another role account from
`http://localhost:18080/register.html`; choose the role in the dropdown. The
local demonstration workspace accepts passwords with at least six characters.
For a real deployment, disable `SEED_DEMO_ACCOUNTS` and use a stronger policy.

## Local non-Docker run

Install PostgreSQL, create a `vendoriq` database, and make a backend `.env`
from `backend/.env.example`. Its `DATABASE_URL` must point at your local
database instead of the Docker hostname. Then:

```powershell
cd C:\Users\Manasa\Documents\Codex\2026-08-04\a\vendoriq\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 18081
```

In a second terminal:

```powershell
cd C:\Users\Manasa\Documents\Codex\2026-08-04\a\vendoriq\frontend-web
python -m http.server 18080
```

## Tests and health checks

```powershell
cd C:\Users\Manasa\Documents\Codex\2026-08-04\a\vendoriq\backend
pytest -q
```

For a running environment, use `GET http://localhost:18081/health`. Swagger
provides authenticated, interactive checks for every API at `/docs`.

For a reproducible local response-time check after the API health check passes:

```powershell
cd C:\Users\Manasa\Documents\Codex\2026-08-04\a\vendoriq\backend
python scripts\load_test.py --requests 200 --concurrency 20
```

Record the output in your evaluation report. This script measures `/health`
without storing credentials; it does not claim to prove 1,000 concurrent users.
A formal 1,000-user benchmark needs a dedicated target environment and a load
tool such as k6 or Locust.

## How it works internally

1. The static frontend loads HTML/CSS/JavaScript from Nginx. `api.js` adds the
   stored JWT as an Authorization Bearer token to each protected request.
2. FastAPI validates the JWT, obtains the user from PostgreSQL, and applies
   role checks. Vendor-role accounts are additionally constrained to the
   single vendor referenced by `users.vendor_id`.
3. Pydantic validates request shapes before SQLAlchemy makes database changes.
   Alembic owns schema history; the application does not create tables at
   runtime.
4. Purchase orders use the enforced sequence `pending -> approved -> ordered
   -> delivered -> completed`, or cancellation before completion. A delivered
   PO requires its actual delivery date. Totals are calculated by the server
   using fixed two-decimal decimal values.
5. New performance records and changed contracts invoke the reliability service.
   Delivery contributes 30%, quality 25%, completion 20%, responsiveness 15%,
   and compliance 10%. Missing measures are neutral (50); a submitted zero is
   a real result. The computed score is persisted to the vendor record.
6. A PO status update writes an in-app notification for its requester. Reports
   query only records the caller is authorized to see and stream CSV files to
   the browser.
7. The six dashboard pages request role-scoped dashboard summaries from the
   API. Their period, vendor, and reliability-risk filters cause a fresh
   PostgreSQL query; vendor accounts receive only records linked to their own
   `users.vendor_id`.
8. Vendor approval, delivery-delay, contract-expiry, and paid-invoice events
   create durable in-app notifications. If root `.env` has valid SMTP values,
   the same event is sent by email without blocking the operational update.

## What users see externally

- **Role dashboards:** six different workspaces for administration,
  procurement, supply chain, vendors, finance, and audit. Cards, charts,
  tables, risk filters, and navigation change by role.
- **Vendors:** supplier records, categories, reliability gauges, approval actions.
- **Purchase orders:** creation, server-calculated totals, and status changes.
- **Contracts:** start/end dates, compliance, automatic expiry classification.
- **Reports:** rankings plus authenticated CSV downloads for vendors and POs.

## Security model and limitations

- Passwords are bcrypt hashes; plaintext passwords are never stored.
- JWT signatures require an operator-provided secret and expire after eight hours.
- Docker keeps database and Redis ports private. Do not expose them without a
  firewall, credentials, backups, and TLS plan.
- Redis and Celery dependencies are installed as extension points; this local
  release does not yet use background jobs. SMTP email is optional (configure
  the root `.env`); SMS and SSO need organisation-owned providers. Activity
  logs are available for administrator and auditor review, but a regulated
  deployment still needs a formal retention, backup, encryption, and access
  review policy.

## Optional SMTP setup

In the root `.env`, set `SMTP_ENABLED=true`, then provide `SMTP_HOST`,
`SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, and `SMTP_FROM_EMAIL`. Gmail
uses `smtp.gmail.com`, port `587`, TLS, and a Google App Password. Restart
`START_VENDORIZ.bat` after editing `.env`. Keep `.env` private and do not
upload it to GitHub.
