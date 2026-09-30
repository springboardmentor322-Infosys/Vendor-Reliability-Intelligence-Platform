# VendorIQ — Final Evaluation Package

VendorIQ is a Vendor Reliability & Procurement Intelligence Platform with role-based dashboards and modules for vendor management, procurement, orders, deliveries, performance, contracts/compliance, invoices, communications, notifications, reports, quality inspection, certification, and administrator user management.

## Roles
- Administrator
- Procurement Manager
- Supply Chain Manager
- Vendor
- Finance Officer
- Auditor

## Local run (Windows PowerShell)

### 1. Backend
```powershell
cd VendorIQ\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python create_test_accounts.py
uvicorn app.main:app --reload
```
Backend: http://127.0.0.1:8000

### 2. Frontend (new terminal)
```powershell
cd VendorIQ\frontend
npm install
npm start
```
Frontend: http://localhost:4200

If PowerShell blocks activation, use:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
```

## Demo accounts
All passwords below are for local/demo evaluation only. Change them before production use.

| Role | Email | Password |
|---|---|---|
| Administrator | admin@vendoriq.com | Admin@123 |
| Procurement Manager | procurement@vendoriq.com | Procurement@123 |
| Supply Chain Manager | supplychain@vendoriq.com | SupplyChain@123 |
| Vendor | vendor@vendoriq.com | Vendor@123 |
| Auditor | auditor@vendoriq.com | Auditor@123 |
| Finance Officer | finance@vendoriq.com | Finance@123 |

## Important
- The supplied project uses SQLite for local/offline evaluation (`backend/vendoriq.db`).
- The source PDF specifies PostgreSQL for the target deployment architecture; PostgreSQL migration is therefore a deployment-level difference, not hidden as if SQLite were PostgreSQL.
- The PDF also specifies PDF and Excel report export, email/SMS notifications, and a broader dashboard set. The project contains the corresponding report/notification modules and UI routes; external SMTP/SMS providers require real provider credentials.

## Main application areas
Administrator: dashboard, vendors, procurement, purchase orders, contracts/compliance, vendor performance, invoices, order tracking, reports, communications, notifications, and user management.

Procurement Manager: dashboard, procurement requests, purchase orders, vendors, vendor performance, contracts/compliance, invoices, order tracking, reports/spend analysis, communications, and notifications.

Supply Chain Manager: dashboard, vendors, procurement, purchase orders, order tracking, supplier performance, risk/reliability, contracts/compliance, analytics/reports, communications, and alerts.

Vendor: dashboard, company/profile, performance, purchase orders, delivery tracking, invoices, contracts/compliance, communications, notifications, and reports.

Finance Officer: dashboard, purchase orders, invoices/payments, vendors, contracts/compliance, reports, communications, and notifications.

Auditor: dashboard, vendors, procurement, purchase orders, contracts/compliance, audit/risk/report areas, document review, communications, notifications, control/checklist/evidence areas.

## Dataset
- Primary operational dataset: DataCo Smart Supply Chain Dataset.
- The full CSV and its field-description CSV are included under `data/`.
- The packaged SQLite database has been rebuilt from the supplied dataset: **118 unique products and 65,752 unique orders** are imported from DataCo.
- Run `python seed_database.py` from `backend/` to clear existing business data and rebuild the database from the DataCo dataset. Existing user accounts are preserved when present.
- If you create a completely new database, run `python create_test_accounts.py` after the import to create the six demo logins.
- DataCo does not contain vendor master, contracts, invoices, communications, certifications, notifications, or quality-inspection tables, so those VendorIQ-only records are generated as supplemental business data and clearly documented in `data/README.md`.

## Reference-aligned enhancements
The implementation also includes the strongest relevant features from the reference Vendor Reliability Intelligence Platform branch while preserving this project's Angular + FastAPI architecture:
- Dedicated Finance Officer dashboard with database-backed department budgets, approval queue, invoices and procurement totals.
- Finance approval can create an operational purchase order automatically, while budget limits are enforced.
- Global in-app Communication Hub with threaded vendor conversations and automatic chat notifications.
- Notification badge/popover with automatic refresh.
- Vendor-account-to-company linkage and backend vendor data isolation so a Vendor account can access only its assigned vendor records.
- Contract/dispute evidence URL support through the backend collaboration/compliance layer.
- `DATABASE_URL` support for PostgreSQL while retaining SQLite as the local evaluation default.

After creating the six demo accounts, run `python seed_reference_features.py` from `backend/` to create the reference-aligned budget records and link the demo Vendor account to vendor #1.
