# Milestone 1 — Week 1 & 2

## Objectives
- Define project objectives for vendor reliability and procurement intelligence
- Gather functional and non-functional requirements
- Design UI wireframes and user flows
- Prepare dashboard and responsive screen layouts
- Design the database schema
- Initialize FastAPI backend
- Configure PostgreSQL
- Implement JWT authentication
- Begin Angular frontend scaffolding

## Functional Requirements
- User registration and login with JWT authentication
- Vendor management CRUD
- Procurement request management CRUD
- Purchase order management CRUD
- Vendor performance tracking and reporting
- Dashboard overview for procurement, vendors, and performance
- Role-based access control (Admin, Procurement Manager, Finance Officer, Auditor)

## Non-functional Requirements
- Secure authentication and authorization
- Responsive UI design for desktop and mobile
- Scalable PostgreSQL database schema
- Clean API structure using FastAPI and SQLAlchemy
- Maintainable codebase with clear documentation

## UI Wireframe Pages
- Login Page
- Registration Page
- Dashboard
- Vendor Management
- Procurement Dashboard
- Purchase Orders
- Vendor Performance Dashboard
- Analytics Dashboard
- Reports Dashboard
- Notification Screen

## User Flows
- User registers, logs in, and receives JWT token
- Admin manages vendors and user roles
- Procurement manager creates and tracks procurement requests
- Finance officer approves and manages purchase orders
- Auditor reviews dashboard summaries and performance metrics

## Database Schema
- users: id, full_name, email, password, role
- vendors: id, vendor_name, category, contact_person, email, phone, address, status
- procurement_requests: id, product_name, quantity, department, requested_by, priority, status
- purchase_orders: id, vendor_name, product_name, quantity, total_amount, status
- vendor_performance: id, vendor_name, delivery_score, quality_score, reliability_score, overall_score

## Backend Implementation
- `app/main.py` initializes FastAPI and registers routers
- `app/models.py` defines SQLAlchemy ORM models
- `app/schemas.py` defines request and response Pydantic schemas
- `app/routers/` contains routes for users, vendors, procurement, purchase orders, performance, and dashboard
- `app/security.py` handles JWT token creation, password hashing, and role-based dependencies
- `app/database.py` now supports PostgreSQL configuration via environment variables

## PostgreSQL Configuration
- Uses `DATABASE_URL` or individual `POSTGRES_*` variables
- Example configuration is provided in `.env.example`
- Recommended local database: `vendor_db`

## Authentication
- JWT access tokens with HS256 signing
- Token expires after 30 minutes by default
- Role-enforced route access using dependency functions

## Next Steps
- Create Angular frontend scaffold and initialize Angular Material
- Develop responsive UI screens and connect frontend to FastAPI APIs
- Finalize Figma designs for wireframes and dashboards
- Implement analytics and reports dashboards in frontend
