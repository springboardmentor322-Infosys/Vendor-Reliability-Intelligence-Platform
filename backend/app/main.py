from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import vendors
from app.routers import auth
from app.routers import procurements
from app.routers import purchase_orders
from app.database import engine
from app import models

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "http://localhost:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
models.Base.metadata.create_all(bind=engine)
app.include_router(vendors.router)
app.include_router(auth.router)
app.include_router(procurements.router)
app.include_router(purchase_orders.router)
@app.get("/")
def home():
    return {"message": "Welcome to Vendor Reliability Intelligence Platform"}
@app.get("/vendors")
def get_vendors():
    return [
        {
            "id": 1,
            "name": "ABC Supplier",
            "delivery": "On Time",
            "score": 90
        },
        {
            "id": 2,
            "name": "XYZ Supplier",
            "delivery": "Late",
            "score": 70
        }
    ]