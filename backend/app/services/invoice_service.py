from math import ceil

from sqlalchemy.orm import Session, joinedload

from app.models.invoice import Invoice

from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceUpdate
)


def get_all_invoices(
    db: Session,
    page: int = 1,
    limit: int = 50
):

    if page < 1:
        page = 1

    if limit < 1:
        limit = 50

    if limit > 100:
        limit = 100


    total = (
        db.query(Invoice)
        .count()
    )


    total_pages = (
        ceil(total / limit)
        if total > 0
        else 1
    )


    if page > total_pages:
        page = total_pages


    offset = (
        page - 1
    ) * limit


    invoices = (
        db.query(Invoice)
        .options(
            joinedload(
                Invoice.purchase_order
            ),
            joinedload(
                Invoice.vendor
            )
        )
        .order_by(
            Invoice.id.desc()
        )
        .offset(offset)
        .limit(limit)
        .all()
    )


    return {
        "items": invoices,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }


def get_invoice_by_id(
    db: Session,
    invoice_id: int
):

    return (
        db.query(Invoice)
        .options(
            joinedload(
                Invoice.purchase_order
            ),
            joinedload(
                Invoice.vendor
            )
        )
        .filter(
            Invoice.id == invoice_id
        )
        .first()
    )


def create_invoice(
    db: Session,
    invoice: InvoiceCreate
):

    db_invoice = Invoice(

        invoice_number=generate_invoice_number(
            db
        ),

        purchase_order_id=(
            invoice.purchase_order_id
        ),

        vendor_id=(
            invoice.vendor_id
        ),

        invoice_date=(
            invoice.invoice_date
        ),

        due_date=(
            invoice.due_date
        ),

        amount=(
            invoice.amount
        ),

        payment_status=(
            invoice.payment_status
        ),

        notes=(
            invoice.notes
        )
    )


    db.add(
        db_invoice
    )

    db.commit()

    db.refresh(
        db_invoice
    )


    return get_invoice_by_id(
        db,
        db_invoice.id
    )


def generate_invoice_number(db: Session):
    last_invoice = (
        db.query(Invoice)
        .order_by(Invoice.id.desc())
        .first()
    )

    if not last_invoice:
        next_number = 1
    else:
        next_number = last_invoice.id + 1

    invoice_number = f"INV-{next_number:06d}"

    # Safety check in case invoice IDs and invoice numbers
    # are already out of sync.
    while (
        db.query(Invoice)
        .filter(Invoice.invoice_number == invoice_number)
        .first()
        is not None
    ):
        next_number += 1
        invoice_number = f"INV-{next_number:06d}"

    return invoice_number

def update_invoice(
    db: Session,
    invoice_id: int,
    invoice: InvoiceUpdate
):

    db_invoice = get_invoice_by_id(
        db,
        invoice_id
    )


    if not db_invoice:
        return None


    update_data = invoice.model_dump(
        exclude_unset=True
    )


    for key, value in update_data.items():

        setattr(
            db_invoice,
            key,
            value
        )


    db.commit()

    db.refresh(
        db_invoice
    )


    return get_invoice_by_id(
        db,
        invoice_id
    )


def delete_invoice(
    db: Session,
    invoice_id: int
):

    db_invoice = get_invoice_by_id(
        db,
        invoice_id
    )


    if not db_invoice:
        return None


    db.delete(
        db_invoice
    )

    db.commit()


    return {
        "message": "Invoice deleted successfully"
    }