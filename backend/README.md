# Vendor Reliability Intelligence & Procurement Risk Management Platform — Backend

A robust RESTful backend for the **Vendor Reliability Intelligence & Procurement Risk Management Platform**, built using **FastAPI, Python, SQLAlchemy, and PostgreSQL**.

The backend provides authentication, vendor management, procurement management, purchase order processing, vendor risk evaluation, analytics, reports, notifications, audit logging, and API endpoints for the Angular frontend.

---

## Project Overview

The Vendor Reliability Intelligence & Procurement Risk Management Platform is designed to help organizations monitor vendor performance, identify procurement risks, manage supplier relationships, and make data-driven procurement decisions.

This repository contains the **backend/API layer** of the platform.

The backend is responsible for:

* User authentication
* JWT-based authorization
* Vendor management
* Vendor reliability scoring
* Risk-level calculation
* Procurement management
* Purchase order management
* Dashboard data
* Analytics
* Reports
* Notifications
* Audit logs
* Database communication

---

## Objectives

The backend is designed to:

* Provide secure REST APIs for the procurement platform.
* Manage vendor and procurement data.
* Calculate vendor reliability and risk levels.
* Support purchase order management.
* Provide analytics and reporting data.
* Maintain audit records of system activities.
* Connect the Angular frontend with the PostgreSQL database.
* Provide scalable API architecture for future enhancements.

---

## Key Features

### Authentication & Authorization

* User registration
* User login
* Password hashing
* JWT access tokens
* Protected API endpoints
* Authenticated user dependencies

### Vendor Management

The vendor API supports:

* Creating vendors
* Viewing vendors
* Updating vendors
* Vendor status management
* Vendor performance information
* Reliability scores
* Risk levels

Vendor performance can include:

* Delivery score
* Quality score
* Payment score
* Compliance score

---

## Vendor Reliability & Risk Engine

The backend contains a dedicated risk engine for evaluating vendor reliability.

The system can calculate:

* Overall reliability score
* Vendor risk level
* Vendor performance indicators
* Vendor status

The risk engine is designed to help procurement teams identify vendors that may require additional monitoring.

---

## Procurement Management

The procurement API provides functionality for:

* Creating procurement records
* Viewing procurement information
* Updating procurement information
* Tracking procurement status
* Associating procurement activities with vendors

---

## Purchase Order Management

The purchase order API provides:

* Purchase order creation
* Purchase order retrieval
* Vendor association
* Purchase order tracking
* Purchase order status management

---

## Dashboard

The dashboard APIs provide summarized information for the Angular dashboard.

Possible dashboard information includes:

* Total vendors
* Vendor risk information
* Procurement statistics
* Purchase order information
* Reliability metrics
* Operational indicators

---

## Analytics

The analytics APIs provide data that can be used to analyze:

* Vendor reliability
* Vendor risk distribution
* Procurement activity
* Performance indicators
* Operational trends

---

## Reports

The reports module provides API functionality for procurement and vendor-related reporting.

Reports can include:

* Vendor performance
* Procurement activity
* Risk information
* Purchase order information
* Reliability metrics

---

## Notifications

The notification APIs support system and procurement-related notifications.

Examples include:

* Vendor risk alerts
* Procurement updates
* Purchase order updates
* System events
* Important operational notifications

---

## Audit Logs

The audit log functionality provides visibility into system activities.

It supports:

* Activity tracking
* User actions
* Procurement traceability
* System monitoring
* Accountability
* Audit and compliance requirements

---

## Technology Stack

### Backend

* **Python**
* **FastAPI**
* **SQLAlchemy**
* **Pydantic**
* **PostgreSQL**

### Authentication & Security

* JWT
* OAuth2 password bearer
* Password hashing
* Protected API routes

### Development Tools

* Visual Studio Code
* Git
* GitHub
* PowerShell
* Uvicorn

---

## Backend Architecture

```text
Angular Frontend
       │
       │ HTTP / REST API
       ▼
FastAPI Backend
       │
       ├── Authentication
       ├── Vendors
       ├── Procurement
       ├── Purchase Orders
       ├── Dashboard
       ├── Analytics
       ├── Reports
       ├── Notifications
       └── Audit Logs
       │
       ▼
SQLAlchemy ORM
       │
       ▼
PostgreSQL Database
```

---

## Project Structure

```text
Vendor_Reliability_Backend/
│
├── app/
│   ├── __init__.py
│   ├── auth.py
│   ├── crud.py
│   ├── database.py
│   ├── dependencies.py
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   │
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── analytics.py
│   │   ├── auditlogs.py
│   │   ├── dashboard.py
│   │   ├── export.py
│   │   ├── login.py
│   │   ├── notifications.py
│   │   ├── procurement.py
│   │   ├── purchaseorders.py
│   │   ├── register.py
│   │   ├── reports.py
│   │   ├── users.py
│   │   └── vendors.py
│   │
│   └── services/
│       ├── __init__.py
│       ├── email_service.py
│       └── risk_engine.py
│
├── .gitignore
├── README.md
└── vendor_report.xlsx
```

---

## Database

The application uses **PostgreSQL** as its relational database.

The backend communicates with PostgreSQL using **SQLAlchemy ORM**.

The database layer is responsible for:

* Database connections
* Session management
* ORM models
* Transactions
* CRUD operations
* Relationship management

---

## Environment Configuration

Sensitive configuration should not be committed to GitHub.

Recommended environment variables include:

```text
DATABASE_URL
SECRET_KEY
ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES
```

Example:

```text
DATABASE_URL=postgresql://username:password@localhost:5432/vendor_reliability_db
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

> Never commit real passwords, database credentials, API keys, or JWT secrets to a public repository.

---

## Getting Started

### Prerequisites

Install the following:

* Python 3.12+
* PostgreSQL
* Git
* Visual Studio Code

Verify Python:

```bash
python --version
```

Verify PostgreSQL is available and running.

---

## Clone the Repository

```bash
git clone https://github.com/Hrishi18162/vendor-reliability-backend.git
```

Move into the project:

```bash
cd vendor-reliability-backend
```

---

## Create a Virtual Environment

Create the environment:

```bash
python -m venv venv
```

Activate it on Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

If PowerShell execution policy prevents activation, you can use:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then activate again:

```powershell
.\venv\Scripts\Activate.ps1
```

---

## Install Dependencies

If `requirements.txt` is available:

```bash
pip install -r requirements.txt
```

If dependencies need to be installed manually, the project uses packages such as:

```bash
pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic python-jose passlib
```

---

## Configure PostgreSQL

Create the PostgreSQL database:

```text
vendor_reliability_db
```

Configure the database connection using your environment configuration.

Do not publish database passwords or credentials.

---

## Run the Backend

Start the FastAPI development server:

```bash
python -m uvicorn app.main:app --reload
```

The backend will normally run at:

```text
http://127.0.0.1:8000
```

---

## API Documentation

FastAPI automatically provides interactive API documentation.

### Swagger UI

```text
http://127.0.0.1:8000/docs
```

### ReDoc

```text
http://127.0.0.1:8000/redoc
```

Swagger can be used to:

* Test APIs
* Register users
* Login
* Create vendors
* Manage procurement
* Create purchase orders
* Test analytics
* Test reports
* Test notifications
* Test audit logs

---

## API Modules

The backend contains API routers for:

| Module          | Router              |
| --------------- | ------------------- |
| Authentication  | `login.py`          |
| Registration    | `register.py`       |
| Users           | `users.py`          |
| Vendors         | `vendors.py`        |
| Procurement     | `procurement.py`    |
| Purchase Orders | `purchaseorders.py` |
| Dashboard       | `dashboard.py`      |
| Analytics       | `analytics.py`      |
| Reports         | `reports.py`        |
| Notifications   | `notifications.py`  |
| Audit Logs      | `auditlogs.py`      |
| Export          | `export.py`         |

---

## Authentication Flow

```text
User
 │
 ▼
Angular Login
 │
 ▼
POST /users/login
 │
 ▼
FastAPI Authentication
 │
 ▼
Validate Credentials
 │
 ▼
Generate JWT
 │
 ▼
Angular Stores Token
 │
 ▼
Authenticated API Requests
```

Protected endpoints require a valid authentication token.

---

## Application Data Flow

```text
Angular Frontend
       │
       │ REST API
       ▼
FastAPI Router
       │
       ▼
Pydantic Schema
       │
       ▼
CRUD Layer
       │
       ▼
SQLAlchemy ORM
       │
       ▼
PostgreSQL
```

---

## Testing

API endpoints can be tested using FastAPI Swagger:

```text
http://127.0.0.1:8000/docs
```

Recommended testing sequence:

```text
1. Register User
2. Login
3. Obtain JWT Token
4. Authorize Swagger
5. Create Vendor
6. Retrieve Vendors
7. Create Procurement
8. Create Purchase Order
9. Check Dashboard
10. Check Analytics
11. Check Reports
12. Check Notifications
13. Check Audit Logs
```

---

## Vendor Risk Evaluation

The backend includes a risk engine service:

```text
app/services/risk_engine.py
```

The risk engine is responsible for vendor reliability and risk evaluation.

Performance factors can include:

```text
Delivery Score
Quality Score
Payment Score
Compliance Score
        ↓
Reliability Calculation
        ↓
Risk Level
```

This allows procurement teams to identify vendors that may require closer monitoring.

---

## Export & Reporting

The backend includes export/report functionality for procurement and vendor-related information.

The export functionality can be extended to support formats such as:

* Excel
* CSV
* PDF

---

## Security

Security considerations include:

* Password hashing
* JWT authentication
* Protected API routes
* Authorization dependencies
* Environment-based secrets
* Database access control
* Input validation
* API validation using Pydantic

For production deployment:

* Use HTTPS.
* Use secure secret keys.
* Store credentials in environment variables.
* Restrict database access.
* Configure appropriate CORS origins.
* Never expose development credentials.

---

## Development Status

### Milestone 1 — Backend Foundation

* [x] FastAPI application setup
* [x] PostgreSQL database integration
* [x] SQLAlchemy models
* [x] Pydantic schemas
* [x] User registration
* [x] User login
* [x] JWT authentication
* [x] Vendor management
* [x] Vendor reliability scoring
* [x] Risk-level calculation
* [x] Procurement management
* [x] Purchase order management
* [x] Dashboard API
* [x] Analytics API
* [x] Reports API
* [x] Notifications API
* [x] Audit log API
* [x] Export API
* [x] Swagger documentation
* [x] GitHub repository

### Future Enhancements

* [ ] Advanced risk prediction
* [ ] Automated vendor alerts
* [ ] Advanced analytics
* [ ] Role-based access control
* [ ] Email notification automation
* [ ] Automated report generation
* [ ] Advanced audit monitoring
* [ ] API rate limiting
* [ ] Automated backend testing
* [ ] CI/CD pipeline
* [ ] Production deployment

---

## Frontend Repository

The Angular frontend is maintained in a separate repository:

[https://github.com/Hrishi18162/vendor-reliability-frontend](https://github.com/Hrishi18162/vendor-reliability-frontend)

---

## Local Development URLs

### Backend

```text
http://127.0.0.1:8000
```

### Swagger

```text
http://127.0.0.1:8000/docs
```

### ReDoc

```text
http://127.0.0.1:8000/redoc
```

### Angular Frontend

```text
http://localhost:4200
```

---

## Author

**Hrishi18162**

GitHub:

[https://github.com/Hrishi18162](https://github.com/Hrishi18162)

---

## License

This project is currently intended for educational, development, and project demonstration purposes.

A formal open-source license can be added when the project is ready for public distribution.

---

## Project Summary

The **Vendor Reliability Intelligence & Procurement Risk Management Platform** provides a centralized backend for vendor performance monitoring, procurement management, risk assessment, purchase order tracking, analytics, reporting, notifications, and audit logging.

The FastAPI backend serves as the core API layer between the Angular frontend and PostgreSQL database, providing secure and structured access to procurement and vendor information.

The platform aims to help procurement teams **identify vendor risks, improve supplier visibility, monitor procurement performance, and make data-driven procurement decisions**.

