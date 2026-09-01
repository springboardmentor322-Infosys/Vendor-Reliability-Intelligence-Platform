from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.certification import Certification
from app.models.vendor import Vendor
from app.schemas.certification import CertificationCreate
from app.utils.security import get_current_email


router = APIRouter(
    prefix="/certifications",
    tags=["Certifications"]
)


# ==========================================
# CREATE CERTIFICATION
# ==========================================

@router.post("/")
def create_certification(
    data: CertificationCreate,
    db: Session = Depends(get_db),
    current_email: str = Depends(get_current_email)
):

    # Check vendor

    vendor = db.query(Vendor).filter(
        Vendor.id == data.vendor_id
    ).first()

    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    # Check duplicate certificate number

    existing = db.query(Certification).filter(
        Certification.certificate_number ==
        data.certificate_number
    ).first()

    if existing:

        raise HTTPException(
            status_code=400,
            detail="Certificate number already exists"
        )


    # Check dates

    if data.expiry_date < data.issue_date:

        raise HTTPException(
            status_code=400,
            detail="Expiry date cannot be before issue date"
        )


    certification = Certification(

        vendor_id=data.vendor_id,

        certification_name=data.certification_name,

        certificate_number=data.certificate_number,

        issuing_authority=data.issuing_authority,

        issue_date=data.issue_date,

        expiry_date=data.expiry_date,

        status=data.status,

        notes=data.notes

    )


    db.add(certification)

    db.commit()

    db.refresh(certification)


    return certification


# ==========================================
# GET ALL CERTIFICATIONS
# ==========================================

@router.get("/")
def get_certifications(
    db: Session = Depends(get_db),
    current_email: str = Depends(get_current_email)
):

    certifications = db.query(
        Certification
    ).all()


    return certifications


# ==========================================
# GET SINGLE CERTIFICATION
# ==========================================

@router.get("/{certification_id}")
def get_certification(
    certification_id: int,
    db: Session = Depends(get_db),
    current_email: str = Depends(get_current_email)
):

    certification = db.query(
        Certification
    ).filter(
        Certification.id == certification_id
    ).first()


    if not certification:

        raise HTTPException(
            status_code=404,
            detail="Certification not found"
        )


    return certification


# ==========================================
# GET CERTIFICATIONS BY VENDOR
# ==========================================

@router.get("/vendor/{vendor_id}")
def get_vendor_certifications(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_email: str = Depends(get_current_email)
):

    vendor = db.query(Vendor).filter(
        Vendor.id == vendor_id
    ).first()


    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    certifications = db.query(
        Certification
    ).filter(
        Certification.vendor_id == vendor_id
    ).all()


    return certifications


# ==========================================
# UPDATE CERTIFICATION
# ==========================================

@router.put("/{certification_id}")
def update_certification(
    certification_id: int,
    data: CertificationCreate,
    db: Session = Depends(get_db),
    current_email: str = Depends(get_current_email)
):

    certification = db.query(
        Certification
    ).filter(
        Certification.id == certification_id
    ).first()


    if not certification:

        raise HTTPException(
            status_code=404,
            detail="Certification not found"
        )


    # Check vendor

    vendor = db.query(Vendor).filter(
        Vendor.id == data.vendor_id
    ).first()

    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    # Check duplicate certificate number

    existing = db.query(Certification).filter(
        Certification.certificate_number ==
        data.certificate_number,
        Certification.id != certification_id
    ).first()

    if existing:

        raise HTTPException(
            status_code=400,
            detail="Certificate number already exists"
        )


    # Check dates

    if data.expiry_date < data.issue_date:

        raise HTTPException(
            status_code=400,
            detail="Expiry date cannot be before issue date"
        )


    certification.vendor_id = data.vendor_id

    certification.certification_name = (
        data.certification_name
    )

    certification.certificate_number = (
        data.certificate_number
    )

    certification.issuing_authority = (
        data.issuing_authority
    )

    certification.issue_date = data.issue_date

    certification.expiry_date = data.expiry_date

    certification.status = data.status

    certification.notes = data.notes


    db.commit()

    db.refresh(certification)


    return certification


# ==========================================
# DELETE CERTIFICATION
# ==========================================

@router.delete("/{certification_id}")
def delete_certification(
    certification_id: int,
    db: Session = Depends(get_db),
    current_email: str = Depends(get_current_email)
):

    certification = db.query(
        Certification
    ).filter(
        Certification.id == certification_id
    ).first()


    if not certification:

        raise HTTPException(
            status_code=404,
            detail="Certification not found"
        )


    db.delete(certification)

    db.commit()


    return {
        "message":
        "Certification deleted successfully"
    }


# ==========================================
# EXPIRING CERTIFICATIONS
# ==========================================

@router.get("/alerts/expiring")
def get_expiring_certifications(
    days: int = 30,
    db: Session = Depends(get_db),
    current_email: str = Depends(get_current_email)
):

    today = date.today()

    expiry_limit = today + timedelta(
        days=days
    )


    certifications = db.query(
        Certification
    ).filter(

        Certification.expiry_date >= today,

        Certification.expiry_date <= expiry_limit

    ).all()


    return certifications


# ==========================================
# EXPIRED CERTIFICATIONS
# ==========================================

@router.get("/alerts/expired")
def get_expired_certifications(
    db: Session = Depends(get_db),
    current_email: str = Depends(get_current_email)
):

    today = date.today()


    certifications = db.query(
        Certification
    ).filter(
        Certification.expiry_date < today
    ).all()


    return certifications