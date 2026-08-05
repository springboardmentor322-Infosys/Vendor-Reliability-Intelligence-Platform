# 🚀 VendorIntel: Vendor Reliability Intelligence Platform

> **Vendor Reliability Intelligence & Procurement Risk Management Platform**

VendorIntel is a full-stack web application designed to enable organizations to evaluate vendor reliability, manage procurement operations, monitor supplier performance, track delivery history, maintain contract compliance, and improve procurement decision-making through centralized dashboards and advanced analytics.

This platform helps procurement teams reduce supply chain risks by providing vendor performance insights, procurement monitoring, contract management, communication tracking, and reliability scoring. It is built for manufacturing companies, retail businesses, logistics organizations, healthcare providers, construction firms, and enterprise procurement departments.

---

## 🎯 Key Outcomes
- ✅ Developed and deployed a full-stack Vendor Reliability Intelligence platform.
- ✅ Implemented secure user authentication and role-based access control.
- ✅ Built vendor registration and supplier management modules.
- ✅ Developed procurement and purchase order management workflows.
- ✅ Implemented vendor reliability scoring based on operational performance.
- ✅ Built contract and compliance monitoring systems.
- ✅ Developed dashboards for procurement analytics and vendor performance.
- ✅ Implemented notifications and procurement alerts.
- ✅ Generated procurement and vendor performance reports.

---

## 🏗️ Architecture & Tech Stack

### **Backend Framework**
- **Language**: Python 3
- **Framework**: FastAPI
- **ORM**: SQLAlchemy
- **Authentication**: JWT & bcrypt (Password Hashing)
- **Server**: Uvicorn

### **Frontend Framework**
- **Core**: Vanilla HTML5, CSS3, JavaScript
- **Styling**: TailwindCSS (via CDN) for a premium glass-morphism aesthetic
- **Charts**: Chart.js

### **Database**
- **Current**: SQLite (for rapid prototyping)
- **Production Ready**: PostgreSQL / MySQL

---

## 🧩 Core Modules

### 1️⃣ User Authentication & Role Management
- Secure User Registration & Login via JWT Authentication.
- Dynamic Role-Based Access Control (RBAC) for Administrators, Procurement Managers, Vendors, and Auditors.

### 2️⃣ Vendor Management Module
- End-to-end vendor profile management and categorization (IT, Logistics, Raw Materials, etc.).
- Strict vendor approval workflows (Pending → Under Review → Approved → Rejected).

### 3️⃣ Procurement Management Module
- Procurement Request (PR) generation with dynamic line-item calculation.
- Automated multi-stage PR approval workflows.
- Purchase Order (PO) creation, vendor assignment, and order tracking (In Progress → Shipped → Delivered).

### 4️⃣ Contract & Compliance Module
- Centralized contract repository with document uploads.
- Tracking of start dates, expiry dates, and automated 30/60/90 day renewal notices.

### 5️⃣ Vendor Performance & Reliability Module
- Dynamic reliability scoring based on delivery history, product quality, communication efficiency, and contract compliance.
- Risk matrix generation and trend analysis.

### 6️⃣ Communication Module
- Thread-based, contextual messaging tied to specific Vendors, PRs, POs, or Contracts.
- Permanent activity and audit logs for compliance tracking.

### 7️⃣ Dashboard & Analytics Module
- Specialized, distinct dashboards for Admins, Procurement Managers, Auditors, and Vendors.
- Real-time visualizations of active POs, vendor performance, and procurement costs.

---

## 🚀 How to Run Locally

### 1. Backend Setup
Navigate to the `backend` directory, install dependencies, and start the FastAPI server:
```bash
cd backend
pip install fastapi uvicorn sqlalchemy python-jose[cryptography] passlib[bcrypt] python-multipart
uvicorn main:app --reload
```
The API and automatic interactive Swagger documentation will be available at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup
Simply serve the `frontend` directory using any local web server, for example:
```bash
# Using Python's built-in HTTP server
cd frontend
python -m http.server 5500
```
Open your browser and navigate to `http://localhost:5500/index.html`.

---

## 📈 Performance Goals
- **Vendor Registration**: Under 3 minutes.
- **Purchase Order Approval**: Within 24 hours.
- **Delivery Monitoring**: 95% On-Time tracking.
- **API Response Time**: < 300 ms.
- **Dashboard Load Time**: < 2 seconds.
