# ?? VendorIntel: Vendor Reliability Intelligence Platform

**Vendor Reliability Intelligence & Procurement Risk Management Platform**

VendorIntel is a full-stack web application designed to enable organizations to evaluate vendor reliability, manage procurement operations, monitor supplier performance, track delivery history, maintain contract compliance, and improve procurement decision-making through centralized dashboards and advanced analytics.

This platform helps procurement teams reduce supply chain risks by providing vendor performance insights, procurement monitoring, contract management, communication tracking, and reliability scoring. It is built for manufacturing companies, retail businesses, logistics organizations, healthcare providers, construction firms, and enterprise procurement departments.

---

## ?? Key Outcomes
- ?? **Full-Stack Deployment:** Developed and deployed a full-stack Vendor Reliability Intelligence platform.
- ?? **Security:** Implemented secure user authentication and role-based access control.
- ?? **Vendor Lifecycle:** Built vendor registration and supplier management modules.
- ?? **Procurement:** Developed procurement and purchase order management workflows.
- ?? **Reliability Scoring:** Implemented vendor reliability scoring based on operational performance.
- ?? **Compliance:** Built contract and compliance monitoring systems.
- ?? **Analytics:** Developed interactive dashboards for procurement analytics and vendor performance.
- ?? **Alerts:** Implemented real-time system notifications and procurement alerts.
- ?? **AI Insights:** Generated procurement and vendor performance reports powered by predictive analytics.

---

## ??? Architecture & Tech Stack

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

### **Database & Datasets**
- **Database**: SQLite (for rapid prototyping), ready to be migrated to PostgreSQL/MySQL for production.
- **Datasets**: The platform uses dynamically generated mock enterprise datasets seeded via `backend/seed_db.py`. This dataset populates the environment with test Vendors, Procurement Requests, Purchase Orders, Contracts, Deliveries, and live AI Intelligence data.

---

## ?? Core Modules

1. **User Authentication & Role Management**: Secure User Registration & Login via JWT Authentication. Dynamic Role-Based Access Control (RBAC) for Administrators, Procurement Managers, Vendors, and Auditors.
2. **Vendor Management**: End-to-end vendor profile management and categorization. Strict vendor approval workflows.
3. **Procurement Management**: Procurement Request (PR) generation and Purchase Order (PO) tracking.
4. **Contract & Compliance**: Centralized contract repository with document uploads and renewal tracking.
5. **Vendor Performance & Reliability**: Dynamic reliability scoring based on delivery history and product quality.
6. **Communication Engine**: Thread-based messaging tied to specific Vendors, PRs, POs, or Contracts.
7. **Dashboard & Analytics**: Specialized, distinct dashboards for Admins, Procurement Managers, Auditors, Supply Chain, Finance, and Vendors.

---

## ?? Milestone Documentation
Detailed release notes and milestone tracking documentation can be viewed below:
- [Milestone 1 Documentation](README_MILESTONES/milestone_documentation.md)
- [Milestone 2 Documentation](README_MILESTONES/milestone_2_documentation.md)
- [Milestone 3 Documentation](README_MILESTONES/Milestone_3_README.md)

---

## ?? How to Run Locally

### 1. Backend Setup
Navigate to the `backend` directory, install dependencies, and start the FastAPI server:
```bash
cd backend
pip install -r requirements.txt
# OR manually: pip install fastapi uvicorn sqlalchemy python-jose[cryptography] passlib[bcrypt] python-multipart fpdf2
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

## ? Performance Goals
- **Vendor Registration**: Under 3 minutes.
- **Purchase Order Approval**: Within 24 hours.
- **Delivery Monitoring**: 95% On-Time tracking.
- **API Response Time**: < 300 ms.
- **Dashboard Load Time**: < 2 seconds.


---

## 🎥 Project Demos
- **Milestone 1 & 2 Screen Recording**: [Watch Video on Google Drive](https://drive.google.com/file/d/1UMZ9P47Xoc13c0lfobyR8mvrX4cRYfwV/view?usp=sharing)

---

## 🚀 Recent Enhancements
- **Global Communication Hub**: In-app pop-up Chat modals injected across all dashboards to allow seamless communication regarding Procurement Requests, POs, Contracts, and Vendors without navigating away from the active page. A global Chat icon was added to the main navigation bar.
- **Smart Notification Modals**: Replaced standalone notification pages with interactive pop-up Notification modals inside the navigation bar across all dashboards.
- **Advanced Finance Budgeting & Analytics**: Rebuilt the Finance Dashboard to include a fully dynamic, database-backed Budget Management tool. Finance Officers can now define departmental budgets, instantly track utilization on progress bars, and download specialized Procurement Expenditure Reports (CSV/Excel).
- **Interactive Procurement Workflows**: Wired up functional "Approve" and "Reject" workflows inside the Finance Dashboard, which auto-generate Purchase Orders and update budgets in real-time. Added capabilities to view and download associated invoice documents dynamically.
- **Disputes Evidence System**: Expanded the Contract/Disputes database to support securely uploading and tracking `evidence_url` documents directly within the Vendor Intel system.
