from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.services.authorization import require_roles
from app.database import get_db
from app.schemas.quality_inspection import (
    QualityInspectionCreate,
    QualityInspectionUpdate,
    QualityInspectionResponse,
    QualityInspectionPaginatedResponse,
)
from app.services.audit_log_service import create_audit_log
from app.services.quality_inspection_service import (
    get_all_quality_inspections,
    get_quality_inspection_by_id,
    create_quality_inspection,
    update_quality_inspection,
    delete_quality_inspection,
)


router = APIRouter(
    prefix="/quality-inspections",
    tags=["Quality Inspections"],
)


def quality_inspection_response(
    inspection,
):
    return {
        "id": inspection.id,
        "purchase_order_id": (
            inspection.purchase_order_id
        ),
        "purchase_order_number": (
            inspection.purchase_order.po_number
            if inspection.purchase_order
            else None
        ),
        "vendor_id": inspection.vendor_id,
        "vendor_name": (
            inspection.vendor.vendor_name
            if inspection.vendor
            else None
        ),
        "inspection_date": (
            inspection.inspection_date
        ),
        "inspector": inspection.inspector,
        "quality_score": inspection.quality_score,
        "defects_found": inspection.defects_found,
        "remarks": inspection.remarks,
        "status": inspection.status,
    }


def quality_inspection_audit_values(
    inspection,
):
    return {
        "purchase_order_id": (
            inspection.purchase_order_id
        ),
        "vendor_id": inspection.vendor_id,
        "inspection_date": (
            str(inspection.inspection_date)
            if inspection.inspection_date
            else None
        ),
        "inspector": inspection.inspector,
        "quality_score": inspection.quality_score,
        "defects_found": inspection.defects_found,
        "remarks": inspection.remarks,
        "status": inspection.status,
    }


@router.get(
    "",
    response_model=QualityInspectionPaginatedResponse,
)
def read_quality_inspections(
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Procurement Manager",
            "Supply Chain Manager",
            "Auditor",
        )
    ),
):
    if page < 1:
        page = 1

    if page_size < 1:
        page_size = 50

    if page_size > 100:
        page_size = 100

    result = get_all_quality_inspections(
        db,
        page,
        page_size,
    )

    return {
        "items": [
            quality_inspection_response(
                inspection
            )
            for inspection in result["items"]
        ],
        "page": result["page"],
        "page_size": result["page_size"],
        "total": result["total"],
        "total_pages": result["total_pages"],
    }


@router.get(
    "/{inspection_id}",
    response_model=QualityInspectionResponse,
)
def read_quality_inspection(
    inspection_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Procurement Manager",
            "Supply Chain Manager",
            "Auditor",
        )
    ),
):
    inspection = get_quality_inspection_by_id(
        db,
        inspection_id,
    )

    if not inspection:
        raise HTTPException(
            status_code=404,
            detail="Quality inspection not found",
        )

    return quality_inspection_response(
        inspection
    )


@router.post(
    "",
    response_model=QualityInspectionResponse,
    status_code=201,
)
def add_quality_inspection(
    inspection_data: QualityInspectionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Supply Chain Manager",
        )
    ),
):
    inspection = create_quality_inspection(
        db,
        inspection_data,
    )

    create_audit_log(
        db=db,
        user=current_user,
        action="CREATE",
        module="Quality Inspections",
        entity_type="QualityInspection",
        entity_id=inspection.id,
        description=(
            f"Quality inspection for "
            f"Purchase Order "
            f"#{inspection.purchase_order_id} "
            f"was recorded."
        ),
        new_values=quality_inspection_audit_values(
            inspection
        ),
    )

    db.commit()
    db.refresh(inspection)

    return quality_inspection_response(
        inspection
    )


@router.put(
    "/{inspection_id}",
    response_model=QualityInspectionResponse,
)
def edit_quality_inspection(
    inspection_id: int,
    inspection_data: QualityInspectionUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Supply Chain Manager",
        )
    ),
):
    existing_inspection = (
        get_quality_inspection_by_id(
            db,
            inspection_id,
        )
    )

    if not existing_inspection:
        raise HTTPException(
            status_code=404,
            detail="Quality inspection not found",
        )

    old_values = (
        quality_inspection_audit_values(
            existing_inspection
        )
    )

    old_status = existing_inspection.status

    updated_inspection = (
        update_quality_inspection(
            db,
            inspection_id,
            inspection_data,
        )
    )

    if not updated_inspection:
        raise HTTPException(
            status_code=404,
            detail="Quality inspection not found",
        )

    new_values = (
        quality_inspection_audit_values(
            updated_inspection
        )
    )

    new_status = updated_inspection.status

    create_audit_log(
        db=db,
        user=current_user,
        action="UPDATE",
        module="Quality Inspections",
        entity_type="QualityInspection",
        entity_id=updated_inspection.id,
        description=(
            f"Quality inspection for "
            f"Purchase Order "
            f"#{updated_inspection.purchase_order_id} "
            f"was updated."
        ),
        old_values=old_values,
        new_values=new_values,
    )

    if old_status != new_status:
        create_audit_log(
            db=db,
            user=current_user,
            action="STATUS_CHANGE",
            module="Quality Inspections",
            entity_type="QualityInspection",
            entity_id=updated_inspection.id,
            description=(
                f"Quality inspection status "
                f"changed from '{old_status}' "
                f"to '{new_status}'."
            ),
            old_values={
                "status": old_status,
            },
            new_values={
                "status": new_status,
            },
        )

    db.commit()
    db.refresh(updated_inspection)

    return quality_inspection_response(
        updated_inspection
    )


@router.delete(
    "/{inspection_id}",
)
def remove_quality_inspection(
    inspection_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Supply Chain Manager",
        )
    ),
):
    inspection = get_quality_inspection_by_id(
        db,
        inspection_id,
    )

    if not inspection:
        raise HTTPException(
            status_code=404,
            detail="Quality inspection not found",
        )

    old_values = (
        quality_inspection_audit_values(
            inspection
        )
    )

    deleted = delete_quality_inspection(
        db,
        inspection_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Quality inspection not found",
        )

    create_audit_log(
        db=db,
        user=current_user,
        action="DELETE",
        module="Quality Inspections",
        entity_type="QualityInspection",
        entity_id=inspection_id,
        description=(
            f"Quality inspection for "
            f"Purchase Order "
            f"#{old_values['purchase_order_id']} "
            f"was deleted."
        ),
        old_values=old_values,
    )

    db.commit()

    return deleted