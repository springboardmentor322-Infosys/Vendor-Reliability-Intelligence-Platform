"""Transactional business services for Milestone 2."""
from __future__ import annotations
from datetime import date, datetime, timezone
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload
from app.models import AuditLog, Contract, ContractDocument, Message, POFulfillment, POItem, ProcurementRequest, PurchaseOrder, Vendor, VendorCategory, VendorContact

def fail(code: int, detail: str): raise HTTPException(status_code=code, detail=detail)
def audit(db: Session, user_id: int | None, action: str, entity: str, entity_id: int | None): db.add(AuditLog(user_id=user_id, action=action, entity=entity, entity_id=entity_id))
def commit(db: Session):
    try: db.commit()
    except Exception as error: db.rollback(); raise HTTPException(status_code=409, detail="The operation conflicts with existing data.") from error
def item_or_404(db: Session, model, item_id: int, options=()):
    statement = select(model).where(model.id == item_id)
    for option in options: statement = statement.options(option)
    item = db.scalar(statement)
    if item is None: fail(404, f"{model.__name__} not found.")
    return item
def role_names(user) -> set[str]: return {role.name.casefold() for role in user.roles}
def can(user, *roles: str) -> bool: return bool(role_names(user).intersection(role.casefold() for role in roles))
def require_finance_procurement_approver(user):
    """Enforce the Finance Officer approval boundary outside the HTTP layer too."""
    if not can(user, "Finance Officer"):
        fail(403, "Only Finance Officers may approve or reject procurement requests.")

def list_vendors(db, query, category_id, approval_status, page, page_size, vendor_id=None):
    statement = select(Vendor).options(selectinload(Vendor.contacts)).order_by(Vendor.created_at.desc())
    if query: statement = statement.where(Vendor.company_name.ilike(f"%{query.strip()}%"))
    if category_id: statement = statement.where(Vendor.category_id == category_id)
    if approval_status: statement = statement.where(Vendor.approval_status == approval_status)
    if vendor_id is not None: statement = statement.where(Vendor.id == vendor_id)
    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    return db.scalars(statement.offset((page-1)*page_size).limit(page_size)).all(), total
def create_vendor(db, data, user_id):
    if db.scalar(select(Vendor).where((Vendor.registration_number == data.registration_number) | (Vendor.gst_number == data.gst_number))): fail(409, "Vendor registration number or GST number already exists.")
    item = Vendor(**data.model_dump(exclude={"contacts"}), created_by=user_id)
    item.contacts = [VendorContact(**contact.model_dump()) for contact in data.contacts]
    db.add(item); commit(db); db.refresh(item); audit(db, user_id, "Vendor Created", "Vendor", item.id); commit(db); return item
def update_vendor(db, item, data, user_id):
    for key, value in data.model_dump(exclude={"approval_status"}).items(): setattr(item, key, value)
    audit(db, user_id, "Vendor Updated", "Vendor", item.id); commit(db); return item
def transition_vendor(db, item, target, user_id):
    allowed = {"Pending": {"Under Review", "Rejected"}, "Under Review": {"Approved", "Rejected"}}
    if target not in allowed.get(item.approval_status, set()): fail(409, f"Vendor cannot transition from {item.approval_status} to {target}.")
    item.approval_status = target; audit(db, user_id, f"Vendor {target}", "Vendor", item.id); commit(db); return item

def request_total(items): return sum((item["subtotal"] for item in items), Decimal("0"))
def create_request(db, data, user_id):
    payload = data.model_dump(); payload["line_items"] = [item.model_dump(mode="json") for item in data.line_items]; payload["estimated_cost"] = request_total([item.model_dump() for item in data.line_items]); item = ProcurementRequest(**payload, created_by=user_id, status="Draft"); db.add(item); commit(db); db.refresh(item); audit(db, user_id, "PROCUREMENT_REQUEST_CREATED", "ProcurementRequest", item.id); commit(db); return item
def update_request(db, item, data, user_id):
    payload = data.model_dump(); payload["line_items"] = [line.model_dump(mode="json") for line in data.line_items]; payload["estimated_cost"] = request_total([line.model_dump() for line in data.line_items]);
    for key, value in payload.items(): setattr(item, key, value)
    audit(db, user_id, "PROCUREMENT_REQUEST_UPDATED", "ProcurementRequest", item.id); commit(db); return item
def submit_request(db, item, user_id):
    if item.status not in {"Draft", "Rejected"}: fail(409, "Only Draft or Rejected procurement requests can be submitted for approval.")
    item.status = "Pending Approval"; item.rejected_by = None; item.rejected_at = None; item.rejection_reason = None
    audit(db, user_id, "PROCUREMENT_REQUEST_SUBMITTED", "ProcurementRequest", item.id)
    from app.services.notification_service import notify_procurement_submitted
    notify_procurement_submitted(db, item)
    commit(db); return item
def approve_request(db, item, approver, comment=None):
    require_finance_procurement_approver(approver)
    if item.status != "Pending Approval": fail(409, "Only procurement requests awaiting approval can be approved.")
    item.status="Approved"; item.approved_by=approver.id; item.approved_at=datetime.now(timezone.utc); item.approval_comment=comment
    audit(db,approver.id,"PROCUREMENT_REQUEST_APPROVED","ProcurementRequest",item.id)
    from app.services.notification_service import notify_procurement_decision
    notify_procurement_decision(db, item, True)
    commit(db); return item
def reject_request(db, item, approver, reason):
    require_finance_procurement_approver(approver)
    if item.status != "Pending Approval": fail(409, "Only procurement requests awaiting approval can be rejected.")
    if not reason or not reason.strip(): fail(422, "A rejection reason is required.")
    item.status="Rejected"; item.rejected_by=approver.id; item.rejected_at=datetime.now(timezone.utc); item.rejection_reason=reason.strip()
    audit(db,approver.id,"PROCUREMENT_REQUEST_REJECTED","ProcurementRequest",item.id)
    from app.services.notification_service import notify_procurement_decision
    notify_procurement_decision(db, item, False)
    commit(db); return item

def create_po(db, data, user_id):
    request = item_or_404(db, ProcurementRequest, data.procurement_request_id)
    if request.status != "Approved": fail(409, "Only approved procurement requests can become purchase orders.")
    vendor = item_or_404(db, Vendor, data.vendor_id)
    if vendor.approval_status != "Approved": fail(409, "Purchase orders require an approved vendor.")
    if db.scalar(select(PurchaseOrder).where(PurchaseOrder.procurement_request_id == request.id)): fail(409, "This procurement request already has a purchase order.")
    today = date.today(); sequence = (db.scalar(select(func.count(PurchaseOrder.id))) or 0) + 1; po = PurchaseOrder(po_number=f"PO-{today:%Y%m%d}-{sequence:04d}", vendor_id=vendor.id, procurement_request_id=request.id, issue_date=data.issue_date, expected_delivery_date=data.expected_delivery_date, total_amount=sum((line.quantity*line.unit_price for line in data.items), Decimal("0")), created_by=user_id)
    po.items = [POItem(item_name=line.item_name, quantity=line.quantity, unit_price=line.unit_price, subtotal=line.quantity*line.unit_price) for line in data.items]; request.status="Purchase Order Created"; db.add(po); commit(db); db.refresh(po); audit(db,user_id,"Purchase Order Created","PurchaseOrder",po.id); commit(db); return po

def update_po(db, po, data, user_id, action="PO Status Changed"):
    """Update a purchase order, triggering reliability recalculation and notifications
    when meaningful status transitions occur.

    Transaction safety: the PO update and the reliability update are flushed
    together in the same unit-of-work, with a single commit at the very end.
    If the reliability update raises, the whole operation rolls back.
    """
    old_status = po.status
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(po, key, value)
    audit(db, user_id, action, "PurchaseOrder", po.id)
    # Flush the PO update into the current transaction (no commit yet)
    db.flush()

    new_status = po.status
    if new_status != old_status:
        from app.services.notification_service import notify_po_accepted, notify_po_delayed, notify_po_rejected, notify_vendor_po_sent
        from app.services.reliability_service import trigger_score_recalculation

        # Notify PMs of rejection
        if new_status == "Rejected":
            notify_po_rejected(db, po)
        elif new_status == "Sent":
            notify_vendor_po_sent(db, po)
        elif new_status == "Accepted":
            notify_po_accepted(db, po)

        # Notify PMs if the PO is already overdue when reaching a non-terminal state
        if new_status in ("Accepted", "In Progress", "Sent") and po.expected_delivery_date < date.today():
            notify_po_delayed(db, po)

        # Recalculate reliability for transitions that affect scoring
        if new_status in ("Delivered", "Completed", "Rejected", "Accepted"):
            trigger_score_recalculation(db, po.vendor_id, triggered_by_user_id=user_id)

    # Single commit covers PO update + reliability + notifications
    commit(db)
    return po


def ordered_quantity(po: PurchaseOrder) -> Decimal:
    return sum((Decimal(str(item.quantity)) for item in po.items), Decimal("0"))


def get_or_create_fulfillment(db: Session, po: PurchaseOrder) -> POFulfillment:
    fulfillment = po.fulfillment
    if fulfillment is None:
        fulfillment = POFulfillment(purchase_order_id=po.id, ordered_quantity=ordered_quantity(po))
        db.add(fulfillment)
        db.flush()
    return fulfillment


def save_vendor_fulfillment(db: Session, po: PurchaseOrder, data, user_id: int) -> POFulfillment:
    fulfillment = get_or_create_fulfillment(db, po)
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(fulfillment, key, value)
    fulfillment.recorded_by = user_id
    po.status = data.fulfillment_status
    audit(db, user_id, "Vendor Fulfillment Updated", "PurchaseOrder", po.id)
    db.flush()
    from app.services.notification_service import notify_fulfillment_updated
    notify_fulfillment_updated(db, po)
    commit(db)
    return fulfillment


def save_receipt_record(db: Session, po: PurchaseOrder, data, user_id: int) -> POFulfillment:
    fulfillment = get_or_create_fulfillment(db, po)
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(fulfillment, key, value)
    fulfillment.fulfillment_status = "Received"
    fulfillment.recorded_by = user_id
    po.status = "Received"
    audit(db, user_id, "Delivery, Quantity & Quality Recorded", "PurchaseOrder", po.id)
    db.flush()
    from app.services.notification_service import notify_receipt_recorded
    from app.services.reliability_service import trigger_score_recalculation
    notify_receipt_recorded(db, po, fulfillment)
    trigger_score_recalculation(db, po.vendor_id, triggered_by_user_id=user_id)
    commit(db)
    return fulfillment


def complete_receipt(db: Session, po: PurchaseOrder, user_id: int) -> PurchaseOrder:
    fulfillment = get_or_create_fulfillment(db, po)
    if fulfillment.actual_delivery_date is None:
        fail(409, "Record receipt and quality evidence before completing a purchase order.")
    po.status = "Completed"
    fulfillment.fulfillment_status = "Completed"
    audit(db, user_id, "Purchase Order Completed After Receipt", "PurchaseOrder", po.id)
    db.flush()
    from app.services.reliability_service import trigger_score_recalculation
    trigger_score_recalculation(db, po.vendor_id, triggered_by_user_id=user_id)
    commit(db)
    return po


def create_contract(db, data, user_id):
    if db.scalar(select(Contract).where(Contract.contract_number == data.contract_number)): fail(409,"Contract number already exists.")
    item_or_404(db, Vendor, data.vendor_id)
    item = Contract(**data.model_dump(), created_by=user_id)
    db.add(item)
    db.flush()  # assign the new contract id without committing
    db.refresh(item)
    audit(db, user_id, "Contract Created", "Contract", item.id)

    # Check for near-expiry and fire notification before committing
    from app.services.notification_service import notify_contract_expiry
    days_left = (item.end_date - date.today()).days
    if 0 <= days_left <= 90:
        notify_contract_expiry(db, item, days_left)

    # Trigger reliability recalculation (flushes internally; no commit)
    from app.services.reliability_service import trigger_score_recalculation
    trigger_score_recalculation(db, data.vendor_id, triggered_by_user_id=user_id)

    # Single commit covers contract + audit + notification + reliability
    commit(db)
    return item


def update_contract(db, item, data, user_id):
    """Update a contract, triggering reliability recalculation when the
    compliance status changes.  All writes share one transaction.
    """
    old_compliance = item.compliance_status
    for key, value in data.model_dump().items():
        setattr(item, key, value)
    audit(db, user_id, "Contract Updated", "Contract", item.id)
    db.flush()  # flush update before recalculation

    # Recalculate only when compliance changes — avoid unnecessary work
    if item.compliance_status != old_compliance:
        from app.services.reliability_service import trigger_score_recalculation
        trigger_score_recalculation(db, item.vendor_id, triggered_by_user_id=user_id)

    # Notify if contract is approaching expiry on update
    from app.services.notification_service import notify_contract_expiry
    days_left = (item.end_date - date.today()).days
    if 0 <= days_left <= 90:
        notify_contract_expiry(db, item, days_left)

    # Single commit covers contract update + audit + notification + reliability
    commit(db)
    return item


def expiry_bucket(contract):
    days=(contract.end_date-date.today()).days
    return 30 if 0 <= days <= 30 else 60 if 0 <= days <= 60 else 90 if 0 <= days <= 90 else None

def send_message(db,data,user_id):
    if bool(data.purchase_order_id) == bool(data.contract_id): fail(422,"A message must belong to exactly one purchase order or contract.")
    if data.purchase_order_id: item_or_404(db,PurchaseOrder,data.purchase_order_id)
    if data.contract_id: item_or_404(db,Contract,data.contract_id)
    item=Message(**data.model_dump(),sender_id=user_id); db.add(item); commit(db); db.refresh(item); audit(db,user_id,"Message Sent","Message",item.id); commit(db); return item
