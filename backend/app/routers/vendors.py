from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from typing import List, Optional

router = APIRouter(
    prefix="/vendors",
    tags=["Vendor Management & Reliability"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def calculate_reliability_score(delivery: str, quality: int, response_time: int) -> tuple[int, str]:
    delivery_score = 100 if delivery == "On Time" else 50
    quality_score = min(max(quality, 0), 100)
    
    if response_time <= 12:
        resp_score = 100
    elif response_time <= 24:
        resp_score = 80
    elif response_time <= 48:
        resp_score = 60
    else:
        resp_score = 40
        
    contract_compliance = 95
    
    calculated_score = int(
        (0.4 * delivery_score) +
        (0.3 * quality_score) +
        (0.2 * resp_score) +
        (0.1 * contract_compliance)
    )
    
    if calculated_score >= 75:
        risk_level = "Low"
    elif calculated_score >= 60:
        risk_level = "Medium"
    else:
        risk_level = "High"
        
    return calculated_score, risk_level

@router.post("", response_model=dict)
@router.post("/", response_model=dict)
def create_vendor(vendor: schemas.VendorCreate, db: Session = Depends(get_db)):
    calculated_score, risk_level = calculate_reliability_score(
        vendor.delivery or "On Time",
        vendor.quality or 90,
        vendor.response_time or 24
    )
    
    new_vendor = models.Vendor(
        name=vendor.name,
        delivery=vendor.delivery or "On Time",
        category=vendor.category or "Raw Material Suppliers",
        status=vendor.status or "Active",
        approval_status=vendor.approval_status or "Approved",
        score=calculated_score,
        quality=vendor.quality or 90,
        response_time=vendor.response_time or 24,
        contact_person=vendor.contact_person,
        email=vendor.email,
        phone=vendor.phone,
        risk_level=risk_level
    )

    db.add(new_vendor)
    db.commit()
    db.refresh(new_vendor)

    return {
        "message": "Vendor registered successfully",
        "data": schemas.VendorResponse.model_validate(new_vendor).model_dump()
    }

@router.get("", response_model=List[schemas.VendorResponse])
@router.get("/", response_model=List[schemas.VendorResponse])
def get_vendors(category: Optional[str] = None, status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Vendor)
    if category:
        query = query.filter(models.Vendor.category == category)
    if status:
        query = query.filter(models.Vendor.status == status)
    
    vendors = query.all()
    return vendors

@router.get("/{vendor_id}", response_model=dict)
def get_vendor(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return {"data": schemas.VendorResponse.model_validate(vendor).model_dump()}

@router.put("/{vendor_id}", response_model=dict)
def update_vendor(vendor_id: int, vendor: schemas.VendorCreate, db: Session = Depends(get_db)):
    existing_vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()

    if not existing_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    calculated_score, risk_level = calculate_reliability_score(
        vendor.delivery or existing_vendor.delivery,
        vendor.quality if vendor.quality is not None else existing_vendor.quality,
        vendor.response_time if vendor.response_time is not None else existing_vendor.response_time
    )

    existing_vendor.name = vendor.name
    existing_vendor.delivery = vendor.delivery or existing_vendor.delivery
    existing_vendor.category = vendor.category or existing_vendor.category
    existing_vendor.status = vendor.status or existing_vendor.status
    existing_vendor.quality = vendor.quality if vendor.quality is not None else existing_vendor.quality
    existing_vendor.response_time = vendor.response_time if vendor.response_time is not None else existing_vendor.response_time
    existing_vendor.score = calculated_score
    existing_vendor.risk_level = risk_level
    if vendor.contact_person: existing_vendor.contact_person = vendor.contact_person
    if vendor.email: existing_vendor.email = vendor.email
    if vendor.phone: existing_vendor.phone = vendor.phone

    db.commit()
    db.refresh(existing_vendor)

    return {
        "message": "Vendor updated successfully",
        "data": schemas.VendorResponse.model_validate(existing_vendor).model_dump()
    }

@router.put("/{vendor_id}/approve", response_model=dict)
def approve_vendor(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    vendor.approval_status = "Approved"
    vendor.status = "Active"
    db.commit()
    return {"message": f"Vendor '{vendor.name}' approved successfully", "data": schemas.VendorResponse.model_validate(vendor).model_dump()}

@router.put("/{vendor_id}/reject", response_model=dict)
def reject_vendor(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    vendor.approval_status = "Rejected"
    vendor.status = "Inactive"
    db.commit()
    return {"message": f"Vendor '{vendor.name}' rejected", "data": schemas.VendorResponse.model_validate(vendor).model_dump()}

@router.delete("/{vendor_id}", response_model=dict)
def delete_vendor(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    db.delete(vendor)
    db.commit()

    return {"message": "Vendor deleted successfully"}