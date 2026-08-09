from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import OperationalError

from app.db.base import Base
from app.db.seed_admin import ensure_admin_account
from app.db.seed_vendor_categories import ensure_vendor_categories
from app.db.session import SessionLocal, engine
from app.routers import admin, auth, contracts, procurement, purchase_orders, vendors
from app.services.vendor_documents import ensure_upload_dir
from app.services.po_documents import ensure_po_upload_dir
from app.services.contract_documents import ensure_contract_upload_dir

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
app.include_router(procurement.router)
app.include_router(purchase_orders.router)
app.include_router(contracts.router)

ensure_upload_dir()
ensure_po_upload_dir()
ensure_contract_upload_dir()
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
    finally:
        db.close()


@app.get("/")
def root():
    return {"status": "ok"}


@app.get("/health")
def health():
    return {"status": "ok"}
