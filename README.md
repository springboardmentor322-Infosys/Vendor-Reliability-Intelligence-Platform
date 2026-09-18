
# Vendor Reliability Intelligence Platform (VRIP)

## Overview

**Vendor Reliability Intelligence Platform (VRIP)** is a full-stack web application developed to manage vendor reliability, procurement activities, purchase orders, vendor performance, compliance, and supply chain operations through a centralized platform.

The project contains both the **Angular frontend** and **FastAPI backend**. The frontend communicates with the backend through REST APIs, while **PostgreSQL** is used for persistent data storage.

The platform evaluates vendor performance using multiple reliability factors and provides risk classification, dashboards, analytics, reports, notifications, and audit tracking.

## Project Highlights

* Full-stack vendor reliability and procurement management platform
* Angular and TypeScript based frontend
* Python and FastAPI based backend
* PostgreSQL database integration
* JWT authentication and role-based access control
* Automated vendor reliability scoring and risk classification
* Procurement and purchase order management
* Vendor performance and compliance monitoring
* Interactive dashboards and analytics
* Supply chain performance analysis
* PDF reports and Excel data export
* Notifications, alerts, and audit logging

## Key Features

### Authentication and Authorization

* User registration and login
* JWT-based authentication
* Role-based access control (RBAC)
* Protected frontend routes
* Authorized backend API endpoints

### Vendor Management

* Vendor registration and management
* Vendor contact and business information
* Delivery, quality, payment, and compliance scoring
* Automatic reliability score calculation
* Vendor risk classification
* Vendor status monitoring

### Vendor Reliability and Risk Assessment

Vendor reliability is calculated using four performance factors:

* Delivery Score
* Quality Score
* Payment Score
* Compliance Score

The four scores are averaged to calculate the overall vendor reliability score.

| Reliability Score | Risk Level |
| ----------------- | ---------- |
| 80 – 100          | Low        |
| 50 – 79.99        | Medium     |
| Below 50          | High       |

### Procurement Management

* Create procurement requests
* Manage procurement records
* Track procurement status
* Associate procurement requests with vendors

### Purchase Order Management

* Create and manage purchase orders
* Track order status
* Monitor quantities and prices
* Track defective units
* Monitor compliance
* Link purchase orders with vendors and procurement requests

### Dashboard and Analytics

* Vendor statistics
* Procurement statistics
* Risk-level distribution
* Purchase order monitoring
* Vendor performance analysis
* Supply chain analytics
* Interactive charts using Chart.js

### Reports and Data Export

* Vendor reports
* Procurement reports
* PDF report generation
* Excel data export

### Notifications and Alerts

* Vendor risk alerts
* Procurement activity notifications
* Purchase order notifications
* System activity monitoring
* Risk warnings and critical alerts

### Audit Logs

* Record important system activities
* Track user actions
* Monitor vendor-related activities
* Monitor purchase order activities
* Support system traceability

### Supply Chain Analytics

* Order status analysis
* Supplier performance analysis
* Category-wise analysis
* Compliance analysis
* Defective unit analysis
* Purchase value analysis
* Dataset-based analytics

## Technology Stack

| Layer             | Technologies                     |
| ----------------- | -------------------------------- |
| Frontend          | Angular, TypeScript, HTML5, CSS3 |
| Visualization     | Chart.js                         |
| Backend           | Python, FastAPI                  |
| ORM               | SQLAlchemy                       |
| Database          | PostgreSQL                       |
| Authentication    | JWT, Passlib, bcrypt             |
| Reporting         | ReportLab                        |
| Data Export       | OpenPyXL                         |
| API Documentation | Swagger / OpenAPI                |
| Version Control   | Git, GitHub                      |

## Frontend and Backend

### Frontend

The frontend is developed using **Angular and TypeScript**.

It provides the user interface for:

* Authentication
* Dashboard
* Vendor Management
* Procurement Management
* Purchase Orders
* Reports
* Analytics
* Notifications
* Audit Logs
* Supply Chain Analytics

Frontend source code:

```text
frontend/
```

### Backend

The backend is developed using **Python and FastAPI**.

It provides REST APIs for:

* Authentication and authorization
* Vendor management
* Procurement management
* Purchase orders
* Vendor performance
* Contracts and compliance
* Reports and exports
* Notifications
* Audit logs
* Analytics
* Supply chain management

Backend source code:

```text
backend/
```

### Application Architecture

```text
                    VRIP APPLICATION

┌───────────────────────────────┐
│      Angular Frontend         │
│        TypeScript             │
└───────────────┬───────────────┘
                │
                │ REST API
                ▼
┌───────────────────────────────┐
│       FastAPI Backend         │
│          Python               │
└───────────────┬───────────────┘
                │
                │ SQLAlchemy
                ▼
┌───────────────────────────────┐
│       PostgreSQL Database     │
└───────────────────────────────┘
```

## Project Structure

```text
Vendor-Reliability-Intelligence-Platform/
│
├── backend/                              # FastAPI backend
│   ├── app/
│   │   ├── routers/
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── database.py
│   │   ├── auth.py
│   │   └── main.py
│   ├── data/
│   └── requirements.txt
│
├── frontend/                             # Angular frontend
│   ├── src/
│   │   ├── app/
│   │   ├── assets/
│   │   └── environments/
│   ├── angular.json
│   ├── package.json
│   └── tsconfig.json
│
├── LICENSE
├── README.md
└── Python_Vendor Reliability Intelligence Platform.pdf
```

## Installation and Setup

### Prerequisites

Install the following before running the project:

* Python 3.12 or compatible version
* Node.js and npm
* Angular CLI
* PostgreSQL
* Git

### Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate the environment on Windows:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure the PostgreSQL database according to the backend database configuration.

Start the FastAPI server:

```bash
python -m uvicorn app.main:app --reload
```

Backend API:

```text
http://127.0.0.1:8000
```

Swagger API documentation:

```text
http://127.0.0.1:8000/docs
```

### Frontend Setup

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the Angular development server:

```bash
ng serve
```

Frontend application:

```text
http://localhost:4200
```

## Application Modules

The platform consists of the following major modules:

* Authentication
* Dashboard
* Vendor Management
* Procurement Management
* Purchase Orders
* Vendor Performance
* Contracts and Compliance
* Reports
* Analytics
* Supply Chain Analytics
* Notifications
* Audit Logs

## Security

VRIP implements:

* JWT-based authentication
* Password hashing
* Role-based access control
* Protected API endpoints
* Protected frontend routes
* Authorization headers for API requests

## API Documentation

The FastAPI backend provides interactive API documentation through Swagger UI:

```text
http://127.0.0.1:8000/docs
```

## Future Enhancements

* Predictive vendor risk analysis
* Advanced supplier performance forecasting
* Automated supplier recommendations
* Email and real-time notifications
* Docker containerization
* Cloud deployment
* Advanced business intelligence dashboards

## License

This project is licensed under the **MIT License**.

## Author

**Hrishitha Kotte**

**Project:** Vendor Reliability Intelligence Platform (VRIP)
