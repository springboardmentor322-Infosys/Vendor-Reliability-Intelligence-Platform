from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import vendors, auth, procurements, purchase_orders, dashboard, contracts
from app.database import engine
from app import models

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
models.Base.metadata.create_all(bind=engine)
app.include_router(vendors.router)
app.include_router(auth.router)
app.include_router(procurements.router)
app.include_router(purchase_orders.router)
app.include_router(dashboard.router)
app.include_router(contracts.router)

@app.get("/")
def home():
    return {"message": "Welcome to Vendor Reliability Intelligence Platform"}