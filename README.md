# Vendor Pulse

 Vendor Reliability Intelligence & Procurement Risk Management Platform




Build a full-stack Vendor Reliability Intelligence & Procurement Risk Management Platform — a web application that lets organizations evaluate vendor reliability, manage procurement operations, monitor supplier performance, track delivery history, maintain contract compliance, and improve procurement decision-making through centralized dashboards and analytics.




Use React (with TypeScript) for the frontend and Supabase for the backend, database (PostgreSQL), authentication, and file storage — this replaces the Angular/FastAPI stack referenced in the original spec while preserving every functional requirement, module, and workflow below. Use Supabase Edge Functions for any server-side business logic (e.g., reliability score calculations, notification triggers, report generation). Use Tailwind CSS + shadcn/ui components for a clean, responsive, professional enterprise dashboard look, with Recharts (or similar) for charts.




The platform should serve manufacturing companies, retail businesses, logistics organizations, healthcare providers, construction firms, and enterprise procurement departments.




Core Outcomes to Deliver




A deployed full-stack Vendor Reliability Intelligence platform.

Secure user authentication with role-based access control.

Vendor registration and supplier management.

Procurement and purchase order management workflows.

Vendor reliability scoring based on operational performance.

Contract and compliance monitoring.

Dashboards for procurement analytics and vendor performance.

Notifications and procurement alerts.

Procurement and vendor performance reporting (with PDF/Excel export).

Responsive UI wireframes/screens for every core workflow before deep implementation.




Data Approach




Do not integrate multiple unrelated third-party datasets. Use one primary dataset as the foundation and generate realistic supporting business data for everything else:




Primary dataset: DataCo Smart Supply Chain Dataset (Kaggle) — covers products, suppliers, orders, shipping, delivery status, categories, and sales. Seed the Products, Purchase Orders, and Deliveries tables from this dataset (import as CSV seed data).

Generated/synthetic data: For business data not present in the primary dataset — vendor details, contracts, invoices, communication history, quality inspection reports, and notifications — generate realistic structured sample records (Faker-style) to seed the database.

Never store computed metrics as static data. Vendor Performance, Vendor Reliability Score, Vendor Ranking, Procurement Risk Level, and all other dashboard metrics must be calculated dynamically by the application from the underlying stored data (via backend functions/queries), not downloaded or hardcoded.




Required Database Tables




Vendors

Products

Purchase Orders

Deliveries

Contracts

Invoices

Quality Inspection

Communication History

Notifications

Users / Roles (for auth and RBAC)




1. User Authentication & Role Management




Features: user registration, secure login, token-based session authentication, password reset, profile management, role-based access control (RBAC).




Roles:




Administrator

Procurement Manager

Supply Chain Manager

Vendor

Finance Officer

Auditor




Each role should have a distinct permission set gating which modules, actions, and dashboards it can access.




2. Vendor Management Module




Features: vendor registration, vendor profile management, vendor categorization, vendor approval workflow, vendor status monitoring (active/inactive/pending/suspended), vendor contact management.




Vendor Categories: Raw Material Suppliers, Equipment Vendors, IT Vendors, Service Providers, Logistics Partners, Maintenance Vendors.




3. Procurement Management Module




Features: procurement requests, purchase order creation, procurement approval workflow, vendor assignment, order tracking, invoice management.




Procurement Status pipeline: Pending → Approved → Ordered → Delivered → Completed (with a Cancelled state available at any point).




4. Vendor Performance Module




Features: delivery performance monitoring, product quality evaluation, communication response tracking, service rating, performance history, vendor ranking.




Performance Metrics tracked: on-time deliveries, delayed deliveries, quality rating, response time, issue resolution time, order completion rate.




5. Vendor Reliability Module




Features: vendor reliability score (calculated), supplier ranking, procurement risk level, performance trend analysis, procurement recommendations.




Reliability Score factors: delivery history, product quality, communication efficiency, contract compliance, purchase history, issue resolution. Implement this as a weighted scoring algorithm in a backend function that recalculates as new performance data comes in, and expose the resulting score, risk level (e.g., Low/Medium/High), and trend on vendor profiles and dashboards.




6. Contract & Compliance Module




Features: contract repository (with file storage for documents), contract renewal tracking, compliance monitoring, certification management, vendor documentation storage, contract expiry notifications.




7. Communication Module




Features: vendor messaging, procurement discussions/threads, communication history log, email notifications, file sharing within threads, activity logs.




8. Dashboard & Analytics Module




Build three distinct dashboards, each scoped to its relevant role(s):




Procurement Dashboard: procurement overview, active purchase orders, vendor performance summary, procurement cost analysis, delivery status.




Vendor Dashboard: vendor's own performance, reliability score, contract status, order history, communication activity.




Admin Dashboard: user management, vendor analytics, procurement reports, compliance monitoring, system statistics.




All dashboards should use charts (trend lines, bar charts, gauges/score cards) alongside summary tables.




9. Notification Module




Features: procurement alerts, delivery delay notifications, vendor approval notifications, contract expiry alerts, compliance notifications, email notifications, SMS notifications (stub/integration-ready if SMS provider isn't wired up).




10. Reports & Export Module




Features: vendor performance reports, procurement reports, purchase order reports, compliance reports, contract reports, with export to PDF and Excel.




11. Final Integration, Testing & Deployment




Ensure all modules are wired together end-to-end (e.g., a purchase order delay updates delivery performance, which feeds the reliability score, which triggers a notification and shows up on dashboards). Include basic tests for critical flows and deploy the app.




Suggested Build Sequence (mirrors original 8-week milestone plan, compress as appropriate for Lovable's iterative workflow)




Phase 1 — Foundation: Define requirements, design wireframes/user flows for Login, Registration, Dashboard, Vendor Management, Procurement Dashboard, Purchase Orders, Vendor Performance Dashboard, Analytics Dashboard, Reports Dashboard, and Notification screens. Set up the database schema, authentication, and base app shell.




Phase 2 — Vendor & Procurement Core: Build Vendor Management, Procurement Management, Purchase Orders, Vendor Approval workflow, Contract Management, and the Communication module.




Phase 3 — Performance & Analytics: Build Vendor Performance tracking, the Reliability Scoring engine, Analytics Dashboard, Notification system, and Reports generation.




Phase 4 — Polish & Deployment: Test all workflows end-to-end, fix issues, finalize responsive design, prepare documentation, and deploy.




Non-Functional / Quantitative Goals




Vendor registration flow completes in under 3 minutes.

Purchase order approval turnaround target: within 24 hours.

Track and surface a 95% on-time delivery monitoring target.

Dashboards should load in under 2 seconds and feel responsive under concurrent use.

API/query responses should stay fast (target sub-300ms where feasible) as the schema scales.




Design Notes




Fully responsive UI (desktop, tablet, mobile).

Clean enterprise/SaaS visual style — avoid generic default styling; use clear data hierarchy, status badges/colors (e.g., color-coded risk levels and order statuses), and accessible contrast.

Every module above should map to a real, navigable screen — not just a database table with no UI.







Note on the stack swap: The source specification called for Angular + FastAPI + PostgreSQL. Lovable builds on React + Supabase (which is PostgreSQL under the hood), so the data model, roles, modules, workflows, and metrics above are preserved exactly — only the frontend framework and backend runtime differ.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://reliable-procure-ly.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2d748d70-76e8-4146-8fbd-d59b4ebd0722).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
