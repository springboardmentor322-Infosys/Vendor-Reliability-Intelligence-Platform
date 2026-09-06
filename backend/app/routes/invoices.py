from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)
from sqlalchemy.orm import Session

from app.services.authorization import require_roles
from app.database import get_db
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
)
from app.services.audit_log_service import create_audit_log
from app.services.invoice_service import (
    get_all_invoices,
    get_invoice_by_id,
    create_invoice,
    update_invoice,
    delete_invoice,
)


router = APIRouter(
    prefix="/invoices",
    tags=["Invoices"],
)


def invoice_response(invoice):
    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "purchase_order_id": invoice.purchase_order_id,
        "purchase_order_number": (
            invoice.purchase_order.po_number
            if invoice.purchase_order
            else None
        ),
        "vendor_id": invoice.vendor_id,
        "vendor_name": (
            invoice.vendor.vendor_name
            if invoice.vendor
            else None
        ),
        "invoice_date": invoice.invoice_date,
        "due_date": invoice.due_date,
        "amount": invoice.amount,
        "payment_status": invoice.payment_status,
        "notes": invoice.notes,
    }


def invoice_audit_values(invoice):
    return {
        "invoice_number": invoice.invoice_number,
        "purchase_order_id": invoice.purchase_order_id,
        "vendor_id": invoice.vendor_id,
        "invoice_date": (
            str(invoice.invoice_date)
            if invoice.invoice_date
            else None
        ),
        "due_date": (
            str(invoice.due_date)
            if invoice.due_date
            else None
        ),
        "amount": (
            float(invoice.amount)
            if invoice.amount is not None
            else None
        ),
        "payment_status": invoice.payment_status,
        "notes": invoice.notes,
    }


@router.get(
    "",
    response_model=dict,
)
def read_invoices(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Procurement Manager",
            "Vendor",
            "Finance Officer",
            "Auditor",
        )
    ),
):
    result = get_all_invoices(
        db,
        page,
        limit,
    )

    return {
        "items": [
            invoice_response(invoice)
            for invoice in result["items"]
        ],
        "total": result["total"],
        "page": result["page"],
        "limit": result["limit"],
        "total_pages": result["total_pages"],
    }


@router.get(
    "/{invoice_id}",
    response_model=InvoiceResponse,
)
def read_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Procurement Manager",
            "Vendor",
            "Finance Officer",
            "Auditor",
        )
    ),
):
    invoice = get_invoice_by_id(
        db,
        invoice_id,
    )

    if not invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    return invoice_response(invoice)


@router.post(
    "",
    response_model=InvoiceResponse,
    status_code=201,
)
def add_invoice(
    invoice_data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Finance Officer",
        )
    ),
):
    invoice = create_invoice(
        db,
        invoice_data,
    )

    create_audit_log(
        db=db,
        user=current_user,
        action="CREATE",
        module="Invoices",
        entity_type="Invoice",
        entity_id=invoice.id,
        description=(
            f"Invoice "
            f"'{invoice.invoice_number}' "
            f"was created."
        ),
        new_values=invoice_audit_values(
            invoice
        ),
    )

    db.commit()
    db.refresh(invoice)

    return invoice_response(invoice)


@router.put(
    "/{invoice_id}",
    response_model=InvoiceResponse,
)
def edit_invoice(
    invoice_id: int,
    invoice_data: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Finance Officer",
        )
    ),
):
    existing_invoice = get_invoice_by_id(
        db,
        invoice_id,
    )

    if not existing_invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    old_values = invoice_audit_values(
        existing_invoice
    )

    old_payment_status = (
        existing_invoice.payment_status
    )

    updated_invoice = update_invoice(
        db,
        invoice_id,
        invoice_data,
    )

    if not updated_invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    new_values = invoice_audit_values(
        updated_invoice
    )

    new_payment_status = (
        updated_invoice.payment_status
    )

    create_audit_log(
        db=db,
        user=current_user,
        action="UPDATE",
        module="Invoices",
        entity_type="Invoice",
        entity_id=updated_invoice.id,
        description=(
            f"Invoice "
            f"'{updated_invoice.invoice_number}' "
            f"was updated."
        ),
        old_values=old_values,
        new_values=new_values,
    )

    if (
        old_payment_status
        != new_payment_status
    ):
        create_audit_log(
            db=db,
            user=current_user,
            action="STATUS_CHANGE",
            module="Invoices",
            entity_type="Invoice",
            entity_id=updated_invoice.id,
            description=(
                f"Invoice "
                f"'{updated_invoice.invoice_number}' "
                f"payment status changed from "
                f"'{old_payment_status}' to "
                f"'{new_payment_status}'."
            ),
            old_values={
                "payment_status": old_payment_status,
            },
            new_values={
                "payment_status": new_payment_status,
            },
        )

    db.commit()
    db.refresh(updated_invoice)

    return invoice_response(
        updated_invoice
    )


@router.delete(
    "/{invoice_id}",
)
def remove_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Finance Officer",
        )
    ),
):
    invoice = get_invoice_by_id(
        db,
        invoice_id,
    )

    if not invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    old_values = invoice_audit_values(
        invoice
    )

    deleted = delete_invoice(
        db,
        invoice_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    create_audit_log(
        db=db,
        user=current_user,
        action="DELETE",
        module="Invoices",
        entity_type="Invoice",
        entity_id=invoice_id,
        description=(
            f"Invoice "
            f"'{old_values['invoice_number']}' "
            f"was deleted."
        ),
        old_values=old_values,
    )

    db.commit()

    return deleted