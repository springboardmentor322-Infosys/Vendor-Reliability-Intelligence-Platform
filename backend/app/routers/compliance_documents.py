"""CRUD for vendor compliance certifications (ISO, insurance, etc.)."""

from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import Role, User
from app.models.vendor import Vendor
from app.models.vendoriq import ComplianceDocument
from app.schemas.vendor import ComplianceDocumentResponse, ComplianceDocumentUpdate
from app.services.audit import format_status_change_description, record_audit_log
from app.services.compliance_documents import save_compliance_document
from app.services.stored_files import file_response

router = APIRouter(prefix="/compliance-documents", tags=["compliance-documents"])

WRITABLE_ROLES = {Role.ADMINISTRATOR, Role.PROCUREMENT_MANAGER}
VALID_STATUSES = {"Pending", "Approved", "Rejected"}
STATUS_ALIASES = {
    "Valid": "Approved",
    "Revoked": "Rejected",
    "Expired": "Approved",
    "pending": "Pending",
    "approved": "Approved",
    "rejected": "Rejected",
}


def _vendor_for_user(user: User, db: Session) -> Vendor | None:
    if user.role != Role.VENDOR:
        return None
    return db.scalar(
        select(Vendor).where((Vendor.user_id == user.id) | (Vendor.created_by == user.id))
    )


def _normalize_status(value: str | None) -> str:
    if not value:
        return "Pending"
    return STATUS_ALIASES.get(value, value)


def _to_response(document: ComplianceDocument) -> ComplianceDocumentResponse:
    vendor = document.vendor
    return ComplianceDocumentResponse(
        id=document.id,
        vendor_id=document.vendor_id,
        vendor_name=vendor.name if vendor else None,
        document_type=document.document_type,
        document_name=document.document_name,
        file_url=f"/compliance-documents/{document.id}/file",
        status=_normalize_status(document.status),
        uploaded_at=document.uploaded_at,
        expires_at=document.expires_at,
        notes=document.notes,
    )


def _get_document_or_404(document_id: int, db: Session) -> ComplianceDocument:
    document = db.scalar(
        select(ComplianceDocument)
        .options(selectinload(ComplianceDocument.vendor))
        .where(ComplianceDocument.id == document_id)
    )
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Compliance document not found")
    return document


def _ensure_can_view(document: ComplianceDocument, user: User, db: Session) -> None:
    if user.role != Role.VENDOR:
        return
    vendor = _vendor_for_user(user, db)
    if vendor is None or document.vendor_id != vendor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


@router.get("", response_model=list[ComplianceDocumentResponse])
def list_compliance_documents(
    vendor_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ComplianceDocumentResponse]:
    query = select(ComplianceDocument).options(selectinload(ComplianceDocument.vendor))

    if current_user.role == Role.VENDOR:
        vendor = _vendor_for_user(current_user, db)
        if vendor is None:
            return []
        query = query.where(ComplianceDocument.vendor_id == vendor.id)
    elif vendor_id is not None:
        query = query.where(ComplianceDocument.vendor_id == vendor_id)

    documents = list(db.scalars(query.order_by(ComplianceDocument.uploaded_at.desc())))
    return [_to_response(document) for document in documents]


@router.post("", response_model=ComplianceDocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_compliance_document(
    vendor_id: int = Form(...),
    document_type: str = Form(...),
    document_name: str = Form(...),
    expires_at: datetime | None = Form(None),
    notes: str | None = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ComplianceDocumentResponse:
    vendor = db.scalar(select(Vendor).where(Vendor.id == vendor_id))
    if vendor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")

    if current_user.role == Role.VENDOR:
        owned = _vendor_for_user(current_user, db)
        if owned is None or owned.id != vendor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    elif current_user.role not in WRITABLE_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    try:
        file_url = await save_compliance_document(vendor.id, file)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    document = ComplianceDocument(
        vendor_id=vendor.id,
        document_type=document_type.strip(),
        document_name=document_name.strip(),
        file_url=file_url,
        status="Pending",
        expires_at=expires_at,
        notes=notes.strip() if notes else None,
    )
    db.add(document)
    db.flush()
    record_audit_log(
        db,
        action_description=(
            f"Compliance document '{document.document_name}' uploaded for {vendor.name} "
            f"by {current_user.name}"
        ),
        performed_by=current_user.id,
        entity_type="compliance_document",
        entity_id=document.id,
    )
    db.commit()
    document = _get_document_or_404(document.id, db)
    return _to_response(document)


@router.get("/{document_id}/file")
def download_compliance_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = _get_document_or_404(document_id, db)
    _ensure_can_view(document, current_user, db)
    suffix = Path(document.file_url or "certificate.pdf").suffix
    return file_response(document.file_url, download_name=f"{document.document_name}{suffix}")


@router.put("/{document_id}", response_model=ComplianceDocumentResponse)
def update_compliance_document(
    document_id: int,
    payload: ComplianceDocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ComplianceDocumentResponse:
    if current_user.role not in WRITABLE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Administrators and Procurement Managers can update compliance documents",
        )

    document = _get_document_or_404(document_id, db)

    if payload.status is not None:
        status_value = _normalize_status(payload.status.strip())
        if status_value not in VALID_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Status must be one of: {', '.join(sorted(VALID_STATUSES))}",
            )
        document.status = status_value
        record_audit_log(
            db,
            action_description=format_status_change_description(
                f"Compliance document {document.document_name}",
                status_value,
                current_user,
            ),
            performed_by=current_user.id,
            entity_type="compliance_document",
            entity_id=document.id,
        )

    if payload.expires_at is not None:
        document.expires_at = payload.expires_at
        record_audit_log(
            db,
            action_description=(
                f"Compliance document '{document.document_name}' expiry updated by {current_user.name}"
            ),
            performed_by=current_user.id,
            entity_type="compliance_document",
            entity_id=document.id,
        )

    if payload.notes is not None:
        document.notes = payload.notes

    db.commit()
    document = _get_document_or_404(document_id, db)
    return _to_response(document)


@router.get("/{document_id}", response_model=ComplianceDocumentResponse)
def get_compliance_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ComplianceDocumentResponse:
    document = _get_document_or_404(document_id, db)
    _ensure_can_view(document, current_user, db)
    return _to_response(document)
