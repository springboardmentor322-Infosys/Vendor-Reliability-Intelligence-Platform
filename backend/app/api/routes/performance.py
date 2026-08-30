import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.performance import PerformanceRecord
from app.models.vendor import Vendor
from app.models.user import RoleEnum, User
from app.schemas.performance import PerformanceRecordCreate, PerformanceRecordOut, ReliabilityScoreOut
from app.api.deps import get_current_user, require_roles, require_vendor_access
from app.services.reliability import recompute_reliability_score

router = APIRouter(prefix="/performance", tags=["Vendor Performance & Reliability"])

LOG_ROLES = (RoleEnum.ADMIN, RoleEnum.PROCUREMENT_MANAGER, RoleEnum.SUPPLY_CHAIN_MANAGER)


@router.get("/vendor/{vendor_id}", response_model=list[PerformanceRecordOut])
def list_vendor_performance(
    vendor_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    require_vendor_access(current_user, vendor_id)
    return (
        db.query(PerformanceRecord)
        .filter(PerformanceRecord.vendor_id == vendor_id)
        .order_by(PerformanceRecord.created_at.desc())
        .all()
    )


@router.post("", response_model=PerformanceRecordOut, status_code=201, dependencies=[Depends(require_roles(*LOG_ROLES))])
def log_performance(
    payload: PerformanceRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vendor = db.query(Vendor).filter(Vendor.id == payload.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    record = PerformanceRecord(**payload.model_dump(), recorded_by_id=current_user.id)
    db.add(record)
    db.commit()
    db.refresh(record)

    recompute_reliability_score(db, payload.vendor_id)
    return record


@router.get("/vendor/{vendor_id}/score", response_model=ReliabilityScoreOut)
def get_vendor_score(vendor_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_vendor_access(current_user, vendor_id)
    score = recompute_reliability_score(db, vendor_id)
    return ReliabilityScoreOut(vendor_id=vendor_id, reliability_score=score)


@router.get("/ranking", response_model=list[dict])
def vendor_ranking(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Supplier Ranking feature - vendors ordered best-to-worst by reliability score."""
    query = db.query(Vendor)
    if current_user.role == RoleEnum.VENDOR:
        if current_user.vendor_id is None:
            return []
        query = query.filter(Vendor.id == current_user.vendor_id)
    vendors = query.order_by(Vendor.reliability_score.desc()).all()
    return [
        {"vendor_id": str(v.id), "company_name": v.company_name, "reliability_score": v.reliability_score}
        for v in vendors
    ]
