from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.security import get_current_user, get_current_user_with_role
from app.db.session import get_db
from app.models.user import Role, User
from app.models.vendor import Vendor, VendorCategory, VendorContact, VendorStatus
from app.schemas.vendor import (
    VendorCreate,
    VendorResponse,
    VendorStatusUpdate,
    VendorUpdate,
)

router = APIRouter(prefix="/vendors", tags=["vendors"])


def _get_vendor_or_404(vendor_id: int, db: Session) -> Vendor:
    vendor = db.scalar(
        select(Vendor)
        .options(selectinload(Vendor.category), selectinload(Vendor.contacts))
        .where(Vendor.id == vendor_id)
    )
    if vendor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    return vendor


def _ensure_owned_vendor(vendor: Vendor, user: User) -> None:
    if user.role == Role.VENDOR and vendor.created_by != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


def _ensure_manage_vendor(user: User) -> None:
    if user.role not in {Role.ADMINISTRATOR, Role.PROCUREMENT_MANAGER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


def _validate_status_transition(current_status: VendorStatus, new_status: VendorStatus) -> None:
    allowed = {
        VendorStatus.PENDING: {VendorStatus.UNDER_REVIEW},
        VendorStatus.UNDER_REVIEW: {VendorStatus.APPROVED, VendorStatus.REJECTED},
        VendorStatus.APPROVED: set(),
        VendorStatus.REJECTED: set(),
    }
    if new_status not in allowed.get(current_status, set()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition from {current_status.value} to {new_status.value}",
        )


@router.post("", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
def create_vendor(
    payload: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user_with_role(
            [Role.ADMINISTRATOR, Role.PROCUREMENT_MANAGER, Role.VENDOR]
        )
    ),
) -> Vendor:
    category = db.get(VendorCategory, payload.category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor category not found")

    vendor = Vendor(
        name=payload.name,
        category_id=payload.category_id,
        contact_email=payload.contact_email,
        contact_phone=payload.contact_phone,
        address=payload.address,
        status=VendorStatus.PENDING,
        created_by=current_user.id,
    )

    if payload.contacts:
        vendor.contacts = [
            VendorContact(
                contact_name=contact.contact_name,
                designation=contact.designation,
                email=contact.email,
                phone=contact.phone,
            )
            for contact in payload.contacts
        ]

    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.get("", response_model=list[VendorResponse])
def list_vendors(
    category_id: int | None = Query(None, alias="category"),
    status: VendorStatus | None = Query(None),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Vendor]:
    query = select(Vendor).options(selectinload(Vendor.category), selectinload(Vendor.contacts))

    if category_id is not None:
        query = query.where(Vendor.category_id == category_id)

    if status is not None:
        query = query.where(Vendor.status == status)

    if search:
        query = query.where(Vendor.name.ilike(f"%{search}%"))

    if current_user.role == Role.VENDOR:
        query = query.where(Vendor.created_by == current_user.id)

    return list(db.scalars(query.order_by(Vendor.id)))


@router.get("/{vendor_id}", response_model=VendorResponse)
def get_vendor(vendor_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Vendor:
    vendor = _get_vendor_or_404(vendor_id, db)
    _ensure_owned_vendor(vendor, current_user)
    return vendor


@router.put("/{vendor_id}", response_model=VendorResponse)
def update_vendor(
    vendor_id: int,
    payload: VendorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Vendor:
    vendor = _get_vendor_or_404(vendor_id, db)

    if current_user.role == Role.VENDOR:
        if vendor.created_by != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    elif current_user.role not in {Role.ADMINISTRATOR, Role.PROCUREMENT_MANAGER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    if payload.name is not None:
        vendor.name = payload.name
    if payload.category_id is not None:
        category = db.get(VendorCategory, payload.category_id)
        if category is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor category not found")
        vendor.category_id = payload.category_id
    if payload.contact_email is not None:
        vendor.contact_email = payload.contact_email
    if payload.contact_phone is not None:
        vendor.contact_phone = payload.contact_phone
    if payload.address is not None:
        vendor.address = payload.address

    if payload.contacts is not None:
        vendor.contacts = [
            VendorContact(
                contact_name=contact.contact_name,
                designation=contact.designation,
                email=contact.email,
                phone=contact.phone,
            )
            for contact in payload.contacts
        ]

    db.commit()
    db.refresh(vendor)
    return vendor


@router.put("/{vendor_id}/status", response_model=VendorResponse)
def update_vendor_status(
    vendor_id: int,
    payload: VendorStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user_with_role([Role.ADMINISTRATOR, Role.PROCUREMENT_MANAGER])
    ),
) -> Vendor:
    vendor = _get_vendor_or_404(vendor_id, db)
    _validate_status_transition(vendor.status, payload.status)
    vendor.status = payload.status
    db.commit()
    db.refresh(vendor)
    return vendor


@router.delete("/{vendor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user_with_role([Role.ADMINISTRATOR])),
) -> None:
    vendor = db.get(Vendor, vendor_id)
    if vendor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")

    db.delete(vendor)
    db.commit()
