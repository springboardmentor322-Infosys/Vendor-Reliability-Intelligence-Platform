from sqlalchemy.orm import Session

from app.models.vendor import Vendor
from app.schemas.vendor import VendorCreate, VendorUpdate


def get_all_vendors(db: Session):
    return db.query(Vendor).order_by(Vendor.id.desc()).all()


def get_vendor_by_id(db: Session, vendor_id: int):
    return (
        db.query(Vendor)
        .filter(Vendor.id == vendor_id)
        .first()
    )


def create_vendor(db: Session, vendor: VendorCreate):

    db_vendor = Vendor(
        vendor_name=vendor.vendor_name,
        category=vendor.category,
        email=vendor.email,
        phone=vendor.phone,
        address=vendor.address,
        reliability_score=vendor.reliability_score,
        compliance_score=vendor.compliance_score,
        status=vendor.status
    )

    db.add(db_vendor)
    db.commit()
    db.refresh(db_vendor)

    return db_vendor


def update_vendor(
    db: Session,
    vendor_id: int,
    vendor: VendorUpdate
):

    db_vendor = get_vendor_by_id(db, vendor_id)

    if not db_vendor:
        return None

    update_data = vendor.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_vendor, key, value)

    db.commit()
    db.refresh(db_vendor)

    return db_vendor


def delete_vendor(
    db: Session,
    vendor_id: int
):

    db_vendor = get_vendor_by_id(db, vendor_id)

    if not db_vendor:
        return None

    db.delete(db_vendor)
    db.commit()

    return {
        "message": "Vendor deleted successfully"
    }
    
def mark_vendor_under_review(
    db: Session,
    vendor_id: int
):

    vendor = get_vendor_by_id(db, vendor_id)

    if not vendor:
        return None

    vendor.status = "Under Review"

    db.commit()
    db.refresh(vendor)

    return vendor


def approve_vendor(
    db: Session,
    vendor_id: int,
    approved_by: str,
    notes: str = None
):

    vendor = get_vendor_by_id(db, vendor_id)

    if not vendor:
        return None

    vendor.status = "Approved"
    vendor.approved_by = approved_by
    vendor.approval_notes = notes

    db.commit()
    db.refresh(vendor)

    return vendor


def reject_vendor(
    db: Session,
    vendor_id: int,
    approved_by: str,
    notes: str = None
):

    vendor = get_vendor_by_id(db, vendor_id)

    if not vendor:
        return None

    vendor.status = "Rejected"
    vendor.approved_by = approved_by
    vendor.approval_notes = notes

    db.commit()
    db.refresh(vendor)

    return vendor