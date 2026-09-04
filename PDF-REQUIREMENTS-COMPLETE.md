# VendorIQ - PDF Requirements Implementation

This project is aligned to the supplied **Python_Vendor Reliability Intelligence Platform (1).pdf**.

All ten application modules in section 4 are represented in the backend and Angular frontend:

1. User Authentication & Role Management
2. Vendor Management
3. Procurement Management
4. Vendor Performance
5. Vendor Reliability
6. Contract & Compliance
7. Communication
8. Dashboard & Analytics
9. Notification
10. Reports & Export

The six roles are preserved exactly as specified:
- Administrator
- Procurement Manager
- Supply Chain Manager
- Vendor
- Finance Officer
- Auditor

Milestone 3 pages and APIs include Vendor Performance, Reliability Scoring, Analytics, Notifications, Reports and Procurement Analytics.

External Email/SMS delivery is configurable through the notification endpoints. In local/demo mode the event is recorded as a delivery queue/activity log; SMTP/Twilio credentials can be supplied through environment variables without hard-coding secrets.
