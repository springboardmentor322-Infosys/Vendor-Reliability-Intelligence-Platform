from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.security import get_current_user, get_current_user_with_role
from app.db.session import get_db
from app.models.user import Role, User
from app.models.vendor import (
    Vendor,
    VendorCategory,
    VendorContact,
    VendorDocument,
    VendorStatus,
    VendorStatusHistory,
)
from app.schemas.performance import VendorPerformanceMetrics
from app.schemas.reliability import VendorRankingEntry, VendorReliabilityScore
from app.schemas.vendor import (
    VendorCategoryResponse,
    VendorCreate,
    VendorDetailResponse,
    VendorDocumentResponse,
    VendorResponse,
    VendorStatusUpdate,
    VendorUpdate,
)
from app.services.audit import format_status_change_description, record_audit_log
from app.services.email import notify_vendor_status_change
from app.services.in_app_notifications import create_notification
from app.services.performance import compute_all_vendors_performance, compute_vendor_performance
from app.services.reliability import compute_vendor_ranking, compute_vendor_reliability
from app.services.vendor_documents import save_vendor_document

router = APIRouter(prefix="/vendors", tags=["vendors"])
categories_router = APIRouter(prefix="/vendor-categories", tags=["vendor-categories"])


def _vendor_owner_id(vendor: Vendor) -> int | None:
    return vendor.user_id if vendor.user_id is not None else vendor.created_by


def _get_vendor_or_404(vendor_id: int, db: Session, *, detailed: bool = False) -> Vendor:
    options = [selectinload(Vendor.category), selectinload(Vendor.contacts)]
    if detailed:
        options.extend(
            [
                selectinload(Vendor.status_history),
                selectinload(Vendor.documents),
            ]
        )

    vendor = db.scalar(select(Vendor).options(*options).where(Vendor.id == vendor_id))
    if vendor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    return vendor


def _ensure_owned_vendor(vendor: Vendor, user: User) -> None:
    if user.role == Role.VENDOR and _vendor_owner_id(vendor) != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


def _ensure_can_upload_documents(vendor: Vendor, user: User) -> None:
    if user.role in {Role.ADMINISTRATOR, Role.PROCUREMENT_MANAGER}:
        return
    if user.role == Role.VENDOR and _vendor_owner_id(vendor) == user.id:
        return
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


def _record_status_change(
    vendor: Vendor,
    *,
    from_status: VendorStatus | None,
    to_status: VendorStatus,
    changed_by: int,
    rejection_reason: str | None = None,
) -> None:
    vendor.status_history.append(
        VendorStatusHistory(
            from_status=from_status.value if from_status else None,
            to_status=to_status.value,
            changed_by=changed_by,
            rejection_reason=rejection_reason,
        )
    )


@categories_router.get("", response_model=list[VendorCategoryResponse])
def list_vendor_categories(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[VendorCategory]:
    return list(db.scalars(select(VendorCategory).order_by(VendorCategory.name)))


@router.post("", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
def create_vendor(
    payload: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user_with_role([Role.VENDOR])
    ),
) -> Vendor:
    """Vendor self-registration endpoint.

    Only users with the VENDOR role may create a vendor profile.
    Admin and Procurement Manager roles manage vendor status (approve/reject)
    but never create vendor records directly.
    """
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
        user_id=current_user.id,
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

    _record_status_change(
        vendor,
        from_status=None,
        to_status=VendorStatus.PENDING,
        changed_by=current_user.id,
    )

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
    if current_user.role == Role.VENDOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    query = select(Vendor).options(selectinload(Vendor.category), selectinload(Vendor.contacts))

    if category_id is not None:
        query = query.where(Vendor.category_id == category_id)

    if status is not None:
        query = query.where(Vendor.status == status)

    if search:
        query = query.where(Vendor.name.ilike(f"%{search}%"))

    return list(db.scalars(query.order_by(Vendor.id)))


@router.get("/me", response_model=VendorDetailResponse)
def get_my_vendor(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role([Role.VENDOR])),
) -> Vendor:
    vendor = db.scalar(
        select(Vendor)
        .options(
            selectinload(Vendor.category),
            selectinload(Vendor.contacts),
            selectinload(Vendor.status_history),
            selectinload(Vendor.documents),
        )
        .where(
            or_(
                Vendor.user_id == current_user.id,
                Vendor.created_by == current_user.id,
            )
        )
        .order_by(Vendor.id.desc())
    )
    if vendor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor profile not found")
    return vendor


@router.get("/performance", response_model=list[VendorPerformanceMetrics])
def list_vendors_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[VendorPerformanceMetrics]:
    if current_user.role == Role.VENDOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return compute_all_vendors_performance(db)


@router.get("/ranking", response_model=list[VendorRankingEntry])
def list_vendor_ranking(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[VendorRankingEntry]:
    if current_user.role == Role.VENDOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return compute_vendor_ranking(db)


@router.get("/{vendor_id}", response_model=VendorDetailResponse)
def get_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Vendor:
    vendor = _get_vendor_or_404(vendor_id, db, detailed=True)
    _ensure_owned_vendor(vendor, current_user)
    return vendor


@router.get("/{vendor_id}/performance", response_model=VendorPerformanceMetrics)
def get_vendor_performance(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VendorPerformanceMetrics:
    vendor = _get_vendor_or_404(vendor_id, db)
    _ensure_owned_vendor(vendor, current_user)
    return compute_vendor_performance(db, vendor)


@router.get("/{vendor_id}/reliability-score", response_model=VendorReliabilityScore)
def get_vendor_reliability_score(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VendorReliabilityScore:
    vendor = _get_vendor_or_404(vendor_id, db)
    _ensure_owned_vendor(vendor, current_user)
    return compute_vendor_reliability(db, vendor)


@router.get("/{vendor_id}/documents", response_model=list[VendorDocumentResponse])
def list_vendor_documents(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[VendorDocument]:
    vendor = _get_vendor_or_404(vendor_id, db)
    _ensure_owned_vendor(vendor, current_user)
    return list(
        db.scalars(
            select(VendorDocument)
            .where(VendorDocument.vendor_id == vendor_id)
            .order_by(VendorDocument.uploaded_at.desc())
        )
    )


@router.post(
    "/{vendor_id}/documents",
    response_model=VendorDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_vendor_document(
    vendor_id: int,
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VendorDocument:
    vendor = _get_vendor_or_404(vendor_id, db)
    _ensure_can_upload_documents(vendor, current_user)

    doc_type = doc_type.strip()
    if not doc_type:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Document type is required")

    try:
        file_url = await save_vendor_document(vendor_id, file)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    document = VendorDocument(
        vendor_id=vendor_id,
        doc_type=doc_type,
        file_url=file_url,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


@router.put("/{vendor_id}", response_model=VendorResponse)
def update_vendor(
    vendor_id: int,
    payload: VendorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Vendor:
    vendor = _get_vendor_or_404(vendor_id, db)

    if current_user.role == Role.VENDOR:
        if _vendor_owner_id(vendor) != current_user.id:
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
    new_status = VendorStatus(payload.status)
    _validate_status_transition(vendor.status, new_status)

    previous_status = vendor.status
    vendor.status = new_status

    if new_status == VendorStatus.REJECTED:
        vendor.rejection_reason = payload.rejection_reason
    else:
        vendor.rejection_reason = None

    _record_status_change(
        vendor,
        from_status=previous_status,
        to_status=new_status,
        changed_by=current_user.id,
        rejection_reason=payload.rejection_reason if new_status == VendorStatus.REJECTED else None,
    )

    record_audit_log(
        db,
        action_description=format_status_change_description(
            f"Vendor {vendor.name}",
            new_status.value,
            current_user,
        ),
        performed_by=current_user.id,
        entity_type="vendor",
        entity_id=vendor.id,
    )

    db.commit()
    db.refresh(vendor)

    notify_vendor_status_change(
        vendor_name=vendor.name,
        vendor_email=vendor.contact_email,
        new_status=new_status.value,
        rejection_reason=vendor.rejection_reason,
    )

    vendor_user_id = vendor.user_id or vendor.created_by
    if vendor_user_id:
        create_notification(
            db,
            user_id=vendor_user_id,
            notification_type="vendor_status",
            title=f"Vendor Status: {new_status.value}",
            message=f"Your vendor profile status has been updated to {new_status.value}.",
            related_entity_type="vendor",
            related_entity_id=vendor.id,
        )
        db.commit()

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
