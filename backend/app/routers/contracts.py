"""Contracts router — manage vendor contracts with compliance tracking."""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import select, or_, and_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import Role, User
from app.models.vendor import Vendor
from app.models.vendoriq import Contract, ContractStatus, ComplianceFlag, Notification
from app.schemas.contract import (
    ContractCreate,
    ContractResponse,
    ContractUpdate,
)
from app.services.audit import format_status_change_description, record_audit_log
from app.services.contract_documents import ensure_contract_upload_dir, save_contract_file
from app.services.email import notify_contract_expiring_soon

router = APIRouter(prefix="/contracts", tags=["contracts"])

# Role-based permissions
WRITABLE_ROLES = {Role.ADMINISTRATOR, Role.PROCUREMENT_MANAGER}
READONLY_ROLES = {Role.SUPPLY_CHAIN_MANAGER, Role.FINANCE_OFFICER, Role.AUDITOR, Role.VENDOR}

# Configurable expiry thresholds (in days)
EXPIRY_THRESHOLDS = [90, 60, 30]
MAX_CONTRACT_NUMBER_RETRIES = 3


def _format_contract_number(contract_id: int) -> str:
    """Build a unique contract number from the persisted row id."""
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"CTR-{timestamp}-{contract_id:06d}"


def _get_contract_or_404(contract_id: int, db: Session) -> Contract:
    contract = db.scalar(
        select(Contract)
        .options(selectinload(Contract.vendor))
        .where(Contract.id == contract_id)
    )
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract


def _compute_status(expiry_date: datetime, renewal_days: int = 30) -> ContractStatus:
    """Compute the contract status based on expiry date and renewal period."""
    now = datetime.now(timezone.utc)
    if expiry_date < now:
        return ContractStatus.EXPIRED
    
    # Check if expiry is within any of our thresholds
    days_until_expiry = (expiry_date - now).days
    if days_until_expiry <= max(EXPIRY_THRESHOLDS):
        return ContractStatus.EXPIRING_SOON
    
    return ContractStatus.ACTIVE


def _enrich_response(contract: Contract) -> ContractResponse:
    """Enrich the response with computed fields."""
    now = datetime.now(timezone.utc)
    expiry = contract.expiry_date
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    
    days_until = (expiry - now).days
    days_until = max(0, days_until) if days_until >= 0 else None

    return ContractResponse(
        id=contract.id,
        contract_number=contract.contract_number,
        vendor_id=contract.vendor_id,
        created_by_user_id=contract.created_by_user_id,
        title=contract.title,
        file_url=contract.file_url,
        start_date=contract.start_date,
        expiry_date=contract.expiry_date,
        renewal_notice_period_days=contract.renewal_notice_period_days,
        contract_value=float(contract.contract_value),
        currency=contract.currency,
        terms=contract.terms,
        compliance_flag=contract.compliance_flag,
        status=contract.status,
        created_at=contract.created_at,
        days_until_expiry=days_until,
    )


def _maybe_log_status_change(
    contract: Contract,
    old_status: ContractStatus,
    new_status: ContractStatus,
    user: User,
    db: Session,
) -> None:
    if old_status == new_status:
        return
    new_status_value = new_status.value if hasattr(new_status, "value") else str(new_status)
    record_audit_log(
        db,
        action_description=format_status_change_description(
            f"Contract {contract.contract_number}",
            new_status_value,
            user,
        ),
        performed_by=user.id,
        entity_type="contract",
        entity_id=contract.id,
    )


def _create_expiry_notifications(contract: Contract, db: Session) -> None:
    """Create notifications for expiring contracts."""
    now = datetime.now(timezone.utc)
    expiry = contract.expiry_date
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    
    days_until = (expiry - now).days
    
    # Determine if we should notify
    for threshold in EXPIRY_THRESHOLDS:
        if days_until <= threshold:
            title = f"Contract Expiring Soon: {contract.title}"
            message = (
                f"Contract '{contract.title}' ({contract.contract_number}) "
                f"expires on {contract.expiry_date.strftime('%Y-%m-%d')} "
                f"({days_until} days remaining). Please review for renewal."
            )
            
            # Notify all Procurement Managers
            pm_users = db.scalars(
                select(User).where(User.role == Role.PROCUREMENT_MANAGER, User.is_active == True)
            ).all()
            
            for pm in pm_users:
                # Check if we already have a similar notification
                existing = db.scalar(
                    select(Notification).where(
                        Notification.user_id == pm.id,
                        Notification.related_entity_type == "contract",
                        Notification.related_entity_id == contract.id,
                        Notification.notification_type == "contract_expiry",
                    )
                )
                if not existing:
                    notification = Notification(
                        user_id=pm.id,
                        notification_type="contract_expiry",
                        title=title,
                        message=message,
                        is_read=False,
                        related_entity_type="contract",
                        related_entity_id=contract.id,
                    )
                    db.add(notification)
                    notify_contract_expiring_soon(
                        recipient_email=pm.email,
                        recipient_name=pm.name,
                        contract_title=contract.title,
                        contract_number=contract.contract_number,
                        expiry_date=contract.expiry_date.strftime("%Y-%m-%d"),
                        days_remaining=days_until,
                    )
            
            # Also notify vendor's associated user (if any)
            vendor = contract.vendor
            if vendor and vendor.created_by:
                vendor_user = db.scalar(
                    select(User).where(User.id == vendor.created_by, User.is_active == True)
                )
                if vendor_user:
                    existing = db.scalar(
                        select(Notification).where(
                            Notification.user_id == vendor_user.id,
                            Notification.related_entity_type == "contract",
                            Notification.related_entity_id == contract.id,
                            Notification.notification_type == "contract_expiry",
                        )
                    )
                    if not existing:
                        db.add(Notification(
                            user_id=vendor_user.id,
                            notification_type="contract_expiry",
                            title=title,
                            message=message,
                            is_read=False,
                            related_entity_type="contract",
                            related_entity_id=contract.id,
                        ))
                        notify_contract_expiring_soon(
                            recipient_email=vendor_user.email,
                            recipient_name=vendor_user.name,
                            contract_title=contract.title,
                            contract_number=contract.contract_number,
                            expiry_date=contract.expiry_date.strftime("%Y-%m-%d"),
                            days_remaining=days_until,
                        )
            
            break  # Only notify once for the highest threshold met
    
    db.commit()


# ---------- Endpoints ----------


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_contract(
    contract_data: str = Form(...),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContractResponse:
    """Create a new contract. Administrator or Procurement Manager only."""
    if current_user.role not in WRITABLE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Administrators and Procurement Managers can create contracts",
        )
    
    import json
    from pydantic import ValidationError
    
    try:
        data = ContractCreate.model_validate(json.loads(contract_data))
    except (json.JSONDecodeError, ValidationError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid contract data: {e}")
    
    # Verify vendor exists and is approved
    vendor = db.scalar(select(Vendor).where(Vendor.id == data.vendor_id))
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    if vendor.status not in ("approved", "Approved"):
        raise HTTPException(status_code=400, detail="Can only create contracts for approved vendors")
    
    # Handle file upload
    file_url = None
    if file and file.filename:
        try:
            file_url = await save_contract_file(file)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    # Compute initial status based on dates
    computed_status = _compute_status(data.expiry_date, data.renewal_notice_period_days)

    contract_fields = {
        "vendor_id": data.vendor_id,
        "created_by_user_id": current_user.id,
        "title": data.title,
        "file_url": file_url,
        "start_date": data.start_date,
        "expiry_date": data.expiry_date,
        "renewal_notice_period_days": data.renewal_notice_period_days,
        "contract_value": data.contract_value,
        "currency": data.currency,
        "terms": data.terms,
        "compliance_flag": data.compliance_flag,
        "status": data.status if data.status != "Draft" else computed_status,
    }

    contract = None
    for attempt in range(MAX_CONTRACT_NUMBER_RETRIES):
        contract = Contract(
            contract_number=f"TMP-{uuid.uuid4().hex}",
            **contract_fields,
        )
        db.add(contract)
        try:
            db.flush()
            contract.contract_number = _format_contract_number(contract.id)
            db.commit()
            db.refresh(contract)
            break
        except IntegrityError as exc:
            db.rollback()
            if attempt == MAX_CONTRACT_NUMBER_RETRIES - 1:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Could not create contract due to a numbering conflict. Please retry.",
                ) from exc
    
    # Check and create expiry notifications
    _create_expiry_notifications(contract, db)
    
    return _enrich_response(contract)


@router.get("/")
def list_contracts(
    vendor_id: int | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    compliance_flag: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ContractResponse]:
    """List contracts with optional filters. Vendors see only their own."""
    query = select(Contract).options(selectinload(Contract.vendor))
    
    # Vendor can only see their own contracts
    if current_user.role == Role.VENDOR:
        vendor = db.scalar(select(Vendor).where(Vendor.created_by == current_user.id))
        if not vendor:
            return []
        query = query.where(Contract.vendor_id == vendor.id)
    elif vendor_id is not None:
        query = query.where(Contract.vendor_id == vendor_id)
    
    if status_filter:
        query = query.where(Contract.status == status_filter)
    if compliance_flag:
        query = query.where(Contract.compliance_flag == compliance_flag)
    
    query = query.order_by(Contract.expiry_date.asc()).offset(skip).limit(limit)
    contracts = db.scalars(query).all()
    
    results = []
    for contract in contracts:
        # Auto-update status if needed
        if contract.status != ContractStatus.DRAFT:
            new_status = _compute_status(contract.expiry_date, contract.renewal_notice_period_days)
            if contract.status != new_status:
                old_status = contract.status
                contract.status = new_status
                _maybe_log_status_change(contract, old_status, new_status, current_user, db)
                db.commit()
                if new_status == ContractStatus.EXPIRING_SOON:
                    _create_expiry_notifications(contract, db)
        
        results.append(_enrich_response(contract))
    
    return results


@router.get("/{contract_id}")
def get_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContractResponse:
    """Get a single contract by ID."""
    contract = _get_contract_or_404(contract_id, db)
    
    # Vendor access check
    if current_user.role == Role.VENDOR:
        vendor = db.scalar(select(Vendor).where(Vendor.created_by == current_user.id))
        if not vendor or contract.vendor_id != vendor.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this contract",
            )
    
    # Auto-update status
    if contract.status != ContractStatus.DRAFT:
        new_status = _compute_status(contract.expiry_date, contract.renewal_notice_period_days)
        if contract.status != new_status:
            old_status = contract.status
            contract.status = new_status
            _maybe_log_status_change(contract, old_status, new_status, current_user, db)
            db.commit()
            if new_status == ContractStatus.EXPIRING_SOON:
                _create_expiry_notifications(contract, db)
    
    return _enrich_response(contract)


@router.put("/{contract_id}")
def update_contract(
    contract_id: int,
    updates: ContractUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContractResponse:
    """Update a contract. Administrator or Procurement Manager only."""
    if current_user.role not in WRITABLE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Administrators and Procurement Managers can update contracts",
        )
    
    contract = _get_contract_or_404(contract_id, db)
    
    update_data = updates.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    old_status = contract.status
    
    for field, value in update_data.items():
        setattr(contract, field, value)
    
    # Re-compute status if dates changed
    if "expiry_date" in update_data or "renewal_notice_period_days" in update_data:
        if contract.status != ContractStatus.DRAFT:
            contract.status = _compute_status(contract.expiry_date, contract.renewal_notice_period_days)

    if "status" in update_data or contract.status != old_status:
        _maybe_log_status_change(contract, old_status, contract.status, current_user, db)
    
    db.commit()
    db.refresh(contract)
    
    # Check and create expiry notifications
    _create_expiry_notifications(contract, db)
    
    return _enrich_response(contract)


@router.post("/{contract_id}/upload", status_code=status.HTTP_201_CREATED)
async def upload_contract_file(
    contract_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContractResponse:
    """Upload a contract file. Administrator or Procurement Manager only."""
    if current_user.role not in WRITABLE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Administrators and Procurement Managers can upload files",
        )
    
    contract = _get_contract_or_404(contract_id, db)
    
    try:
        file_url = await save_contract_file(file)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    contract.file_url = file_url
    db.commit()
    db.refresh(contract)
    
    return _enrich_response(contract)

