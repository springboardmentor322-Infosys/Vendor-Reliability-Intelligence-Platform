# Vendor Reliability Intelligence Platform

Full-stack Vendor Reliability Intelligence and Procurement Risk Management Platform.

## Included modules

- Authentication and JWT authorization
- Role-based access control
- Administrator dashboard
- Procurement Manager dashboard
- Supply Chain Manager dashboard
- Finance Officer dashboard
- Vendor dashboard
- Auditor dashboard
- Vendor Management
- Products
- Procurement Requests
- Purchase Orders
- Deliveries
- Contracts
- Invoices
- Quality Inspections
- Communication History
- Notifications
- Analytics
- Reports
- Audit Logs
- User Management
- Settings

## Roles

1. Administrator
2. Procurement Manager
3. Supply Chain Manager
4. Vendor
5. Finance Officer
6. Auditor

## Backend setup

1. Create a PostgreSQL database named `vendor_db`.
2. Copy `backend/.env.example` to `backend/.env`.
3. Set the PostgreSQL username, password and database URL.
4. Install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

5. Start FastAPI:

```bash
uvicorn app.main:app --reload
```

API: `http://127.0.0.1:8000`
Swagger: `http://127.0.0.1:8000/docs`

## Frontend

Serve the `frontend` directory with a local HTTP server. For example, VS Code Live Server can run it on port 5500.

Open `login.html` through the local server.

## Notes

The application creates missing SQLAlchemy tables through `Base.metadata.create_all()` during startup. Existing operational data is not intentionally deleted by the added Analytics, Reports or role dashboards.

Analytics and Reports read existing PostgreSQL records. They do not create duplicate reporting data.
