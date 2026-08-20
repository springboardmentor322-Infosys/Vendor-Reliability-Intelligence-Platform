# 1. Cover Page

**Project Title:** Vendor Reliability Intelligence Platform  
**Name:** B P S Kruthi
**Program:** Infosys Springboard Internship  
**Milestone:** Milestone 2  

---

# 2. Introduction

## Overview of the project
The Vendor Reliability Intelligence Platform is an enterprise-grade web application designed to streamline vendor management, procurement, and contract tracking. It provides a centralized dashboard for administrators and vendors to interact, track purchase orders, analyze risk, and evaluate performance metrics. By leveraging a comprehensive rating and risk-level system, the platform ensures organizational efficiency and mitigates supply chain risks.

## Purpose of Milestone 2
The purpose of Milestone 2 is to successfully build and demonstrate the core features of the platform, solidifying the backend architecture, database integration, and intuitive frontend UI. This milestone transitions the project from initial conceptualization to a fully functional prototype.

## Objectives
- Implement comprehensive CRUD operations for vendors, procurement requests, purchase orders, and contracts.
- Develop dedicated dashboards for Admins and Vendors with role-based access control.
- Establish a robust MySQL database schema with relational integrity.
- Integrate communication modules and notification alerts.
- Ensure the user interface is responsive, modern, and aligned with enterprise standards.

---

# 3. Features Implemented

### Vendor Management
- **Vendor Registration**: Seamless onboarding for new vendors, automatically generating user accounts for portal access.
- **Vendor Approval Workflow**: Admin capabilities to approve, reject, or suspend vendors based on performance.
- **Vendor Categories**: Categorization of vendors (e.g., IT, Logistics, Raw Materials) for easier sorting and filtering.
- **Vendor Dashboard**: A dedicated secure portal for vendors to view their metrics, active contracts, and fulfill purchase orders.

### Procurement Management
- **Purchase Request (PR)**: Creation and tracking of departmental procurement requests with estimated costs.
- **Approval Workflow**: Admin functionality to review and approve or reject PRs before PO generation.
- **Procurement Dashboard**: A centralized view of recent transactions, pending requests, and top-performing vendors.

### Purchase Order Management
- **Purchase Order (PO)**: Automated generation of POs linked to approved PRs and assigned vendors.
- **Order Status Tracking**: Real-time status updates (e.g., Pending, In Progress, Delivered) visible to both admins and vendors.
- **Invoice Tracking**: Capabilities to track and upload invoices/receipts against specific POs.

### Contract Management
- **Contract Repository**: Centralized storage of all active, expired, and pending vendor contracts.
- **Expiry Tracking**: Automated tracking of contract validity dates.
- **Renewal Notifications**: Email notification triggers and UI alerts for contracts nearing expiration.

### Communication Module
- **Notifications**: On-screen alerts and UI badges for critical updates (e.g., High-Risk Vendors).
- **Audit Logs**: Comprehensive tracking of system activities (creates, updates, deletes) for accountability.
- **Email Alerts**: Triggered actions for communicating directly with vendors regarding contract renewals or performance drops.

---

# 4. System Architecture

## Architecture Diagram
*(See Attachments for the full Architecture Diagram)*

## Frontend
The frontend is built using standard web technologies (HTML, JavaScript) layered with Tailwind CSS for modern, responsive, and glassmorphism-inspired UI components. It communicates with the backend via asynchronous `fetch` API calls.

## Backend
The backend operates on a high-performance **FastAPI** server using Python. It handles all business logic, routing, authentication, and RESTful API endpoints. 

## Database
A relational **MySQL** database serves as the backbone of the application. It is accessed using SQLAlchemy as the Object Relational Mapper (ORM), ensuring secure and structured data transactions.

---

# 5. Database Design

## ER Diagram
*(See Attachments for the full Entity-Relationship Diagram)*

## Database Schema
The database (`vendorintel`) consists of highly normalized tables to ensure data integrity and minimize redundancy.

### Tables
- **Users**: Manages authentication credentials, roles (admin/vendor), and timestamps.
- **Vendors**: Stores company details, risk levels, ratings, and maps directly to the `Users` table via `user_id`.
- **Procurement Requests**: Logs internal departmental requests for supplies or services.
- **Purchase Orders**: Links approved PRs to specific Vendors for fulfillment.
- **Contracts**: Tracks the lifecycle, validity, and compliance flags of vendor agreements.

*(See Attachments for the detailed SQL Database Schema script).*

---

# 6. Backend Implementation

## FastAPI Structure
The backend is structured into modular components:
- `main.py`: Contains API route definitions and endpoint logic.
- `models.py`: Defines SQLAlchemy database models.
- `database.py`: Handles MySQL connection pooling and session management.
- `schema.sql`: Raw SQL definition of the database structure.
- `seed_db.py`: Automation script for resetting and populating dummy data.

## APIs Implemented
- `GET /api/vendors` - Retrieve all vendors.
- `POST /api/vendors` - Register a new vendor.
- `PUT /api/vendors/{id}/status` - Update vendor approval status.
- `GET /api/procurement_requests` - Fetch all PRs.
- `POST /api/purchase_orders` - Generate a PO from an approved PR.
- `GET /api/contracts` - Fetch contract details and expiration status.
- `GET /api/audit_logs` - Retrieve system activity history.

## Authentication
Custom token-based authentication logic implemented to secure routes. The system differentiates between `admin` and `vendor` roles, restricting access to sensitive endpoints accordingly.

## MySQL Connection
Utilizes `mysql+pymysql` driver through SQLAlchemy's `create_engine` to maintain a persistent, secure connection to the local MySQL server.

---

# 7. Technologies Used
- **HTML**: Page structuring and semantic elements.
- **CSS (Tailwind CSS)**: Utility-first styling for rapid, responsive UI development.
- **JavaScript**: Client-side logic, DOM manipulation, and API integration.
- **FastAPI (Python)**: High-performance backend framework.
- **MySQL**: Relational database management system.
- **GitHub**: Version control and source code management.
- **VS Code**: Primary Integrated Development Environment (IDE).

---

# 8. Testing

## Login Testing
- Verified successful authentication for valid Admin credentials.
- Verified successful authentication for valid Vendor credentials.
- Ensured unauthorized users are redirected to the login page.

## Vendor CRUD Testing
- Successfully added new vendors (which automatically creates associated user accounts).
- Updated vendor risk levels and statuses dynamically.
- Verified accurate display of vendor data on the Admin dashboard.

## Procurement Testing
- Created PRs with varied departments and estimated costs.
- Successfully approved and rejected PRs using the Admin portal.

## Purchase Order Testing
- Generated POs successfully from approved PRs.
- Verified PO visibility on the respective Vendor's dashboard.

## Contract Module Testing
- Tested expiry date logic to accurately identify Active vs. Expired contracts.
- Simulated the "Notify" email trigger functionality for expiring contracts.

---

# 9. Challenges Faced

During the development of Milestone 2, several technical challenges were encountered and resolved:

- **Backend Integration**: Aligning the asynchronous `fetch` calls from the frontend with the FastAPI Pydantic response models required careful debugging of CORS policies and payload structures.
- **MySQL Configuration**: Initial setup of SQLAlchemy with MySQL required resolving driver dependencies (`pymysql`) and ensuring foreign key constraints did not cause insertion errors during the database seeding phase.
- **Authentication**: Implementing role-based access control (Admin vs. Vendor) on the frontend using `localStorage` while ensuring the backend endpoints remained secure required implementing dependency injection in FastAPI.
- **UI Responsiveness**: Designing complex data tables (like Contracts and POs) that look modern while remaining readable on smaller screens required extensive use of Tailwind's container queries and horizontal overflow properties.

---

# 10. Conclusion

Milestone 2 represents a significant leap forward for the Vendor Reliability Intelligence Platform. The foundational architecture has been successfully established, integrating a robust MySQL database with a high-performance FastAPI backend and a sleek, modern frontend interface. 

All core modules—Vendor Management, Procurement, Purchase Orders, and Contracts—are fully functional and communicating seamlessly. The dual-dashboard system securely separates Admin and Vendor views, while features like Risk Analysis and automated Audit Logging add immense enterprise value. With this stable foundation ready, the platform is perfectly positioned for the advanced analytics and refinements planned for the next milestone.


