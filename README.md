# Vendor Reliability Intelligence & Procurement Risk Management Platform (VendorIQ)

VendorIQ is a full-stack web application designed to evaluate vendor reliability, monitor procurement operations, analyze supply-chain performance, manage contracts, and support data-driven procurement decision-making through centralized dashboards and analytics.

The platform uses the **DataCo Supply Chain Dataset** as its primary operational data source and processes supply-chain transaction data using Python and Pandas before storing and serving the data through PostgreSQL and FastAPI.

---

## 1. Problem Statement

Modern supply chains face persistent risks from delayed deliveries, unreliable suppliers, operational inefficiencies, and contract-related issues. Organizations often lack centralized visibility to analyze vendor performance objectively.

This platform addresses these challenges by processing historical supply-chain transaction data, calculating vendor performance metrics, monitoring procurement activities, tracking deliveries, and providing role-based dashboards for different organizational users.

---

## 2. Key Features

* **JWT Authentication**: Secure login and registration with token-based authentication.
* **Role-Based Access Control (RBAC)**: Role-specific access for Admin, Procurement Manager, Supply Chain Manager, Finance Officer, Auditor, and Vendor.
* **Vendor Management**: Vendor registration, vendor mapping, vendor information, and performance monitoring.
* **Vendor Reliability Analysis**: Calculates vendor-level delivery and reliability metrics from supply-chain transaction data.
* **Procurement Management**: Procurement request and purchase order monitoring.
* **Purchase Order Tracking**: Tracks order status, delivery information, and procurement activities.
* **Supply Chain Dashboard**: Provides shipment, delivery, delay, and performance analytics.
* **Contract Management**: Tracks contract information and compliance-related activities.
* **Invoice Management**: Supports invoice monitoring and authorized payment-status updates.
* **Quality Monitoring**: Records and analyzes quality inspection information.
* **Notifications**: Provides alerts and notifications for relevant system events.
* **Audit Logs**: Maintains records of important system activities.
* **Reports**: Provides analytical reports for procurement and vendor performance.
* **Interactive Dashboards**: Provides data-driven visualizations and KPIs using JavaScript and Chart.js.

---

## 3. Dataset

The project uses the **DataCo Supply Chain Dataset** as the primary source of supply-chain transaction data.

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

The dataset is processed using Python/Pandas and imported into the PostgreSQL database through the project's data import pipeline.

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

The processed dataset currently represents approximately **118 vendor entities** and **180,519 supply-chain transaction records**.

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

## 6. Architecture

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
                                 v
                 +-------------------------------+
                 |      Role-Based Dashboards     |
                 +-------------------------------+
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
```

The system is designed to process the large supply-chain dataset through the backend rather than loading all records directly into the browser.

---

## 8. Folder Structure

```text
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
│   └── js/
│
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── LICENSE
├── PHASE1_SUMMARY.md
│
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
│
└── README.md
```

---

## 9. Database Setup

The project uses **PostgreSQL** as its database.

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

Update the database credentials in `.env` according to your local PostgreSQL configuration.

### Step 3: Import Dataset

Run the CSV import pipeline:

```bash
python import_csv_pipeline.py
```

The pipeline processes the DataCo Supply Chain Dataset and imports the required records into PostgreSQL.

The current dataset contains approximately **180,519 transaction records** and the project derives approximately **118 vendor entities** from the available data.

---

## 10. Running the Project Locally

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

Create the `vendor_platform` database and configure the database credentials in `.env`.

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

### Step 8: Open the Frontend

```text
http://127.0.0.1:8000/frontend/login.html
```

---

## 11. Running with Docker

The project also supports containerized execution using Docker and Docker Compose.

Build and start the application:

```bash
docker-compose up --build
```

Docker Compose starts the required application services and connects the backend with PostgreSQL according to the project configuration.

---

## 12. User Roles

| Role                     | Main Responsibilities                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| **Admin**                | User approval, vendor mapping, system monitoring, audit logs, and administrative operations.        |
| **Procurement Manager**  | Procurement requests, purchase orders, contracts, and vendor-related procurement activities.        |
| **Supply Chain Manager** | Delivery monitoring, shipment analytics, delays, and supply-chain performance.                      |
| **Finance Officer**      | Invoice monitoring and authorized payment-related operations.                                       |
| **Auditor**              | Read-only access to audit information and analytical reports.                                       |
| **Vendor**               | Access to vendor-specific procurement, performance, invoice, quality, and notification information. |

---

## 13. API Overview

The FastAPI backend exposes REST APIs for the major application modules.

| Module         | Purpose                                  |
| -------------- | ---------------------------------------- |
| Authentication | Login, registration, and authorization   |
| Vendors        | Vendor management and vendor information |
| Dashboard      | Dashboard statistics and KPIs            |
| Procurement    | Procurement requests and purchase orders |
| Contracts      | Contract management                      |
| Deliveries     | Delivery and shipment analysis           |
| Invoices       | Invoice management and payment status    |
| Quality        | Quality inspection records               |
| Notifications  | System notifications                     |
| Audit Logs     | System activity monitoring               |
| Reports        | Vendor and procurement reports           |

Interactive API documentation is available through:

```text
http://127.0.0.1:8000/docs
```

---

## 14. Testing

The application can be tested through the FastAPI Swagger interface and the main frontend workflows.

### Backend Testing

After starting the FastAPI server, open:

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
* Quality inspection APIs
* Notification APIs
* Audit log APIs
* Dashboard APIs
* Reporting APIs

### Data Validation

The data-processing scripts can be used to inspect and validate the imported supply-chain dataset before and after database processing.

---

## 15. Performance Considerations

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

## 16. Future Scope & Limitations

* **Database Optimization:** Frequently used aggregation queries can be optimized using database views, indexes, or materialized views.
* **Scalable Storage:** Cloud object storage such as Amazon S3 can be integrated for scalable document and attachment storage.
* **Advanced Prediction:** Machine-learning models can be integrated for predictive vendor-risk and delivery-delay prediction.
* **Real-Time Alerts:** Real-time event-based alerts can be added for critical supply-chain risks.
* **Cloud Deployment:** The application can be deployed on cloud infrastructure for production-scale usage.
* **Advanced Analytics:** Additional forecasting and anomaly-detection models can be integrated into the platform.

---

## 17. Project Demos

### 📺 Project Demonstration

* **Vendor Reliability Intelligence Platform – Project Demo**: [Watch Project Demo on Google Drive](https://drive.google.com/file/d/1yqcuSiCYRlpjdIz0smtO0putaDnRDdc0/view?usp=sharing)
### 📋 Demo Coverage

The project demonstration covers the major functionalities of the Vendor Reliability Intelligence Platform, including:

* User Registration and Login
* Role-Based Access Control
* Vendor Management
* Vendor Reliability Analysis
* Procurement Management
* Purchase Order Monitoring
* Supply Chain Dashboard
* Delivery Performance Analysis
* Contract Management
* Invoice Management
* Quality Monitoring
* Notifications
* Reports and Analytics
* Role-specific Dashboards


## 18. License

This project is licensed under the MIT License.
