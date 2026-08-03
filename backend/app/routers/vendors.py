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
        score=vendor.score
    )

    db.add(new_vendor)
    db.commit()
    db.refresh(new_vendor)
    db.close()

    return {
        "message": "Vendor added successfully",
        "data": new_vendor
    }
@router.get("/vendors")
def get_vendors():
    db: Session = SessionLocal()

    vendors = db.query(models.Vendor).all()

    db.close()

    return vendors