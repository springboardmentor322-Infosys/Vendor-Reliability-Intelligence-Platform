from fastapi import FastAPI

from app.routes.auth import router as auth_router
from app.routes.vendors import router as vendors_router
from app.routes.purchase_orders import router as purchase_orders_router

from app.database import Base, engine

from app.models.user import User
from app.models.vendor import Vendor
from app.models.purchase_order import PurchaseOrder
from app.routes.settings import router as settings_router

from app.routes.procurement_requests import (
    router as procurement_requests_router
)
from app.routes.dashboard import router as dashboard_router

from fastapi.middleware.cors import CORSMiddleware

from app.routes.products import router as products_router

from app.routes.deliveries import router as deliveries_router

from app.routes import contracts

from app.routes import invoices

from app.routes import quality_inspections

from app.routes import communication_history

from app.routes import notification

from app.routes.users import router as users_router

from app.models.audit_log import AuditLog
from app.routes.audit_logs import router as audit_logs_router
from app.routes.analytics import router as analytics_router
from app.routes.reports import router as reports_router

app = FastAPI(
    title="Vendor Reliability Platform",
    version="1.0.0"
)
Base.metadata.create_all(bind=engine)

app.include_router(auth_router)
app.include_router(vendors_router)
app.include_router(purchase_orders_router)
app.include_router(dashboard_router)
app.include_router(procurement_requests_router)
app.include_router(products_router)
app.include_router(deliveries_router)
app.include_router(contracts.router)
app.include_router(invoices.router)
app.include_router(quality_inspections.router)
app.include_router(communication_history.router)
app.include_router(notification.router)
app.include_router(users_router)
app.include_router(settings_router)
app.include_router(audit_logs_router)
app.include_router(analytics_router)
app.include_router(reports_router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5501"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/")
def root():
    return {
        "message": "Vendor Reliability Platform API is Running"
    }
    

