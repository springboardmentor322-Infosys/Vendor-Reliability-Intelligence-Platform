# VendorIntel: Complete Milestone Documentation

This document serves as the comprehensive documentation for the **VendorIntel** platform, encompassing system requirements, architectural design, database schemas, and module breakdowns for Milestones 1 and 2.

## 1. System Requirements (Milestone 1)

### 1.1 Project Objectives
VendorIntel is a state-of-the-art Vendor Reliability Intelligence Platform designed to streamline the procurement lifecycle, automate vendor risk assessment, and provide real-time telemetry on vendor performance and compliance. 

### 1.2 Functional Requirements
- **Authentication & Authorization**: Secure JWT-based login, role-based access control (Admin, Procurement Manager, Vendor, Auditor, Supply Chain Manager, Finance Officer).
- **Vendor Management**: End-to-end lifecycle management including registration, approval workflows, risk matrix analysis, and performance reviews.
- **Procurement Request (PR) Engine**: Internal workflows for generating PRs, dynamic line-item calculation, and multi-stage managerial approvals based on cost thresholds.
- **Purchase Order (PO) Processing**: Conversion of PRs to POs, vendor fulfillment tracking (Shipped, Delivered), and automated invoicing.
- **Contract Management**: Centralized repository for vendor agreements, tracking start/expiry dates, compliance flags, and automated renewal reminders.
- **Communication Module**: Unified thread-based communication allowing internal stakeholders to chat directly with vendors regarding specific POs, PRs, or Contracts.

### 1.3 Non-Functional Requirements
- **Scalability**: Capable of handling concurrent vendor sessions and large document uploads using an asynchronous FastAPI backend.
- **Security**: Robust `bcrypt` password hashing, encrypted JWT payloads, and strict endpoint authorization policies.
- **UI/UX**: Premium, responsive, glass-morphism aesthetic ensuring a seamless experience across desktop and mobile viewing (Dark/Light mode support).

---

## 2. System Architecture

The application follows a modern decoupled client-server architecture.
- **Frontend**: Vanilla HTML/TailwindCSS/JavaScript communicating asynchronously via `fetch`.
- **Backend**: Python 3 (FastAPI) serving RESTful APIs.
- **Database**: Relational Database (SQLAlchemy ORM - SQLite for prototyping, MySQL ready).

```mermaid
graph TD
    %% Define Nodes
    Client[Browser Client<br>HTML / CSS / JS / Tailwind]
    API[FastAPI Backend Server]
    AuthRouter[Auth Router]
    VendorRouter[Vendor Router]
    ProcRouter[Procurement Router]
    ContractRouter[Contract Router]
    DB[(Relational Database<br>SQLAlchemy)]
    FileStore[[Document Storage]]

    %% Connections
    Client <-->|REST / JSON| API
    
    API --> AuthRouter
    API --> VendorRouter
    API --> ProcRouter
    API --> ContractRouter
    
    AuthRouter <--> DB
    VendorRouter <--> DB
    ProcRouter <--> DB
    ContractRouter <--> DB
    
    ContractRouter --> FileStore
    ProcRouter --> FileStore
```

---

## 3. Use Case Diagrams

This diagram illustrates how different user roles interact with the system's core modules.

```mermaid
usecaseDiagram
    actor Admin
    actor "Procurement Mgr" as ProcMgr
    actor Vendor
    actor Auditor

    usecase "Manage Users & Roles" as UC1
    usecase "Approve/Reject Vendors" as UC2
    usecase "Create & Approve PRs" as UC3
    usecase "Generate POs" as UC4
    usecase "Submit Invoices/Delivery" as UC5
    usecase "Manage Contracts" as UC6
    usecase "View Risk Matrix & Audit" as UC7

    Admin --> UC1
    Admin --> UC2

    ProcMgr --> UC2
    ProcMgr --> UC3
    ProcMgr --> UC4
    ProcMgr --> UC6
    ProcMgr --> UC7

    Vendor --> UC5
    
    Auditor --> UC7
```

---

## 4. Entity-Relationship (ER) Diagram

The database is highly normalized to support complex relationships between Users, Vendors, Requests, and Orders.

```mermaid
erDiagram
    USER ||--o{ VENDOR : "manages account for"
    USER ||--o{ AUDIT_LOG : "triggers"
    USER ||--o{ MESSAGE : "sends"
    
    VENDOR ||--o{ PROCUREMENT_REQUEST : "fulfills (via PO)"
    VENDOR ||--o{ PURCHASE_ORDER : "assigned to"
    VENDOR ||--o{ CONTRACT : "signs"
    
    PROCUREMENT_REQUEST ||--o{ PR_ITEM : "contains"
    PROCUREMENT_REQUEST ||--o| PURCHASE_ORDER : "generates"
    
    PURCHASE_ORDER ||--o{ PO_ITEM : "contains"
    
    THREAD ||--o{ MESSAGE : "contains"

    USER {
        int id PK
        string email
        string password_hash
        string role
        string full_name
        string department
    }
    
    VENDOR {
        int id PK
        int user_id FK
        string company_name
        string contact_email
        string category
        string approval_status
        float risk_score
    }
    
    PROCUREMENT_REQUEST {
        int id PK
        string request_number
        string department
        float total_cost
        string approval_status
    }

    CONTRACT {
        int id PK
        int vendor_id FK
        date start_date
        date expiry_date
        string status
        string document_url
    }
```

---

## 5. Milestone 2 Module Breakdown

### 5.1 Vendor Management Module
- **Endpoints**: `/api/vendors`, `/api/vendors/{id}`
- **Features**: Complete CRUD operations, Vendor Categories, Search & Filter capabilities, and strict Approval Workflows (Pending -> Under Review -> Approved/Rejected).
- **UI Element**: `vendor_dashboard.html`, `admin_dashboard.html`

### 5.2 Procurement Request (PR) Module
- **Endpoints**: `/api/procurement-requests`, `/api/procurement-requests/{id}`
- **Features**: Dynamic Line Item Calculations, Department Selection, and Multi-stage Approval Workflow (Pending -> Approved -> Ordered -> Delivered -> Completed/Cancelled).
- **UI Element**: `procurement_requests.html`

### 5.3 Purchase Order (PO) Module
- **Endpoints**: `/api/purchase-orders` (Integration Planned)
- **Features**: Converts approved PRs to formal POs. Supports Vendor updates (Shipped, Partial Delivery, Delivered) and Invoice/Receipt document uploads.
- **UI Element**: `purchase_orders.html` (Planned/In-progress)

### 5.4 Contract Management
- **Endpoints**: `/api/contracts`, `/api/contracts/{id}/upload`
- **Features**: Vendor assignment, Document Uploading, Expiry Tracking with Compliance Flags, and 30/60/90 Day Renewal Notices.
- **UI Element**: `contracts.html`

### 5.5 Communication Module
- **Endpoints**: `/api/threads`, `/api/threads/{entity_type}/{entity_id}`
- **Features**: Contextual thread-based messaging tying conversations directly to a specific Vendor, Contract, PR, or PO. Maintains permanent audit logs of correspondence.
- **UI Element**: Reusable Chat Modal integrated across all dashboards.
