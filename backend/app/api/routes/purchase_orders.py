import uuid
from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.purchase_order import PurchaseOrder, POStatus
from app.models.vendor import Vendor
from app.models.user import RoleEnum, User
from app.models.notification import NotificationType
from app.schemas.purchase_order import PurchaseOrderCreate, PurchaseOrderOut, PurchaseOrderStatusUpdate
from app.api.deps import get_current_user, require_roles
from app.services.notifications import notify

router = APIRouter(prefix="/purchase-orders", tags=["Procurement"])

CREATE_ROLES = (RoleEnum.ADMIN, RoleEnum.PROCUREMENT_MANAGER, RoleEnum.SUPPLY_CHAIN_MANAGER)
APPROVE_ROLES = (RoleEnum.ADMIN, RoleEnum.PROCUREMENT_MANAGER, RoleEnum.FINANCE_OFFICER)


ALLOWED_TRANSITIONS = {
    POStatus.PENDING: {POStatus.APPROVED, POStatus.CANCELLED},
    POStatus.APPROVED: {POStatus.ORDERED, POStatus.CANCELLED},
    POStatus.ORDERED: {POStatus.DELIVERED, POStatus.CANCELLED},
    POStatus.DELIVERED: {POStatus.COMPLETED, POStatus.CANCELLED},
    POStatus.COMPLETED: set(),
    POStatus.CANCELLED: set(),
}


@router.get("", response_model=list[PurchaseOrderOut])
def list_purchase_orders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(PurchaseOrder)
    if current_user.role == RoleEnum.VENDOR:
        if current_user.vendor_id is None:
            return []
        query = query.filter(PurchaseOrder.vendor_id == current_user.vendor_id)
    return query.order_by(PurchaseOrder.created_at.desc()).all()


@router.post("", response_model=PurchaseOrderOut, status_code=201, dependencies=[Depends(require_roles(*CREATE_ROLES))])
def create_purchase_order(
    payload: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vendor = db.query(Vendor).filter(Vendor.id == payload.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # A UUID-derived identifier is collision-resistant while retaining a readable prefix.
    po = PurchaseOrder(
        po_number=f"PO-{uuid.uuid4().hex[:12].upper()}",
        vendor_id=payload.vendor_id,
        requested_by_id=current_user.id,
        description=payload.description,
        quantity=payload.quantity,
        unit_price=payload.unit_price,
        total_amount=(Decimal(payload.quantity) * payload.unit_price).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        expected_delivery_date=payload.expected_delivery_date,
    )
    db.add(po)
    db.commit()
    db.refresh(po)
    return po


@router.patch(
    "/{po_id}/status",
    response_model=PurchaseOrderOut,
    dependencies=[Depends(require_roles(*APPROVE_ROLES))],
)
def update_po_status(
    po_id: uuid.UUID,
    payload: PurchaseOrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if payload.status not in ALLOWED_TRANSITIONS[po.status]:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot move a purchase order from '{po.status.value}' to '{payload.status.value}'",
        )
    if payload.status == POStatus.DELIVERED and payload.actual_delivery_date is None:
        raise HTTPException(status_code=422, detail="actual_delivery_date is required when marking a PO delivered")

    po.status = payload.status
    if payload.actual_delivery_date:
        po.actual_delivery_date = payload.actual_delivery_date
    if payload.invoice_reference:
        po.invoice_reference = payload.invoice_reference
    db.commit()
    db.refresh(po)

    # Notify whoever requested it, e.g. "Your PO-123456 is now Approved"
    notify(
        db,
        user_id=po.requested_by_id,
        type=NotificationType.PO_STATUS,
        message=f"Purchase order {po.po_number} status changed to '{payload.status.value}'.",
    )
    return po
