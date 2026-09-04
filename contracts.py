import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.contract import Contract, ContractStatus
from app.models.vendor import Vendor
from app.models.user import RoleEnum, User
from app.models.notification import NotificationType
from app.schemas.contract import ContractCreate, ContractOut, ContractUpdate, ContractRenew
from app.api.deps import get_current_user, require_roles
from app.services.activity import log_activity
from app.services.notifications import notify
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


def _notify_contract_expiry(db: Session, contract: Contract) -> None:
    """Alert the linked vendor when an expiry state needs their action."""
    if contract.status not in (ContractStatus.EXPIRING_SOON, ContractStatus.EXPIRED):
        return
    message = (
        f"Contract {contract.contract_number} is {contract.status.value.replace('_', ' ')} "
        f"and ends on {contract.end_date.date().isoformat()}."
    )
    for user in db.query(User).filter(User.vendor_id == contract.vendor_id, User.is_active.is_(True)).all():
        notify(db, user.id, NotificationType.CONTRACT_EXPIRY, message)


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
def create_contract(payload: ContractCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vendor = db.query(Vendor).filter(Vendor.id == payload.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    contract = Contract(**payload.model_dump())
    _refresh_status(contract)
    db.add(contract)
    log_activity(db, current_user.id, "created", "contract", contract.id, contract.contract_number)
    db.commit()
    db.refresh(contract)

    recompute_reliability_score(db, payload.vendor_id)
    _notify_contract_expiry(db, contract)
    return contract


@router.patch("/{contract_id}", response_model=ContractOut, dependencies=[Depends(require_roles(*MANAGE_ROLES))])
def update_contract(contract_id: uuid.UUID, payload: ContractUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(contract, field, value)
    _refresh_status(contract)
    log_activity(db, current_user.id, "updated", "contract", contract.id, contract.contract_number)
    db.commit()
    db.refresh(contract)

    recompute_reliability_score(db, contract.vendor_id)
    _notify_contract_expiry(db, contract)
    return contract


@router.post("/{contract_id}/renew", response_model=ContractOut, status_code=201,
             dependencies=[Depends(require_roles(*MANAGE_ROLES))])
def renew_contract(contract_id: uuid.UUID, payload: ContractRenew, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    previous = db.query(Contract).filter(Contract.id == contract_id).first()
    if not previous:
        raise HTTPException(status_code=404, detail="Contract not found")
    if db.query(Contract.id).filter(Contract.contract_number == payload.contract_number).first():
        raise HTTPException(status_code=400, detail="Contract number already exists")
    renewed = Contract(vendor_id=previous.vendor_id, title=previous.title, contract_number=payload.contract_number,
                       start_date=payload.start_date, end_date=payload.end_date, is_compliant=previous.is_compliant,
                       notes=payload.notes or previous.notes)
    _refresh_status(renewed)
    db.add(renewed)
    log_activity(db, current_user.id, "renewed", "contract", renewed.id, renewed.contract_number)
    db.commit()
    db.refresh(renewed)
    recompute_reliability_score(db, renewed.vendor_id)
    _notify_contract_expiry(db, renewed)
    return renewed
