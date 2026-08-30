import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.contract import Contract, ContractStatus
from app.models.vendor import Vendor
from app.models.user import RoleEnum, User
from app.schemas.contract import ContractCreate, ContractOut, ContractUpdate
from app.api.deps import get_current_user, require_roles
from app.services.reliability import recompute_reliability_score

router = APIRouter(prefix="/contracts", tags=["Contracts & Compliance"])

MANAGE_ROLES = (RoleEnum.ADMIN, RoleEnum.PROCUREMENT_MANAGER, RoleEnum.AUDITOR)


def _refresh_status(contract: Contract) -> None:
    """Auto-derive status from dates (Contract Expiry Notifications feature)."""
    now = datetime.utcnow()
    if contract.status == ContractStatus.TERMINATED:
        return
    if contract.end_date < now:
        contract.status = ContractStatus.EXPIRED
    elif contract.end_date - now <= timedelta(days=30):
        contract.status = ContractStatus.EXPIRING_SOON
    else:
        contract.status = ContractStatus.ACTIVE


@router.get("", response_model=list[ContractOut])
def list_contracts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Contract)
    if current_user.role == RoleEnum.VENDOR:
        if current_user.vendor_id is None:
            return []
        query = query.filter(Contract.vendor_id == current_user.vendor_id)
    contracts = query.order_by(Contract.end_date.asc()).all()
    for c in contracts:
        _refresh_status(c)
    db.commit()
    return contracts


@router.post("", response_model=ContractOut, status_code=201, dependencies=[Depends(require_roles(*MANAGE_ROLES))])
def create_contract(payload: ContractCreate, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == payload.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    contract = Contract(**payload.model_dump())
    _refresh_status(contract)
    db.add(contract)
    db.commit()
    db.refresh(contract)

    recompute_reliability_score(db, payload.vendor_id)
    return contract


@router.patch("/{contract_id}", response_model=ContractOut, dependencies=[Depends(require_roles(*MANAGE_ROLES))])
def update_contract(contract_id: uuid.UUID, payload: ContractUpdate, db: Session = Depends(get_db)):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(contract, field, value)
    _refresh_status(contract)
    db.commit()
    db.refresh(contract)

    recompute_reliability_score(db, contract.vendor_id)
    return contract
