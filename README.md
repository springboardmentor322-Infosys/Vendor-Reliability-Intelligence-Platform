# Vendor Reliability Intelligence & Procurement Risk Management Platform

## Project Objective
This platform is a comprehensive Vendor Reliability and Procurement Risk Management system. It enables automated evaluation of vendors derived directly from operational PostgreSQL data.

## Features (Milestones 1-4)
- **Role-Based Access Control (RBAC):** Six specific roles consisting of Administrator, Procurement Manager, Supply Chain Manager, Finance Officer, Auditor, and Vendor.
- **Vendor Management:** Comprehensive registration, approval flow, and vendor portfolio listing.
- **Procurement & PO Routing:** Tracks purchase orders dynamically.
- **Contract & Compliance Repository:** Stores PDF uploads and dynamic evaluations.
- **Communications:** PO/Contract-linked messaging capabilities.
- **Vendor Performance & Reliability Modules:** 
  - Dynamic formulation tracing On-Time Delivery rates.
  - Quality inspection success ratios.
  - Contract compliance checks.
- **Dynamic Dashboards:** Implements `ng-apexcharts` powered purely by real-time SQLAlchemy Python aggregations on the DataCo Dataset.

## Architecture & Tech Stack
**Frontend:** Angular 18 (TypeScript, RxJS) + ApexCharts + TailwindCSS
**Backend:** FastAPI (Python 3.9) + SQLAlchemy + Pydantic + Uvicorn + Alembic
**Database:** PostgreSQL 15 + Redis 7
**Deployment:** Docker + Docker Compose

## Local Development Setup
**Backend:**
1. Navigate to `/backend`
2. Run `pip install -r requirements.txt`
3. Prepare `.env` variables from `.env.example`
4. Run `alembic upgrade head`
5. Run `uvicorn app.main:app --reload`
6. Access Swagger docs at `http://127.0.0.1:8000/docs`

**Frontend:**
1. Navigate to `/frontend`
2. Run `npm install`
3. Run `npm run start`

## Docker Deployment (Demonstration Recommended)
1. In the root project structure, execute `docker compose up --build -d`
2. Access Frontend at `http://localhost:8081`
3. Backend APIs resolve securely through `http://localhost:8000`

### Known Limitations
- The world map in the Supply Chain Manager dashboard is rendered purely for structural UI flow rather than parsing geographic coordinates natively.
- No real SMTP/Twilio messaging is triggered outwards (Intranet comms only).
