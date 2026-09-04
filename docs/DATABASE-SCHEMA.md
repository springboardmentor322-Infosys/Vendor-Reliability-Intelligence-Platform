# Database Schema

## Entity Relationship Diagram

```mermaid
erDiagram
    USERS {
        int id PK
        string full_name
        string email UK
        string password
        string role
    }

    VENDORS {
        int id PK
        string vendor_name
        string category
        string contact_person
        string email
        string phone
        string address
        string status
    }

    PROCUREMENT_REQUESTS {
        int id PK
        string product_name
        int quantity
        string department
        string requested_by
        string priority
        string status
    }

    PURCHASE_ORDERS {
        int id PK
        string vendor_name
        string product_name
        int quantity
        int total_amount
        string status
    }

    VENDOR_PERFORMANCE {
        int id PK
        string vendor_name
        int delivery_score
        int quality_score
        int reliability_score
        int overall_score
    }
```

## Table Definitions

### users
| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO INCREMENT | Unique user ID |
| full_name | VARCHAR | NOT NULL | Display name |
| email | VARCHAR | UNIQUE, NOT NULL | Login email |
| password | VARCHAR | NOT NULL | Hashed password |
| role | VARCHAR | NOT NULL, DEFAULT 'Vendor' | Admin, Procurement Manager, Finance Officer, Auditor, Vendor |

### vendors
| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | INTEGER | PRIMARY KEY | Unique vendor ID |
| vendor_name | VARCHAR | NOT NULL | Company name |
| category | VARCHAR | NOT NULL | e.g. IT, Logistics, Office Supplies |
| contact_person | VARCHAR | NOT NULL | Primary contact |
| email | VARCHAR | NOT NULL | Contact email |
| phone | VARCHAR | NOT NULL | Contact phone |
| address | VARCHAR | NOT NULL | Business address |
| status | VARCHAR | DEFAULT 'Active' | Active / Inactive |

### procurement_requests
| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | INTEGER | PRIMARY KEY | Request ID |
| product_name | VARCHAR | NOT NULL | Item requested |
| quantity | INTEGER | NOT NULL | Units needed |
| department | VARCHAR | NOT NULL | Requesting department |
| requested_by | VARCHAR | NOT NULL | Requester name |
| priority | VARCHAR | DEFAULT 'Medium' | Low / Medium / High |
| status | VARCHAR | DEFAULT 'Pending' | Pending / Approved / Rejected |

### purchase_orders
| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | INTEGER | PRIMARY KEY | Order ID |
| vendor_name | VARCHAR | NOT NULL | Vendor reference |
| product_name | VARCHAR | NOT NULL | Product ordered |
| quantity | INTEGER | NOT NULL | Order quantity |
| total_amount | INTEGER | NOT NULL | Total cost |
| status | VARCHAR | DEFAULT 'Pending' | Pending / Approved / Completed |

### vendor_performance
| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | INTEGER | PRIMARY KEY | Record ID |
| vendor_name | VARCHAR | NOT NULL | Vendor reference |
| delivery_score | INTEGER | NOT NULL | 0–100 |
| quality_score | INTEGER | NOT NULL | 0–100 |
| reliability_score | INTEGER | NOT NULL | 0–100 |
| overall_score | INTEGER | NOT NULL | 0–100 |

## PostgreSQL Setup

```sql
CREATE DATABASE vendor_db;
```

Connection string:
```
postgresql+psycopg2://postgres:password@localhost:5432/vendor_db
```

Tables are auto-created by SQLAlchemy on FastAPI startup via `Base.metadata.create_all()`.

## Role Values

| Role | Permissions |
|------|-------------|
| Admin | Full access to all resources |
| Procurement Manager | Procurement CRUD |
| Finance Officer | Purchase orders and performance CRUD |
| Auditor | Dashboard read access |
| Vendor | Self-service (future milestone) |
