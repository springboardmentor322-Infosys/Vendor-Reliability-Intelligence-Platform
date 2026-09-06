from math import ceil

from sqlalchemy.orm import Session, joinedload

from app.models.quality_inspection import QualityInspection
from app.schemas.quality_inspection import (
    QualityInspectionCreate,
    QualityInspectionUpdate
)


def get_quality_inspection_by_id(
    db: Session,
    inspection_id: int
):

    return (
        db.query(QualityInspection)
        .options(
            joinedload(
                QualityInspection.purchase_order
            ),
            joinedload(
                QualityInspection.vendor
            )
        )
        .filter(
            QualityInspection.id == inspection_id
        )
        .first()
    )


def get_all_quality_inspections(
    db: Session,
    page: int = 1,
    page_size: int = 50
):

    if page < 1:
        page = 1

    if page_size < 1:
        page_size = 50

    if page_size > 100:
        page_size = 100

    query = (
        db.query(QualityInspection)
        .options(
            joinedload(
                QualityInspection.purchase_order
            ),
            joinedload(
                QualityInspection.vendor
            )
        )
    )

    total = query.count()

    total_pages = (
        ceil(total / page_size)
        if total > 0
        else 1
    )

    inspections = (
        query
        .order_by(
            QualityInspection.id.desc()
        )
        .offset(
            (page - 1) * page_size
        )
        .limit(page_size)
        .all()
    )

    return {
        "items": inspections,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }


def create_quality_inspection(
    db: Session,
    inspection: QualityInspectionCreate
):

    db_inspection = QualityInspection(
        purchase_order_id=inspection.purchase_order_id,
        vendor_id=inspection.vendor_id,

        inspection_date=inspection.inspection_date,
        inspector=inspection.inspector,

        quality_score=inspection.quality_score,
        defects_found=inspection.defects_found,

        remarks=inspection.remarks,
        status=inspection.status
    )

    db.add(db_inspection)

    db.commit()

    db.refresh(db_inspection)

    return get_quality_inspection_by_id(
        db,
        db_inspection.id
    )


def update_quality_inspection(
    db: Session,
    inspection_id: int,
    inspection: QualityInspectionUpdate
):

    db_inspection = get_quality_inspection_by_id(
        db,
        inspection_id
    )

    if not db_inspection:
        return None

    update_data = inspection.model_dump(
        exclude_unset=True
    )

    for key, value in update_data.items():

        setattr(
            db_inspection,
            key,
            value
        )

    db.commit()

    db.refresh(db_inspection)

    return get_quality_inspection_by_id(
        db,
        inspection_id
    )


def delete_quality_inspection(
    db: Session,
    inspection_id: int
):

    db_inspection = get_quality_inspection_by_id(
        db,
        inspection_id
    )

    if not db_inspection:
        return None

    db.delete(db_inspection)

    db.commit()

    return {
        "message": "Quality inspection deleted successfully"
    }