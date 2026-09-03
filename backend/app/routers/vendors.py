from fastapi import APIRouter
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas

router = APIRouter()

@router.post("/vendors")
def create_vendor(vendor: schemas.VendorCreate):
    db: Session = SessionLocal()

    new_vendor = models.Vendor(
        name=vendor.name,
        delivery=vendor.delivery,
        category=vendor.category,
        status=vendor.status,
        score=vendor.score,
        quality=vendor.quality,
response_time=vendor.response_time
    )

    db.add(new_vendor)
    db.commit()
    db.refresh(new_vendor)
    db.close()

    return {
        "message": "Vendor added successfully",
        "data": new_vendor
    }
@router.put("/vendors/{vendor_id}")
def update_vendor(vendor_id: int, vendor: schemas.VendorCreate):
    db: Session = SessionLocal()

    existing_vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()

    if not existing_vendor:
        db.close()
        return {"message": "Vendor not found"}

    existing_vendor.name = vendor.name
    existing_vendor.delivery = vendor.delivery
    existing_vendor.category = vendor.category
    existing_vendor.status = vendor.status
    existing_vendor.score = vendor.score

    db.commit()
    db.refresh(existing_vendor)
    db.close()

    return {
        "message": "Vendor updated successfully",
        "data": existing_vendor
    }
@router.delete("/vendors/{vendor_id}")
def delete_vendor(vendor_id: int):
    db: Session = SessionLocal()

    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()

    if not vendor:
        db.close()
        return {"message": "Vendor not found"}

    db.delete(vendor)
    db.commit()
    db.close()

    return {"message": "Vendor deleted successfully"}

@router.get("/vendors")
def get_vendors():
    db: Session = SessionLocal()

    vendors = db.query(models.Vendor).all()

    db.close()

    return vendors