# Vendor Reliability Platform

A web-based Vendor Reliability and Procurement Management System designed to manage vendors, procurement requests, purchase orders, and vendor performance.

## Features

* Vendor Management
* Vendor Categories
* Vendor Approval Workflow
* Procurement Request Management
* Purchase Order Management
* Delivery Tracking
* Vendor Performance Monitoring
* Analytics and Reports
* Notifications
* User Authentication

## Technology Stack

### Backend

* Python
* FastAPI
* SQLAlchemy
* PostgreSQL
* JWT Authentication

### Frontend

* HTML
* CSS
* JavaScript

## Project Modules

### Vendor Management

Manage vendor details, categories, approval status, and vendor information.

### Procurement

Create and manage procurement requests and purchase orders.

### Vendor Performance

Monitor vendor performance based on:

* On-Time Delivery
* Quality Score
* Reliability Score
* Overall Performance Score
* Risk Level

### Reports and Analytics

View procurement and vendor-related analytics and reports.

## How to Run the Backend

Open the terminal inside the `backend` folder and run:

```bash
python -m uvicorn app:app --reload
```

The backend will run locally on:

```text
http://127.0.0.1:8000
```

## Project Structure

```text
VendorReliabilityPlatform/
│
├── backend/
│   ├── app.py
│   ├── database.py
│   └── models.py
│
└── frontend/
    ├── dashboard.html
    ├── vendors.html
    ├── procurement.html
    ├── performance.html
    ├── analytics.html
    ├── reports.html
    ├── notifications.html
    ├── login.html
    ├── register.html
    └── css/
        └── style.css
```

## Project Objective

The objective of this project is to improve vendor reliability and procurement management by providing a centralized platform for managing vendors, purchase orders, performance, and procurement activities.
