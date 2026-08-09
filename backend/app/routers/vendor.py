from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.vendor import Vendor
from app.schemas.vendor import VendorCreate

router = APIRouter()


@router.post("/vendors")
def create_vendor(
    vendor: VendorCreate,
    db: Session = Depends(get_db)
):

    new_vendor = Vendor(
        vendor_name=vendor.vendor_name,
        email=vendor.email,
        phone=vendor.phone,
        address=vendor.address,
        gst_number=vendor.gst_number
    )

    db.add(new_vendor)
    db.commit()
    db.refresh(new_vendor)

    return {
        "message": "Vendor created successfully",
        "vendor_id": new_vendor.id
    }

@router.get("/vendors")
def get_vendors(db: Session = Depends(get_db)):

    vendors = db.query(Vendor).all()

    print("========== DEBUG ==========")
    print("VENDORS:", vendors)
    print("===========================")

    return vendors

@router.get("/vendors/count")
def vendor_count(db: Session = Depends(get_db)):

    total = db.query(Vendor).count()

    return {
        "count": total
    }

@router.put("/vendors/{vendor_id}")
def update_vendor(
    vendor_id: int,
    vendor: VendorCreate,
    db: Session = Depends(get_db)
):

    existing_vendor = db.query(Vendor).filter(
        Vendor.id == vendor_id
    ).first()

    if not existing_vendor:
        return {
            "message": "Vendor not found"
        }

    existing_vendor.vendor_name = vendor.vendor_name
    existing_vendor.email = vendor.email
    existing_vendor.phone = vendor.phone
    existing_vendor.address = vendor.address
    existing_vendor.gst_number = vendor.gst_number

    db.commit()
    db.refresh(existing_vendor)

    return {
        "message": "Vendor updated successfully"
    }

@router.delete("/vendors/{vendor_id}")
def delete_vendor(
    vendor_id: int,
    db: Session = Depends(get_db)
):

    vendor = db.query(Vendor).filter(
        Vendor.id == vendor_id
    ).first()

    if not vendor:
        return {
            "message": "Vendor not found"
        }

    db.delete(vendor)
    db.commit()

    return {
        "message": "Vendor deleted successfully"
    }