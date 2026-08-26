import datetime as dt
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth import get_current_user, require_roles
from models import RoleEnum
from reliability import refresh_vendor_score
from notifications_engine import check_expiring_contracts
from file_storage import save_upload, get_upload_path

router = APIRouter(prefix="/api/contracts", tags=["Contracts & Compliance"])

MANAGE_ROLES = (RoleEnum.ADMIN, RoleEnum.PROCUREMENT_MANAGER, RoleEnum.AUDITOR)


@router.get("", response_model=List[schemas.ContractOut])
def list_contracts(
    vendor_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Contract)
    if vendor_id:
        query = query.filter(models.Contract.vendor_id == vendor_id)
    return query.order_by(models.Contract.end_date.asc()).all()


@router.get("/expiring-soon", response_model=List[schemas.ContractOut])
def expiring_soon(days: int = 30, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    cutoff = dt.datetime.utcnow() + dt.timedelta(days=days)
    return (
        db.query(models.Contract)
        .filter(models.Contract.end_date <= cutoff, models.Contract.end_date >= dt.datetime.utcnow())
        .order_by(models.Contract.end_date.asc())
        .all()
    )


@router.post("", response_model=schemas.ContractOut, status_code=201)
def create_contract(
    payload: schemas.ContractCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(*MANAGE_ROLES)),
):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == payload.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    contract = models.Contract(**payload.dict())
    db.add(contract)
    db.commit()
    db.refresh(contract)
    refresh_vendor_score(db, payload.vendor_id)

    # A newly added contract might already be inside the expiry warning
    # window (e.g. backfilling historical data) - check immediately rather
    # than waiting for the next scheduled trigger point.
    check_expiring_contracts(db)

    return contract


@router.put("/{contract_id}/compliance", response_model=schemas.ContractOut)
def update_compliance(
    contract_id: int,
    status: models.ComplianceStatusEnum,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(*MANAGE_ROLES)),
):
    contract = db.query(models.Contract).filter(models.Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    contract.compliance_status = status
    db.commit()
    db.refresh(contract)
    refresh_vendor_score(db, contract.vendor_id)

    if status == models.ComplianceStatusEnum.NON_COMPLIANT:
        notif = models.Notification(
            title="Compliance Issue",
            message=f"Contract '{contract.contract_title}' is now Non-Compliant.",
            category="Compliance Notifications",
        )
        db.add(notif)
        db.commit()

    return contract


@router.post("/{contract_id}/document", response_model=schemas.ContractOut)
def upload_contract_document(
    contract_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(*MANAGE_ROLES)),
):
    contract = db.query(models.Contract).filter(models.Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    relative_path, original_name = save_upload(file, subfolder=f"contracts/{contract_id}")
    contract.document_path = relative_path
    contract.document_name = original_name
    db.commit()
    db.refresh(contract)
    return contract


@router.get("/{contract_id}/document")
def download_contract_document(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    contract = db.query(models.Contract).filter(models.Contract.id == contract_id).first()
    if not contract or not contract.document_path:
        raise HTTPException(status_code=404, detail="No document uploaded for this contract")
    return FileResponse(get_upload_path(contract.document_path), filename=contract.document_name)
