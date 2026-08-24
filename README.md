
# Vendor Reliability Intelligence Platform

## Milestone 1: Week 1 & 2

This repository contains the FastAPI backend for a vendor reliability and procurement intelligence platform.

### Milestone 1 status
- FastAPI project initialized
- PostgreSQL-ready database configuration added
- JWT authentication implemented
- Basic user, vendor, procurement, purchase order, performance, and dashboard routes established
- Angular frontend scaffold initialized
- Angular Material theme and animation support configured for the UI shell
- Login, register, dashboard, vendor, and procurement routes are wired for the milestone flow

### Setup
1. Copy `.env.example` to `.env`
2. Install dependencies:
   ```bash
   python -m pip install -r requirements.txt
   ```
3. Start the app:
   ```bash
   uvicorn app.main:app --reload
   ```

### Notes
- The backend now supports PostgreSQL through `DATABASE_URL` and falls back to local SQLite for quick development.
- The repository includes a data model for users, vendors, procurement requests, purchase orders, and vendor performance.
- Angular frontend scaffolding is planned for the next phase; current focus is backend initialization and authentication.

## VendorIQ Milestone Build
The current build includes a VendorIQ-aligned landing page, administrator dashboard and vendor dashboard, plus milestone authentication, role routing, vendor approval, procurement/PO/contract workflows and Alembic configuration. Configure credentials in `.env` before deployment.
# Vendor-Reliability-Intelligence-Platform
Vendor Reliability Intelligence Platform

