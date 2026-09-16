"""Connected invoice and payment workflow APIs.

Invoices are commercial records raised by the external supplier only after a
purchase order has completed its existing fulfillment/receipt workflow. The
router keeps financial decisions with Finance and never trusts a vendor-supplied
vendor id.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, UploadFile, status as http_status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.security import get_current_user
from app.database.database import get_db
from app.models import Invoice, Payment, PurchaseOrder, Role, User, UserRole, Vendor, VendorCategory
from app.routers.milestone_two import save_upload
from app.schemas.invoices import (
    InvoiceCreate,
    InvoiceDecision,
    InvoiceRead,
    InvoiceReceivingEvidence,
    PaymentCreate,
    PaymentRead,
)
from app.services.milestone_two import audit, can, commit, fail, item_or_404
from app.services.notification_service import create_notification


router = APIRouter(prefix="/api/v1/invoices", tags=["Invoices & Payments"])
DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

VIEWER_ROLES = (
    "Administrator",
    "Procurement Manager",
    "Supply Chain Manager",
    "Finance Officer",
    "Auditor",
    "Vendor",
)


def external_vendor(user: User) -> bool:
    """Return True only for supplier portal accounts, not a dual-role user."""
    return can(user, "Vendor") and not can(
        user,
        "Administrator",
        "Procurement Manager",
        "Supply Chain Manager",
        "Finance Officer",
        "Auditor",
    )


def scope_vendor(user: User) -> int:
    if user.vendor_id is None:
        fail(403, "This Vendor account is not linked to a vendor company.")
    return user.vendor_id


def require_invoice_view_access(user: User) -> None:
    if not can(user, *VIEWER_ROLES):
        fail(403, "You do not have permission to view invoices.")


def invoice_load_options():
    return (
        selectinload(Invoice.payments),
        selectinload(Invoice.vendor),
        selectinload(Invoice.purchase_order).selectinload(PurchaseOrder.fulfillment),
    )


def serialize(invoice: Invoice) -> InvoiceRead:
    """Return the invoice plus real PO/vendor/receiving context for review UI."""
    invoice_data = InvoiceRead.model_validate(invoice)
    po = invoice.purchase_order
    fulfillment = po.fulfillment if po else None
    evidence = None
    if po:
        evidence = InvoiceReceivingEvidence(
            purchase_order_status=po.status,
            purchase_order_total=po.total_amount,
            expected_delivery_date=po.expected_delivery_date,
            ordered_quantity=fulfillment.ordered_quantity if fulfillment else None,
            received_quantity=fulfillment.received_quantity if fulfillment else None,
            accepted_quantity=fulfillment.accepted_quantity if fulfillment else None,
            rejected_quantity=fulfillment.rejected_quantity if fulfillment else None,
            quality_status=fulfillment.quality_status if fulfillment else None,
            actual_delivery_date=fulfillment.actual_delivery_date if fulfillment else None,
        )
    return invoice_data.model_copy(
        update={
            "vendor_name": invoice.vendor.company_name if invoice.vendor else None,
            "po_number": po.po_number if po else None,
            "receiving_evidence": evidence,
        }
    )


def invoice_for_user(db: Session, invoice_id: int, user: User) -> Invoice:
    require_invoice_view_access(user)
    invoice = item_or_404(db, Invoice, invoice_id, invoice_load_options())
    if external_vendor(user) and invoice.vendor_id != scope_vendor(user):
        fail(403, "You do not have permission to access this invoice.")
    return invoice


def validate_invoice_evidence(invoice: Invoice, db: Session) -> PurchaseOrder:
    """Ensure the invoice is supported by received, quality-checked PO evidence."""
    po = item_or_404(db, PurchaseOrder, invoice.purchase_order_id, (selectinload(PurchaseOrder.fulfillment),))
    fulfillment = po.fulfillment
    if po.vendor_id != invoice.vendor_id:
        fail(409, "The invoice vendor does not match the purchase order vendor.")
    if po.status != "Completed":
        fail(409, "An invoice can be submitted only after the purchase order is completed.")
    if not fulfillment or fulfillment.actual_delivery_date is None:
        fail(409, "Receiving evidence is required before an invoice can be submitted.")
    if fulfillment.received_quantity is None or fulfillment.accepted_quantity is None:
        fail(409, "Received and accepted quantities are required before invoice submission.")
    if fulfillment.accepted_quantity <= 0:
        fail(409, "At least one accepted unit is required before invoice submission.")
    if fulfillment.quality_status not in {"Passed", "Conditional"}:
        fail(409, "A passed or conditional quality check is required before invoice submission.")
    return po


def notify_finance_reviewers(db: Session, invoice: Invoice) -> None:
    finance_ids = db.scalars(
        select(User.id)
        .join(UserRole, UserRole.user_id == User.id)
        .join(Role, Role.id == UserRole.role_id)
        .where(Role.name == "Finance Officer", User.is_active.is_(True))
        .distinct()
    ).all()
    for recipient_id in finance_ids:
        create_notification(
            db,
            recipient_id,
            "Invoice awaiting review",
            f"Invoice {invoice.invoice_number} requires Finance review.",
            "invoice",
            "warning",
            "Invoice",
            invoice.id,
        )


@router.get("/analytics/financial-summary", summary="Aggregated financial metrics for dashboards")
def get_financial_summary(db: DatabaseSession, user: CurrentUser):
    """Provide real PO spend, invoice billing, AP aging, and category breakdown."""
    if not can(user, "Finance Officer", "Administrator", "Procurement Manager", "Auditor"):
        fail(403, "You do not have permission to view financial summaries.")

    total_po_spend = db.scalar(select(func.sum(PurchaseOrder.total_amount))) or Decimal("0.00")
    total_invoiced = db.scalar(select(func.sum(Invoice.total_amount))) or Decimal("0.00")
    total_paid = db.scalar(select(func.sum(Payment.amount))) or Decimal("0.00")

    invoice_rows = db.execute(
        select(Invoice.status, func.count(Invoice.id), func.sum(Invoice.total_amount))
        .group_by(Invoice.status)
    ).all()
    invoices_by_status = {
        row[0]: {"count": row[1], "amount": float(row[2] or 0)}
        for row in invoice_rows
    }

    pending_invoices_count = sum(
        v["count"] for k, v in invoices_by_status.items() if k in {"Submitted", "Under Review", "Payment Pending", "Approved"}
    )
    pending_invoices_amount = sum(
        v["amount"] for k, v in invoices_by_status.items() if k in {"Submitted", "Under Review", "Payment Pending", "Approved"}
    )

    cat_rows = db.execute(
        select(VendorCategory.name, func.sum(PurchaseOrder.total_amount))
        .join(Vendor, Vendor.category_id == VendorCategory.id)
        .join(PurchaseOrder, PurchaseOrder.vendor_id == Vendor.id)
        .group_by(VendorCategory.name)
        .order_by(func.sum(PurchaseOrder.total_amount).desc())
    ).all()
    spend_by_category = [{"category": row[0], "amount": float(row[1] or 0)} for row in cat_rows]

    vendor_rows = db.execute(
        select(Vendor.id, Vendor.company_name, func.sum(PurchaseOrder.total_amount), func.count(PurchaseOrder.id))
        .join(PurchaseOrder, PurchaseOrder.vendor_id == Vendor.id)
        .group_by(Vendor.id, Vendor.company_name)
        .order_by(func.sum(PurchaseOrder.total_amount).desc())
        .limit(10)
    ).all()
    spend_by_vendor = [
        {"vendor_id": row[0], "vendor_name": row[1], "amount": float(row[2] or 0), "po_count": row[3]}
        for row in vendor_rows
    ]

    po_records = db.execute(select(PurchaseOrder.created_at, PurchaseOrder.total_amount)).all()
    monthly_map: dict[str, Decimal] = {}
    for po_created, po_amt in po_records:
        if po_created:
            m_key = po_created.strftime("%b %Y")
            monthly_map[m_key] = monthly_map.get(m_key, Decimal("0.00")) + (po_amt or Decimal("0.00"))
    monthly_trend = [
        {"month": k, "amount": float(v)}
        for k, v in sorted(monthly_map.items(), key=lambda x: datetime.strptime(x[0], "%b %Y"))
    ]

    unpaid_invoices = db.scalars(
        select(Invoice).where(Invoice.status.in_(["Submitted", "Under Review", "Payment Pending", "Approved"]))
    ).all()
    now_date = datetime.now(timezone.utc).date()
    aging = {"0-30": 0.0, "31-60": 0.0, "61-90": 0.0, "90+": 0.0}
    for inv in unpaid_invoices:
        diff = (now_date - inv.due_date).days if inv.due_date else 0
        amt = float(inv.total_amount or 0)
        if diff <= 30:
            aging["0-30"] += amt
        elif diff <= 60:
            aging["31-60"] += amt
        elif diff <= 90:
            aging["61-90"] += amt
        else:
            aging["90+"] += amt

    payment_methods_rows = db.execute(
        select(Payment.payment_method, func.sum(Payment.amount), func.count(Payment.id))
        .group_by(Payment.payment_method)
    ).all()
    payment_methods = [
        {"method": row[0], "amount": float(row[1] or 0), "count": row[2]}
        for row in payment_methods_rows
    ]

    return {
        "total_po_spend": float(total_po_spend),
        "total_invoiced": float(total_invoiced),
        "total_paid": float(total_paid),
        "pending_invoices_count": pending_invoices_count,
        "pending_invoices_amount": float(pending_invoices_amount),
        "invoices_by_status": invoices_by_status,
        "spend_by_category": spend_by_category,
        "spend_by_vendor": spend_by_vendor,
        "monthly_trend": monthly_trend,
        "ap_aging": aging,
        "payment_methods": payment_methods,
    }


@router.get("", response_model=list[InvoiceRead])
def list_invoices(
    db: DatabaseSession,
    user: CurrentUser,
    status_filter: str | None = Query(None, alias="status"),
    search: str | None = None,
    purchase_order_id: int | None = None,
):
    require_invoice_view_access(user)
    statement = select(Invoice).options(*invoice_load_options()).order_by(Invoice.created_at.desc())
    if external_vendor(user):
        statement = statement.where(Invoice.vendor_id == scope_vendor(user))
    if status_filter:
        statement = statement.where(Invoice.status == status_filter)
    if purchase_order_id:
        statement = statement.where(Invoice.purchase_order_id == purchase_order_id)
    if search and search.strip():
        statement = statement.where(Invoice.invoice_number.ilike(f"%{search.strip()}%"))
    return [serialize(invoice) for invoice in db.scalars(statement).all()]


@router.post("", response_model=InvoiceRead, status_code=http_status.HTTP_201_CREATED)
def create_invoice(data: InvoiceCreate, db: DatabaseSession, user: CurrentUser):
    if not external_vendor(user):
        fail(403, "Only the assigned Vendor may create an invoice.")

    po = item_or_404(db, PurchaseOrder, data.purchase_order_id, (selectinload(PurchaseOrder.fulfillment),))
    vendor_id = scope_vendor(user)
    if po.vendor_id != vendor_id:
        fail(403, "You may only invoice purchase orders assigned to your company.")
    if po.status != "Completed":
        fail(409, "An invoice can be created only after the purchase order is completed.")
    if db.scalar(
        select(Invoice.id).where(Invoice.vendor_id == vendor_id, Invoice.invoice_number == data.invoice_number)
    ):
        fail(409, "This invoice number already exists for your company.")

    total = data.subtotal + data.tax_amount
    po_total = Decimal(str(po.total_amount))
    if total > po_total:
        fail(422, "Invoice total cannot exceed the purchase order total.")
    committed_total = db.scalar(
        select(func.coalesce(func.sum(Invoice.total_amount), Decimal("0"))).where(
            Invoice.purchase_order_id == po.id,
            Invoice.status != "Rejected",
        )
    )
    if Decimal(str(committed_total or 0)) + total > po_total:
        fail(422, "Combined non-rejected invoice totals cannot exceed the purchase order total.")

    invoice = Invoice(
        **data.model_dump(exclude={"currency"}),
        vendor_id=vendor_id,
        total_amount=total,
        currency=data.currency.upper(),
        created_by=user.id,
        status="Draft",
    )
    db.add(invoice)
    db.flush()
    audit(db, user.id, "INVOICE_CREATED", "Invoice", invoice.id)
    commit(db)
    return serialize(invoice_for_user(db, invoice.id, user))


@router.post("/{invoice_id}/document", response_model=InvoiceRead)
def upload_invoice_document(
    invoice_id: int,
    file: Annotated[UploadFile, File()],
    db: DatabaseSession,
    user: CurrentUser,
):
    invoice = invoice_for_user(db, invoice_id, user)
    if not external_vendor(user) or invoice.created_by != user.id or invoice.status not in {"Draft", "Rejected"}:
        fail(403, "Only the creating Vendor may upload a document for a Draft or Rejected invoice.")
    invoice.document_path = save_upload(
        file,
        settings.uploads_dir / "invoices",
        {".pdf", ".png", ".jpg", ".jpeg"},
    )
    audit(db, user.id, "INVOICE_DOCUMENT_UPLOADED", "Invoice", invoice.id)
    commit(db)
    return serialize(invoice_for_user(db, invoice.id, user))


@router.post("/{invoice_id}/submit", response_model=InvoiceRead)
def submit_invoice(invoice_id: int, db: DatabaseSession, user: CurrentUser):
    invoice = invoice_for_user(db, invoice_id, user)
    if not external_vendor(user) or invoice.created_by != user.id or invoice.status not in {"Draft", "Rejected"}:
        fail(403, "Only the creating Vendor may submit a Draft or Rejected invoice.")
    validate_invoice_evidence(invoice, db)
    invoice.status = "Submitted"
    audit(db, user.id, "INVOICE_SUBMITTED", "Invoice", invoice.id)
    notify_finance_reviewers(db, invoice)
    commit(db)
    return serialize(invoice_for_user(db, invoice.id, user))


@router.post("/{invoice_id}/review", response_model=InvoiceRead)
def review_invoice(invoice_id: int, data: InvoiceDecision, db: DatabaseSession, user: CurrentUser):
    if not can(user, "Finance Officer"):
        fail(403, "Only Finance Officers may review invoices.")
    invoice = invoice_for_user(db, invoice_id, user)
    if invoice.status != "Submitted":
        fail(409, "Only submitted invoices can be reviewed.")
    invoice.status = "Under Review"
    invoice.reviewed_by = user.id
    invoice.reviewed_at = datetime.now(timezone.utc)
    invoice.review_comment = data.comment
    audit(db, user.id, "INVOICE_REVIEWED", "Invoice", invoice.id)
    commit(db)
    return serialize(invoice_for_user(db, invoice.id, user))


@router.post("/{invoice_id}/approve", response_model=InvoiceRead)
def approve_invoice(invoice_id: int, data: InvoiceDecision, db: DatabaseSession, user: CurrentUser):
    if not can(user, "Finance Officer"):
        fail(403, "Only Finance Officers may approve invoices.")
    invoice = invoice_for_user(db, invoice_id, user)
    if invoice.status not in {"Submitted", "Under Review"}:
        fail(409, "Only submitted or reviewed invoices can be approved.")
    validate_invoice_evidence(invoice, db)
    invoice.status = "Approved"
    invoice.reviewed_by = user.id
    invoice.reviewed_at = datetime.now(timezone.utc)
    invoice.review_comment = data.comment
    audit(db, user.id, "INVOICE_APPROVED", "Invoice", invoice.id)
    create_notification(
        db,
        invoice.created_by,
        "Invoice approved",
        f"Invoice {invoice.invoice_number} is approved and queued for payment preparation.",
        "invoice",
        "info",
        "Invoice",
        invoice.id,
    )
    commit(db)
    return serialize(invoice_for_user(db, invoice.id, user))


@router.post("/{invoice_id}/payment-pending", response_model=InvoiceRead)
def prepare_payment(invoice_id: int, data: InvoiceDecision, db: DatabaseSession, user: CurrentUser):
    if not can(user, "Finance Officer"):
        fail(403, "Only Finance Officers may prepare an approved invoice for payment.")
    invoice = invoice_for_user(db, invoice_id, user)
    if invoice.status != "Approved":
        fail(409, "Only approved invoices can be prepared for payment.")
    invoice.status = "Payment Pending"
    if data.comment:
        invoice.review_comment = data.comment
    audit(db, user.id, "INVOICE_PAYMENT_PENDING", "Invoice", invoice.id)
    commit(db)
    return serialize(invoice_for_user(db, invoice.id, user))


@router.post("/{invoice_id}/reject", response_model=InvoiceRead)
def reject_invoice(invoice_id: int, data: InvoiceDecision, db: DatabaseSession, user: CurrentUser):
    if not can(user, "Finance Officer"):
        fail(403, "Only Finance Officers may reject invoices.")
    if not data.comment or not data.comment.strip():
        fail(422, "A rejection reason is required.")
    invoice = invoice_for_user(db, invoice_id, user)
    if invoice.status not in {"Submitted", "Under Review"}:
        fail(409, "Only submitted or reviewed invoices can be rejected.")
    invoice.status = "Rejected"
    invoice.reviewed_by = user.id
    invoice.reviewed_at = datetime.now(timezone.utc)
    invoice.review_comment = data.comment.strip()
    audit(db, user.id, "INVOICE_REJECTED", "Invoice", invoice.id)
    create_notification(
        db,
        invoice.created_by,
        "Invoice rejected",
        f"Invoice {invoice.invoice_number} was rejected: {invoice.review_comment}",
        "invoice",
        "warning",
        "Invoice",
        invoice.id,
    )
    commit(db)
    return serialize(invoice_for_user(db, invoice.id, user))


@router.post("/{invoice_id}/payments", response_model=PaymentRead, status_code=http_status.HTTP_201_CREATED)
def process_payment(invoice_id: int, data: PaymentCreate, db: DatabaseSession, user: CurrentUser):
    if not can(user, "Finance Officer"):
        fail(403, "Only Finance Officers may process payments.")
    invoice = invoice_for_user(db, invoice_id, user)
    if invoice.status != "Payment Pending":
        fail(409, "Only approved invoices prepared for payment can be paid.")
    if data.amount != invoice.total_amount:
        fail(422, "Payment amount must equal the approved invoice total.")
    if db.scalar(select(Payment.id).where(Payment.reference_number == data.reference_number)):
        fail(409, "Payment reference number already exists.")
    payment = Payment(
        **data.model_dump(),
        invoice_id=invoice.id,
        vendor_id=invoice.vendor_id,
        created_by=user.id,
        status="Processed",
    )
    db.add(payment)
    invoice.status = "Paid"
    db.flush()
    audit(db, user.id, "PAYMENT_PROCESSED", "Payment", payment.id)
    audit(db, user.id, "INVOICE_MARKED_PAID", "Invoice", invoice.id)
    create_notification(
        db,
        invoice.created_by,
        "Invoice paid",
        f"Payment for invoice {invoice.invoice_number} has been processed.",
        "payment",
        "info",
        "Invoice",
        invoice.id,
    )
    commit(db)
    db.refresh(payment)
    return PaymentRead.model_validate(payment)


@router.get("/{invoice_id}", response_model=InvoiceRead)
def get_invoice(invoice_id: int, db: DatabaseSession, user: CurrentUser):
    return serialize(invoice_for_user(db, invoice_id, user))
