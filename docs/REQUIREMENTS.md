# Functional & Non-Functional Requirements

## Functional Requirements

### Authentication & Authorization
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Users can register with full name, email, password, and role | High |
| FR-02 | Users can log in and receive a JWT access token | High |
| FR-03 | Protected routes require valid JWT | High |
| FR-04 | Role-based access: Admin, Procurement Manager, Finance Officer, Auditor | High |
| FR-05 | Admin role cannot be self-assigned during registration | High |

### Vendor Management
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-10 | CRUD operations for vendor records | High |
| FR-11 | Search/filter vendors by name, category, status | Medium |
| FR-12 | Track vendor contact details and status (Active/Inactive) | High |

### Procurement
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-20 | Create and manage procurement requests | High |
| FR-21 | Track product, quantity, department, priority, and status | High |
| FR-22 | Procurement Manager can create/update/delete requests | High |

### Purchase Orders
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-30 | Create and manage purchase orders linked to vendors | High |
| FR-31 | Track quantity, total amount, and order status | High |
| FR-32 | Finance Officer can approve and manage orders | High |

### Vendor Performance
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-40 | Record delivery, quality, reliability, and overall scores | High |
| FR-41 | Finance Officer can add/update performance records | High |
| FR-42 | Performance dashboard displays vendor rankings | Medium |

### Dashboards & Reporting
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-50 | Main dashboard shows aggregate KPIs | High |
| FR-51 | Analytics dashboard with trend summaries | Medium |
| FR-52 | Reports dashboard with exportable summaries | Medium |
| FR-53 | Notification screen for system alerts | Medium |

---

## Non-Functional Requirements

### Security
| ID | Requirement |
|----|-------------|
| NFR-01 | Passwords hashed with Werkzeug before storage |
| NFR-02 | JWT tokens signed with HS256, 30-minute default expiry |
| NFR-03 | CORS restricted to local Angular dev origins |
| NFR-04 | No sensitive data logged in production |

### Performance
| ID | Requirement |
|----|-------------|
| NFR-10 | API response time under 500 ms for list endpoints |
| NFR-11 | Lazy-loaded Angular routes for faster initial load |

### Scalability
| ID | Requirement |
|----|-------------|
| NFR-20 | PostgreSQL as production database |
| NFR-21 | SQLAlchemy ORM with connection pooling support |
| NFR-22 | Stateless JWT authentication (no server-side sessions) |

### Usability
| ID | Requirement |
|----|-------------|
| NFR-30 | Responsive layout for desktop (≥1024px) and mobile (≤768px) |
| NFR-31 | Angular Material design system for consistent UI |
| NFR-32 | Clear navigation sidebar across authenticated pages |

### Maintainability
| ID | Requirement |
|----|-------------|
| NFR-40 | Modular FastAPI routers per domain |
| NFR-41 | Pydantic schemas for request/response validation |
| NFR-42 | Centralized auth service and HTTP interceptor in Angular |
