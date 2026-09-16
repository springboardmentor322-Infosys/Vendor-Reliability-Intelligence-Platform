"""Notification creation and management service for VendorIQ."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Contract, Notification, ProcurementRequest, PurchaseOrder, Role, User, UserRole, Vendor


# ---------------------------------------------------------------------------
# Core creation helper
# ---------------------------------------------------------------------------

def create_notification(
    db: Session,
    recipient_id: int,
    title: str,
    message: str,
    type: str,
    severity: str,
    related_entity: Optional[str] = None,
    related_entity_id: Optional[int] = None,
) -> Notification:
    """Persist a single notification record. If an unread one already exists for the same
    recipient, entity, and type, returns that duplicate instead of writing a new one.
    """
    if related_entity and related_entity_id is not None:
        duplicate = db.scalar(
            select(Notification).where(
                Notification.recipient_id == recipient_id,
                Notification.type == type,
                Notification.related_entity == related_entity,
                Notification.related_entity_id == related_entity_id,
                Notification.is_read == False,
            )
        )
        if duplicate is not None:
            return duplicate

    notif = Notification(
        recipient_id=recipient_id,
        title=title,
        message=message,
        type=type,
        severity=severity,
        related_entity=related_entity,
        related_entity_id=related_entity_id,
        is_read=False,
    )
    db.add(notif)
    return notif


def _admin_and_pm_ids(db: Session) -> list[int]:
    """Return user IDs for all active Administrators and Procurement Managers."""
    from app.models import Role, User, UserRole
    roles = db.scalars(
        select(Role).where(Role.name.in_(["Administrator", "Procurement Manager"]))
    ).all()
    role_ids = [r.id for r in roles]
    if not role_ids:
        return []
    user_ids = db.scalars(
        select(UserRole.user_id).where(UserRole.role_id.in_(role_ids)).distinct()
    ).all()
    # Filter to active users only
    active_ids = db.scalars(
        select(User.id).where(User.id.in_(user_ids), User.is_active == True)
    ).all()
    return list(active_ids)


# ---------------------------------------------------------------------------
# Domain-specific notification helpers
# ---------------------------------------------------------------------------

def notify_risk_change(
    db: Session,
    vendor: Vendor,
    new_category: str,
    score: Optional[Decimal],
) -> None:
    """Notify Admins and PMs when a vendor transitions to High/Critical risk."""
    severity = "critical" if new_category == "Critical Risk" else "warning"
    score_str = f"{float(score):.1f}" if score is not None else "N/A"
    title = f"Vendor Risk Alert: {vendor.company_name}"
    message = (
        f"{vendor.company_name} has been classified as {new_category} "
        f"(Reliability Score: {score_str}/100). Immediate review recommended."
    )
    for uid in _admin_and_pm_ids(db):
        create_notification(
            db, uid, title, message,
            type="reliability", severity=severity,
            related_entity="Vendor", related_entity_id=vendor.id,
        )


def notify_contract_expiry(
    db: Session,
    contract: Contract,
    days_remaining: int,
) -> None:
    """Notify Admins and PMs of an upcoming contract expiry."""
    severity = "critical" if days_remaining <= 30 else "warning"
    title = f"Contract Expiry: {contract.contract_number}"
    message = (
        f"Contract {contract.contract_number} expires in {days_remaining} day(s) "
        f"(on {contract.end_date}). Please review renewal options."
    )
    for uid in _admin_and_pm_ids(db):
        create_notification(
            db, uid, title, message,
            type="contract", severity=severity,
            related_entity="Contract", related_entity_id=contract.id,
        )


def notify_po_rejected(db: Session, po: PurchaseOrder) -> None:
    """Notify PMs when a vendor rejects a Purchase Order."""
    title = f"Purchase Order Rejected: {po.po_number}"
    message = (
        f"Purchase order {po.po_number} has been rejected by the vendor. "
        f"Total value: ₹{po.total_amount:,.0f}."
    )
    for uid in _admin_and_pm_ids(db):
        create_notification(
            db, uid, title, message,
            type="po", severity="warning",
            related_entity="PurchaseOrder", related_entity_id=po.id,
        )


def notify_vendor_po_sent(db: Session, po: PurchaseOrder) -> None:
    """Notify only accounts explicitly linked to the PO's supplier company."""
    recipients = db.scalars(
        select(User.id).where(User.vendor_id == po.vendor_id, User.is_active == True)
    ).all()
    for uid in recipients:
        create_notification(
            db, uid,
            f"Purchase Order Received: {po.po_number}",
            f"A purchase order worth ₹{po.total_amount:,.0f} is ready for your acknowledgement.",
            type="po", severity="info", related_entity="PurchaseOrder", related_entity_id=po.id,
        )


def notify_po_accepted(db: Session, po: PurchaseOrder) -> None:
    """Notify the responsible Procurement Manager when the supplier accepts."""
    create_notification(
        db, po.created_by,
        f"Purchase Order Accepted: {po.po_number}",
        f"The assigned vendor has accepted purchase order {po.po_number}.",
        type="po", severity="info", related_entity="PurchaseOrder", related_entity_id=po.id,
    )


def notify_po_delayed(db: Session, po: PurchaseOrder) -> None:
    """Notify PMs when a PO passes its expected delivery date without delivery."""
    today = date.today()
    if po.expected_delivery_date >= today:
        return
    days_overdue = (today - po.expected_delivery_date).days
    title = f"Delivery Delayed: {po.po_number}"
    message = (
        f"Purchase order {po.po_number} is {days_overdue} day(s) overdue "
        f"(expected {po.expected_delivery_date}). Current status: {po.status}."
    )
    for uid in _admin_and_pm_ids(db):
        create_notification(
            db, uid, title, message,
            type="po", severity="warning",
            related_entity="PurchaseOrder", related_entity_id=po.id,
        )


def notify_high_value_procurement(
    db: Session,
    request_id: int,
    title_str: str,
    estimated_cost: Decimal,
    threshold: float,
) -> None:
    """Notify Finance Officers of high-value procurement requests."""
    from app.models import Role, UserRole
    roles = db.scalars(select(Role).where(Role.name == "Finance Officer")).all()
    role_ids = [r.id for r in roles]
    user_ids = db.scalars(
        select(UserRole.user_id).where(UserRole.role_id.in_(role_ids))
    ).all()
    active_ids = db.scalars(
        select(User.id).where(User.id.in_(user_ids), User.is_active == True)
    ).all()

    notif_title = f"High-Value Procurement Requires Finance Approval"
    message = (
        f"Procurement request '{title_str}' (₹{estimated_cost:,.0f}) exceeds the "
        f"Finance Officer threshold of ₹{threshold:,.0f}. Your approval is required."
    )
    for uid in active_ids:
        create_notification(
            db, uid, notif_title, message,
            type="procurement", severity="warning",
            related_entity="ProcurementRequest", related_entity_id=request_id,
        )


def notify_procurement_submitted(db: Session, request: ProcurementRequest) -> None:
    """Notify active Finance Officers that a request requires a decision."""
    finance_role_ids = db.scalars(select(Role.id).where(Role.name == "Finance Officer")).all()
    recipients = db.scalars(
        select(User.id).join(UserRole).where(UserRole.role_id.in_(finance_role_ids), User.is_active == True)
    ).all() if finance_role_ids else []
    for recipient_id in recipients:
        create_notification(db, recipient_id, "Procurement Request Awaiting Approval",
                            f"Procurement request '{request.title}' requires your review.",
                            type="procurement", severity="warning", related_entity="ProcurementRequest", related_entity_id=request.id)


def notify_procurement_decision(db: Session, request: ProcurementRequest, approved: bool) -> None:
    """Return the Finance Officer's decision to the requesting Procurement Manager."""
    comment = request.approval_comment if approved else request.rejection_reason
    decision = "approved" if approved else "rejected"
    create_notification(db, request.created_by, f"Procurement Request {decision.title()}",
                        f"'{request.title}' was {decision}.{(' Comment: ' + comment) if comment else ''}",
                        type="procurement", severity="info" if approved else "warning",
                        related_entity="ProcurementRequest", related_entity_id=request.id)


def notify_invoice_submitted(db: Session, invoice) -> None:
    """Notify active Finance Officers when an invoice is submitted."""
    finance_role_ids = db.scalars(select(Role.id).where(Role.name == "Finance Officer")).all()
    recipients = db.scalars(
        select(User.id).join(UserRole).where(UserRole.role_id.in_(finance_role_ids), User.is_active == True)
    ).all() if finance_role_ids else []
    for recipient_id in recipients:
        create_notification(
            db, recipient_id, f"Invoice Submitted for Review: {invoice.invoice_number}",
            f"Vendor invoice {invoice.invoice_number} (₹{invoice.total_amount:,.2f}) has been submitted for review.",
            type="invoice", severity="warning", related_entity="Invoice", related_entity_id=invoice.id
        )


def notify_invoice_decision(db: Session, invoice, approved: bool) -> None:
    """Notify Vendor users when an invoice is approved or rejected."""
    recipients = db.scalars(
        select(User.id).where(User.vendor_id == invoice.vendor_id, User.is_active == True)
    ).all()
    status_str = "Approved" if approved else "Rejected"
    for recipient_id in recipients:
        create_notification(
            db, recipient_id, f"Invoice {status_str}: {invoice.invoice_number}",
            f"Your invoice {invoice.invoice_number} has been {status_str.lower()}.",
            type="invoice", severity="info" if approved else "warning", related_entity="Invoice", related_entity_id=invoice.id
        )


def notify_payment_processed(db: Session, payment, invoice) -> None:
    """Notify Vendor users when a payment is processed."""
    recipients = db.scalars(
        select(User.id).where(User.vendor_id == invoice.vendor_id, User.is_active == True)
    ).all()
    for recipient_id in recipients:
        create_notification(
            db, recipient_id, f"Payment Processed: ₹{payment.amount:,.2f}",
            f"Payment ref {payment.payment_reference} for invoice {invoice.invoice_number} has been processed via {payment.payment_method}.",
            type="payment", severity="info", related_entity="Invoice", related_entity_id=invoice.id
        )


def notify_fulfillment_updated(db: Session, po) -> None:
    """Notify Supply Chain Managers when a vendor updates shipment/fulfillment status."""
    scm_role_ids = db.scalars(select(Role.id).where(Role.name == "Supply Chain Manager")).all()
    recipients = db.scalars(
        select(User.id).join(UserRole).where(UserRole.role_id.in_(scm_role_ids), User.is_active == True)
    ).all() if scm_role_ids else []
    for recipient_id in recipients:
        create_notification(
            db, recipient_id, f"Shipment Update for PO {po.po_number}",
            f"Vendor has updated fulfillment status for purchase order {po.po_number} to '{po.status}'.",
            type="po", severity="info", related_entity="PurchaseOrder", related_entity_id=po.id
        )


def notify_receipt_recorded(db: Session, po, fulfillment) -> None:
    """Notify PM and Finance when receiving and quality inspection evidence is logged."""
    notif_title = f"Goods Received & QA Logged: PO {po.po_number}"
    quality = getattr(fulfillment, 'quality_status', 'Passed')
    message = (
        f"Receiving evidence recorded for PO {po.po_number}. "
        f"Accepted: {getattr(fulfillment, 'accepted_quantity', 0)}, Rejected: {getattr(fulfillment, 'rejected_quantity', 0)}, Quality: {quality}."
    )
    # Notify PO creator (PM)
    create_notification(
        db, po.created_by, notif_title, message,
        type="po", severity="info" if quality == "Passed" else "warning",
        related_entity="PurchaseOrder", related_entity_id=po.id
    )



def notify_new_message(db: Session, message_item: object, sender_name: str) -> None:
    """Notify recipient user when a new message/chat is sent."""
    title = f"New Message: {message_item.subject}"
    msg_preview = message_item.message[:100] + ("..." if len(message_item.message) > 100 else "")
    create_notification(
        db,
        recipient_id=message_item.receiver_id,
        title=title,
        message=f"{sender_name}: {msg_preview}",
        type="message",
        severity="info",
        related_entity="Message",
        related_entity_id=message_item.id,
    )


# ---------------------------------------------------------------------------
# Mark read helpers
# ---------------------------------------------------------------------------

def mark_as_read(db: Session, notification_id: int, user_id: int) -> Optional[Notification]:
    """Mark a single notification as read; returns None if not found or not owned."""
    notif = db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.recipient_id == user_id,
        )
    )
    if notif:
        notif.is_read = True
        if notif.related_entity == "Message" and notif.related_entity_id:
            from app.models.milestone_two import Message
            msg = db.scalar(select(Message).where(Message.id == notif.related_entity_id, Message.receiver_id == user_id))
            if msg:
                msg.is_read = True
    return notif


def mark_all_read(db: Session, user_id: int) -> int:
    """Mark all unread notifications for a user as read. Returns count updated."""
    notifs = db.scalars(
        select(Notification).where(
            Notification.recipient_id == user_id,
            Notification.is_read == False,
        )
    ).all()
    for n in notifs:
        n.is_read = True
        if n.related_entity == "Message" and n.related_entity_id:
            from app.models.milestone_two import Message
            msg = db.scalar(select(Message).where(Message.id == n.related_entity_id, Message.receiver_id == user_id))
            if msg:
                msg.is_read = True
    return len(notifs)
