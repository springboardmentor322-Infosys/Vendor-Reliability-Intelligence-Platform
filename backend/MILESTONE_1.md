\# Milestone 1 - Backend Foundation and Core Platform



\## Overview



Milestone 1 focused on developing the backend foundation and core functionality of the Vendor Reliability Intelligence \& Procurement Risk Management Platform.



The backend was developed using FastAPI, Python, SQLAlchemy, and PostgreSQL. It provides REST APIs for authentication, vendor management, procurement management, purchase orders, dashboard data, analytics, reports, notifications, audit logs, and data export.



\## Objectives



The main objectives of Milestone 1 were:



\- Set up the FastAPI backend

\- Integrate PostgreSQL database

\- Implement SQLAlchemy ORM models

\- Implement Pydantic schemas

\- Implement user registration and login

\- Implement JWT authentication

\- Develop vendor management APIs

\- Implement vendor reliability scoring

\- Implement vendor risk-level calculation

\- Develop procurement management APIs

\- Develop purchase order APIs

\- Develop dashboard APIs

\- Develop analytics APIs

\- Develop reports APIs

\- Develop notification APIs

\- Develop audit log APIs

\- Develop export functionality

\- Integrate the backend with the Angular frontend

\- Test APIs using Swagger



\## Technology Stack



\### Backend



\- Python

\- FastAPI

\- SQLAlchemy

\- Pydantic

\- PostgreSQL



\### Authentication



\- JWT

\- OAuth2 Password Bearer

\- Password Hashing



\### Development Tools



\- Visual Studio Code

\- Git

\- GitHub

\- PowerShell

\- Uvicorn

\- FastAPI Swagger



\## Implemented Modules



\### Authentication



Implemented:



\- User registration

\- User login

\- Password hashing

\- JWT token generation

\- Protected API endpoints

\- Authentication dependencies



\### Vendor Management



Implemented:



\- Create vendor

\- Retrieve vendors

\- Retrieve vendor by ID

\- Update vendor

\- Vendor status

\- Vendor performance scores

\- Reliability score

\- Risk level



Vendor performance factors include:



\- Delivery score

\- Quality score

\- Payment score

\- Compliance score



\### Vendor Risk Engine



Implemented a dedicated risk engine for evaluating vendor reliability.



The system calculates:



\- Reliability score

\- Risk level

\- Vendor performance indicators



Risk levels include:



\- Low Risk

\- Medium Risk

\- High Risk



\### Procurement Management



Implemented:



\- Create procurement request

\- Retrieve procurement records

\- Retrieve procurement by ID

\- Update procurement information

\- Procurement approval

\- Vendor association

\- Procurement status tracking



\### Purchase Order Management



Implemented:



\- Create purchase orders

\- Retrieve purchase orders

\- Retrieve purchase order by ID

\- Vendor association

\- Procurement association

\- Order amount

\- Order date

\- Purchase order status



\### Dashboard



Implemented dashboard APIs for displaying:



\- Total vendors

\- Total procurements

\- Vendor risk distribution

\- Procurement statistics

\- Reliability information



\### Analytics



Implemented analytics APIs for:



\- Vendor reliability

\- Vendor risk distribution

\- Procurement activity

\- Performance information



\### Reports



Implemented report APIs for:



\- Vendor information

\- Vendor performance

\- Procurement information

\- Risk information



\### Notifications



Implemented notification APIs for:



\- Vendor risk alerts

\- Procurement updates

\- Purchase order updates

\- System notifications



\### Audit Logs



Implemented audit log APIs for tracking:



\- User activities

\- Vendor activities

\- Procurement activities

\- Purchase order activities

\- System events



\### Export



Implemented export functionality for vendor-related data.



\## Backend Architecture



```text

Angular Frontend

&#x20;      |

&#x20;      | HTTP / REST API

&#x20;      v

FastAPI Backend

&#x20;      |

&#x20;      +-- Authentication

&#x20;      +-- Vendors

&#x20;      +-- Procurement

&#x20;      +-- Purchase Orders

&#x20;      +-- Dashboard

&#x20;      +-- Analytics

&#x20;      +-- Reports

&#x20;      +-- Notifications

&#x20;      +-- Audit Logs

&#x20;      +-- Export

&#x20;      |

&#x20;      v

SQLAlchemy ORM

&#x20;      |

&#x20;      v

PostgreSQL Database

