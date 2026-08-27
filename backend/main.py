import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from database import engine, Base, SessionLocal
from notifications_engine import check_expiring_contracts
from routers import auth_router, vendors, procurement, performance, contracts, communication, notifications, dashboard, reports

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="VendorIQ - Vendor Reliability Intelligence Platform",
    description="Procurement risk & vendor reliability management platform",
    version="1.0.0",
)


@app.on_event("startup")
def run_startup_checks():
    # Catches any contract that entered the expiry-warning window while the
    # server was down, so notifications don't depend on someone opening the
    # bell icon first.
    db = SessionLocal()
    try:
        check_expiring_contracts(db)
    finally:
        db.close()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(vendors.router)
app.include_router(procurement.router)
app.include_router(performance.router)
app.include_router(contracts.router)
app.include_router(communication.router)
app.include_router(notifications.router)
app.include_router(dashboard.router)
app.include_router(reports.router)

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")

app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")

@app.get("/")
def serve_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "landing.html"))


@app.get("/{page_name}.html")
def serve_page(page_name: str):
    path = os.path.join(FRONTEND_DIR, f"{page_name}.html")
    if os.path.exists(path):
        return FileResponse(path)
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "VendorIQ API"}