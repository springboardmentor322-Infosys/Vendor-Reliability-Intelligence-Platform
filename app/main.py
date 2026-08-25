from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.database import Base, engine
from app import models
from app.routers import (
    users,
    vendors,
    procurement,
    purchase_orders,
    performance,
    dashboard,
    contracts,
    reliability,
    analytics,
    notifications,
    reports,
    communication,
    invoices,
    compliance,
)


# Create database tables
Base.metadata.create_all(bind=engine)


def _ensure_legacy_columns():
    inspector = inspect(engine)

    migrations = {
        "vendor_performance": {
            "on_time_deliveries": "INTEGER DEFAULT 0",
            "delayed_deliveries": "INTEGER DEFAULT 0",
            "response_time_hours": "INTEGER DEFAULT 0",
            "issue_resolution_time_hours": "INTEGER DEFAULT 0",
            "service_rating": "INTEGER DEFAULT 0",
            "order_completion_rate": "INTEGER DEFAULT 0",
            "performance_period": "VARCHAR DEFAULT 'Current'",
        },
        "vendors": {
            "website": "VARCHAR DEFAULT ''",
            "registration_date": "VARCHAR DEFAULT ''",
            "approval_date": "VARCHAR DEFAULT ''",
        },
        "procurement_requests": {
            "vendor_name": "VARCHAR DEFAULT ''",
            "estimated_cost": "INTEGER DEFAULT 0",
            "approval_comment": "VARCHAR DEFAULT ''",
        },
        "purchase_orders": {
            "expected_delivery_date": "VARCHAR DEFAULT ''",
            "actual_delivery_date": "VARCHAR DEFAULT ''",
            "invoice_status": "VARCHAR DEFAULT 'Pending'",
            "proof_of_delivery": "VARCHAR DEFAULT ''",
        },
        "contracts": {
            "terms": "TEXT DEFAULT ''",
            "compliance_flag": "VARCHAR DEFAULT 'Active'",
            "document_path": "VARCHAR DEFAULT ''",
            "status": "VARCHAR DEFAULT 'Active'",
        },
    }

    with engine.begin() as conn:
        tables = set(inspector.get_table_names())

        for table, columns in migrations.items():
            if table not in tables:
                continue

            existing_columns = {
                column["name"]
                for column in inspector.get_columns(table)
            }

            for column_name, column_type in columns.items():
                if column_name not in existing_columns:
                    conn.execute(
                        text(
                            f"ALTER TABLE {table} "
                            f"ADD COLUMN {column_name} {column_type}"
                        )
                    )


# Add missing legacy columns if required
_ensure_legacy_columns()


# Create FastAPI application
app = FastAPI(
    title="Vendor Reliability Intelligence Platform",
    version="2.0.0",
    description=(
        "Vendor Reliability Intelligence & "
        "Procurement Risk Management Platform"
    ),
)


# ============================================================
# CORS CONFIGURATION
# ============================================================
# Allows:
# - Local Angular development
# - Production Angular frontend deployed on Render
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://127.0.0.1:4200",
        "http://localhost:4201",
        "http://127.0.0.1:4201",
        "https://vendor-reliability-intelligence-platform-1mvt.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ROUTERS
# ============================================================

app.include_router(users.router)
app.include_router(vendors.router)
app.include_router(procurement.router)
app.include_router(purchase_orders.router)
app.include_router(performance.router)
app.include_router(dashboard.router)
app.include_router(contracts.router)
app.include_router(reliability.router)
app.include_router(analytics.router)
app.include_router(notifications.router)
app.include_router(reports.router)
app.include_router(communication.router)
app.include_router(invoices.router)
app.include_router(compliance.router)


# ============================================================
# ROOT / HEALTH CHECK
# ============================================================

@app.get("/")
def home():
    return {
        "status": "success",
        "message": "Vendor Reliability Intelligence Platform API Running",
        "modules": [
            "Authentication",
            "Vendor Management",
            "Procurement",
            "Vendor Performance",
            "Reliability",
            "Contracts & Compliance",
            "Communication",
            "Dashboards & Analytics",
            "Notifications",
            "Reports & Export",
        ],
    }