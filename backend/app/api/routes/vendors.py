import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.vendor import Vendor
from app.models.user import RoleEnum
from app.schemas.vendor import VendorCreate, VendorOut, VendorUpdateStatus
from app.api.deps import get_current_user, require_roles, require_vendor_access

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


@router.patch(
    "/{vendor_id}/status",
    response_model=VendorOut,
    dependencies=[Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PROCUREMENT_MANAGER))],
)
def update_vendor_status(vendor_id: uuid.UUID, payload: VendorUpdateStatus, db: Session = Depends(get_db)):
    """Approve / reject / suspend a vendor - the 'Vendor Approval Workflow' feature."""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    vendor.status = payload.status
    db.commit()
    db.refresh(vendor)
    return vendor
