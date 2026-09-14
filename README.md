# VendorIQ — Vendor Reliability Intelligence & Procurement Risk Management Platform

VendorIQ is a web-based Vendor Reliability Intelligence and Procurement Risk Management Platform designed to help organizations manage vendors, procurement activities, purchase orders, contracts, performance, reliability, communication, notifications, and reports from a single application.

The project is built as a single FastAPI application with a lightweight HTML, CSS, and JavaScript frontend.

---

## Technology Stack

- Python
- FastAPI
- SQLAlchemy
- PostgreSQL
- HTML5
- CSS3
- JavaScript
- Chart.js
- JWT Authentication
- REST APIs

---

## Main Features

- User authentication and role-based access control
- Vendor management and approval
- Procurement management
- Purchase order management
- Vendor performance tracking
- Vendor reliability scoring
- Vendor risk analysis
- Contract and compliance management
- Vendor communication
- Notifications
- Role-based dashboards
- Audit logs
- CSV reports
- DataCo supply-chain analytics

---

## User Roles

VendorIQ supports the following roles:

- Administrator
- Procurement Manager
- Supply Chain Manager
- Finance Officer
- Auditor
- Vendor

Each role has access to the modules and dashboard features relevant to its responsibilities.

---

## 1. Setup

Clone the repository:

```powershell
git clone https://github.com/springboardmentor322-Infosys/Vendor-Reliability-Intelligence-Platform.git

Go to the project folder:

cd Vendor-Reliability-Intelligence-Platform

Go to the backend folder:

cd backend

Create a Python virtual environment:

python -m venv venv

Activate the virtual environment:

venv\Scripts\activate

Install the required packages:

python -m pip install -r requirements.txt
2. Database Setup

VendorIQ uses PostgreSQL for persistent application data.

Make sure PostgreSQL is installed and running on your system.

Configure the database connection using the DATABASE_URL environment variable.

Example:

$env:DATABASE_URL="postgresql://<user>:<password>@localhost:5432/vendoriq"

Install the PostgreSQL driver if required:

python -m pip install psycopg2-binary

Do not add real database passwords, API keys, JWT secrets, or other sensitive credentials to the GitHub repository.

3. Optional Demo Data

If demo or seed data is required for testing, run:

python seed.py

This can populate the database with sample users, vendors, purchase orders, performance records, contracts, messages, and other demo information.

User accounts can also be created and managed through the VendorIQ registration and administration workflows.

For security reasons, passwords and real credentials are not stored in this repository.

4. Run the Application

From the backend directory, start the FastAPI server:

python -m uvicorn main:app --reload --port 8000

Open the application in your browser:

http://localhost:8000

The FastAPI application serves the frontend directly, so a separate frontend server is not required.

Application URLs
VendorIQ Application: http://localhost:8000
API Documentation: http://localhost:8000/docs
API Health Check: http://localhost:8000/api/health

FastAPI automatically generates interactive API documentation that can be used to view and test the available REST API endpoints.

5. Landing Page and Authentication

The application opens with the VendorIQ landing page.

The Sign In option is integrated directly into the landing page and opens the login interface without requiring a separate login page.

After successful authentication, users are redirected to the dashboard corresponding to their assigned role.

Authentication is implemented using JWT-based authorization and role-based access control.

6. Project Structure
vendoriq/
│
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── auth.py
│   ├── reliability.py
│   ├── seed.py
│   ├── requirements.txt
│   │
│   └── routers/
│       ├── auth_router.py
│       ├── vendors.py
│       ├── procurement.py
│       ├── performance.py
│       ├── contracts.py
│       ├── communication.py
│       ├── notifications.py
│       ├── dashboard.py
│       ├── reports.py
│       └── audit.py
│
├── frontend/
│   ├── index.html
│   ├── dashboard.html
│   ├── admin-dashboard.html
│   ├── vendor-dashboard.html
│   ├── vendors.html
│   ├── procurement.html
│   ├── performance.html
│   ├── contracts.html
│   ├── messages.html
│   ├── reports.html
│   │
│   ├── css/
│   │   └── style.css
│   │
│   └── js/
│       ├── api.js
│       └── ...
│
└── data/
    └── DataCoSupplyChainDataset.csv
    
7. Dashboard Modules
Administrator Dashboard

The Administrator dashboard provides:

User management
Vendor overview
System activity
Vendor risk analysis
Compliance monitoring
Audit logs
System administration
Overall platform analytics
Procurement Manager Dashboard

The Procurement Manager dashboard provides:

Vendor overview
Procurement summary
Purchase order information
Procurement analytics
Vendor performance
Procurement risk analysis
Recent procurement activity
Supply Chain Manager Dashboard

The Supply Chain Manager dashboard provides:

Delivery performance
Vendor reliability
Delayed order monitoring
Risk distribution
Supply-chain analytics
Vendor performance comparison
DataCo supply-chain insights
Finance Officer Dashboard

The Finance Officer dashboard provides:

Financial overview
Procurement value
Purchase order value
Invoice information
Vendor financial analysis
Financial trends
Procurement spending insights
Auditor Dashboard

The Auditor dashboard provides:

Audit activity
Compliance monitoring
Risk analysis
Audit logs
Vendor review
Procurement review
System activity monitoring
Vendor Dashboard

The Vendor dashboard provides:

Reliability score
Performance summary
Purchase orders
Contract status
Delivery performance
Reliability breakdown
Vendor communication activity
8. Vendor Management

The Vendor Management module allows authorized users to:

Add vendors
View vendors
Search vendors
Update vendor information
Approve vendors
Monitor vendor status
Review vendor reliability
Analyze vendor risk
9. Procurement and Purchase Orders

The Procurement module provides functionality for:

Procurement records
Purchase orders
Order status tracking
Purchase order details
Procurement value monitoring
Vendor-related procurement information

Users can monitor procurement activities and purchase order progress from the application.

10. Vendor Performance and Reliability

VendorIQ includes a Vendor Performance and Reliability module for evaluating supplier performance.

The platform can provide:

Reliability scores
Delivery performance
On-time delivery information
Delayed delivery monitoring
Quality performance
Vendor risk levels
Vendor performance comparisons

These insights help procurement and supply-chain teams identify reliable vendors and potential supplier risks.

11. Contracts and Compliance

The Contracts and Compliance module provides:

Contract management
Contract status tracking
Contract expiry monitoring
Compliance status
Vendor contract information
Expiry-related notifications

The system can generate notifications for contracts approaching their expiry period.

12. Communication

The Communication module provides vendor-related messaging functionality.

Users can:

View communication activity
Send messages
Review vendor communication
Track communication history
13. Notifications

VendorIQ provides notification functionality for important system events.

Notifications can be used for:

Contract expiry alerts
Procurement updates
System activities
Other important platform events

Users can view notifications from the application interface.

14. Audit Logs

The platform includes an Audit Log module to track important system activities.

Audit information can include:

User
User role
Action
Module
Record ID
Activity details
Date and time

Audit logs are available to authorized roles such as Administrator and Auditor.

15. Reports

VendorIQ provides CSV report generation for important business information.

Available reports include:

Vendor Performance Report
Purchase Order Report
Contract Report

Reports can be accessed from the Reports & Notifications module.

16. DataCo Supply Chain Analytics

The platform also includes supply-chain analytics based on the DataCo Smart Supply Chain dataset.

The analytics module can provide insights such as:

Total records
Total sales
Total profit
Delivery rate
Late delivery records
Late delivery risk
Product categories
Markets
Shipping modes

The dataset is used for supply-chain analysis and dashboard visualization.

17. API Documentation

FastAPI automatically generates interactive API documentation.

Open:

http://localhost:8000/docs

The documentation allows developers and testers to:

View available API endpoints
View request and response schemas
Test API endpoints
Check authentication requirements
Understand the REST API structure
18. Security

VendorIQ includes several security features:

JWT-based authentication
Role-based access control
Protected API endpoints
Authentication guards
Audit logging
Environment-based database configuration
Secure credential handling

Sensitive information such as database passwords, JWT secrets, and API keys should be stored using environment variables and should never be committed to GitHub.

19. Running the Project

After installing the dependencies and configuring PostgreSQL:

cd backend
python -m uvicorn main:app --reload --port 8000

Then open:

http://localhost:8000

The complete VendorIQ application runs through a single FastAPI server.

No separate frontend server is required.

20. Development Scope

The project is implemented as a single FastAPI application with a lightweight JavaScript frontend.

The original project concept can be extended in the future with technologies such as:

Angular
Microservices
Docker
Kubernetes
RabbitMQ
Cloud deployment
SMS and email integrations
Advanced machine-learning based risk prediction

The current architecture keeps the major functional modules separated through routers, models, schemas, authentication, and frontend pages, making future expansion easier.

21. Future Enhancements

Future versions of VendorIQ can include:

Advanced AI-based vendor risk prediction
Automated supplier recommendations
Real-time procurement alerts
Advanced forecasting
Email and SMS notifications
Cloud deployment
Microservice architecture
Mobile application
Advanced business intelligence dashboards
Automated vendor onboarding
Supplier performance forecasting

22. Conclusion

VendorIQ provides a centralized platform for managing vendor reliability, procurement activities, purchase orders, contracts, performance, risk, communication, notifications, and reporting.

The application combines FastAPI, PostgreSQL, SQLAlchemy, JWT authentication, HTML, CSS, JavaScript, and Chart.js to provide a practical procurement and vendor management solution.

The current implementation is designed for development, demonstration, and academic project evaluation, while providing a foundation for future enterprise-level expansion.