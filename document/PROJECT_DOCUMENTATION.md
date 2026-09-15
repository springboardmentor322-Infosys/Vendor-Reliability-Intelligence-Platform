# Vendor Reliability Intelligence Platform (VendorIQ)
## Comprehensive Technical Documentation & Architecture Specification

---

## 1. Executive Overview

The **Vendor Reliability Intelligence Platform (VendorIQ)** is an enterprise-grade full-stack web application designed to evaluate vendor reliability, monitor procurement operations, assess supplier performance risks, track delivery history, enforce contract compliance, and optimize procurement decision-making through centralized dashboards and analytics.

---

## 2. Architecture Components

### Frontend Layer
- Responsive Glassmorphic Web Dashboard interface built with HTML5, CSS3 (`Plus Jakarta Sans` styling framework), JavaScript (ES6+), and Chart.js.
- Compatible with Angular 17+ component architecture.

### API & Application Layer (FastAPI Microservices)
- **API Gateway**: CORS Middleware, JWT Bearer Token Security, Route Protection.
- **Microservices Core**:
  - `Auth Service`: User registration, JWT login, Password hashing, Role-Based Access Control (RBAC).
  - `Vendor Service`: Vendor profile CRUD, approval workflow, category management, reliability rating.
  - `Procurement Service`: Requisition tracking, PO creation, cost estimation, department budgeting.
  - `Purchase Order Service`: Order management, status lifecycle, invoice upload & validation.
  - `Reliability & Performance Service`: Multi-factor dynamic reliability scoring algorithm.
  - `Contract Service`: Expiry tracking, compliance monitoring, renewal notice alerts.
  - `Notification Service`: System alerts, delivery delay warnings, contract expiration notices.
  - `Reports Service`: CSV & Excel data export engines.

### Data Layer
- **Relational Database**: PostgreSQL / SQLite (`SQLAlchemy` ORM integration).
- **Storage Layer**: Local file system & AWS S3 compatible document repository for PO invoices and proof of delivery files.

---

## 3. Implemented System Modules

### Module 1: User Authentication & Role Management
- **Features**: User Registration, JWT Bearer Token Authentication, Password Hashing, Profile Management.
- **Supported Roles**:
  1. `Administrator`: Complete system administration and role configuration.
  2. `Procurement Manager`: Manages PO creation, procurement approvals, and vendor assignments.
  3. `Supply Chain Manager`: Monitors delivery status, delay alerts, and logistics performance.
  4. `Vendor`: Accesses vendor portal for order updates and invoice uploads.
  5. `Finance Officer`: Reviews invoices, payment statuses, and spend analysis.
  6. `Auditor`: Monitors compliance, contract terms, and audit activity logs.

### Module 2: Vendor Management Module
- **Features**: Vendor Registration, Category Classification, Status Monitoring, Approval Workflows.
- **Vendor Categories**: Raw Material Suppliers, Equipment Vendors, IT Vendors, Service Providers, Logistics Partners, Maintenance Vendors.

### Module 3: Procurement Management Module
- **Features**: Procurement Requests, Purchase Order Creation, Status Lifecycle (`Pending` -> `Approved` -> `Ordered` -> `Delivered` -> `Completed` -> `Cancelled`), Invoice Management.

### Module 4 & 5: Vendor Performance & Reliability Scoring Engine
- **Calculated Reliability Score Formula**:
  $$\text{Reliability Score} = 0.4 \times \text{Delivery Rate} + 0.3 \times \text{Quality Score} + 0.2 \times \text{Response Time Score} + 0.1 \times \text{Contract Compliance}$$
- **Risk Categorization**:
  - `Low Risk` ($\text{Score} \ge 75$)
  - `Medium Risk` ($60 \le \text{Score} < 75$)
  - `High Risk` ($\text{Score} < 60$)

### Module 6: Contract & Compliance Module
- **Features**: Contract Repository, Expiry Tracking (30-day default renewal alerts), Terms storage, Compliance scoring.

### Module 7: Communication Module
- **Features**: Message logs, file sharing attachments, activity log auditing.

### Module 8: Dashboard & Analytics Module
- **Procurement Dashboard**: Active PO counts, Spend Metrics, On-time Delivery %, Vendor Risk Distribution.
- **Vendor Dashboard**: Score breakdown, Rating distribution, Order history.
- **Admin Dashboard**: System user counts, active contracts, system statistics.

### Module 9: Notification & Alerting Module
- **Features**: Real-time procurement warnings, delivery delay flags, expiring contract alerts.

### Module 10: Reports & Export Module
- **Features**: CSV/Excel downloads for Vendor Performance Reports and Purchase Order status history.

---

## 4. Database Schema Reference

```sql
-- Users Table
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username VARCHAR UNIQUE NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    hashed_password VARCHAR NOT NULL,
    full_name VARCHAR,
    role VARCHAR DEFAULT 'Procurement Manager',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendors Table
CREATE TABLE vendors (
    id INTEGER PRIMARY KEY,
    name VARCHAR NOT NULL,
    delivery VARCHAR DEFAULT 'On Time',
    category VARCHAR DEFAULT 'Raw Material Suppliers',
    status VARCHAR DEFAULT 'Active',
    approval_status VARCHAR DEFAULT 'Approved',
    score INTEGER DEFAULT 85,
    quality INTEGER DEFAULT 90,
    response_time INTEGER DEFAULT 24,
    contact_person VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    risk_level VARCHAR DEFAULT 'Low'
);

-- Purchase Orders Table
CREATE TABLE purchase_orders (
    id INTEGER PRIMARY KEY,
    order_id VARCHAR UNIQUE NOT NULL,
    vendor VARCHAR NOT NULL,
    product VARCHAR NOT NULL,
    amount INTEGER NOT NULL,
    status VARCHAR DEFAULT 'Pending',
    invoice_number VARCHAR,
    invoice_status VARCHAR DEFAULT 'Pending',
    invoice_file VARCHAR,
    proof_of_delivery VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contracts Table
CREATE TABLE contracts (
    id INTEGER PRIMARY KEY,
    contract_id VARCHAR UNIQUE NOT NULL,
    vendor VARCHAR NOT NULL,
    contract_name VARCHAR NOT NULL,
    start_date VARCHAR NOT NULL,
    expiry_date VARCHAR NOT NULL,
    renewal_notice_period INTEGER DEFAULT 30,
    terms TEXT,
    status VARCHAR DEFAULT 'Active',
    compliance_score INTEGER DEFAULT 95
);
```

---

## 5. API Endpoint Directory

| Endpoint | Method | Description |
|---|---|---|
| `POST /auth/register` | POST | User registration with role selection |
| `POST /auth/login` | POST | Authenticates user & returns JWT access token |
| `GET /auth/me` | GET | Returns profile of currently authenticated user |
| `GET /vendors` | GET | Lists all vendors with optional category/status filters |
| `POST /vendors` | POST | Creates new vendor and computes initial reliability score |
| `PUT /vendors/{id}/approve` | PUT | Approves pending vendor registration |
| `PUT /vendors/{id}/reject` | PUT | Rejects vendor registration |
| `GET /procurements` | GET | Fetches all procurement requisitions |
| `POST /procurements` | POST | Submits a new procurement request |
| `GET /purchase-orders` | GET | Fetches all purchase orders |
| `POST /purchase-orders` | POST | Creates purchase order with optional invoice file upload |
| `GET /contracts` | GET | Lists contracts and expiration metrics |
| `POST /contracts` | POST | Creates contract with expiry dates and terms |
| `GET /dashboard/stats` | GET | Returns aggregated analytics, pie chart distribution, & spend summaries |
| `GET /notifications` | GET | Returns alert notifications and warning system messages |
| `GET /reports/export/vendors.csv` | GET | Exports complete vendor performance dataset as CSV |
| `GET /reports/export/purchase-orders.csv` | GET | Exports purchase order history as CSV |

---

## 6. Milestone Alignment Status

- [x] **Milestone 1: Backend Setup, DB Schema & Authentication** (FastAPI, SQLite/PostgreSQL models, JWT auth & password hashing completed).
- [x] **Milestone 2: Vendor & Procurement Management** (Vendor approval workflows, PO lifecycle, contract repository completed).
- [x] **Milestone 3: Vendor Performance & Analytics** (Reliability Scoring Engine, Risk level categorization, Dashboard Stats aggregation completed).
- [x] **Milestone 4: Testing & Documentation** (Verified Python execution environment, generated CSV export tools, and compiled technical specification).
