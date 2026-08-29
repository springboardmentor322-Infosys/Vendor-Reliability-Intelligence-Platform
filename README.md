<div align="center">
  <h1>📊 VendorIntel</h1>
  <p><strong>Vendor Reliability Intelligence & Procurement Risk Management Platform</strong><br>
  <em> by B P S KRUTHI</em></p>

  <p>
    <a href="#-key-outcomes"><img src="https://img.shields.io/badge/Status-Active-success.svg" alt="Status" /></a>
    <a href="#-architecture--tech-stack"><img src="https://img.shields.io/badge/Python-3.x-blue.svg" alt="Python" /></a>
    <a href="#-architecture--tech-stack"><img src="https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi" alt="FastAPI" /></a>
    <a href="#-architecture--tech-stack"><img src="https://img.shields.io/badge/Frontend-Vanilla_JS_%7C_Tailwind-orange.svg" alt="Frontend" /></a>
  </p>
</div>

---

VendorIntel is a comprehensive full-stack web application designed to empower organizations to evaluate vendor reliability, manage procurement operations, monitor supplier performance, track delivery history, maintain contract compliance, and elevate procurement decision-making through centralized dashboards and advanced analytics.

Built for **manufacturing companies, retail businesses, logistics organizations, healthcare providers, construction firms, and enterprise procurement departments**, this platform actively mitigates supply chain risks by providing actionable vendor performance insights and robust procurement monitoring.

---

## 🎯 Key Outcomes

- 🚀 **Full-Stack Deployment:** Developed and deployed a responsive, full-stack intelligence platform.
- 🔒 **Security:** Implemented secure user authentication and dynamic role-based access control (RBAC).
- 👥 **Vendor Lifecycle:** Built end-to-end vendor registration and supplier management modules.
- 🛒 **Procurement:** Developed structured procurement requests and purchase order management workflows.
- ⭐ **Reliability Scoring:** Implemented data-driven vendor reliability scoring based on operational metrics.
- ⚖️ **Compliance:** Built centralized contract repositories and compliance monitoring systems.
- 📈 **Analytics:** Developed interactive dashboards for procurement analytics and vendor performance.
- 🔔 **Alerts:** Implemented real-time system notifications and procurement alerts.
- 🧠 **AI Insights:** Generated procurement and vendor performance reports powered by predictive analytics.

---

## 🏗️ Architecture & Tech Stack

### ⚙️ Backend
- **Language**: Python 3
- **Framework**: FastAPI (High-performance API framework)
- **ORM**: SQLAlchemy
- **Authentication**: JWT & bcrypt (Secure Password Hashing)
- **Server**: Uvicorn

### 🎨 Frontend
- **Core**: HTML5, CSS3, Vanilla JavaScript
- **Styling**: TailwindCSS (via CDN) for a premium, modern glass-morphism aesthetic
- **Visualizations**: Chart.js for data-rich dashboards

### 🗄️ Database & Datasets
- **Database**: SQLite (optimized for rapid prototyping), architected for seamless migration to PostgreSQL/MySQL in production.
- **Datasets**: Populated via dynamically generated mock enterprise datasets (`backend/seed_db.py`), which seeds test Vendors, Procurement Requests, Purchase Orders, Contracts, Deliveries, and live AI Intelligence data.

---

## 🧩 Core Modules

1. **🔐 User Authentication & Role Management**: Secure User Registration & Login via JWT Authentication. Dynamic Role-Based Access Control (RBAC) tailored for Administrators, Procurement Managers, Vendors, and Auditors.
2. **🏢 Vendor Management**: End-to-end vendor profile management, categorization, and strict vendor approval workflows.
3. **📦 Procurement Management**: Streamlined Procurement Request (PR) generation and Purchase Order (PO) tracking.
4. **📜 Contract & Compliance**: Centralized contract repository with dispute evidence tracking, document uploads, and renewal monitoring.
5. **⭐ Vendor Performance & Reliability**: Dynamic, auto-calculated reliability scoring based on historical delivery timelines and product quality.
6. **💬 Communication Engine**: Contextual, thread-based messaging directly tied to specific Vendors, PRs, POs, or Contracts. Includes a global in-app pop-up Chat hub.
7. **📊 Dashboards & Analytics**: Specialized, distinct dashboard views for Admins, Procurement Managers, Auditors, Supply Chain, Finance, and Vendors.

---

## 🚀 Recent Enhancements

- ✨ **Global Communication Hub**: In-app pop-up Chat modals injected across all dashboards for seamless communication without navigating away from the active page.
- ✨ **Smart Notification Modals**: Interactive pop-up Notification modals integrated inside the navigation bar across all dashboards.
- ✨ **Advanced Finance Budgeting**: A newly rebuilt Finance Dashboard featuring dynamic, database-backed Budget Management tools, visual progress bars, and CSV/Excel export capabilities.
- ✨ **Interactive Procurement Workflows**: Fully functional "Approve" and "Reject" workflows inside the Finance Dashboard that auto-generate Purchase Orders and update budgets in real-time.
- ✨ **Disputes Evidence System**: Expanded Contract/Disputes database to support tracking `evidence_url` documents directly within the system.

---

## 📚 Milestone Documentation

Detailed release notes and milestone tracking documentation can be viewed below:
- 📖 [Milestone 1 Documentation](README_MILESTONES/milestone_documentation.md)
- 📖 [Milestone 2 Documentation](README_MILESTONES/milestone_2_documentation.md)
- 📖 [Milestone 3 Documentation](README_MILESTONES/Milestone_3_README.md)

---

## 💻 How to Run Locally

### 1️⃣ Backend Setup
Navigate to the `backend` directory, install dependencies, and start the FastAPI server:

```bash
cd backend
pip install -r requirements.txt
# Alternatively, install manually: 
# pip install fastapi uvicorn sqlalchemy python-jose[cryptography] passlib[bcrypt] python-multipart fpdf2

uvicorn main:app --reload
```
> **Tip:** The API and interactive Swagger documentation will be available at `http://127.0.0.1:8000/docs`.

### 2️⃣ Frontend Setup
Serve the `frontend` directory using any local web server. For example, using Python's built-in HTTP server:

```bash
cd frontend
python -m http.server 5500
```
> Open your browser and navigate to `http://localhost:5500/index.html`.

---

## ⚡ Performance Goals

| Metric | Target |
|--------|--------|
| **Vendor Registration** | Under 3 minutes |
| **Purchase Order Approval** | Within 24 hours |
| **Delivery Monitoring** | > 95% On-Time tracking |
| **API Response Time** | < 300 ms |
| **Dashboard Load Time** | < 2 seconds |

---

## 🎥 Project Demos

- 📺 **Milestone 1 & 2 Screen Recording**: [Watch Video on Google Drive](https://drive.google.com/file/d/1UMZ9P47Xoc13c0lfobyR8mvrX4cRYfwV/view?usp=sharing)

<br>
<p align="center">
  <i>Built with ❤️ for better procurement.</i>
</p>
