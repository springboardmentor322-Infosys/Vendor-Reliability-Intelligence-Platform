Vendor Reliability Intelligence & Procurement Risk Management Platform

A full-stack web application designed to monitor vendor reliability, procurement performance, supply-chain risks, financial information, and vendor performance through role-based dashboards and analytics.

Project Overview

The Vendor Reliability Intelligence Platform helps organizations manage vendors and make data-driven procurement decisions.

Key Features
Vendor Management
Vendor Performance Monitoring
Procurement Management
Vendor Reliability Analysis
Supply Chain Risk Monitoring
Financial Monitoring
Notifications and Alerts
Reports and Analytics
Role-Based Access Control
Authentication and Authorization
Interactive Dashboards
Vendor Categories

The platform supports six major vendor categories:

Raw Material Suppliers
Equipment Vendors
IT Vendors
Service Providers
Logistics Partners
Maintenance Vendors
User Roles
Administrator
Manage users
Manage vendors
Monitor platform activities
Access administrative dashboards
Procurement Manager
Monitor procurement activities
Analyze vendor performance
Review procurement risks
Monitor vendor reliability
Supply Chain Manager
Monitor supply-chain performance
Analyze delivery performance
Track supply-chain risks
Monitor vendor reliability
Vendor
View vendor information
View performance information
Access vendor dashboard
Monitor relevant metrics
Finance Officer
Monitor financial information
Analyze vendor-related financial metrics
Review financial performance
Monitor financial risks
Auditor
Review vendor and procurement activities
Access reports and analytics
Review audit-related information
Monitor system information
Authentication & Authorization

The application provides secure authentication and role-based authorization using:

JWT Authentication
Role-Based Access Control
Protected Routes
Authorized API Access
Token Management
Vendor Reliability

The platform evaluates vendor reliability using performance-related information such as:

Delivery Performance
Quality Performance
Procurement Performance
Risk Indicators
Vendor Performance Trends

This helps organizations identify reliable vendors and vendors that require attention.

Procurement Management

The procurement dashboard provides visibility into:

Procurement Metrics
Vendor Performance
Procurement Risks
Order Information
Performance Trends
Analytical Insights
Supply Chain Monitoring

Supply-chain users can monitor:

Delivery Performance
Supply-chain Performance
Risk Indicators
Vendor Reliability
Operational Metrics
Performance Trends
Financial Monitoring

Finance users can monitor:

Vendor Financial Performance
Financial Metrics
Financial Risks
Cost-related Information
Financial Insights
Analytics & Dashboards

The application provides role-specific interactive dashboards containing:

KPI Cards
Charts
Performance Indicators
Vendor Statistics
Risk Indicators
Trend Analysis
Business Insights
Notifications

The platform provides notifications for important events such as:

Vendor Risk Alerts
Performance Issues
Important Vendor Events
Procurement Updates
Reports

Reports and analytics support:

Vendor Performance Analysis
Procurement Analysis
Reliability Analysis
Risk Analysis
Financial Analysis
Audit Review
Technology Stack
Frontend
Angular
TypeScript
HTML5
CSS3
Angular Material
Chart.js
ng2-charts
Backend
Python
FastAPI
Pydantic
SQLAlchemy
JWT Authentication
Database
PostgreSQL
SQLite
Tools & Deployment
Git
GitHub
GitHub Actions
Render
Project Architecture
Vendor-Reliability-Platform
│
├── app
│   ├── routers
│   ├── models
│   ├── schemas
│   ├── services
│   └── main.py
│
├── frontend
│   ├── src
│   │   ├── app
│   │   ├── pages
│   │   ├── shared
│   │   └── services
│   ├── angular.json
│   ├── package.json
│   └── package-lock.json
│
├── alembic
├── dataset
├── .github
│   └── workflows
├── requirements.txt
├── README.md
└── .gitignore
API

The backend provides REST APIs using FastAPI.

Interactive API documentation is available through Swagger UI.

/docs
Security

The platform includes:

JWT Authentication
Role-Based Authorization
Protected API Endpoints
Protected Frontend Routes
CORS Configuration
Environment-based Configuration

Sensitive credentials should be stored using environment variables.

Deployment

The Angular frontend is configured for production builds and GitHub Actions deployment.

The FastAPI backend can be deployed using cloud hosting services such as Render.

Project Objectives
Improve vendor visibility
Monitor vendor reliability
Identify procurement risks
Improve supply-chain decision making
Monitor vendor performance
Support financial monitoring
Provide role-specific business insights
Enable data-driven procurement decisions
Benefits

The platform helps organizations:

Identify unreliable vendors
Monitor vendor performance
Detect procurement risks
Improve supplier management
Improve supply-chain visibility
Analyze operational performance
Centralize vendor information
Support better procurement decisions
Future Enhancements
Predictive vendor risk analysis
Machine-learning-based risk prediction
Automated vendor scoring
Advanced notification rules
Enhanced reporting
Additional data visualizations
Automated procurement recommendations
License

This project is developed for educational and project demonstration purposes.
## 🎥 Demo Video

This video demonstrates the key features and workflow of the Vendor Reliability Intelligence & Procurement Risk Management Platform.

[▶️ Watch Demo Video](docs/vendor-reliability.mp4)
