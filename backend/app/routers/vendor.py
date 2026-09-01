from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.vendor import Vendor

from app.schemas.vendor import (
    VendorCreate,
    VendorStatusUpdate,
    VendorApprovalUpdate,
    VENDOR_CATEGORIES,
    VENDOR_STATUSES,
    VENDOR_APPROVAL_STATUSES
)

from app.utils.permissions import (
    require_roles,
    ADMINISTRATOR,
    PROCUREMENT_MANAGER,
    SUPPLY_CHAIN_MANAGER,
    VENDOR,
    FINANCE_OFFICER,
    AUDITOR
)


router = APIRouter()


# ==========================================
# CREATE VENDOR
# ==========================================

@router.post("/vendors")
def create_vendor(
    vendor: VendorCreate,
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER
        )
    )
):

    # ======================================
    # VALIDATE CATEGORY
    # ======================================

    if vendor.category not in VENDOR_CATEGORIES:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid vendor category. "
                "Allowed categories: "
                + ", ".join(VENDOR_CATEGORIES)
            )
        )


    # ======================================
    # CHECK DUPLICATE EMAIL
    # ======================================

    existing_vendor = db.query(
        Vendor
    ).filter(
        Vendor.email == vendor.email
    ).first()


    if existing_vendor:

        raise HTTPException(
            status_code=400,
            detail="Vendor email already exists"
        )


    # ======================================
    # CREATE
    # ======================================

    new_vendor = Vendor(

        vendor_name=vendor.vendor_name,

        email=vendor.email,

        phone=vendor.phone,

        address=vendor.address,

        gst_number=vendor.gst_number,

        category=vendor.category,

        contact_person=vendor.contact_person,

        approval_status="Pending",

        status="Active"

    )


    db.add(new_vendor)

    db.commit()

    db.refresh(new_vendor)


    return {

        "message":
            "Vendor created successfully",

        "vendor": {

            "id":
                new_vendor.id,

            "vendor_name":
                new_vendor.vendor_name,

            "email":
                new_vendor.email,

            "phone":
                new_vendor.phone,

            "address":
                new_vendor.address,

            "gst_number":
                new_vendor.gst_number,

            "category":
                new_vendor.category,

            "contact_person":
                new_vendor.contact_person,

            "approval_status":
                new_vendor.approval_status,

            "status":
                new_vendor.status

        }

    }


# ==========================================
# GET ALL VENDORS
# ==========================================

@router.get("/vendors")
def get_vendors(
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    vendors = db.query(
        Vendor
    ).all()


    return vendors


# ==========================================
# GET SINGLE VENDOR
# ==========================================

@router.get("/vendors/{vendor_id}")
def get_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    vendor = db.query(
        Vendor
    ).filter(
        Vendor.id == vendor_id
    ).first()


    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    return vendor


# ==========================================
# GET VENDOR COUNT
# ==========================================

@router.get("/vendors/count")
def vendor_count(
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    total = db.query(
        Vendor
    ).count()


    return {
        "count": total
    }


# ==========================================
# UPDATE VENDOR
# ==========================================

@router.put("/vendors/{vendor_id}")
def update_vendor(
    vendor_id: int,
    vendor: VendorCreate,
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER
        )
    )
):

    # ======================================
    # VALIDATE CATEGORY
    # ======================================

    if vendor.category not in VENDOR_CATEGORIES:

        raise HTTPException(
            status_code=400,
            detail="Invalid vendor category"
        )


    # ======================================
    # FIND VENDOR
    # ======================================

    existing_vendor = db.query(
        Vendor
    ).filter(
        Vendor.id == vendor_id
    ).first()


    if not existing_vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    # ======================================
    # DUPLICATE EMAIL
    # ======================================

    duplicate_vendor = db.query(
        Vendor
    ).filter(
        Vendor.email == vendor.email,
        Vendor.id != vendor_id
    ).first()


    if duplicate_vendor:

        raise HTTPException(
            status_code=400,
            detail="Vendor email already exists"
        )


    # ======================================
    # UPDATE
    # ======================================

    existing_vendor.vendor_name = (
        vendor.vendor_name
    )

    existing_vendor.email = (
        vendor.email
    )

    existing_vendor.phone = (
        vendor.phone
    )

    existing_vendor.address = (
        vendor.address
    )

    existing_vendor.gst_number = (
        vendor.gst_number
    )

    existing_vendor.category = (
        vendor.category
    )

    existing_vendor.contact_person = (
        vendor.contact_person
    )


    db.commit()

    db.refresh(existing_vendor)


    return {

        "message":
            "Vendor updated successfully",

        "vendor":
            existing_vendor

    }


# ==========================================
# UPDATE VENDOR APPROVAL
# ==========================================

@router.put("/vendors/{vendor_id}/approval")
def update_vendor_approval(
    vendor_id: int,
    data: VendorApprovalUpdate,
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER
        )
    )
):

    if data.approval_status not in VENDOR_APPROVAL_STATUSES:

        raise HTTPException(
            status_code=400,
            detail="Invalid approval status"
        )


    vendor = db.query(
        Vendor
    ).filter(
        Vendor.id == vendor_id
    ).first()


    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    vendor.approval_status = (
        data.approval_status
    )


    db.commit()

    db.refresh(vendor)


    return {

        "message":
            "Vendor approval status updated",

        "vendor_id":
            vendor.id,

        "approval_status":
            vendor.approval_status

    }


# ==========================================
# APPROVE VENDOR
# ==========================================

@router.put("/vendors/{vendor_id}/approve")
def approve_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER
        )
    )
):

    vendor = db.query(
        Vendor
    ).filter(
        Vendor.id == vendor_id
    ).first()


    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    vendor.approval_status = "Approved"

    vendor.status = "Active"


    db.commit()

    db.refresh(vendor)


    return {

        "message":
            "Vendor approved successfully",

        "vendor":
            vendor

    }


# ==========================================
# REJECT VENDOR
# ==========================================

@router.put("/vendors/{vendor_id}/reject")
def reject_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER
        )
    )
):

    vendor = db.query(
        Vendor
    ).filter(
        Vendor.id == vendor_id
    ).first()


    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    vendor.approval_status = "Rejected"

    vendor.status = "Inactive"


    db.commit()

    db.refresh(vendor)


    return {

        "message":
            "Vendor rejected successfully",

        "vendor":
            vendor

    }


# ==========================================
# UPDATE VENDOR STATUS
# ==========================================

@router.put("/vendors/{vendor_id}/status")
def update_vendor_status(
    vendor_id: int,
    data: VendorStatusUpdate,
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER
        )
    )
):

    if data.status not in VENDOR_STATUSES:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid vendor status. "
                "Allowed values: "
                + ", ".join(VENDOR_STATUSES)
            )
        )


    vendor = db.query(
        Vendor
    ).filter(
        Vendor.id == vendor_id
    ).first()


    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    vendor.status = data.status


    db.commit()

    db.refresh(vendor)


    return {

        "message":
            "Vendor status updated",

        "vendor_id":
            vendor.id,

        "status":
            vendor.status

    }


# ==========================================
# DELETE VENDOR
# ==========================================

@router.delete("/vendors/{vendor_id}")
def delete_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR
        )
    )
):

    vendor = db.query(
        Vendor
    ).filter(
        Vendor.id == vendor_id
    ).first()


    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    db.delete(vendor)

    db.commit()


    return {

        "message":
            "Vendor deleted successfully"

    }