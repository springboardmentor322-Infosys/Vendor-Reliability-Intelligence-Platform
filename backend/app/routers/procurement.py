from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.procurement_request import ProcurementRequest
from app.models.vendor import Vendor
from app.schemas.procurement_request import ProcurementRequestCreate

from app.utils.permissions import (
    require_roles,
    ADMINISTRATOR,
    PROCUREMENT_MANAGER,
    SUPPLY_CHAIN_MANAGER,
    VENDOR,
    FINANCE_OFFICER,
    AUDITOR
)


router = APIRouter(
    prefix="/procurement",
    tags=["Procurement"]
)


# ==========================================
# CREATE PROCUREMENT REQUEST
# ==========================================

@router.post("/")
def create_procurement_request(
    data: ProcurementRequestCreate,
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER
        )
    )
):

    # Check if vendor exists

    vendor = db.query(Vendor).filter(
        Vendor.id == data.vendor_id
    ).first()

    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    request = ProcurementRequest(

        vendor_id=data.vendor_id,

        product_name=data.product_name,

        quantity=data.quantity,

        estimated_amount=data.estimated_amount

    )


    db.add(request)

    db.commit()

    db.refresh(request)


    return request


# ==========================================
# GET ALL PROCUREMENT REQUESTS
# ==========================================

@router.get("/")
def get_procurement_requests(
    db: Session = Depends(get_db),

    current_user = Depends(
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

    requests = db.query(
        ProcurementRequest
    ).all()


    return requests


# ==========================================
# GET SINGLE PROCUREMENT REQUEST
# ==========================================

@router.get("/{request_id}")
def get_procurement_request(
    request_id: int,
    db: Session = Depends(get_db),

    current_user = Depends(
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

    request = db.query(
        ProcurementRequest
    ).filter(
        ProcurementRequest.id == request_id
    ).first()


    if not request:

        raise HTTPException(
            status_code=404,
            detail="Procurement request not found"
        )


    return request


# ==========================================
# UPDATE PROCUREMENT REQUEST
# ==========================================

@router.put("/{request_id}")
def update_procurement_request(
    request_id: int,
    data: ProcurementRequestCreate,
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER
        )
    )
):

    request = db.query(
        ProcurementRequest
    ).filter(
        ProcurementRequest.id == request_id
    ).first()


    if not request:

        raise HTTPException(
            status_code=404,
            detail="Procurement request not found"
        )


    vendor = db.query(Vendor).filter(
        Vendor.id == data.vendor_id
    ).first()


    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    request.vendor_id = data.vendor_id

    request.product_name = data.product_name

    request.quantity = data.quantity

    request.estimated_amount = data.estimated_amount


    db.commit()

    db.refresh(request)


    return request


# ==========================================
# DELETE PROCUREMENT REQUEST
# ==========================================

@router.delete("/{request_id}")
def delete_procurement_request(
    request_id: int,
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR
        )
    )
):

    request = db.query(
        ProcurementRequest
    ).filter(
        ProcurementRequest.id == request_id
    ).first()


    if not request:

        raise HTTPException(
            status_code=404,
            detail="Procurement request not found"
        )


    db.delete(request)

    db.commit()


    return {
        "message":
        "Procurement request deleted successfully"
    }


# ==========================================
# APPROVE PROCUREMENT REQUEST
# ==========================================

@router.put("/{request_id}/approve")
def approve_procurement_request(
    request_id: int,
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER
        )
    )
):

    request = db.query(
        ProcurementRequest
    ).filter(
        ProcurementRequest.id == request_id
    ).first()


    if not request:

        raise HTTPException(
            status_code=404,
            detail="Procurement request not found"
        )


    if request.status != "Pending":

        raise HTTPException(
            status_code=400,
            detail="Only pending requests can be approved"
        )


    request.status = "Approved"


    db.commit()

    db.refresh(request)


    return request


# ==========================================
# REJECT PROCUREMENT REQUEST
# ==========================================

@router.put("/{request_id}/reject")
def reject_procurement_request(
    request_id: int,
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER
        )
    )
):

    request = db.query(
        ProcurementRequest
    ).filter(
        ProcurementRequest.id == request_id
    ).first()


    if not request:

        raise HTTPException(
            status_code=404,
            detail="Procurement request not found"
        )


    if request.status != "Pending":

        raise HTTPException(
            status_code=400,
            detail="Only pending requests can be rejected"
        )


    request.status = "Rejected"


    db.commit()

    db.refresh(request)


    return request