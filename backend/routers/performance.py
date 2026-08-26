from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth import get_current_user, require_roles
from models import RoleEnum
from reliability import refresh_vendor_score
from recommendations import generate_recommendations

router = APIRouter(prefix="/api/performance", tags=["Vendor Performance & Reliability"])

MANAGE_ROLES = (RoleEnum.ADMIN, RoleEnum.PROCUREMENT_MANAGER, RoleEnum.SUPPLY_CHAIN_MANAGER, RoleEnum.AUDITOR)


@router.get("/vendor/{vendor_id}/recommendations")
def vendor_recommendations(
    vendor_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return {"vendor_id": vendor_id, "recommendations": generate_recommendations(db, vendor_id)}


@router.get("/vendor/{vendor_id}", response_model=List[schemas.PerformanceOut])
def vendor_performance_history(
    vendor_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    return (
        db.query(models.PerformanceRecord)
        .filter(models.PerformanceRecord.vendor_id == vendor_id)
        .order_by(models.PerformanceRecord.recorded_at.desc())
        .all()
    )


@router.post("", response_model=schemas.PerformanceOut, status_code=201)
def record_performance(
    payload: schemas.PerformanceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(*MANAGE_ROLES)),
):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == payload.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    record = models.PerformanceRecord(**payload.dict())
    db.add(record)
    db.commit()
    db.refresh(record)

    # Recalculate reliability score & risk level whenever new performance data lands
    refresh_vendor_score(db, payload.vendor_id)

    return record


@router.get("/ranking", response_model=List[schemas.VendorOut])
def vendor_ranking(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Vendor).order_by(models.Vendor.reliability_score.desc()).all()
