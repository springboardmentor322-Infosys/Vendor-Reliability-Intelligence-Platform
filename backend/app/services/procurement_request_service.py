from sqlalchemy.orm import Session

from app.models.procurement_request import ProcurementRequest
from app.schemas.procurement_request import (
    ProcurementRequestCreate,
    ProcurementRequestUpdate
)


def get_all_requests(db: Session):
    return (
        db.query(ProcurementRequest)
        .order_by(ProcurementRequest.id.desc())
        .all()
    )


def get_request_by_id(
    db: Session,
    request_id: int
):
    return (
        db.query(ProcurementRequest)
        .filter(
            ProcurementRequest.id == request_id
        )
        .first()
    )


def create_request(
    db: Session,
    request: ProcurementRequestCreate
):

    db_request = ProcurementRequest(
        **request.model_dump()
    )

    db.add(db_request)
    db.commit()
    db.refresh(db_request)

    return db_request


def update_request(
    db: Session,
    request_id: int,
    request: ProcurementRequestUpdate
):

    db_request = get_request_by_id(
        db,
        request_id
    )

    if not db_request:
        return None

    update_data = request.model_dump(
        exclude_unset=True
    )

    for key, value in update_data.items():

        setattr(db_request, key, value)

    db.commit()
    db.refresh(db_request)

    return db_request


def delete_request(
    db: Session,
    request_id: int
):

    db_request = get_request_by_id(
        db,
        request_id
    )

    if not db_request:
        return None

    db.delete(db_request)
    db.commit()

    return {
        "message": "Procurement Request deleted successfully"
    }