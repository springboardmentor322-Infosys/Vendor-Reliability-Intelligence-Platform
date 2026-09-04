from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.security import require_admin, get_current_user


router = APIRouter(
    prefix="/vendors",
    tags=["Vendors"]
)


# -------------------- Get All Vendors --------------------

@router.get("/", response_model=list[schemas.VendorResponse])
def get_vendors(
    db: Session = Depends(get_db)
):
    vendors = db.query(models.Vendor).all()

    # Convert old Active status to approval workflow
    for vendor in vendors:
        if vendor.status == "Active":
            vendor.status = "Approved"

    return vendors



# -------------------- Search & Filter Vendors --------------------

@router.get("/search", response_model=list[schemas.VendorResponse])
def search_vendors(
    name: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):

    query = db.query(models.Vendor)

    if name:
        query = query.filter(
            models.Vendor.vendor_name.ilike(f"%{name}%")
        )

    if category:
        query = query.filter(
            models.Vendor.category.ilike(f"%{category}%")
        )

    if status:
        query = query.filter(
            models.Vendor.status.ilike(f"%{status}%")
        )

    return query.all()




# -------------------- Get Current Vendor --------------------
@router.get("/me", response_model=schemas.VendorResponse)
def get_current_vendor(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Return the vendor linked to the logged-in user.

    If the user email is not present in the imported dataset, return the
    first approved vendor so demo/vendor dashboards still have usable data.
    """
    email = (current_user.get("email") or "").strip().lower()
    vendor = db.query(models.Vendor).filter(
        models.Vendor.email.ilike(email)
    ).first()

    if not vendor:
        vendor = db.query(models.Vendor).filter(
            models.Vendor.status.in_(["Approved", "Active"])
        ).order_by(models.Vendor.id.asc()).first()

    if not vendor:
        raise HTTPException(status_code=404, detail="No vendor available")

    if vendor.status == "Active":
        vendor.status = "Approved"
        db.commit()
        db.refresh(vendor)

    return vendor



# -------------------- Get Vendor By ID --------------------

@router.get("/{vendor_id}", response_model=schemas.VendorResponse)
def get_vendor(
    vendor_id: int,
    db: Session = Depends(get_db)
):

    vendor = db.query(models.Vendor).filter(
        models.Vendor.id == vendor_id
    ).first()


    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )

    return vendor



# -------------------- Add Vendor --------------------

@router.post("/add", response_model=schemas.VendorResponse)
def add_vendor(
    vendor: schemas.VendorCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):

    vendor_data = vendor.model_dump()

    # New vendors start with Pending status
    vendor_data["status"] = "Pending"


    new_vendor = models.Vendor(
        **vendor_data
    )


    db.add(new_vendor)
    db.commit()
    db.refresh(new_vendor)

    return new_vendor



# -------------------- Update Vendor --------------------

@router.put("/{vendor_id}", response_model=schemas.VendorResponse)
def update_vendor(
    vendor_id: int,
    vendor: schemas.VendorCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):

    existing_vendor = db.query(models.Vendor).filter(
        models.Vendor.id == vendor_id
    ).first()


    if not existing_vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    for key, value in vendor.model_dump().items():
        setattr(existing_vendor, key, value)


    db.commit()
    db.refresh(existing_vendor)

    return existing_vendor



# -------------------- Approve Vendor --------------------

@router.put("/{vendor_id}/approve",
            response_model=schemas.VendorResponse)
def approve_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):

    vendor = db.query(models.Vendor).filter(
        models.Vendor.id == vendor_id
    ).first()


    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    vendor.status = "Approved"

    db.commit()
    db.refresh(vendor)

    return vendor



# -------------------- Reject Vendor --------------------

@router.put("/{vendor_id}/reject",
            response_model=schemas.VendorResponse)
def reject_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):

    vendor = db.query(models.Vendor).filter(
        models.Vendor.id == vendor_id
    ).first()


    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    vendor.status = "Rejected"

    db.commit()
    db.refresh(vendor)

    return vendor



# -------------------- Move Under Review --------------------

@router.put("/{vendor_id}/review",
            response_model=schemas.VendorResponse)
def review_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):

    vendor = db.query(models.Vendor).filter(
        models.Vendor.id == vendor_id
    ).first()


    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    vendor.status = "Under Review"

    db.commit()
    db.refresh(vendor)

    return vendor



# -------------------- Delete Vendor --------------------

@router.delete("/{vendor_id}")
def delete_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):

    vendor = db.query(models.Vendor).filter(
        models.Vendor.id == vendor_id
    ).first()


    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    db.delete(vendor)
    db.commit()


    return {
        "message": "Vendor deleted successfully"
    }