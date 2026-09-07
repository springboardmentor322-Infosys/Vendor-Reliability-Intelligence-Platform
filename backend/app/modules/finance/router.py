from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, case
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel

from app.core.database import get_db
from app.core.dependencies import RoleChecker
from app.modules.auth.service import get_current_user
from app.modules.auth.models import User
from app.modules.procurement.models import Invoice, Payment, PurchaseOrder
from app.modules.vendors.models import Vendor, VendorCategory
from app.modules.audit.models import AuditLog
from app.modules.notifications.models import Notification

router = APIRouter(tags=["Finance"])

FINANCE_ROLES = ["Finance Officer", "Administrator"]
allow_finance = RoleChecker(FINANCE_ROLES)

# ─── Helper: compute outstanding balance and effective status ─────────────────

def _effective_status(invoice: Invoice) -> str:
    """
    Derive the effective status at query time.
    Overdue is never stored — always calculated.
    """
    total_paid = sum(p.amount for p in (invoice.payments or []))
    outstanding = invoice.amount - total_paid
    if outstanding <= 0:
        return "Paid"
    if total_paid > 0:
        if invoice.due_date and invoice.due_date < datetime.utcnow():
            return "Overdue"
        return "Partially Paid"
    if invoice.status in ("Rejected",):
        return "Rejected"
    if invoice.due_date and invoice.due_date < datetime.utcnow():
        return "Overdue"
    return invoice.status  # Pending / Approved / Under Review


def _invoice_to_dict(inv: Invoice) -> dict:
    total_paid = sum(p.amount for p in (inv.payments or []))
    outstanding = inv.amount - total_paid
    effective = _effective_status(inv)
    vendor_name = None
    po_number = None
    if inv.purchase_order:
        po_number = inv.purchase_order.po_number
        if inv.purchase_order.vendor:
            vendor_name = inv.purchase_order.vendor.name
    return {
        "id": inv.id,
        "invoice_number": inv.invoice_number,
        "po_id": inv.po_id,
        "po_number": po_number,
        "vendor": vendor_name,
        "amount": inv.amount,
        "tax_amount": inv.tax_amount or 0.0,
        "total_paid": total_paid,
        "outstanding_balance": max(outstanding, 0),
        "invoice_date": inv.invoice_date.isoformat() if inv.invoice_date else None,
        "due_date": inv.due_date.isoformat() if inv.due_date else None,
        "status": inv.status,
        "effective_status": effective,
        "rejection_reason": inv.rejection_reason,
        "payments": [
            {
                "id": p.id,
                "amount": p.amount,
                "payment_date": p.payment_date.isoformat() if p.payment_date else None,
                "payment_method": p.payment_method,
                "payment_reference": p.payment_reference,
                "notes": p.notes,
            }
            for p in (inv.payments or [])
        ],
    }


# ─── Pydantic Schemas ────────────────────────────────────────────────────────

class PayInvoiceRequest(BaseModel):
    amount: float
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None
    notes: Optional[str] = None

class RejectInvoiceRequest(BaseModel):
    reason: str


# ─── Lazy loader helpers ─────────────────────────────────────────────────────

from sqlalchemy.orm import selectinload

async def _load_invoice(db: AsyncSession, invoice_id: int) -> Invoice:
    result = await db.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.payments),
            selectinload(Invoice.purchase_order).selectinload(PurchaseOrder.vendor),
        )
        .where(Invoice.id == invoice_id)
    )
    return result.scalars().first()


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/invoices", dependencies=[Depends(allow_finance)])
async def list_invoices(
    vendor_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    overdue_only: bool = False,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """
    List invoices with Finance-specific fields.
    Effective status (including Overdue) is computed at query time.
    """
    q = (
        select(Invoice)
        .options(
            selectinload(Invoice.payments),
            selectinload(Invoice.purchase_order).selectinload(PurchaseOrder.vendor),
        )
        .order_by(Invoice.id.desc())
    )

    if vendor_id:
        q = q.join(Invoice.purchase_order).where(PurchaseOrder.vendor_id == vendor_id)
    if status_filter:
        q = q.where(Invoice.status == status_filter)
    if date_from:
        q = q.where(Invoice.invoice_date >= datetime.fromisoformat(date_from))
    if date_to:
        q = q.where(Invoice.invoice_date <= datetime.fromisoformat(date_to))

    result = await db.execute(q.offset(skip).limit(limit))
    invoices = result.scalars().all()

    data = [_invoice_to_dict(inv) for inv in invoices]

    if overdue_only:
        data = [d for d in data if d["effective_status"] == "Overdue"]

    return data


@router.get("/invoices/{invoice_id}", dependencies=[Depends(allow_finance)])
async def get_invoice_detail(invoice_id: int, db: AsyncSession = Depends(get_db)):
    inv = await _load_invoice(db, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Fetch audit trail for this invoice
    audit_res = await db.execute(
        select(AuditLog)
        .where(AuditLog.entity_type == "Invoice", AuditLog.entity_id == invoice_id)
        .order_by(AuditLog.created_at.desc())
        .limit(20)
    )
    audit_logs = audit_res.scalars().all()

    data = _invoice_to_dict(inv)
    data["audit_trail"] = [
        {
            "action": a.action,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in audit_logs
    ]
    return data


@router.patch("/invoices/{invoice_id}/approve", dependencies=[Depends(allow_finance)])
async def approve_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = await _load_invoice(db, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if inv.status not in ("Pending", "Under Review"):
        raise HTTPException(status_code=400, detail=f"Cannot approve invoice in status '{inv.status}'")

    inv.status = "Approved"
    audit = AuditLog(
        user_id=current_user.id, action="APPROVE_INVOICE",
        entity_type="Invoice", entity_id=invoice_id
    )
    db.add(audit)

    # Notify vendor via PO contact
    target_user_id = 1  # fallback
    if inv.purchase_order and inv.purchase_order.vendor and inv.purchase_order.vendor.contacts:
        target_user_id = inv.purchase_order.vendor.contacts[0].id
    notif = Notification(
        user_id=target_user_id,
        message=f"Invoice {inv.invoice_number} has been approved by Finance Officer."
    )
    db.add(notif)
    await db.commit()
    await db.refresh(inv)
    return {"message": "Invoice approved", "invoice_id": invoice_id, "status": inv.status}


@router.patch("/invoices/{invoice_id}/reject", dependencies=[Depends(allow_finance)])
async def reject_invoice(
    invoice_id: int,
    body: RejectInvoiceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = await _load_invoice(db, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if inv.status not in ("Pending", "Under Review", "Approved"):
        raise HTTPException(status_code=400, detail=f"Cannot reject invoice in status '{inv.status}'")

    inv.status = "Rejected"
    inv.rejection_reason = body.reason
    audit = AuditLog(
        user_id=current_user.id, action="REJECT_INVOICE",
        entity_type="Invoice", entity_id=invoice_id
    )
    db.add(audit)

    target_user_id = 1
    if inv.purchase_order and inv.purchase_order.vendor and inv.purchase_order.vendor.contacts:
        target_user_id = inv.purchase_order.vendor.contacts[0].id
    notif = Notification(
        user_id=target_user_id,
        message=f"Invoice {inv.invoice_number} has been rejected. Reason: {body.reason}"
    )
    db.add(notif)
    await db.commit()
    await db.refresh(inv)
    return {"message": "Invoice rejected", "invoice_id": invoice_id, "status": inv.status, "reason": body.reason}


@router.post("/invoices/{invoice_id}/pay", dependencies=[Depends(allow_finance)])
async def pay_invoice(
    invoice_id: int,
    body: PayInvoiceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Record a payment against an invoice.
    Supports partial payments. Status transitions:
      outstanding_balance <= 0  →  Paid
      outstanding_balance >  0  →  Partially Paid
    Overdue is computed at query time and never stored.
    """
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be positive")

    inv = await _load_invoice(db, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if inv.status == "Rejected":
        raise HTTPException(status_code=400, detail="Cannot pay a rejected invoice")

    payment = Payment(
        invoice_id=invoice_id,
        amount=body.amount,
        payment_method=body.payment_method,
        payment_reference=body.payment_reference,
        notes=body.notes,
        created_by_id=current_user.id,
        payment_date=datetime.utcnow(),
    )
    db.add(payment)
    await db.flush()  # get payment.id before commit

    # Recompute outstanding balance
    total_paid = sum(p.amount for p in inv.payments) + body.amount
    outstanding = inv.amount - total_paid

    if outstanding <= 0:
        inv.status = "Paid"
    else:
        inv.status = "Partially Paid"

    audit = AuditLog(
        user_id=current_user.id, action="PAY_INVOICE",
        entity_type="Invoice", entity_id=invoice_id
    )
    db.add(audit)

    target_user_id = 1
    if inv.purchase_order and inv.purchase_order.vendor and inv.purchase_order.vendor.contacts:
        target_user_id = inv.purchase_order.vendor.contacts[0].id
    notif = Notification(
        user_id=target_user_id,
        message=f"Payment of ₹{body.amount:,.2f} recorded for Invoice {inv.invoice_number}. Status: {inv.status}."
    )
    db.add(notif)
    await db.commit()

    return {
        "message": "Payment recorded",
        "invoice_id": invoice_id,
        "payment_amount": body.amount,
        "total_paid": total_paid,
        "outstanding_balance": max(outstanding, 0),
        "invoice_status": inv.status,
    }


@router.get("/payments", dependencies=[Depends(allow_finance)])
async def list_payments(
    vendor_id: Optional[int] = None,
    payment_method: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(Payment)
        .options(
            selectinload(Payment.invoice)
            .selectinload(Invoice.purchase_order)
            .selectinload(PurchaseOrder.vendor)
        )
        .order_by(Payment.payment_date.desc())
    )
    if payment_method:
        q = q.where(Payment.payment_method == payment_method)
    if date_from:
        q = q.where(Payment.payment_date >= datetime.fromisoformat(date_from))
    if date_to:
        q = q.where(Payment.payment_date <= datetime.fromisoformat(date_to))

    result = await db.execute(q.offset(skip).limit(limit))
    payments = result.scalars().all()

    data = []
    for p in payments:
        inv = p.invoice
        vendor_name = None
        if inv and inv.purchase_order and inv.purchase_order.vendor:
            vendor_name = inv.purchase_order.vendor.name
        # filter by vendor_id after join
        if vendor_id and inv and inv.purchase_order and inv.purchase_order.vendor_id != vendor_id:
            continue
        days_overdue = None
        if inv and inv.due_date and inv.due_date < datetime.utcnow():
            days_overdue = (datetime.utcnow() - inv.due_date).days
        data.append({
            "id": p.id,
            "invoice_id": p.invoice_id,
            "invoice_number": inv.invoice_number if inv else None,
            "vendor": vendor_name,
            "amount": p.amount,
            "payment_date": p.payment_date.isoformat() if p.payment_date else None,
            "payment_method": p.payment_method,
            "payment_reference": p.payment_reference,
            "notes": p.notes,
        })
    return data


@router.get("/vendors", dependencies=[Depends(allow_finance)])
async def list_vendors_finance(db: AsyncSession = Depends(get_db)):
    """Vendor financial summary: committed, realized, invoiced, paid, pending, overdue."""
    vendors_res = await db.execute(
        select(Vendor).options(
            selectinload(Vendor.purchase_orders).selectinload(PurchaseOrder.invoices).selectinload(Invoice.payments),
            selectinload(Vendor.category),
        )
    )
    vendors = vendors_res.scalars().all()

    data = []
    now = datetime.utcnow()
    for v in vendors:
        committed = sum(po.amount for po in v.purchase_orders if po.status not in ("Cancelled",))
        realized = sum(po.amount for po in v.purchase_orders if po.status in ("Delivered", "Completed"))
        all_invoices = [inv for po in v.purchase_orders for inv in po.invoices]
        invoiced = sum(inv.amount for inv in all_invoices)
        paid = sum(sum(p.amount for p in inv.payments) for inv in all_invoices)
        pending = sum(inv.amount for inv in all_invoices if inv.status in ("Pending", "Under Review", "Approved"))
        overdue = sum(
            inv.amount - sum(p.amount for p in inv.payments)
            for inv in all_invoices
            if inv.due_date and inv.due_date < now
            and inv.status not in ("Paid", "Rejected")
        )
        data.append({
            "id": v.id,
            "name": v.name,
            "category": v.category.name if v.category else None,
            "status": v.status,
            "committed_spend": committed,
            "realized_spend": realized,
            "invoiced_amount": invoiced,
            "paid_amount": paid,
            "pending_amount": max(pending, 0),
            "overdue_amount": max(overdue, 0),
            "invoice_count": len(all_invoices),
        })
    data.sort(key=lambda x: x["committed_spend"], reverse=True)
    return data


@router.get("/vendors/{vendor_id}", dependencies=[Depends(allow_finance)])
async def get_vendor_finance_detail(vendor_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Vendor)
        .where(Vendor.id == vendor_id)
        .options(
            selectinload(Vendor.purchase_orders).selectinload(PurchaseOrder.invoices).selectinload(Invoice.payments),
            selectinload(Vendor.category),
        )
    )
    vendor = res.scalars().first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    all_invoices = [inv for po in vendor.purchase_orders for inv in po.invoices]
    now = datetime.utcnow()

    monthly: dict = {}
    for po in vendor.purchase_orders:
        if po.created_at:
            key = po.created_at.strftime("%b %Y")
            monthly[key] = monthly.get(key, 0) + po.amount

    return {
        "id": vendor.id,
        "name": vendor.name,
        "category": vendor.category.name if vendor.category else None,
        "status": vendor.status,
        "committed_spend": sum(po.amount for po in vendor.purchase_orders if po.status not in ("Cancelled",)),
        "realized_spend": sum(po.amount for po in vendor.purchase_orders if po.status in ("Delivered", "Completed")),
        "invoiced_amount": sum(inv.amount for inv in all_invoices),
        "paid_amount": sum(sum(p.amount for p in inv.payments) for inv in all_invoices),
        "invoices": [_invoice_to_dict(inv) for inv in all_invoices[-20:]],
        "monthly_spend": [{"month": k, "amount": v} for k, v in sorted(monthly.items())],
        "purchase_orders": [
            {"po_number": po.po_number, "amount": po.amount, "status": po.status, "date": po.created_at.isoformat() if po.created_at else None}
            for po in vendor.purchase_orders[-10:]
        ],
    }


@router.get("/spend-analysis", dependencies=[Depends(allow_finance)])
async def spend_analysis(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    vendor_id: Optional[int] = None,
    category_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    """Spend by category, by vendor, and monthly — sourced from purchase_orders."""
    q = select(PurchaseOrder).options(
        selectinload(PurchaseOrder.vendor).selectinload(Vendor.category)
    ).where(PurchaseOrder.status.in_(["Delivered", "Completed"]))

    if date_from:
        q = q.where(PurchaseOrder.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        q = q.where(PurchaseOrder.created_at <= datetime.fromisoformat(date_to))
    if vendor_id:
        q = q.where(PurchaseOrder.vendor_id == vendor_id)

    result = await db.execute(q)
    pos = result.scalars().all()

    cat_spend: dict = {}
    vendor_spend: dict = {}
    monthly_spend: dict = {}
    total_spend = 0.0

    for po in pos:
        if category_id and po.vendor and po.vendor.category_id != category_id:
            continue
        amount = po.amount or 0.0
        total_spend += amount
        cat = po.vendor.category.name if (po.vendor and po.vendor.category) else "Uncategorized"
        cat_spend[cat] = cat_spend.get(cat, 0) + amount
        v_name = po.vendor.name if po.vendor else "Unknown"
        vendor_spend[v_name] = vendor_spend.get(v_name, 0) + amount
        if po.created_at:
            key = po.created_at.strftime("%b '%y")
            monthly_spend[key] = monthly_spend.get(key, 0) + amount

    by_category = [
        {"category": k, "amount": v, "percentage": round(v / total_spend * 100, 1) if total_spend else 0}
        for k, v in sorted(cat_spend.items(), key=lambda x: x[1], reverse=True)
    ]
    by_vendor = [
        {"vendor": k, "amount": v, "percentage": round(v / total_spend * 100, 1) if total_spend else 0}
        for k, v in sorted(vendor_spend.items(), key=lambda x: x[1], reverse=True)[:10]
    ]
    monthly = [{"month": k, "amount": v} for k, v in sorted(monthly_spend.items())]

    return {
        "total_spend": total_spend,
        "by_category": by_category,
        "by_vendor": by_vendor,
        "monthly": monthly,
    }


@router.get("/cost-analysis", dependencies=[Depends(allow_finance)])
async def cost_analysis(db: AsyncSession = Depends(get_db)):
    """Cost breakdown: avg order value by category, concentration index."""
    result = await db.execute(
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.vendor).selectinload(Vendor.category))
        .where(PurchaseOrder.status.in_(["Delivered", "Completed"]))
    )
    pos = result.scalars().all()

    cat_data: dict = {}
    for po in pos:
        cat = po.vendor.category.name if (po.vendor and po.vendor.category) else "Uncategorized"
        if cat not in cat_data:
            cat_data[cat] = {"count": 0, "total": 0.0}
        cat_data[cat]["count"] += 1
        cat_data[cat]["total"] += po.amount or 0.0

    total_all = sum(v["total"] for v in cat_data.values())
    breakdown = [
        {
            "category": k,
            "total_cost": v["total"],
            "order_count": v["count"],
            "avg_order_value": round(v["total"] / v["count"], 2) if v["count"] else 0,
            "pct_of_total": round(v["total"] / total_all * 100, 1) if total_all else 0,
        }
        for k, v in sorted(cat_data.items(), key=lambda x: x[1]["total"], reverse=True)
    ]
    return {"total_cost": total_all, "by_category": breakdown}


@router.get("/budget", dependencies=[Depends(allow_finance)])
async def spend_run_rate(db: AsyncSession = Depends(get_db)):
    """
    Spend Run Rate by category.
    EXPLICITLY LABELLED as run rate — not Budget Utilization.
    committed = SUM(po.amount) where status not Cancelled
    realized  = SUM(po.amount) where status in Delivered/Completed
    run_rate_pct = realized / committed * 100
    No budget table exists; no invented budget values.
    """
    result = await db.execute(
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.vendor).selectinload(Vendor.category))
        .where(PurchaseOrder.status.notin_(["Cancelled"]))
    )
    pos = result.scalars().all()

    cat_data: dict = {}
    for po in pos:
        cat = po.vendor.category.name if (po.vendor and po.vendor.category) else "Uncategorized"
        if cat not in cat_data:
            cat_data[cat] = {"committed": 0.0, "realized": 0.0}
        cat_data[cat]["committed"] += po.amount or 0.0
        if po.status in ("Delivered", "Completed"):
            cat_data[cat]["realized"] += po.amount or 0.0

    by_category = [
        {
            "category": k,
            "committed": v["committed"],
            "realized": v["realized"],
            "outstanding": v["committed"] - v["realized"],
            "run_rate_pct": round(v["realized"] / v["committed"] * 100, 1) if v["committed"] else 0,
        }
        for k, v in sorted(cat_data.items(), key=lambda x: x[1]["committed"], reverse=True)
    ]
    total_committed = sum(v["committed"] for v in cat_data.values())
    total_realized = sum(v["realized"] for v in cat_data.values())
    return {
        "label": "Spend Run Rate (not Budget Utilization — no budget table exists)",
        "total_committed": total_committed,
        "total_realized": total_realized,
        "overall_run_rate_pct": round(total_realized / total_committed * 100, 1) if total_committed else 0,
        "by_category": by_category,
    }


@router.get("/approvals", dependencies=[Depends(allow_finance)])
async def list_pending_approvals(db: AsyncSession = Depends(get_db)):
    """All invoices pending Finance Officer review, sorted by due_date ascending (most urgent first)."""
    result = await db.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.payments),
            selectinload(Invoice.purchase_order).selectinload(PurchaseOrder.vendor),
        )
        .where(Invoice.status.in_(["Pending", "Under Review"]))
        .order_by(Invoice.due_date.asc().nullslast())
    )
    invoices = result.scalars().all()
    return [_invoice_to_dict(inv) for inv in invoices]


@router.get("/tax-summary", dependencies=[Depends(allow_finance)])
async def tax_summary(db: AsyncSession = Depends(get_db)):
    """
    Tax aggregation from real invoice.tax_amount fields.
    Only shows what is actually in the database — no invented GST/tax IDs.
    Existing invoices have tax_amount=0.0 from migration default.
    """
    result = await db.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.purchase_order).selectinload(PurchaseOrder.vendor).selectinload(Vendor.category),
        )
        .where(Invoice.tax_amount > 0)
    )
    invoices = result.scalars().all()

    total_tax = sum(inv.tax_amount or 0 for inv in invoices)
    by_vendor: dict = {}
    by_category: dict = {}
    monthly: dict = {}

    for inv in invoices:
        t = inv.tax_amount or 0
        v_name = inv.purchase_order.vendor.name if (inv.purchase_order and inv.purchase_order.vendor) else "Unknown"
        cat = (
            inv.purchase_order.vendor.category.name
            if (inv.purchase_order and inv.purchase_order.vendor and inv.purchase_order.vendor.category)
            else "Uncategorized"
        )
        by_vendor[v_name] = by_vendor.get(v_name, 0) + t
        by_category[cat] = by_category.get(cat, 0) + t
        if inv.invoice_date:
            key = inv.invoice_date.strftime("%b %Y")
            monthly[key] = monthly.get(key, 0) + t

    return {
        "note": "Tax amounts reflect actual invoice.tax_amount values. No GST IDs or fabricated compliance data.",
        "total_tax_amount": total_tax,
        "invoice_count_with_tax": len(invoices),
        "by_vendor": [{"vendor": k, "tax": v} for k, v in sorted(by_vendor.items(), key=lambda x: x[1], reverse=True)],
        "by_category": [{"category": k, "tax": v} for k, v in sorted(by_category.items(), key=lambda x: x[1], reverse=True)],
        "monthly": [{"month": k, "tax": v} for k, v in sorted(monthly.items())],
    }


@router.get("/audit-controls", dependencies=[Depends(allow_finance)])
async def audit_controls(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """Finance-filtered audit log — only APPROVE_INVOICE, REJECT_INVOICE, PAY_INVOICE events."""
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.action.in_(["APPROVE_INVOICE", "REJECT_INVOICE", "PAY_INVOICE"]))
        .order_by(AuditLog.created_at.desc())
        .offset(skip).limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id": a.id,
            "action": a.action,
            "entity_type": a.entity_type,
            "entity_id": a.entity_id,
            "user_id": a.user_id,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in logs
    ]
