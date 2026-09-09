# Reference Alignment & Implementation Notes

This package preserves the existing Angular + FastAPI VendorIQ implementation and adds selected functional patterns from the supplied reference repository branch:

- Finance Officer dashboard with budget utilization, procurement approval queue and invoice visibility.
- Database-backed department budgets.
- Finance approval creates an operational purchase order and enforces the configured department budget.
- Global Communication Hub using persistent vendor conversation threads.
- Chat messages create user-targeted notifications.
- Global notification badge/popover with automatic refresh.
- Vendor account/company linkage and backend vendor-data isolation.
- Contract evidence URL field and dispute/evidence API support.
- PostgreSQL-compatible `DATABASE_URL` configuration while retaining SQLite for local evaluation.

## Demo Vendor Mapping

The demo account `vendor@vendoriq.com` is linked to vendor record #1 (`Apex Logistics`). This is intentional so vendor isolation can be demonstrated.

## Validation performed

- Python source compilation: PASS
- Angular TypeScript compilation: PASS
- Angular template compilation with Angular compiler: PASS
- Backend FastAPI smoke tests using the packaged schema/data: PASS
- Finance summary/budget endpoints: PASS
- Vendor isolation for vendors/orders/deliveries/performance: PASS
- Unauthorized vendor access to another vendor chat: PASS

The reference repository was used as a comparison/reference implementation; its static-HTML architecture was not copied over the existing Angular application.
