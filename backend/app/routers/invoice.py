from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.invoice import Invoice
from app.models.order import Order
from app.models.vendor import Vendor
from app.schemas.invoice import InvoiceCreate

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
    prefix="/invoices",
    tags=["Invoices"]
)


# ==========================================
# CREATE INVOICE
# ==========================================

@router.post("/")
def create_invoice(
    data: InvoiceCreate,
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            FINANCE_OFFICER
        )
    )
):

    # Check order

    order = db.query(Order).filter(
        Order.id == data.order_id
    ).first()

    if not order:

        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )


    # Check vendor

    vendor = db.query(Vendor).filter(
        Vendor.id == data.vendor_id
    ).first()

    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    # Make sure invoice number is unique

    existing_invoice = db.query(
        Invoice
    ).filter(
        Invoice.invoice_number == data.invoice_number
    ).first()

    if existing_invoice:

        raise HTTPException(
            status_code=400,
            detail="Invoice number already exists"
        )


    invoice = Invoice(

        invoice_number=data.invoice_number,

        order_id=data.order_id,

        vendor_id=data.vendor_id,

        amount=data.amount,

        invoice_date=data.invoice_date,

        due_date=data.due_date

    )


    db.add(invoice)

    db.commit()

    db.refresh(invoice)


    return invoice


# ==========================================
# GET ALL INVOICES
# ==========================================

@router.get("/")
def get_invoices(
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

    invoices = db.query(
        Invoice
    ).all()


    return invoices


# ==========================================
# GET SINGLE INVOICE
# ==========================================

@router.get("/{invoice_id}")
def get_invoice(
    invoice_id: int,
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

    invoice = db.query(
        Invoice
    ).filter(
        Invoice.id == invoice_id
    ).first()


    if not invoice:

        raise HTTPException(
            status_code=404,
            detail="Invoice not found"
        )


    return invoice


# ==========================================
# UPDATE INVOICE STATUS
# ==========================================

@router.put("/{invoice_id}/status")
def update_invoice_status(
    invoice_id: int,
    data: dict,
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            FINANCE_OFFICER
        )
    )
):

    invoice = db.query(
        Invoice
    ).filter(
        Invoice.id == invoice_id
    ).first()


    if not invoice:

        raise HTTPException(
            status_code=404,
            detail="Invoice not found"
        )


    if "status" not in data:

        raise HTTPException(
            status_code=400,
            detail="Status is required"
        )


    new_status = data["status"]


    allowed_statuses = [
        "Pending",
        "Paid",
        "Overdue",
        "Cancelled"
    ]


    if new_status not in allowed_statuses:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid status. "
                "Allowed statuses: "
                + ", ".join(allowed_statuses)
            )
        )


    invoice.status = new_status


    db.commit()

    db.refresh(invoice)


    return invoice


# ==========================================
# DELETE INVOICE
# ==========================================

@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR
        )
    )
):

    invoice = db.query(
        Invoice
    ).filter(
        Invoice.id == invoice_id
    ).first()


    if not invoice:

        raise HTTPException(
            status_code=404,
            detail="Invoice not found"
        )


    db.delete(invoice)

    db.commit()


    return {
        "message": "Invoice deleted successfully"
    }