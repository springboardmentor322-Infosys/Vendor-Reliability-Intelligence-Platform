# Vendor Management permissions

Vendor Management is a monitoring/read role and cannot register new vendors.

- The `+ Register vendor` button is hidden for Vendor Management.
- The `/add-vendor` route is restricted to Administrator, Procurement Manager, and Supply Chain Manager.
- The backend `POST /vendors` endpoint is restricted to Administrator and Procurement Manager.
- Direct navigation or programmatic attempts from Vendor Management are blocked.
