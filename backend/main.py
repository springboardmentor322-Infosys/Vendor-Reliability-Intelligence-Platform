from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT_DIR))

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Routers
from auth import router
from vendor import router as vendor_router
from purchase import router as purchase_router
from contract import router as contract_router
from dashboard import router as dashboard_router
from report import router as report_router
from purchase_request import router as purchase_request_router
from vendor_performance import router as vendor_performance_router
from communication import router as communication_router
from vendor_reliability import router as vendor_reliability_router
from delivery import router as delivery_router
import analytics
import notifications
import audit_logs
import invoices
import quality

# Create FastAPI app
app = FastAPI()


# ==========================
# CORS
# ==========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5501",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================
# Include Routers
# ==========================

app.include_router(router)
app.include_router(vendor_router)
app.include_router(purchase_router)
app.include_router(contract_router)
app.include_router(dashboard_router)
app.include_router(report_router)
app.include_router(purchase_request_router)
app.include_router(vendor_performance_router)
app.include_router(communication_router)
app.include_router(vendor_reliability_router)
app.include_router(delivery_router)
app.include_router(analytics.router)
app.include_router(notifications.router)
app.include_router(audit_logs.router)
app.include_router(invoices.router)
app.include_router(quality.router)


# ==========================
# Home API & Public Stats
# ==========================

from db import conn

@app.get("/api/public/platform-stats")
def get_public_stats():
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            # 1. Total vendors
            cursor.execute("SELECT COUNT(*) FROM vendors")
            total_vendors = int(cursor.fetchone()[0] or 0)

            # 2. Total purchase orders
            cursor.execute("SELECT COUNT(DISTINCT COALESCE(dataco_order_id, id)) FROM purchase_orders")
            total_purchase_orders = int(cursor.fetchone()[0] or 0)

            # 3. Total contracts
            cursor.execute("SELECT COUNT(*) FROM contracts")
            total_contracts = int(cursor.fetchone()[0] or 0)

            # 4. Average reliability
            cursor.execute("SELECT COALESCE(AVG(reliability_score), 0) FROM vendors")
            avg_reliability = float(cursor.fetchone()[0] or 0)

        return {
            "total_vendors": total_vendors,
            "total_purchase_orders": total_purchase_orders,
            "total_contracts": total_contracts,
            "average_reliability": round(avg_reliability, 1)
        }
    except Exception as e:
        conn.rollback()
        return {
            "error": str(e),
            "total_vendors": 0,
            "total_purchase_orders": 0,
            "total_contracts": 0,
            "average_reliability": 0.0
        }

@app.get("/")
def home():
    return {
        "message": "Vendor Reliability Platform Running"
    }



# ==========================
# Frontend
# ==========================

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

app.mount(
    "/frontend",
    StaticFiles(directory=str(FRONTEND_DIR), html=True),
    name="frontend"
)


@app.get("/favicon.ico")
def favicon():
    return Response(status_code=204)