import datetime as dt
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth import get_current_user, require_roles
from models import RoleEnum
from file_storage import save_upload, get_upload_path

router = APIRouter(prefix="/api/vendors", tags=["Vendor Management"])

MANAGE_ROLES = (RoleEnum.ADMIN, RoleEnum.PROCUREMENT_MANAGER, RoleEnum.SUPPLY_CHAIN_MANAGER)


@router.get("", response_model=List[schemas.VendorOut])
def list_vendors(
    status: Optional[models.VendorStatusEnum] = None,
    category: Optional[models.VendorCategoryEnum] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Vendor)
    if status:
        query = query.filter(models.Vendor.status == status)
    if category:
        query = query.filter(models.Vendor.category == category)
    return query.order_by(models.Vendor.created_at.desc()).all()


@router.get("/me", response_model=schemas.VendorOut)
def get_my_vendor_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Lets a logged-in Vendor-role user see their own linked vendor record.
    Vendors are linked automatically at registration by matching email to an
    existing Vendor record (see auth_router.register). If no match was found,
    this returns 404 so the frontend can show a clear 'not linked yet' state."""
    if not current_user.vendor_id:
        raise HTTPException(
            status_code=404,
            detail="No vendor profile is linked to your account yet. Ask your "
                   "procurement team to register your company, using this same email.",
        )
    vendor = db.query(models.Vendor).filter(models.Vendor.id == current_user.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Linked vendor profile could not be found.")
    return vendor


@router.get("/{vendor_id}", response_model=schemas.VendorOut)
def get_vendor(vendor_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@router.post("", response_model=schemas.VendorOut, status_code=201)
def create_vendor(
    payload: schemas.VendorCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(*MANAGE_ROLES)),
):
    vendor = models.Vendor(**payload.dict())
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.put("/{vendor_id}", response_model=schemas.VendorOut)
def update_vendor(
    vendor_id: int,
    payload: schemas.VendorUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(*MANAGE_ROLES)),
):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(vendor, field, value)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.post("/{vendor_id}/approve", response_model=schemas.VendorOut)
def approve_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PROCUREMENT_MANAGER)),
):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    vendor.status = models.VendorStatusEnum.APPROVED
    db.commit()
    db.refresh(vendor)

    notif = models.Notification(
        title="Vendor Approved",
        message=f"Vendor '{vendor.name}' has been approved.",
        category="Vendor Approval",
    )
    db.add(notif)
    db.commit()
    return vendor


@router.post("/{vendor_id}/reject", response_model=schemas.VendorOut)
def reject_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PROCUREMENT_MANAGER)),
):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    vendor.status = models.VendorStatusEnum.REJECTED
    db.commit()
    db.refresh(vendor)
    return vendor


@router.delete("/{vendor_id}", status_code=204)
def delete_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(RoleEnum.ADMIN)),
):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    db.delete(vendor)
    db.commit()
    return None


# ---------- Certification Management / Vendor Documentation ----------
# Kept as internal-staff-managed for now (Admin/Procurement/Supply Chain),
# not vendor self-service upload - matches the brief's framing of this as
# part of the internal Contract & Compliance module.

@router.get("/{vendor_id}/documents", response_model=List[schemas.VendorDocumentOut])
def list_vendor_documents(
    vendor_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    return (
        db.query(models.VendorDocument)
        .filter(models.VendorDocument.vendor_id == vendor_id)
        .order_by(models.VendorDocument.uploaded_at.desc())
        .all()
    )


@router.post("/{vendor_id}/documents", response_model=schemas.VendorDocumentOut, status_code=201)
def upload_vendor_document(
    vendor_id: int,
    document_type: str = Form(...),
    expiry_date: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(*MANAGE_ROLES)),
):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    parsed_expiry = None
    if expiry_date:
        try:
            parsed_expiry = dt.datetime.fromisoformat(expiry_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="expiry_date must be a valid date")

    relative_path, original_name = save_upload(file, subfolder=f"vendor_docs/{vendor_id}")

    doc = models.VendorDocument(
        vendor_id=vendor_id,
        document_type=document_type,
        file_name=original_name,
        file_path=relative_path,
        expiry_date=parsed_expiry,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/documents/{document_id}/download")
def download_vendor_document(
    document_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    doc = db.query(models.VendorDocument).filter(models.VendorDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return FileResponse(get_upload_path(doc.file_path), filename=doc.file_name)


@router.delete("/documents/{document_id}", status_code=204)
def delete_vendor_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(*MANAGE_ROLES)),
):
    doc = db.query(models.VendorDocument).filter(models.VendorDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()
    return None
