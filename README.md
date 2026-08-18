# Vendor Reliability Intelligence & Procurement Risk Management Platform (VendorIQ)

VendorIQ is a production-ready, full-stack enterprise web application designed to evaluate supplier reliability, track procurement transactions, monitor operational performance, handle contract compliance, and support data-driven procurement decision-making through dynamic analytics dashboards.

---

## 1. Problem Statement
Modern supply chains face persistent risks from delayed deliveries, low-quality shipments, and non-compliance with contracts. Organizations often lack central visibility to analyze and rate their vendors objectively. This platform addresses this gap by importing historical transaction logs, generating real-time performance scores, automating quality tracking, and securing operational workflows based on role permissions.

---

## 2. Features

* **JWT Authenticated Session Management**: Custom login, register, and admin approval gates.
* **Role-Based Access Control (RBAC)**: Support for 6 distinct roles (Admin, Procurement Manager, Supply Chain Manager, Finance Officer, Auditor, Vendor).
* **Vendor Data Isolation**: Vendor users are strictly restricted to viewing only their own transactions, invoices, quality inspections, and notifications.
* **Procurement Operations**: Live tracking of purchase orders, contracts, and delivery timelines.
* **Supply Chain Deliveries Dashboard**: Interactive KPIs for total shipments, on-time delivery rates, average delays, and monthly trend tracking.
* **Invoices & Payment Actions**: Authorized mark-paid workflow updating PostgreSQL status and dates.
* **Quality Inspections & Compliance**: Defect rates and quality scoring logged with input bounds validations.
* **System Audit Logs**: Read-only chronological logs of system mutations with fuzzy email, action, and date filters.
* **Notifications Center**: Active alerts of late deliveries or compliance notices with unread counts and read markers.
* **Analytical Reports**: Fully functional, downloadable CSV reports for purchase orders and vendor reliability.

---

## 3. Technology Stack

* **Language**: Python 3.12, ES6 Vanilla JavaScript, HTML5, CSS3
* **Backend Framework**: FastAPI (served via Uvicorn)
* **Database**: PostgreSQL 15 (psycopg2-binary connection)
* **Libraries**: PyJWT, passlib[bcrypt], pandas, openpyxl, reportlab
* **Deployment**: Docker, Docker Compose

---

## 4. Architecture Blueprint

```
                     +----------------------------------+
                     |    Web Browser (HTML/CSS/JS)    |
                     +-----------------+----------------+
                                       |
                               REST API (JSON)
                                       |
                                       v
                     +-----------------+----------------+
                     |    FastAPI (Uvicorn Backend)     |
                     +-----------------+----------------+
                                       |
                                  Connection
                                       |
                                       v
                     +-----------------+----------------+
                     |      PostgreSQL Database         |
                     +----------------------------------+
```

---

## 5. Folder Structure
```
Vendor-Reliability-Intelligence-Platform/
│
├── backend/
│   ├── analytics.py
│   ├── audit_logs.py
│   ├── auth.py
│   ├── contract.py
│   ├── dashboard.py
│   ├── db.py
│   ├── delivery.py
│   ├── invoices.py
│   ├── main.py
│   ├── notifications.py
│   ├── quality.py
│   ├── report.py
│   └── requirements.txt
│
├── data/
│   ├── DataCoSupplyChainDataset.csv
│   └── vendor_reliability_analysis.csv
│
├── frontend/
│   ├── css/
│   ├── js/
│   │   ├── auth.js
│   │   ├── login.js
│   │   ├── invoices.js
│   │   ├── quality.js
│   │   ├── audit_logs.js
│   │   ├── notifications.js
│   │   └── supplychain_dashboard.js
│   ├── dashboard.html
│   ├── invoices.html
│   ├── quality.html
│   ├── audit_logs.html
│   ├── notifications.html
│   └── supplychain_dashboard.html
│
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 6. Database Setup
1. Create a PostgreSQL database named `vendor_platform`.
2. Configure credentials in your `.env` file (copied from `.env.example`).
3. Run the import pipelines in sequence to import the DataCo dataset:
   ```bash
   python import_csv_pipeline.py
   ```
   This will reset and seed all raw transaction records (180,519 rows) and vendor metadata (118 vendors).

---

## 7. Configuration & Running Locally

### Prerequisites
* Python 3.12+
* PostgreSQL 15+

### Environment Variables
Configure your environment using the provided template `.env.example`:
```bash
cp .env.example .env
```

### Installation
1. Create a virtual environment and activate it:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   ```
2. Install Python dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Start the FastAPI backend server:
   ```bash
   python -m uvicorn backend.main:app --reload --port 8000
   ```
4. Access the web interface in your browser:
   `http://127.0.0.1:8000/frontend/login.html`

---

## 8. Running with Docker (Containerized)
To build and run the entire application container stack:
```bash
docker-compose up --build
```
This launches a PostgreSQL database and a FastAPI backend service automatically connected on port `8000`.

---

## 9. User Roles Matrix

| Role | Permitted Actions |
|---|---|
| **Admin** | Approves users, maps vendors, views system statistics, reads audit logs, records quality logs. |
| **Procurement Manager** | Accesses active purchase orders, issues contract records, and writes quality inspection logs. |
| **Supply Chain Manager** | Views deliveries summary, monthly trends, delayed alert list, and records quality logs. |
| **Finance Officer** | Oversight on all billing invoices; marks pending invoices as paid. |
| **Auditor** | Accesses read-only chronological system audit log entries and reports. |
| **Vendor** | Strictly limited to viewing their own invoices, quality logs, and notifications. |

---

## 10. API Route Registry

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `POST` | `/login` | Public | Authenticates credentials and returns JWT token. |
| `POST` | `/register` | Public | Submits registration details to the pending queue. |
| `GET` | `/deliveries/summary` | Admin, SCM | Computes total deliveries, rates, delay aggregates. |
| `GET` | `/invoices` | All | Returns invoices (scoped to vendor if Vendor role). |
| `PUT` | `/invoices/{id}/pay` | Admin, Finance | Marks invoice status as 'Paid'. |
| `GET` | `/quality-inspections` | All | Lists inspection logs (scoped if Vendor). |
| `POST` | `/quality-inspections` | Admin, PM, SCM | Records new inspection details. |
| `GET` | `/audit-logs` | Admin, Auditor | Lists chronological system logs. |
| `GET` | `/notifications` | All | Returns notifications (scoped if Vendor). |
| `POST` | `/notifications/read/{id}` | All | Marks alert notification as 'Read'. |

---

## 11. Testing
Comprehensive integration test scripts are available in the project. Run them directly against the running application:
```bash
# Verify invoices, quality logs, audit, and notifications
python scratch/test_invoices_integration.py
python scratch/test_quality_integration.py
python scratch/test_audit_logs_integration.py
python scratch/test_notifications_integration.py
```

---

## 12. Future Scope & Limitations
* **Calculation Load**: SCM and report aggregation queries read 180k+ rows on-demand. Future versions should use database views or materialization to speed up dashboard loads.
* **Cloud File Storage**: Message attachment and documentation sharing are currently stored locally. S3 integration is suggested for scalability.
