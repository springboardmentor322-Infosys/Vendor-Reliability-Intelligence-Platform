from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers from modules
from app.modules.auth.router import router as auth_router
from app.modules.vendors.router import router as vendors_router
from app.modules.procurement.router import router as procurement_router
from app.modules.performance.router import router as performance_router
from app.modules.reliability.router import router as reliability_router
from app.modules.contracts.router import router as contracts_router
from app.modules.notifications.router import router as notifications_router
from app.modules.analytics.router import router as analytics_router
from app.modules.reports.router import router as reports_router
from app.modules.communications.router import router as communications_router

app = FastAPI(title="Vendor Reliability Intelligence Platform API")

# Configure CORS for Angular dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://127.0.0.1:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}

# Mount routers
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(vendors_router, prefix="/vendors", tags=["Vendors"])
app.include_router(procurement_router, prefix="/procurement", tags=["Procurement"])
app.include_router(performance_router, prefix="/performance", tags=["Performance"])
app.include_router(reliability_router, prefix="/reliability", tags=["Reliability"])
app.include_router(contracts_router, prefix="/contracts", tags=["Contracts"])
app.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
app.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
app.include_router(reports_router, prefix="/reports", tags=["Reports"])
app.include_router(communications_router, prefix="/communications", tags=["Communications"])
