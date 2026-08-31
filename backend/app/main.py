from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import OperationalError

from app.db.base import Base
from app.models import communication  # noqa: F401 — register thread_messages & audit_logs tables
import app.models.supply_chain  # noqa: F401 — register products, deliveries, invoices, quality_inspections
from app.db.seed_admin import ensure_admin_account
from app.db.seed_vendor_categories import ensure_vendor_categories
from app.db.session import SessionLocal, engine
from app.routers import admin, analytics, audit_logs, auth, compliance_documents, contracts, dashboard, messages, notifications, procurement, purchase_orders, reports, supply_chain, support, vendors
from app.services.vendor_documents import ensure_upload_dir
from app.services.po_documents import ensure_po_upload_dir
from app.services.contract_documents import ensure_contract_upload_dir
from app.services.compliance_documents import ensure_compliance_upload_dir
from app.services.vendor_profile import count_vendor_users_missing_profile

app = FastAPI(title="Vendor Reliability Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(vendors.router)
app.include_router(vendors.categories_router)
app.include_router(analytics.router)
app.include_router(dashboard.router)
app.include_router(reports.router)
app.include_router(procurement.router)
app.include_router(purchase_orders.router)
app.include_router(contracts.router)
app.include_router(compliance_documents.router)
app.include_router(messages.router)
app.include_router(audit_logs.router)
app.include_router(notifications.router)
app.include_router(support.router)
app.include_router(supply_chain.products_router)
app.include_router(supply_chain.deliveries_router)
app.include_router(supply_chain.invoices_router)
app.include_router(supply_chain.quality_inspections_router)

ensure_upload_dir()
ensure_po_upload_dir()
ensure_contract_upload_dir()
ensure_compliance_upload_dir()
uploads_path = Path(__file__).resolve().parent.parent / "uploads"
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")


@app.on_event("startup")
def initialize_database() -> None:
    try:
        Base.metadata.create_all(bind=engine)
    except OperationalError as exc:
        print(f"Database startup warning: {exc}")

    db = SessionLocal()
    try:
        ensure_admin_account(db)
        ensure_vendor_categories(db)
        missing_profiles = count_vendor_users_missing_profile(db)
        if missing_profiles:
            print(
                f"Vendor profile backfill needed: {missing_profiles} Vendor user(s) "
                "have no linked vendor record"
            )
    finally:
        db.close()


@app.get("/")
def root():
    return {"status": "ok"}


@app.get("/health")
def health():
    return {"status": "ok"}
