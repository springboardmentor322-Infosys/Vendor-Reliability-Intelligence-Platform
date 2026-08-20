# VendorIntel - Milestone 3: Vendor Reliability Intelligence

Welcome to the **Milestone 3** release of the Vendor Reliability Intelligence Platform. This milestone transforms the platform from an operational CRUD tool into a powerful, data-driven intelligence hub.

## 🚀 What's New in Milestone 3?

We have successfully integrated a complete intelligence and monitoring layer across 6 major dashboards:

### 1. 🏢 Vendor Performance & Reliability Scoring
- Automated formulas calculate a Vendor's **Reliability Score (0-100)** based on:
  - On-Time Delivery (30%)
  - Order Completion (25%)
  - Quality Score (20%)
  - Contract Compliance (15%)
  - Invoice Accuracy (10%)
- **Dynamic Risk Levels** (Low 🟢, Medium 🟡, High 🔴) update instantly.

### 2. 📊 Dashboards Fully Implemented & Interactive
- **Admin Dashboard**: Total system oversight with one-click Vendor Suspension capabilities.
- **Procurement Dashboard**: PR generation, PR approval workflows, and contract evaluation.
- **Supply Chain Dashboard (NEW)**: Real-time PO tracking. Identifies "Delayed", "In Transit", and "Delivered" orders instantly.
- **Finance Dashboard (NEW)**: Monitors total procurement spending, outstanding invoices, and approves PR budgets.
- **Vendor Dashboard**: Vendors can now view their live reliability scores, handle POs, upload invoices, and manage delivery status.
- **Auditor Dashboard**: Seamless integration with the new **System Audit Log**, tracking every significant action with immutable history.

### 3. 🔔 Intelligent Notifications & Shared Pages
- **System Audit Log (`audit_log.html`)**: Complete, searchable trail of user actions.
- **Notifications Center (`notifications.html`)**: Dynamic alerts for high-risk vendors and delayed POs.
- **Profile & Settings (`settings.html`)**: User preference management.

## 🛠️ Database Additions
The backend database (`models.py`) was extended to support:
- `VendorRiskHistory`: For plotting score trends over time.
- `DeliveryTracking`: Granular supply chain analytics.
- `Invoice`: Linking POs with financial tracking.
- `Notification`: Smart alert routing.

## ✅ How to Test the End-to-End Intelligence Flow
1. Run the database seed: `python backend/seed_db.py`
2. Start the FastAPI backend: `uvicorn main:app --reload` (inside `/backend`)
3. Open `frontend/login.html` and log in as any role (e.g., `finance@vendorintel.com` or `supplychain@vendorintel.com`, Password: `1234`).
4. Watch the dashboards interact: If Supply Chain marks a delivery as "Delayed", the Vendor's Reliability Score will recalculate, potentially raising their Risk Level, which automatically alerts the Admin!

Enjoy Milestone 3!
