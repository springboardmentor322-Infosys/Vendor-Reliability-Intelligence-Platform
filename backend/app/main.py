"""VendorIQ FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers.auth import router as auth_router
from app.routers.milestone_two import contracts_router, po_router, procurement_router, vendors_router
from app.routers.reliability import router as reliability_router
from app.routers.notifications import router as notifications_router
from app.routers.users import router as users_router
from app.routers.audit_logs import router as audit_logs_router
from app.routers.exports import router as exports_router
from app.routers.files import router as files_router
from app.routers.password_reset import router as password_reset_router
from app.routers.invoices import router as invoices_router


app = FastAPI(
    title=settings.app_name,
    version="3.0.0",
    description="VendorIQ — Vendor Reliability Intelligence Platform (Milestone 3).",
    debug=settings.debug,
)

# `null` is intentionally present in settings for pages opened directly from
# disk, while localhost origins support a normal static development server.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Milestone 1 & 2 routers (preserved)
app.include_router(auth_router)
app.include_router(vendors_router)
app.include_router(procurement_router)
app.include_router(po_router)
app.include_router(contracts_router)

# Milestone 3 routers
app.include_router(reliability_router)
app.include_router(notifications_router)
app.include_router(users_router)
app.include_router(audit_logs_router)
app.include_router(exports_router)
app.include_router(files_router)
app.include_router(password_reset_router)
app.include_router(invoices_router)
