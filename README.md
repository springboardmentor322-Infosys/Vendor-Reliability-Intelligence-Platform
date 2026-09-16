# VendorIQ

VendorIQ is a Vendor Reliability Intelligence and Procurement Risk Management Platform. It includes the Milestone 1 foundation—PostgreSQL persistence, JWT authentication, role-based access control, Alembic migrations, and responsive authentication/dashboard pages—and the operational Milestone 2 modules.

Milestone 2 adds operational vendor, procurement request, purchase order, contract, and thread-based communication management. It does not add reliability scoring, analytics, reports, exports, notifications, charts, Docker, deployment, CI/CD, or any Milestone 3–4 capability.

Milestone 1 deliberately does not include vendor management, procurement, purchase orders, contracts, reports, messaging, notifications, reliability scoring, or analytics.

## Milestone 1 capabilities

- Secure registration, login, access-token refresh, and current-user APIs.
- BCrypt password hashing and JWT access and refresh tokens.
- Six seeded roles: Administrator, Procurement Manager, Supply Chain Manager, Finance Officer, Vendor, and Auditor.
- PostgreSQL schema managed through Alembic.
- Bootstrap 5, vanilla JavaScript authentication pages and a protected starter dashboard.
- Client-side session handling with `localStorage` and dashboard route protection.

## Technology stack

- Backend: Python, FastAPI, SQLAlchemy, Alembic, Pydantic, Uvicorn, Passlib, python-jose, and python-dotenv.
- Database: PostgreSQL.
- Frontend: HTML5, CSS3, vanilla JavaScript (ES6), Bootstrap 5, and Chart.js. Chart.js is loaded for the planned platform stack, but no charts or analytics are implemented in Milestone 1.

## Milestone 2 data model

The `20260804_0002_milestone_two_operations` migration adds: `vendor_categories`, `vendors`, `vendor_contacts`, `procurement_requests`, `purchase_orders`, `po_items`, `contracts`, `contract_documents`, `messages`, and `audit_logs`.

- Vendors move through Pending → Under Review → Approved, or can be Rejected. Vendor registration and GST numbers are unique.
- Procurement requests store validated dynamic line items and calculated totals. Procurement Managers create and approve normal requests; Finance Officers approve requests exceeding `VENDORIQ_PROCUREMENT_FINANCE_THRESHOLD`.
- Purchase Orders can be created only from approved procurement requests and approved vendors. PO numbers are generated automatically and unique. Vendor users can accept, reject, update delivery status, and upload invoice or delivery proof only for their assigned company’s purchase orders.
- Contracts store terms, renewal data, compliance state, PDF documents under `backend/uploads/contracts`, and an expiry bucket for 30, 60, or 90 days.
- Messages are scoped to exactly one purchase order or contract thread. Participants can view conversation history and recipients can mark messages read.
- All creation, approval, rejection, upload, deletion, and delivery-state actions are recorded in `audit_logs`.

## Invoice and payment workflow

The `20260827_0007_invoice_payment_workflow` and `20260827_0008_payment_updated_at` migrations add connected `invoices` and `payments` records. An invoice belongs to exactly one vendor and one purchase order; a payment belongs to one invoice and its vendor.

- A Vendor can create a draft only for its own completed PO, attach a PDF/image invoice document, and submit it only when receiving quantities and passed/conditional quality evidence are present.
- Finance Officers move invoices through **Submitted → Under Review → Approved → Payment Pending → Paid**, or reject a submitted/reviewed invoice with a required reason. Finance records the payment method, date, amount, and unique reference number.
- Procurement Managers, Administrators, Auditors, and Supply Chain Managers have read-only invoice visibility. Supplier isolation is enforced by the API, so a Vendor cannot access another company’s invoice by changing an ID.
- Invoice details include live PO, vendor, receiving/quality evidence, payment history, audit events, and notifications. Purchase Order details display the real invoice/payment summary for that PO.

## Milestone 2 API endpoints

| Area | Base path | Operations |
| --- | --- | --- |
| Vendors | `/api/v1/vendors` | Categories, searchable/paginated list, CRUD, approve, reject. |
| Procurement | `/api/v1/procurement-requests` | List, CRUD, approve, reject. |
| Purchase Orders | `/api/v1/purchase-orders` | List, CRUD, accept/reject, delivery status, invoice and proof upload. |
| Invoices & Payments | `/api/v1/invoices` | Vendor draft, document upload, submit; Finance review, approve, prepare payment, and process payment; read-only review for authorized internal roles. |
| Contracts | `/api/v1/contracts` | List, CRUD, PDF document upload, expiry data. |
| Messages | `/api/v1/messages` | Send, filter by PO/contract thread, mark read. |

All Milestone 2 endpoints require the existing bearer JWT. Administrator retains full access; Auditor is read-only; the remaining roles are constrained according to their operational responsibilities.

## Vendor account onboarding and data isolation

The `20260826_0004_vendor_user_link` migration adds `users.vendor_id`, an indexed foreign key to `vendors.id`. `vendors.created_by` remains the internal onboarding audit field; it is never used to infer an external supplier’s ownership.

An Administrator or Procurement Manager can invite a Vendor account from Vendor Management, selecting the supplier company at creation. Administrators can also link an existing Vendor-role account from User Management. A Vendor account is restricted server-side to its linked company’s vendor profile, purchase orders, contracts, fulfillment records, files, and messages. An unlinked legacy Vendor account receives an authorization error for supplier data until it is linked.

Provisioning APIs:

| Endpoint | Permission | Purpose |
| --- | --- | --- |
| `GET /api/v1/users/roles` | Administrator, Procurement Manager | Lists roles that may be provisioned. Procurement Managers receive only `Vendor`. |
| `POST /api/v1/users` | Administrator, Procurement Manager | Creates an account; Procurement Managers may create only Vendor accounts, which require `vendor_id`. |
| `PATCH /api/v1/users/{id}/vendor-company` | Administrator, Procurement Manager | Links an existing Vendor-role account to one vendor company. |

## Procurement request approval workflow

Procurement requests use an auditable lifecycle: **Draft → Pending Approval → Approved → Purchase Order Created**, or **Draft → Pending Approval → Rejected**. A Procurement Manager creates, edits, deletes, and submits only their own Draft or Rejected request. Submitted requests are immutable until an Administrator approves or rejects them.

Administrators are the approval authority. They can approve or reject only `Pending Approval` requests; rejection requires a reason. The request records the approver/rejector, timestamp, and decision comment. Every creation, submission, approval, rejection, and purchase-order transition is written to `audit_logs`. The existing notification system alerts Administrators on submission and the requesting Procurement Manager on a decision.

Purchase-order creation is protected in the backend: `POST /api/v1/purchase-orders` rejects any procurement request whose status is not `Approved`, regardless of frontend input. After a PO is created, its request becomes `Purchase Order Created` and cannot be reused.

## Project structure

```text
vendoriq/
├── backend/
│   ├── alembic/
│   │   ├── versions/
│   │   │   └── 20260802_0001_initial_auth_schema.py
│   │   ├── env.py
│   │   └── script.py.mako
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── security.py
│   │   ├── database/
│   │   │   └── database.py
│   │   ├── models/
│   │   │   ├── role.py
│   │   │   ├── user.py
│   │   │   └── user_role.py
│   │   ├── routers/
│   │   │   └── auth.py
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   ├── role.py
│   │   │   └── user.py
│   │   ├── services/
│   │   │   └── auth_service.py
│   │   └── main.py
│   ├── .env.example
│   ├── alembic.ini
│   └── requirements.txt
├── frontend/
│   ├── assets/
│   │   ├── css/
│   │   │   ├── dashboard.css
│   │   │   ├── login.css
│   │   │   └── style.css
│   │   ├── images/
│   │   └── js/
│   │       ├── api.js
│   │       ├── auth.js
│   │       └── dashboard.js
│   ├── dashboard.html
│   ├── index.html
│   ├── login.html
│   └── register.html
└── README.md
```

## Prerequisites

- Python 3.11 or later.
- PostgreSQL 14 or later, running locally or reachable through a PostgreSQL connection URL.
- A modern browser.

## Database setup

Create the PostgreSQL database named `vendoriq`:

```powershell
psql -U postgres -c "CREATE DATABASE vendoriq;"
```

If PostgreSQL uses a different host, port, user, or password, reflect those values in `VENDORIQ_DATABASE_URL` in the backend `.env` file.

## Backend setup

From the repository root, create and activate a virtual environment:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` before running the application. At minimum, set a strong, unique `VENDORIQ_JWT_SECRET_KEY` and a valid `VENDORIQ_DATABASE_URL`.

Apply the database schema and seed the six roles:

```powershell
alembic upgrade head
```

Start the FastAPI server:

```powershell
uvicorn app.main:app --reload
```

The API is available at `http://127.0.0.1:8000`, and interactive API documentation is available at `http://127.0.0.1:8000/docs`.

## Development demo data

After applying all Alembic migrations, seed the development database from the repository root:

```powershell
python seed.py
```

From the `backend` directory, the equivalent commands are `python seed.py` or `python -m app.seed`. The seeder is idempotent: it creates missing roles, users, and operational demonstration records without duplicating existing seeded records.

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@vendoriq.com` | `Admin@123` |
| Procurement Manager | `procurement@vendoriq.com` | `Procurement@123` |
| Supply Chain Manager | `supplychain@vendoriq.com` | `SupplyChain@123` |
| Finance Officer | `finance@vendoriq.com` | `Finance@123` |
| Vendor | `vendor@vendoriq.com` | `Vendor@123` |
| Auditor | `auditor@vendoriq.com` | `Auditor@123` |

The table lists the primary account for each role. The seeder creates two active users per role and prints every demo credential when it runs. The generated dataset includes 20 Indian and regional vendors with contacts and varied approval states, 30 multi-line-item procurement requests, purchase orders for approved requests, contracts across active/expired and 30/60/90-day renewal windows, placeholder invoice, delivery-proof, and contract files, PO and contract conversations, and audit records.

## Frontend setup

Keep the backend running, then serve the `frontend` directory with a static web server. For example:

```powershell
cd ..\frontend
py -m http.server 5500
```

Open `http://127.0.0.1:5500/login.html` in a browser. The application redirects unauthenticated visitors away from `dashboard.html` to the login page. You can also open `frontend/login.html` directly, though a local static server is more reliable across browser security settings.

## Environment variables

Use `backend/.env.example` as the source for `backend/.env`.

| Variable | Purpose | Example |
| --- | --- | --- |
| `VENDORIQ_DATABASE_URL` | PostgreSQL SQLAlchemy connection URL. | `postgresql+psycopg://postgres:password@localhost:5432/vendoriq` |
| `VENDORIQ_JWT_SECRET_KEY` | Secret used to sign JWTs. Use a long, randomly generated value. | `replace-with-a-long-random-secret` |
| `VENDORIQ_JWT_ALGORITHM` | JWT signing algorithm. | `HS256` |
| `VENDORIQ_ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime in minutes. | `30` |
| `VENDORIQ_REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime in days. | `7` |
| `VENDORIQ_CORS_ORIGINS` | Comma-separated frontend origins allowed to call the API. | `http://127.0.0.1:5500,http://localhost:5500,null` |

Never commit `backend/.env` or expose its `VENDORIQ_JWT_SECRET_KEY`.

## Authentication API

All endpoints are prefixed with `/api/v1/auth`.

| Method | Endpoint | Authentication | Description |
| --- | --- | --- | --- |
| `POST` | `/register` | No | Creates an active user and assigns one selected seeded role. |
| `POST` | `/login` | No | Validates credentials and returns an access token and refresh token. |
| `POST` | `/refresh-token` | No | Exchanges a valid refresh token for a fresh access and refresh token pair. |
| `GET` | `/me` | Bearer access token | Returns the authenticated user's profile and roles. |

### Register request

```json
{
  "first_name": "Asha",
  "last_name": "Kumar",
  "email": "asha.kumar@example.com",
  "phone": "+919876543210",
  "password": "SecurePass1!",
  "role_name": "Procurement Manager"
}
```

Passwords must be at least eight characters long and include an uppercase letter, lowercase letter, number, and special character. Email addresses are unique.

### Login request

```json
{
  "email": "asha.kumar@example.com",
  "password": "SecurePass1!"
}
```

### Refresh-token request

```json
{
  "refresh_token": "<refresh-token-returned-by-login>"
}
```

For `/me`, send the access token in the `Authorization` header:

```text
Authorization: Bearer <access-token>
```

## Alembic workflow

Run these commands from `backend/` after configuring `.env`:

```powershell
alembic current
alembic upgrade head
```

The initial migration creates only the `roles`, `users`, and `user_roles` tables, adds data-integrity constraints, and inserts the six canonical roles. New schema changes should be made through new Alembic revisions rather than by manually changing the database.

## Running checks

After dependencies are installed, verify that the backend imports successfully:

```powershell
python -m compileall app
```

Then run the database migration and start Uvicorn as described above. Registration, login, token refresh, and `/me` can be tested through the Swagger UI at `/docs`.
