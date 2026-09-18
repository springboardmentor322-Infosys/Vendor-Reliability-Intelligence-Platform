 # Vendor Reliability Intelligence Platform

## Overview

Vendor Reliability Intelligence Platform (VendorIQ) is a web-based procurement and supply-chain management platform designed to help organizations manage vendors, procurement activities, purchase orders, deliveries, contracts, invoices, and vendor performance.

The platform provides role-specific dashboards and data-driven vendor reliability and risk insights to support better procurement and supply-chain decisions.

## Key Features

- Secure authentication with JWT and bcrypt
- Role-based access control
- Role-specific dashboards
- Vendor management and categorization
- Procurement request management
- Vendor comparison and selection
- Purchase order creation and tracking
- Delivery tracking
- Vendor performance and reliability analysis
- Vendor risk-level identification and ranking
- Contract management and expiry monitoring
- Invoice and payment-status management
- Notifications
- Procurement, vendor, financial, and operational analytics
- Audit and compliance monitoring

## User Roles

The platform supports six roles:

- Administrator
- Procurement Manager
- Supply Chain Manager
- Finance Officer
- Vendor
- Auditor

### Role Responsibilities

- **Administrator:** Manages users, vendors, system activities, and administrative insights.
- **Procurement Manager:** Creates and manages procurement requests, evaluates vendors based on reliability and performance, assigns vendors, and manages purchase orders.
- **Supply Chain Manager:** Monitors deliveries, supply-chain activities, vendor reliability, and operational performance.
- **Finance Officer:** Manages invoices, monitors payment status, and reviews financial and spending information.
- **Vendor:** Views assigned purchase orders, tracks order status, and accesses vendor-specific performance information.
- **Auditor:** Reviews audit-related activities, compliance information, and system records.

## Procurement Workflow

The main procurement workflow in VendorIQ is:

1. **Create Procurement Request** – A procurement requirement is created with the required items and details.
2. **Review and Approve Request** – The Procurement Manager reviews and approves the request.
3. **Compare Vendors** – Available vendors are evaluated using vendor performance, reliability, ranking, and related metrics.
4. **Select and Assign Vendor** – A vendor is selected and assigned to the procurement request.
5. **Create Purchase Order** – A purchase order is created for the selected vendor.
6. **Notify Vendor** – The assigned vendor receives the relevant order notification.
7. **Track Order and Delivery** – Purchase order and delivery status can be monitored through the platform.
8. **Evaluate Performance** – Vendor performance and reliability information can be reviewed for future procurement decisions.

## Technology Stack

### Frontend

- React.js
- Vite
- JavaScript
- CSS
- React Router

### Backend

- Node.js
- Express.js
- JWT
- bcrypt

### Database

- PostgreSQL

### Dataset

- DataCo Smart Supply Chain Dataset
- Supporting application data for vendor, procurement, contract, invoice, performance, and notification modules

## Project Structure

```text
Vendor-Reliability-Intelligence-Platform/
├── backend/
├── frontend/
├── .gitignore
├── LICENSE
└── README.md
```

## Running the Project Locally

### Prerequisites

Make sure you have the following installed:

- Node.js
- npm
- PostgreSQL

### Backend Setup

```bash
cd backend
npm install
node server.js
```

The backend runs on:

```text
http://localhost:5000
```

### Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

## Environment Variables

Sensitive information such as database credentials and JWT secrets should be stored in environment variables and should not be committed to the repository.

Example:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vendor_platform
DB_USER=your_database_user
DB_PASSWORD=your_database_password
JWT_SECRET=your_secret_key
```

## Demo

[Google Drive Demo Video](https://drive.google.com/file/d/1bunv0u_LHGE0UTrO7Djk0i5wygOmOaPM/view?usp=sharing)


## License

This project is licensed under the MIT License.

See the [LICENSE](LICENSE) file for details.
