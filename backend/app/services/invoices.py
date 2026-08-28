"""Invoice creation and payment-status helpers."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.supply_chain import Invoice, InvoiceStatus
from app.models.vendoriq import PurchaseOrder
from app.schemas.supply_chain import InvoiceResponse, InvoiceSummaryResponse

INVOICE_TRIGGER_STATUSES = {"Delivered", "Completed"}
VALID_INVOICE_STATUSES = {item.value for item in InvoiceStatus}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def invoice_to_response(invoice: Invoice) -> InvoiceResponse:
    po = invoice.purchase_order
    vendor = po.vendor if po else None
    return InvoiceResponse(
        id=invoice.id,
        purchase_order_id=invoice.purchase_order_id,
        invoice_number=invoice.invoice_number,
        amount=float(invoice.amount or 0),
        status=str(invoice.status.value if hasattr(invoice.status, "value") else invoice.status),
        due_date=invoice.due_date,
        paid_date=invoice.paid_date,
        po_number=po.po_number if po else None,
        vendor_id=po.vendor_id if po else None,
        vendor_name=vendor.name if vendor else None,
    )


def get_invoice_with_po(db: Session, invoice_id: int) -> Invoice | None:
    return db.scalar(
        select(Invoice)
        .options(selectinload(Invoice.purchase_order).selectinload(PurchaseOrder.vendor))
        .where(Invoice.id == invoice_id)
    )


def find_invoice_for_po(db: Session, purchase_order_id: int) -> Invoice | None:
    return db.scalar(
        select(Invoice)
        .options(selectinload(Invoice.purchase_order).selectinload(PurchaseOrder.vendor))
        .where(Invoice.purchase_order_id == purchase_order_id)
        .order_by(Invoice.id.desc())
    )


def ensure_invoice_for_po(db: Session, po: PurchaseOrder) -> Invoice:
    """Create a pending invoice for a delivered/completed PO if one does not exist."""
    existing = find_invoice_for_po(db, po.id)
    if existing is not None:
        return existing

    invoice = Invoice(
        purchase_order_id=po.id,
        invoice_number=f"INV-{po.id:06d}-{uuid4().hex[:6].upper()}",
        amount=po.total_amount,
        status=InvoiceStatus.PENDING,
        due_date=_now() + timedelta(days=30),
        paid_date=None,
    )
    db.add(invoice)
    db.flush()
    return invoice


def apply_invoice_status(invoice: Invoice, status: str) -> Invoice:
    invoice.status = InvoiceStatus(status)
    if status == InvoiceStatus.PAID.value:
        invoice.paid_date = _now()
    else:
        invoice.paid_date = None
    return invoice


def compute_invoice_summary(invoices: list[Invoice]) -> InvoiceSummaryResponse:
    total = 0.0
    pending = 0.0
    overdue = 0.0
    paid = 0.0
    pending_count = 0
    overdue_count = 0
    paid_count = 0

    for invoice in invoices:
        amount = float(invoice.amount or 0)
        total += amount
        status = str(invoice.status.value if hasattr(invoice.status, "value") else invoice.status)
        if status == InvoiceStatus.PENDING.value:
            pending += amount
            pending_count += 1
        elif status == InvoiceStatus.OVERDUE.value:
            overdue += amount
            overdue_count += 1
        elif status == InvoiceStatus.PAID.value:
            paid += amount
            paid_count += 1

    return InvoiceSummaryResponse(
        total_invoiced=round(total, 2),
        pending_amount=round(pending, 2),
        overdue_amount=round(overdue, 2),
        paid_amount=round(paid, 2),
        invoice_count=len(invoices),
        pending_count=pending_count,
        overdue_count=overdue_count,
        paid_count=paid_count,
    )


def invoices_query(db: Session):
    return select(Invoice).options(
        selectinload(Invoice.purchase_order).selectinload(PurchaseOrder.vendor)
    )
