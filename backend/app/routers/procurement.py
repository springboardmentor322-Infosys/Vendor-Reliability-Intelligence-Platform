from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.procurement_request import ProcurementRequest
from app.models.vendor import Vendor
from app.models.order import Order
from app.models.budget import Budget
from app.schemas.procurement_request import ProcurementRequestCreate

from app.utils.permissions import (
    require_roles,
    ADMINISTRATOR,
    PROCUREMENT_MANAGER,
    SUPPLY_CHAIN_MANAGER,
    VENDOR,
    FINANCE_OFFICER,
    AUDITOR,
    ensure_vendor_access
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

        estimated_amount=data.estimated_amount,
        department=data.department,
        expected_delivery_date=data.expected_delivery_date

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

    query = db.query(ProcurementRequest)
    if current_user.role == VENDOR:
        if not current_user.vendor_id:
            return []
        query = query.filter(ProcurementRequest.vendor_id == current_user.vendor_id)
    return query.all()


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

    ensure_vendor_access(current_user, request.vendor_id)
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
    request.department = data.department
    request.expected_delivery_date = data.expected_delivery_date


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
            PROCUREMENT_MANAGER,
            FINANCE_OFFICER
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

    if current_user.role == FINANCE_OFFICER:
        budget = db.query(Budget).filter(Budget.department == (request.department or "General")).first()
        if budget:
            approved_total = sum(float(r.estimated_amount or 0) for r in db.query(ProcurementRequest).filter(ProcurementRequest.department == budget.department, ProcurementRequest.status == "Approved").all())
            if approved_total + float(request.estimated_amount or 0) > budget.allocated_limit:
                raise HTTPException(status_code=400, detail=f"Approval would exceed the {budget.department} budget limit")

    request.status = "Approved"

    # Finance approval follows the reference workflow: immediately create
    # the operational PO so approval is not merely a status change.
    if current_user.role == FINANCE_OFFICER:
        existing_order = db.query(Order).filter(Order.source_order_id == f"PR-{request.id}").first()
        if not existing_order:
            db.add(Order(
                vendor_id=request.vendor_id,
                product_name=request.product_name,
                quantity=request.quantity,
                amount=request.estimated_amount,
                status="Ordered",
                source_order_id=f"PR-{request.id}"
            ))

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
            PROCUREMENT_MANAGER,
            FINANCE_OFFICER
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