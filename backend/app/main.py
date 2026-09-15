from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import vendors, auth, procurements, purchase_orders, dashboard, contracts, notifications, reports
from app.database import engine
from app import models

app = FastAPI(
    title="Vendor Reliability Intelligence Platform API",
    description="Full-stack API for vendor evaluation, procurement management, contract compliance, and reliability intelligence.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)

app.include_router(auth.router)
app.include_router(vendors.router)
app.include_router(procurements.router)
app.include_router(purchase_orders.router)
app.include_router(contracts.router)
app.include_router(dashboard.router)
app.include_router(notifications.router)
app.include_router(reports.router)

@app.get("/")
def home():
    return {
        "status": "online",
        "app": "Vendor Reliability Intelligence Platform (VendorIQ)",
        "version": "1.0.0",
        "modules": [
            "User Authentication & Role Management",
            "Vendor Management Module",
            "Procurement Management Module",
            "Vendor Performance Module",
            "Vendor Reliability Module",
            "Contract & Compliance Module",
            "Communication Module",
            "Dashboard & Analytics Module",
            "Notification Module",
            "Reports & Export Module"
        ]
    }