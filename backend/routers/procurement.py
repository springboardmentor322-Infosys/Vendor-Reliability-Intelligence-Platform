import uuid
import datetime as dt
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth import get_current_user, require_roles
from models import RoleEnum

router = APIRouter(prefix="/api/procurement", tags=["Procurement & Purchase Orders"])

MANAGE_ROLES = (RoleEnum.ADMIN, RoleEnum.PROCUREMENT_MANAGER, RoleEnum.SUPPLY_CHAIN_MANAGER)


def _generate_po_number() -> str:
    return f"PO-{dt.datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


@router.get("", response_model=List[schemas.PurchaseOrderOut])
def list_orders(
    status: Optional[models.ProcurementStatusEnum] = None,
    vendor_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.PurchaseOrder)
    if status:
        query = query.filter(models.PurchaseOrder.status == status)
    if vendor_id:
        query = query.filter(models.PurchaseOrder.vendor_id == vendor_id)
    return query.order_by(models.PurchaseOrder.order_date.desc()).all()


@router.get("/{po_id}", response_model=schemas.PurchaseOrderOut)
def get_order(po_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return po


@router.post("", response_model=schemas.PurchaseOrderOut, status_code=201)
def create_order(
    payload: schemas.PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(*MANAGE_ROLES)),
):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == payload.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    if vendor.status != models.VendorStatusEnum.APPROVED:
        raise HTTPException(status_code=400, detail="Purchase orders can only be raised for approved vendors")

    po = models.PurchaseOrder(
        po_number=_generate_po_number(),
        vendor_id=payload.vendor_id,
        item_description=payload.item_description,
        quantity=payload.quantity,
        unit_price=payload.unit_price,
        total_amount=round(payload.quantity * payload.unit_price, 2),
        requested_by=payload.requested_by or current_user.full_name,
        expected_delivery=payload.expected_delivery,
    )
    db.add(po)
    db.commit()
    db.refresh(po)
    return po


@router.put("/{po_id}", response_model=schemas.PurchaseOrderOut)
def update_order(
    po_id: int,
    payload: schemas.PurchaseOrderUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(*MANAGE_ROLES, RoleEnum.FINANCE_OFFICER)),
):
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    prev_status = po.status
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(po, field, value)
    db.commit()
    db.refresh(po)

    if payload.status == models.ProcurementStatusEnum.DELIVERED and prev_status != models.ProcurementStatusEnum.DELIVERED:
        if not po.actual_delivery:
            po.actual_delivery = dt.datetime.utcnow()
            db.commit()
        is_delayed = bool(po.expected_delivery and po.actual_delivery and po.actual_delivery > po.expected_delivery)
        notif = models.Notification(
            title="Delivery Delay" if is_delayed else "Delivery Completed",
            message=f"PO {po.po_number} was delivered {'late' if is_delayed else 'on time'}.",
            category="Delivery Delay Notifications" if is_delayed else "Procurement Alerts",
        )
        db.add(notif)
        db.commit()

    return po


@router.delete("/{po_id}", status_code=204)
def cancel_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(*MANAGE_ROLES)),
):
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    po.status = models.ProcurementStatusEnum.CANCELLED
    db.commit()
    return None
