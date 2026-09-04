# VendorIQ milestone and evaluation status

This document maps the implementation to the **Python Vendor Reliability
Intelligence Platform** brief. It is intentionally evidence-based: a feature is
only marked implemented when the application has code and a user-facing workflow
for it.

## Milestone 1 - foundation

Implemented:

- FastAPI API, PostgreSQL schema and Alembic migrations.
- JWT authentication, six roles and route-level RBAC.
- Registration, profile updates, password change and password-reset request UI.
- Responsive login, registration, dashboard, management, analytics, reports and
  notification screens.
- Docker Compose, isolated ports and a Windows launcher.

Gap against the exact brief:

- The frontend is responsive HTML/CSS/JavaScript, not Angular/Angular Material.
- Figma source wireframes/user-flow files are not included in this repository.

## Milestone 2 - vendor and procurement management

Implemented:

- Vendor registration, categories, contact/profile editing, approval/rejection
  and status monitoring.
- Procurement requests, review/approval, vendor assignment and conversion to a
  purchase order.
- Purchase-order workflow: pending, approved, ordered, delivered, completed and
  cancelled.
- Deliveries, invoices, quality inspections, contracts, renewal dates,
  compliance, documents/certifications, communication, and activity history.
- An administrator can link an independently registered Vendor user to the
  correct supplier record from **User Management**.

## Milestone 3 - performance and analytics

Implemented:

- Calculated reliability score, supplier ranking, risk level, recommendation and
  per-vendor trend endpoint.
- Predictive delivery-delay probability, calculated from historical delivery
  outcomes with a documented smoothed probability method. This is predictive
  analytics; it is not falsely represented as a trained ML model.
- Performance records for on-time/delayed delivery, quality, response time,
  issue resolution and order completion.
- Six role-specific dashboards with different cards, navigation, charts,
  actions, table panels, and live period/vendor/risk filters. The filters make
  new role-scoped PostgreSQL queries; vendor accounts cannot select or receive
  another vendor's records.
- In-app notifications plus optional SMTP email delivery for vendor approval,
  delayed delivery, contract expiry, and paid invoice events.
- CSV, Excel and PDF vendor-performance reports; CSV contract and PO reports.
- **Performance** page now calculates approval rate/time, response time, PO
  processing time, completion, compliance, delivery accuracy, issue resolution,
  reliability, and the current database query time from PostgreSQL records.

## Milestone 4 - testing, deployment and documentation

Implemented:

- Docker Compose local deployment, health endpoint, `START_VENDORIZ.bat`,
  README and RUNBOOK.
- Core automated tests for validation, PO transitions and reliability rules.
- Static syntax checks for the Python and browser code.

Still required for a production-ready claim:

- Run the automated tests in the Docker backend and record the results.
- Perform a timed dashboard/API/load test in the target environment.
- Provide organisation-owned SMTP credentials in the root `.env` if email
  delivery is required. SMS/Twilio still needs an approved provider account.
- Deploy to a specific AWS/Azure/cloud account if your evaluator requires cloud
  deployment.

## Evaluation and performance metrics

Open **Performance** in the application to view the calculated business metrics.
The following infrastructure goals from the brief need an actual benchmark, not
an invented dashboard number: API response below 300 ms, dashboard load below 2
seconds, and support for 1,000+ concurrent users. Record those measurements
after running a controlled load test.

## Dataset

The DataCo Smart Supply Chain Dataset is imported through **Data Management**.
It is not committed to Git because Kaggle download terms and the dataset size
are external. Supporting vendor, contract, invoice, quality, communication and
notification records are generated inside PostgreSQL for the local demo.
