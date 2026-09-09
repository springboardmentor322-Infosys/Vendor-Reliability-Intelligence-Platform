# Vendor Reliability Intelligence Platform

VendorIQ is a full-stack procurement and supplier-management system designed to help organizations monitor vendor reliability, manage purchasing operations, and coordinate compliance activities in one place.

## What the application provides

- Vendor registration, profiles, performance scores, and reliability analysis
- Procurement requests, purchase orders, deliveries, and order tracking
- Contract documents, certifications, audit plans, findings, and evidence
- Invoices, department budgets, finance approvals, and payment tracking
- Quality inspections and supplier risk monitoring
- Vendor communication threads and in-app notifications
- PDF and Excel report exports
- Role-based access control and administrator user management

## User roles

| Role | Primary responsibilities |
| --- | --- |
| Administrator | Full platform access and user management |
| Procurement Manager | Requests, purchasing, vendors, contracts, and spend |
| Supply Chain Manager | Deliveries, reliability, risk, and supplier operations |
| Vendor | Assigned company profile, orders, deliveries, invoices, and communication |
| Finance Officer | Budgets, invoices, approvals, and financial reporting |
| Auditor | Compliance, controls, evidence, audits, and risk review |

## Technology

- **Frontend:** Angular 22 and TypeScript
- **Backend:** FastAPI and Python
- **Database:** SQLite for local evaluation; PostgreSQL supported through `DATABASE_URL`
- **ORM and migrations:** SQLAlchemy and Alembic
- **Deployment:** Docker and Docker Compose

## Repository layout

```text
Vendor-Reliability-Intelligence-Platform/
├── backend/       FastAPI service, models, routers, schemas, and seed scripts
├── frontend/      Angular web application
├── data/          DataCo CSV files and dataset documentation
├── docs/          Data mapping and project documentation
├── docker-compose.yml
└── LICENSE
```

## Prerequisites

For local development, install:

- Python 3.11 or newer
- Node.js 22 or newer
- npm

Docker Desktop is required only for the containerized setup.

## Local installation

### 1. Configure the backend

From the repository root, open PowerShell and run:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

If PowerShell prevents activation, run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
```

### 2. Create demo data

```powershell
python create_test_accounts.py
python seed_reference_features.py
```

### 3. Start the API

```powershell
uvicorn app.main:app --reload
```

Backend URL: `http://127.0.0.1:8000`

Interactive API documentation: `http://127.0.0.1:8000/docs`

### 4. Start the Angular frontend

Open another PowerShell window:

```powershell
cd frontend
npm install
npm start
```

Frontend URL: `http://localhost:4200`

## Docker setup

To build and run both services from the repository root:

```powershell
docker compose up --build
```

Docker exposes the frontend on `http://localhost:4200` and the backend on `http://localhost:8000`.

To stop the containers:

```powershell
docker compose down
```

The SQLite database is mounted from `backend/vendoriq.db`, allowing local data to persist across container restarts.

## Demo login accounts

The following accounts are created by `create_test_accounts.py`. They are intended for local demonstrations only.

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@vendoriq.com` | `Admin@123` |
| Procurement Manager | `procurement@vendoriq.com` | `Procurement@123` |
| Supply Chain Manager | `supplychain@vendoriq.com` | `SupplyChain@123` |
| Vendor | `vendor@vendoriq.com` | `Vendor@123` |
| Finance Officer | `finance@vendoriq.com` | `Finance@123` |
| Auditor | `auditor@vendoriq.com` | `Auditor@123` |

Change these passwords before using the system outside a local evaluation environment.

## DataCo dataset

The project includes the DataCo Smart Supply Chain Dataset in `data/`, together with its field-description CSV. The supplied database contains:

- 118 unique products
- 65,752 unique orders

To rebuild the operational data from the CSV files:

```powershell
cd backend
python seed_database.py
python create_test_accounts.py
python seed_reference_features.py
```

The import preserves existing users while rebuilding business records. DataCo does not include vendor master data, contracts, invoices, communications, certifications, notifications, or quality inspections, so those VendorIQ-specific records are generated separately. More information is available in `data/README.md`.

## Configuration

SQLite is used automatically for local development. To connect to PostgreSQL, set `DATABASE_URL` in the backend environment:

```text
DATABASE_URL=postgresql+psycopg://username:password@localhost:5432/vendoriq
```

External email and SMS delivery requires valid provider credentials. In-app notifications work without external providers.

## Important security note

The demo credentials in this document are public evaluation credentials. Do not use them in production. Configure strong secrets, production database credentials, and external notification providers before deployment.


## Project Demo

Click below to watch the complete project demonstration:

👉 [Watch Project Demo](https://drive.google.com/file/d/1vRl4FIlfsd2f8CBk1tJ30y35QYGwt_zY/view?usp=drive_link)



## License

See [LICENSE](LICENSE) for licensing information.
