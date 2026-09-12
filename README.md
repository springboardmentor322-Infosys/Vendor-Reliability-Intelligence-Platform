# Vendor Reliability Intelligence & Procurement Risk Management Platform (VendorIQ)

VendorIQ is a full-stack web application designed to evaluate vendor reliability, monitor procurement operations, analyze supply-chain performance, manage contracts, process invoices and payments, maintain audit trails, and support data-driven procurement decision-making through centralized role-based dashboards and analytics.

The platform uses the **DataCo Supply Chain Dataset** as its primary operational data source. Supply-chain transaction data is processed using **Python and Pandas**, stored in **PostgreSQL**, and exposed through **FastAPI REST APIs** to the HTML/CSS/JavaScript frontend.

---

## 1. Problem Statement

Modern supply chains face persistent risks such as delayed deliveries, unreliable suppliers, procurement inefficiencies, payment delays, quality issues, and insufficient transaction visibility.

Organizations need a centralized platform that can:

* Evaluate vendor reliability
* Monitor procurement requests and purchase orders
* Track delivery and shipment performance
* Monitor contracts and compliance
* Manage invoices and payments
* Maintain audit trails
* Provide role-specific access
* Identify delivery and procurement risks
* Support data-driven decision-making

VendorIQ addresses these requirements through an integrated procurement and vendor-reliability management platform.

---

## 2. Key Features

### 🔐 Authentication & Security

* JWT-based authentication
* User registration and login
* Password hashing
* Role-Based Access Control (RBAC)
* Role-specific authorization
* User approval workflow
* Vendor-specific access restrictions
* Protected API endpoints

### 👥 Role-Based Access

The platform supports six organizational roles:

1. **Administrator**
2. **Procurement Manager**
3. **Supply Chain Manager**
4. **Finance Officer**
5. **Auditor**
6. **Vendor**

Each role receives access only to the functionality required for its responsibilities.

### 🏢 Vendor Management

* Vendor registration and mapping
* Vendor information management
* Vendor-specific dashboards
* Vendor performance monitoring
* Vendor reliability analysis
* Vendor-specific procurement visibility

The DataCo dataset does not contain a dedicated vendor identifier. Therefore, vendor entities are derived from the available **Product Card Id** information.

The current processed dataset represents approximately **118 vendor entities**.

### 📊 Vendor Reliability Analysis

Vendor performance is evaluated using:

* Total Orders
* Late Orders
* Average Shipping Days
* Average Scheduled Shipping Days
* Total Sales
* On-Time Delivery Rate
* Late Delivery Rate
* Reliability Score
* Reliability Status

### 📝 Procurement Management

* Procurement Requests
* Purchase Orders
* Purchase Order status tracking
* Vendor selection
* Quantity and pricing management
* Purchase order monitoring
* Procurement dashboard
* Purchase Order filtering
* Order Slip generation

### 🚚 Supply Chain & Delivery Monitoring

* Shipment monitoring
* Delivery status tracking
* Delivery delay analysis
* Late-delivery risk monitoring
* Supply-chain KPIs
* Delivery performance charts
* Active alerts
* Track Shipments workflow

### 📄 Contract Management

* Contract creation and monitoring
* Contract information management
* Contract status tracking
* Contract monitoring
* Compliance-related information

### 💰 Invoice & Payment Management

* Invoice creation and monitoring
* Invoice status management
* Finance-authorized payment operations
* Payment tracking
* Advance payment support
* Partial payment tracking
* Remaining payment calculation
* Final payment tracking
* Payment status monitoring
* Role-based invoice access

The payment workflow supports staged payment processing such as:

```text
Purchase Order
      ↓
Advance Payment
      ↓
Partially Paid
      ↓
Delivery / Completion
      ↓
Final Payment
      ↓
Paid
```

Payment operations are protected by authorization rules to prevent unauthorized users from performing financial actions.

### 📦 Order Slip / PDF Generation

The platform supports generating downloadable **Purchase Order / Order Slip PDF documents**.

Order slips can be accessed by authorized roles including:

* Administrator
* Procurement Manager
* Finance Officer
* Supply Chain Manager
* Owning Vendor

PDF generation is implemented using **ReportLab**.

### 🔎 Auditor Dashboard

The Auditor role provides read-oriented access for independent review and verification.

The Auditor dashboard supports:

* Transaction tracing
* Approval verification
* Audit findings
* Evidence review
* Compliance reporting
* Audit log monitoring
* Analytical information

The Auditor does not perform normal procurement or financial modification operations.

### 🧪 Quality Monitoring

* Quality inspection information
* Quality monitoring
* Quality-related records and analysis

### 🔔 Notifications

The platform provides notifications for relevant system activities and events.

### 📋 Audit Logs

Important system activities are recorded through audit logs to support:

* Transaction traceability
* Activity monitoring
* Approval verification
* Accountability
* Auditing

### 📈 Reports & Analytics

The platform provides analytical information for:

* Vendor performance
* Vendor reliability
* Procurement
* Supply-chain performance
* Delivery delays
* Financial activity
* Audit review

### 🤖 Machine Learning — Delivery Delay Prediction

VendorIQ includes a machine-learning module for delivery-delay prediction.

The ML module contains:

* Model training
* Prediction
* Model explanation
* Model metadata
* Feature importance
* Drift baseline
* Model artifacts
* Candidate model artifacts
* Retraining support

The current implementation uses a **HistGradientBoosting-based delivery-delay prediction model**.

The model is designed to estimate the probability of transit/delivery delay using available pre-fulfillment parameters.

---

## 3. Dataset

The project uses the **DataCo Supply Chain Dataset** as its primary supply-chain transaction source.

### Dataset Information

| Attribute               |   Value |
| ----------------------- | ------: |
| Total Records           | 180,519 |
| Total Columns           |      53 |
| Unique Product Card IDs |     118 |
| Categories              |      50 |
| Order Status Types      |       9 |
| Delivery Status Types   |       4 |

### Important Dataset Fields

The analysis uses fields including:

* Order Id
* Product Name
* Category Name
* Order Status
* Delivery Status
* Days for shipping (real)
* Days for shipment (scheduled)
* Late_delivery_risk
* Order Item Quantity
* Order Item Product Price
* Sales
* Order Item Total
* Order Date
* Shipping Date
* Product Card Id

The dataset is processed using Python/Pandas and imported into PostgreSQL through the project's data-processing and import pipeline.

---

## 4. Vendor Reliability Analysis

The platform derives vendor-level performance information from the available supply-chain transaction data.

The analysis includes:

* Total Orders
* Late Orders
* Average Shipping Days
* Average Scheduled Shipping Days
* Total Sales
* On-Time Delivery Rate
* Late Delivery Rate
* Reliability Score
* Reliability Status

The current processed dataset represents approximately:

* **118 vendor entities**
* **180,519 supply-chain transaction records**

Because the original dataset does not provide a dedicated vendor column, the project derives vendor entities from **Product Card Id**.

---

## 5. Technology Stack

### Backend

* Python 3.12+
* FastAPI
* Uvicorn
* SQLAlchemy
* PostgreSQL
* JWT Authentication
* Password Hashing

### Data Processing

* Python
* Pandas
* CSV
* DataCo Supply Chain Dataset

### Machine Learning

* Python
* Scikit-learn
* HistGradientBoosting
* Model artifacts
* Feature importance analysis
* Model metadata
* Drift baseline
* Prediction and retraining utilities

### Frontend

* HTML5
* CSS3
* Vanilla JavaScript
* Chart.js

### Export & Reporting

* Pandas
* OpenPyXL
* ReportLab

### Deployment

* Docker
* Docker Compose

---

## 6. System Architecture

```text
                  +--------------------------------+
                  |      DataCo CSV Dataset        |
                  +---------------+----------------+
                                  |
                                  v
                  +-------------------------------+
                  |    Python / Pandas Processing  |
                  +---------------+---------------+
                                  |
                                  v
                  +-------------------------------+
                  |       PostgreSQL Database      |
                  +---------------+---------------+
                                  |
                                  v
                  +-------------------------------+
                  |       FastAPI Backend          |
                  |          + Uvicorn             |
                  +---------------+---------------+
                                  |
                         REST API / JSON
                                  |
                                  v
                  +-------------------------------+
                  |       HTML / CSS / JS          |
                  |        Frontend Application    |
                  +---------------+---------------+
                                  |
             +--------------------+--------------------+
             |         |          |         |           |
             v         v          v         v           v
          Admin   Procurement  Supply    Finance     Auditor
                              Chain
                                  |
                                  v
                              Vendor
```

---

## 7. Data Processing Pipeline

```text
DataCoSupplyChainDataset.csv
            |
            v
      Data Validation
            |
            v
       Data Cleaning
            |
            v
    Pandas Transformation
            |
            v
    Vendor-Level Analysis
            |
            v
       PostgreSQL
            |
            v
        FastAPI APIs
            |
            v
      JavaScript fetch()
            |
            v
     Frontend Dashboards
            |
            v
   Role-Based Application
```

The system processes the large supply-chain dataset through the backend rather than transferring all records directly to the browser.

---

## 8. Machine Learning Pipeline

The delivery-delay prediction module follows a model lifecycle consisting of:

```text
Historical Supply-Chain Data
             |
             v
       Data Preparation
             |
             v
       Feature Processing
             |
             v
      Model Training
             |
             v
   HistGradientBoosting Model
             |
             v
     Model Evaluation
             |
             v
       Model Artifact
             |
             v
       Prediction API
             |
             v
     Delivery Risk Output
```

The ML module also contains utilities for:

* Prediction
* Explanation
* Feature importance
* Model metadata
* Retraining
* Candidate model evaluation
* Drift baseline information

---

## 9. Folder Structure

```text
Vendor-Reliability-Intelligence-Platform/
│
├── backend/
│   ├── analytics.py
│   ├── audit_logs.py
│   ├── auth.py
│   ├── communication.py
│   ├── contract.py
│   ├── dashboard.py
│   ├── db.py
│   ├── delivery.py
│   ├── invoices.py
│   ├── main.py
│   ├── notifications.py
│   ├── predictions.py
│   ├── purchase.py
│   ├── purchase_request.py
│   ├── quality.py
│   ├── report.py
│   ├── vendor.py
│   ├── vendor_performance.py
│   ├── vendor_reliability.py
│   ├── order_slip.py
│   ├── migrate_auditor.py
│   ├── migrate_budget_pos.py
│   ├── setup_vendor_credentials.py
│   │
│   └── ml/
│       ├── __init__.py
│       ├── explain.py
│       ├── predict.py
│       ├── retrain.py
│       ├── train_model.py
│       ├── model_metadata.json
│       ├── artifacts/
│       │   ├── delivery_delay_model.joblib
│       │   ├── drift_baseline.json
│       │   ├── feature_importance.json
│       │   └── candidates/
│       │
│       └── requirements.txt
│
├── data/
│   ├── DataCoSupplyChainDataset.csv
│   └── vendor_reliability_analysis.csv
│
├── frontend/
│   ├── css/
│   ├── js/
│   ├── images/
│   └── *.html
│
├── scratch/
│   └── testing and verification scripts
│
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── LICENSE
├── PHASE1_SUMMARY.md
├── check_data.py
├── check_schema.py
├── data_analysis.py
├── fix_schema.py
├── import_csv_pipeline.py
├── import_vendor_data.py
├── phase1_inspect.py
├── phase2_3_products.py
├── phase4_generate_vendors.py
├── phase5_vendor_products.py
├── phase6_deliveries.py
├── vendor_analysis.py
└── README.md
```

---

## 10. Database Setup

The project uses **PostgreSQL**.

### Step 1: Create Database

Create a PostgreSQL database named:

```text
vendor_platform
```

### Step 2: Configure Environment Variables

Copy the provided environment template:

```bash
cp .env.example .env
```

Update the database configuration in `.env` according to the local PostgreSQL setup.

> Do not commit real passwords, secrets, or private credentials to GitHub.

### Step 3: Import Dataset

Run:

```bash
python import_csv_pipeline.py
```

The pipeline processes the DataCo Supply Chain Dataset and imports the required data into PostgreSQL.

---

## 11. Running the Project Locally

### Prerequisites

Make sure the following are installed:

* Python 3.12+
* PostgreSQL
* Git

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd Vendor-Reliability-Intelligence-Platform
```

### Step 2: Create Virtual Environment

```bash
python -m venv .venv
```

Activate it on Windows:

```bash
.venv\Scripts\activate
```

### Step 3: Install Dependencies

```bash
pip install -r backend/requirements.txt
```

### Step 4: Configure PostgreSQL

Create the:

```text
vendor_platform
```

database and configure the required environment variables.

### Step 5: Import Dataset

```bash
python import_csv_pipeline.py
```

### Step 6: Start FastAPI

```bash
python -m uvicorn backend.main:app --reload --port 8000
```

### Step 7: Open Swagger API Documentation

```text
http://127.0.0.1:8000/docs
```

### Step 8: Open Frontend

```text
http://127.0.0.1:8000/frontend/login.html
```

---

## 12. Running with Docker

The project supports containerized execution using Docker and Docker Compose.

Build and start the application:

```bash
docker-compose up --build
```

Docker Compose starts the required application services and connects the backend with PostgreSQL according to the project configuration.

---

## 13. User Roles & Responsibilities

| Role                     | Main Responsibilities                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| **Administrator**        | User approval, vendor management, system monitoring, audit logs, and administrative operations          |
| **Procurement Manager**  | Procurement requests, purchase orders, contracts, vendor-related procurement activities                 |
| **Supply Chain Manager** | Delivery monitoring, shipment analytics, delays, alerts, and supply-chain performance                   |
| **Finance Officer**      | Invoice monitoring, payment processing, and financial operations                                        |
| **Auditor**              | Transaction review, approval verification, audit logs, evidence, findings, and compliance analysis      |
| **Vendor**               | Vendor-specific procurement, performance, invoice, quality, communication, and notification information |

---

## 14. Role-Based Workflow

### Administrator

```text
Login
  ↓
Admin Dashboard
  ↓
User Approval / Vendor Management
  ↓
System Monitoring
  ↓
Audit Logs
```

### Procurement Manager

```text
Login
  ↓
Procurement Dashboard
  ↓
Purchase Request
  ↓
Vendor Selection
  ↓
Purchase Order
  ↓
Order Slip
  ↓
Delivery / Finance Workflow
```

### Supply Chain Manager

```text
Login
  ↓
Supply Chain Dashboard
  ↓
Shipment Monitoring
  ↓
Track Shipments
  ↓
Delivery Status
  ↓
Delay / Risk Analysis
```

### Finance Officer

```text
Login
  ↓
Finance Dashboard
  ↓
Invoice
  ↓
Advance / Partial Payment
  ↓
Final Payment
  ↓
Paid
```

### Auditor

```text
Login
  ↓
Auditor Dashboard
  ↓
Trace Transaction
  ↓
Approval Verification
  ↓
Evidence / Findings
  ↓
Audit Logs / Compliance Reports
```

### Vendor

```text
Login
  ↓
Vendor Dashboard
  ↓
Own Purchase Orders
  ↓
Own Contracts / Invoices
  ↓
Performance / Quality
  ↓
Notifications
```

---

## 15. API Overview

The FastAPI backend exposes REST APIs for the major application modules.

| Module         | Purpose                                                |
| -------------- | ------------------------------------------------------ |
| Authentication | Login, registration, authentication, and authorization |
| Vendors        | Vendor management and vendor information               |
| Dashboard      | Dashboard statistics and KPIs                          |
| Procurement    | Procurement requests and purchase orders               |
| Contracts      | Contract management                                    |
| Deliveries     | Delivery and shipment analysis                         |
| Invoices       | Invoice management and payment status                  |
| Quality        | Quality inspection records                             |
| Notifications  | System notifications                                   |
| Audit Logs     | System activity monitoring                             |
| Reports        | Vendor and procurement reports                         |
| Predictions    | Delivery-delay prediction functionality                |

Interactive API documentation is available at:

```text
http://127.0.0.1:8000/docs
```

---

## 16. Testing & Verification

The application can be tested using the FastAPI Swagger interface, frontend workflows, and project verification scripts.

### Backend Testing

After starting FastAPI:

```text
http://127.0.0.1:8000/docs
```

The following functionality can be tested:

* User registration
* User login
* JWT authentication
* Role-based authorization
* Vendor management
* Procurement requests
* Purchase orders
* Contract management
* Delivery APIs
* Invoice operations
* Payment workflow
* Quality inspection APIs
* Notification APIs
* Audit log APIs
* Dashboard APIs
* Reporting APIs
* Prediction APIs

### Verification Scripts

The project also contains verification scripts under:

```text
scratch/
```

These scripts support testing of authentication, RBAC, invoices, vendor security, purchase orders, and application setup.

---

## 17. Performance Considerations

The project works with a large dataset containing more than 180,000 transaction records.

To improve application performance, the system should use:

* Server-side pagination
* Database-level filtering
* Aggregated API responses
* Efficient SQL queries
* Backend data processing
* Dashboard-specific queries

Large datasets should not be unnecessarily transferred to the browser.

---

## 18. Security Considerations

The application implements several security controls:

* JWT authentication
* Password hashing
* Role-Based Access Control
* Protected API endpoints
* Role-specific frontend access
* Vendor-specific data access
* Finance authorization for payment operations
* Auditor read-oriented access
* Audit logging
* Prevention of unauthorized cross-vendor access

Sensitive configuration such as database passwords and secret keys should be stored in environment variables and should not be committed to the repository.

---

## 19. Future Scope & Limitations

Possible future improvements include:

* Database optimization using indexes and materialized views
* Cloud object storage for documents and attachments
* Advanced vendor-risk prediction
* Real-time supply-chain alerts
* Cloud deployment
* Advanced forecasting
* Anomaly detection
* More sophisticated vendor-risk models
* Production-scale monitoring and observability

---

## 20. Project Demonstration

### 📺 Project Demonstration

**Vendor Reliability Intelligence Platform – Project Demo**

🎥 [▶️ Watch the Complete Project Demo](https://drive.google.com/file/d/1fdhtNMnlMN92iyZkLNYD3YpdihS36mF0/view?usp=drive_link)

The project demonstration covers the major functionalities of the platform, including:

* User Registration and Login
* Role-Based Access Control
* User Approval
* Vendor Management
* Vendor Reliability Analysis
* Procurement Management
* Purchase Order Monitoring
* Order Slip Generation
* Supply Chain Dashboard
* Delivery Performance Analysis
* Delivery Risk Prediction
* Contract Management
* Invoice Management
* Advance and Partial Payments
* Quality Monitoring
* Notifications
* Audit Logs
* Reports and Analytics
* Auditor Review
* Role-specific Dashboards
---

## 21. License

This project is licensed under the **MIT License**.
