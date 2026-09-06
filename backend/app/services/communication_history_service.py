from sqlalchemy.orm import Session

from app.models.communication_history import CommunicationHistory
from app.schemas.communication_history import (
    CommunicationHistoryCreate,
    CommunicationHistoryUpdate
)


def get_all_communication_history(db: Session):
    return (
        db.query(CommunicationHistory)
        .order_by(
            CommunicationHistory.communication_date.desc()
        )
        .all()
    )


def get_communication_history_by_id(
    db: Session,
    communication_id: int
):
    return (
        db.query(CommunicationHistory)
        .filter(
            CommunicationHistory.id == communication_id
        )
        .first()
    )


def create_communication_history(
    db: Session,
    communication: CommunicationHistoryCreate
):

    db_communication = CommunicationHistory(

        vendor_id=communication.vendor_id,

        subject=communication.subject,

        communication_type=communication.communication_type,

        sender=communication.sender,

        receiver=communication.receiver,

        message=communication.message

    )

    db.add(db_communication)

    db.commit()

    db.refresh(db_communication)

    return db_communication


def update_communication_history(
    db: Session,
    communication_id: int,
    communication: CommunicationHistoryUpdate
):

    db_communication = get_communication_history_by_id(
        db,
        communication_id
    )

    if not db_communication:
        return None

    update_data = communication.model_dump(
        exclude_unset=True
    )

    for key, value in update_data.items():
        setattr(
            db_communication,
            key,
            value
        )

    db.commit()

    db.refresh(db_communication)

    return db_communication


def delete_communication_history(
    db: Session,
    communication_id: int
):

    db_communication = get_communication_history_by_id(
        db,
        communication_id
    )

    if not db_communication:
        return None

    db.delete(db_communication)

    db.commit()

    return {
        "message": "Communication deleted successfully"
    }