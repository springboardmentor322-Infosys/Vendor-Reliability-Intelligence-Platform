import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.vendor import Vendor
from app.models.user import RoleEnum, User
from app.models.notification import NotificationType
from app.schemas.vendor import VendorCreate, VendorOut, VendorUpdateStatus, VendorUpdate
from app.api.deps import get_current_user, require_roles, require_vendor_access
from app.services.activity import log_activity
from app.services.notifications import notify

router = APIRouter(prefix="/vendors", tags=["Vendor Management"])

# Roles allowed to manage vendor records, per the spec's RBAC model
MANAGE_ROLES = (RoleEnum.ADMIN, RoleEnum.PROCUREMENT_MANAGER, RoleEnum.SUPPLY_CHAIN_MANAGER)


@router.get("", response_model=list[VendorOut])
def list_vendors(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(Vendor)
    if current_user.role == RoleEnum.VENDOR:
        if current_user.vendor_id is None:
            return []
        query = query.filter(Vendor.id == current_user.vendor_id)
    return query.order_by(Vendor.created_at.desc()).all()


@router.post("", response_model=VendorOut, status_code=201, dependencies=[Depends(require_roles(*MANAGE_ROLES))])
def create_vendor(payload: VendorCreate, db: Session = Depends(get_db)):
    vendor = Vendor(**payload.model_dump())
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.get("/{vendor_id}", response_model=VendorOut)
def get_vendor(vendor_id: uuid.UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    require_vendor_access(current_user, vendor_id)
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@router.patch("/{vendor_id}", response_model=VendorOut)
def update_vendor(vendor_id: uuid.UUID, payload: VendorUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    if current_user.role == RoleEnum.VENDOR:
        require_vendor_access(current_user, vendor_id)
    elif current_user.role not in MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="You do not have permission to edit vendors")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(vendor, field, value)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.patch(
    "/{vendor_id}/status",
    response_model=VendorOut,
    dependencies=[Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PROCUREMENT_MANAGER))],
)
def update_vendor_status(
    vendor_id: uuid.UUID,
    payload: VendorUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Approve / reject / suspend a vendor - the 'Vendor Approval Workflow' feature."""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    previous_status = vendor.status
    vendor.status = payload.status
    log_activity(db, current_user.id, "updated", "vendor", vendor.id, f"status {previous_status.value} -> {payload.status.value}")
    db.commit()
    db.refresh(vendor)
    for vendor_user in db.query(User).filter(User.vendor_id == vendor.id, User.is_active.is_(True)).all():
        notify(
            db,
            vendor_user.id,
            NotificationType.VENDOR_APPROVAL,
            f"Vendor profile {vendor.company_name} status changed to '{payload.status.value}'.",
        )
    return vendor
