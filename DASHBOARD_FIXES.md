# Dashboard / Routing Fixes

- Added screenshot-style role dashboards for Procurement Manager, Supply Chain Manager, Finance Officer and Auditor.
- Added role-specific side navigation and login routing.
- Added missing `/vendors`, `/add-vendor`, `/edit-vendor/:id`, and `/vendor-details/:id` routes.
- Internal roles can view Vendors; only Administrator/Admin see vendor management actions.
- Fixed role guard fallback so an unauthorized user is returned to their own role dashboard instead of being sent to Vendor Dashboard.
- Fixed Angular table data binding for Users and Purchase Orders using signals to avoid ExpressionChangedAfterItHasBeenCheckedError.
- Normalized environment imports so they resolve from `src/environments/environment.ts`.
- Preserved the existing FastAPI backend, database, vendor categories, and authentication setup.
