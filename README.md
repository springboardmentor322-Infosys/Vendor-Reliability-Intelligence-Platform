# Vendor Reliability Intelligence Platform

A Vendor Reliability and Procurement Intelligence Platform designed to help organizations manage vendors, procurement activities, purchase orders, contracts, performance, and reliability insights.

## Project Overview

The Vendor Reliability Intelligence Platform provides a centralized application for managing vendor-related activities and analyzing vendor performance.

The project includes a FastAPI backend, Angular frontend, database integration, authentication, dashboards, procurement workflows, and Docker-based deployment.

## Key Features

- User registration and login
- JWT-based authentication
- Role-based access
- Vendor management
- Vendor approval workflow
- Procurement management
- Purchase order management
- Contract management
- Vendor performance tracking
- Reliability analysis
- Analytics and dashboards
- Notifications
- Reports
- Invoice management
- Compliance management

## Technology Stack

### Backend

- Python
- FastAPI
- Uvicorn
- SQLAlchemy
- Pydantic
- JWT Authentication
- Alembic

### Frontend

- Angular
- Angular Material
- TypeScript
- HTML
- CSS

### Database

- SQLite for local development
- PostgreSQL-ready configuration

### Deployment

- Docker
- Docker Compose
- Nginx

## Milestone 4 Demonstration

The complete application demonstration and screen recording are available below:

[Watch Milestone 4 Demo](https://github.com/springboardmentor322-Infosys/Vendor-Reliability-Intelligence-Platform/blob/main/docs/milestone4.mp4)

The demonstration covers the major application workflows, including authentication, dashboard, vendor management, procurement, purchase orders, contracts, performance, reliability, analytics, and other platform features.

## Project Structure

```text
Vendor-Reliability-Platform/
├── app/
│   ├── routers/
│   └── ...
├── frontend/
├── dataset/
├── docs/
├── scripts/
├── alembic/
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── alembic.ini
├── .env.example
└── README.md
