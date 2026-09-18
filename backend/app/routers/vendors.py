
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import schemas, crud
from app.auth import get_current_user

from app.services.risk_engine import (
    calculate_reliability_score,
    calculate_risk_level
)


router = APIRouter(
    prefix="/vendors",
    tags=["Vendors"]
)


# ============================================================
# CREATE VENDOR
# ============================================================

@router.post(
    "/",
    response_model=schemas.VendorResponse
)
def create_vendor(
    vendor: schemas.VendorCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    if current_user["role"] not in [
        "admin",
        "procurement_manager"
    ]:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to create vendors"
        )

    # Calculate reliability score
    reliability_score = calculate_reliability_score(
        vendor.delivery_score,
        vendor.quality_score,
        vendor.payment_score,
        vendor.compliance_score
    )

    # Calculate risk level
    risk_level = calculate_risk_level(
        reliability_score
    )

    return crud.create_vendor(
        db,
        vendor,
        reliability_score,
        risk_level
    )


# ============================================================
# GET ALL VENDORS
# ============================================================

@router.get(
    "/",
    response_model=list[schemas.VendorResponse]
)
def get_vendors(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return crud.get_all_vendors(db)


# ============================================================
# GET SINGLE VENDOR
# ============================================================

@router.get(
    "/{vendor_id}",
    response_model=schemas.VendorResponse
)
def get_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    vendor = crud.get_vendor_by_id(
        db,
        vendor_id
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )

    return vendor


# ============================================================
# UPDATE VENDOR
# ============================================================

@router.put(
    "/{vendor_id}",
    response_model=schemas.VendorResponse
)
def update_vendor(
    vendor_id: int,
    vendor: schemas.VendorCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    # Check permission
    if current_user["role"] not in [
        "admin",
        "procurement_manager"
    ]:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update vendors"
        )

    # Find existing vendor
    existing_vendor = crud.get_vendor_by_id(
        db,
        vendor_id
    )

    if not existing_vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )

    # Recalculate reliability score
    reliability_score = calculate_reliability_score(
        vendor.delivery_score,
        vendor.quality_score,
        vendor.payment_score,
        vendor.compliance_score
    )

    # Recalculate risk level
    risk_level = calculate_risk_level(
        reliability_score
    )

    # Update vendor
    return crud.update_vendor(
        db,
        vendor_id,
        vendor,
        reliability_score,
        risk_level
    )