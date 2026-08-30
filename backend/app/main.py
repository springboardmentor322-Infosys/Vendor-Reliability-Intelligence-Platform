from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import (
    auth,
    vendors,
    purchase_orders,
    contracts,
    performance,
    notifications,
    reports,
)

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["System"])
def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME}


app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(vendors.router, prefix=settings.API_V1_PREFIX)
app.include_router(purchase_orders.router, prefix=settings.API_V1_PREFIX)
app.include_router(contracts.router, prefix=settings.API_V1_PREFIX)
app.include_router(performance.router, prefix=settings.API_V1_PREFIX)
app.include_router(notifications.router, prefix=settings.API_V1_PREFIX)
app.include_router(reports.router, prefix=settings.API_V1_PREFIX)
