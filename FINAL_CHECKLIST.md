# VendorIQ Final Checklist

## Included roles
- Administrator
- Procurement Manager
- Supply Chain Manager
- Vendor
- Finance Officer
- Auditor

## Included application areas
- Authentication / JWT
- Role-based access control
- Vendor registration and management
- Procurement requests
- Purchase orders
- Order/delivery tracking
- Vendor performance and reliability
- Contracts and compliance
- Contract documents
- Certifications
- Invoices and payments
- Communications
- Notifications
- Reports and analytics
- Quality inspection
- Administrator user management
- Role-specific navigation and dashboards

## Local demo accounts
See `README.md` for credentials. `backend/create_test_accounts.py` recreates all six demo accounts.

## Validation performed before packaging
- Backend Python source successfully passed `compileall` syntax compilation.
- SQLite database contains all six demo users.
- Frontend source, routes, services, role guard, and role-specific navigation are included.
- Build dependencies are intentionally not bundled as `node_modules`; run `npm install` before `npm start`.

## Specification note
The supplied project is configured for SQLite for local evaluation. The supplied PDF specifies PostgreSQL as the target database for the deployment milestone. This difference is explicitly documented rather than represented as completed PostgreSQL integration.
