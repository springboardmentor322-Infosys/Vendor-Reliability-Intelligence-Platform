# VendorIQ — Milestone 1 & 2 Implementation

This build uses the existing Vendor Reliability Platform as the base and aligns the public landing page, administrator dashboard and vendor dashboard to the VendorIQ reference design.

## Milestone 1
- Six-role model supported: Admin/Administrator, Procurement Manager, Supply Chain Manager, Finance Officer, Vendor and Auditor.
- JWT authentication with access + refresh tokens.
- Role-based Angular route protection.
- Registration, login, profile and password-reset API.
- SQLAlchemy models for users, vendors, procurement requests, purchase orders, performance and contracts.
- PostgreSQL configuration through environment variables, with SQLite fallback for local demos.

## Milestone 2
- Vendor CRUD and approval workflow: Pending → Under Review → Approved / Rejected.
- Procurement workflow: Pending → Approved → Ordered → Delivered → Completed / Cancelled.
- Purchase-order lifecycle and delivery statuses.
- Contract repository model with expiry checking and Near Expiry / Expired states.
- Existing communication/notification screens retained in the Angular application.
- Vendor and admin dashboards present the operational metrics required for the reference designs.

## Run

### Backend
```bash
cd Vendor-Reliability-Platform
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd Vendor-Reliability-Platform/frontend
npm install
npm start
```

Open `http://localhost:4200`.
