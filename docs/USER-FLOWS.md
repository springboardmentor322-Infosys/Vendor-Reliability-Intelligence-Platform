# User Flow Diagrams

## 1. Authentication Flow

```mermaid
flowchart TD
    A[Landing Page] --> B{Has Account?}
    B -->|No| C[Registration Page]
    B -->|Yes| D[Login Page]
    C --> E[Fill Form: name, email, role, password]
    E --> F{Validation OK?}
    F -->|No| C
    F -->|Yes| G[POST /users/register]
    G --> H{Email exists?}
    H -->|Yes| I[Show Error]
    I --> C
    H -->|No| J[Account Created]
    J --> D
    D --> K[Enter email + password]
    K --> L[POST /users/login]
    L --> M{Credentials valid?}
    M -->|No| N[Show Error]
    N --> D
    M -->|Yes| O[Store JWT in localStorage]
    O --> P[Redirect to Dashboard]
```

---

## 2. Admin — Vendor Management Flow

```mermaid
flowchart TD
    A[Login as Admin] --> B[Dashboard]
    B --> C[Vendor Management]
    C --> D{Action?}
    D -->|View| E[Vendor List GET /vendors]
    D -->|Add| F[Add Vendor Form]
    D -->|Edit| G[Edit Vendor Form]
    D -->|Delete| H[Confirm Delete]
    F --> I[POST /vendors/add]
    G --> J[PUT /vendors/id]
    H --> K[DELETE /vendors/id]
    I --> E
    J --> E
    K --> E
```

---

## 3. Procurement Manager Flow

```mermaid
flowchart TD
    A[Login as Procurement Manager] --> B[Procurement Dashboard]
    B --> C{Action?}
    C -->|Create| D[New Request Form]
    C -->|Track| E[Request List]
    D --> F[POST /procurement/add]
    F --> E
    E --> G{Update Status?}
    G -->|Yes| H[PUT /procurement/id]
    H --> E
    G -->|No| B
```

---

## 4. Finance Officer — Purchase Order Flow

```mermaid
flowchart TD
    A[Login as Finance Officer] --> B[Purchase Orders Page]
    B --> C{Action?}
    C -->|Create PO| D[PO Form: vendor, product, qty, amount]
    C -->|Approve| E[Select Pending PO]
    D --> F[POST /purchase-orders/add]
    E --> G[Update status to Approved]
    G --> H[PUT /purchase-orders/id]
    F --> B
    H --> I[Record Vendor Performance]
    I --> J[POST /performance/add]
    J --> B
```

---

## 5. Auditor — Review Flow

```mermaid
flowchart TD
    A[Login as Auditor] --> B[Dashboard Overview]
    B --> C[Analytics Dashboard]
    B --> D[Reports Dashboard]
    B --> E[Vendor Performance]
    C --> F[Review KPI Trends]
    D --> G[Generate / Export Report]
    E --> H[Review Vendor Scores]
    F --> I[Notifications]
    G --> I
    H --> I
```

---

## 6. End-to-End Procurement Lifecycle

```mermaid
sequenceDiagram
    participant PM as Procurement Manager
    participant FO as Finance Officer
    participant SYS as VRIP Platform
    participant AU as Auditor

    PM->>SYS: Create procurement request
    SYS-->>PM: Request status: Pending
    PM->>SYS: Update request to Approved
    FO->>SYS: Create purchase order
    SYS-->>FO: PO status: Pending
    FO->>SYS: Approve purchase order
    FO->>SYS: Record vendor performance scores
    AU->>SYS: View dashboard analytics
    AU->>SYS: Generate compliance report
```
