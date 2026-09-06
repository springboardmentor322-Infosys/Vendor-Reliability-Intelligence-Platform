from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from app.services.authorization import require_roles
from app.database import get_db
from app.schemas.vendor import (
    VendorCreate,
    VendorUpdate,
    VendorResponse,
)
from app.services.audit_log_service import create_audit_log
from app.services.vendor_service import (
    get_all_vendors,
    get_vendor_by_id,
    create_vendor,
    update_vendor,
    delete_vendor,
    mark_vendor_under_review,
    approve_vendor,
    reject_vendor,
)


router = APIRouter(
    prefix="/vendors",
    tags=["Vendors"],
)


def vendor_audit_values(vendor):
    return {
        "vendor_name": vendor.vendor_name,
        "category": vendor.category,
        "email": vendor.email,
        "phone": vendor.phone,
        "status": vendor.status,
        "reliability_score": vendor.reliability_score,
        "compliance_score": vendor.compliance_score,
    }


@router.get(
    "",
    response_model=list[VendorResponse],
)
def read_vendors(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Procurement Manager",
            "Supply Chain Manager",
            "Finance Officer",
            "Auditor",
        )
    ),
):
    return get_all_vendors(db)


@router.get(
    "/{vendor_id}",
    response_model=VendorResponse,
)
def read_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Procurement Manager",
            "Supply Chain Manager",
            "Finance Officer",
            "Auditor",
        )
    ),
):
    vendor = get_vendor_by_id(db, vendor_id)

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    return vendor


@router.post(
    "",
    response_model=VendorResponse,
    status_code=201,
)
def add_vendor(
    vendor_data: VendorCreate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Procurement Manager",
        )
    ),
):
    vendor = create_vendor(
        db,
        vendor_data,
    )

    create_audit_log(
        db=db,
        user=current_user,
        action="CREATE",
        module="Vendors",
        entity_type="Vendor",
        entity_id=vendor.id,
        description=(
            f"Vendor '{vendor.vendor_name}' was created."
        ),
        new_values=vendor_audit_values(vendor),
    )

    db.commit()
    db.refresh(vendor)

    return vendor


@router.put(
    "/{vendor_id}",
    response_model=VendorResponse,
)
def edit_vendor(
    vendor_id: int,
    vendor_data: VendorUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Procurement Manager",
        )
    ),
):
    existing_vendor = get_vendor_by_id(
        db,
        vendor_id,
    )

    if not existing_vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    old_values = vendor_audit_values(
        existing_vendor
    )

    updated_vendor = update_vendor(
        db,
        vendor_id,
        vendor_data,
    )

    if not updated_vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    new_values = vendor_audit_values(
        updated_vendor
    )

    create_audit_log(
        db=db,
        user=current_user,
        action="UPDATE",
        module="Vendors",
        entity_type="Vendor",
        entity_id=updated_vendor.id,
        description=(
            f"Vendor '{updated_vendor.vendor_name}' "
            f"was updated."
        ),
        old_values=old_values,
        new_values=new_values,
    )

    db.commit()
    db.refresh(updated_vendor)

    return updated_vendor


@router.delete(
    "/{vendor_id}",
)
def remove_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
        )
    ),
):
    vendor = get_vendor_by_id(
        db,
        vendor_id,
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    old_values = vendor_audit_values(
        vendor
    )

    deleted = delete_vendor(
        db,
        vendor_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    create_audit_log(
        db=db,
        user=current_user,
        action="DELETE",
        module="Vendors",
        entity_type="Vendor",
        entity_id=vendor_id,
        description=(
            f"Vendor '{old_values['vendor_name']}' "
            f"was deleted."
        ),
        old_values=old_values,
    )

    db.commit()

    return deleted


@router.put(
    "/{vendor_id}/review",
    response_model=VendorResponse,
)
def review_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Procurement Manager",
        )
    ),
):
    existing_vendor = get_vendor_by_id(
        db,
        vendor_id,
    )

    if not existing_vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    old_status = existing_vendor.status

    vendor = mark_vendor_under_review(
        db,
        vendor_id,
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    new_status = vendor.status

    if old_status != new_status:
        create_audit_log(
            db=db,
            user=current_user,
            action="STATUS_CHANGE",
            module="Vendors",
            entity_type="Vendor",
            entity_id=vendor.id,
            description=(
                f"Vendor '{vendor.vendor_name}' "
                f"status changed from "
                f"'{old_status}' to '{new_status}'."
            ),
            old_values={
                "status": old_status,
            },
            new_values={
                "status": new_status,
            },
        )

    db.commit()
    db.refresh(vendor)

    return vendor


@router.put(
    "/{vendor_id}/approve",
    response_model=VendorResponse,
)
def approve(
    vendor_id: int,
    approved_by: str = Body(...),
    notes: str | None = Body(None),
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Procurement Manager",
        )
    ),
):
    existing_vendor = get_vendor_by_id(
        db,
        vendor_id,
    )

    if not existing_vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    old_status = existing_vendor.status

    vendor = approve_vendor(
        db,
        vendor_id,
        approved_by,
        notes,
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    new_status = vendor.status

    create_audit_log(
        db=db,
        user=current_user,
        action="APPROVE",
        module="Vendors",
        entity_type="Vendor",
        entity_id=vendor.id,
        description=(
            f"Vendor '{vendor.vendor_name}' "
            f"was approved."
        ),
        old_values={
            "status": old_status,
        },
        new_values={
            "status": new_status,
            "approved_by": approved_by,
            "approval_notes": notes,
        },
    )

    db.commit()
    db.refresh(vendor)

    return vendor


@router.put(
    "/{vendor_id}/reject",
    response_model=VendorResponse,
)
def reject(
    vendor_id: int,
    approved_by: str = Body(...),
    notes: str | None = Body(None),
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Procurement Manager",
        )
    ),
):
    existing_vendor = get_vendor_by_id(
        db,
        vendor_id,
    )

    if not existing_vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    old_status = existing_vendor.status

    vendor = reject_vendor(
        db,
        vendor_id,
        approved_by,
        notes,
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    new_status = vendor.status

    create_audit_log(
        db=db,
        user=current_user,
        action="REJECT",
        module="Vendors",
        entity_type="Vendor",
        entity_id=vendor.id,
        description=(
            f"Vendor '{vendor.vendor_name}' "
            f"was rejected."
        ),
        old_values={
            "status": old_status,
        },
        new_values={
            "status": new_status,
            "approved_by": approved_by,
            "approval_notes": notes,
        },
    )

    db.commit()
    db.refresh(vendor)

    return vendor