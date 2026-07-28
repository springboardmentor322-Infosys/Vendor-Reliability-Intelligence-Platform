from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

import models, database

# Create tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="VendorIntel API")

# Configure CORS so the frontend HTML files can fetch data
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas for Requests/Responses
class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str

    class Config:
        orm_mode = True

class VendorCreate(BaseModel):
    company_name: str
    contact_email: str
    status: str = "Pending"

class VendorResponse(VendorCreate):
    id: int
    rating: float
    risk_level: str
    delivery_rate: float
    quality_score: float

    class Config:
        orm_mode = True

class StatusUpdate(BaseModel):
    status: str

# --- API Endpoints ---

@app.get("/")
def root():
    return {"message": "VendorIntel API is running"}

@app.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(database.get_db)):
    # Very basic placeholder logic for the internship project.
    # We map email domains or keywords to roles for demonstration.
    role = "vendor"
    if "admin" in req.email.lower() or "exec" in req.email.lower():
        role = "admin"
    elif "manager" in req.email.lower() or "procure" in req.email.lower():
        role = "manager"
    
    # Mock successful login response
    name = req.email.split('@')[0].capitalize()
    return {
        "success": True,
        "user": {
            "name": name,
            "email": req.email,
            "role": role
        }
    }

@app.get("/api/vendors", response_model=List[VendorResponse])
def get_vendors(db: Session = Depends(database.get_db)):
    vendors = db.query(models.Vendor).all()
    return vendors

@app.post("/api/vendors", response_model=VendorResponse)
def create_vendor(vendor: VendorCreate, db: Session = Depends(database.get_db)):
    db_vendor = models.Vendor(**vendor.dict())
    db.add(db_vendor)
    db.commit()
    db.refresh(db_vendor)
    return db_vendor

@app.put("/api/vendors/{vendor_id}/status", response_model=VendorResponse)
def update_vendor_status(vendor_id: int, status_update: StatusUpdate, db: Session = Depends(database.get_db)):
    db_vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not db_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    db_vendor.status = status_update.status
    db.commit()
    db.refresh(db_vendor)
    return db_vendor
