from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db

from app.schemas.communication_history import (
    CommunicationHistoryCreate,
    CommunicationHistoryUpdate,
    CommunicationHistoryResponse
)

from app.services.communication_history_service import (
    get_all_communication_history,
    get_communication_history_by_id,
    create_communication_history,
    update_communication_history,
    delete_communication_history
)

router = APIRouter(
    prefix="/communication-history",
    tags=["Communication History"]
)


@router.get(
    "/",
    response_model=list[CommunicationHistoryResponse]
)
def read_communication_history(
    db: Session = Depends(get_db)
):

    return get_all_communication_history(db)


@router.get(
    "/{communication_id}",
    response_model=CommunicationHistoryResponse
)
def read_communication(
    communication_id: int,
    db: Session = Depends(get_db)
):

    communication = get_communication_history_by_id(
        db,
        communication_id
    )

    if not communication:

        raise HTTPException(
            status_code=404,
            detail="Communication not found"
        )

    return communication


@router.post(
    "/",
    response_model=CommunicationHistoryResponse,
    status_code=201
)
def add_communication(
    communication: CommunicationHistoryCreate,
    db: Session = Depends(get_db)
):

    return create_communication_history(
        db,
        communication
    )


@router.put(
    "/{communication_id}",
    response_model=CommunicationHistoryResponse
)
def edit_communication(
    communication_id: int,
    communication: CommunicationHistoryUpdate,
    db: Session = Depends(get_db)
):

    updated = update_communication_history(
        db,
        communication_id,
        communication
    )

    if not updated:

        raise HTTPException(
            status_code=404,
            detail="Communication not found"
        )

    return updated


@router.delete(
    "/{communication_id}"
)
def remove_communication(
    communication_id: int,
    db: Session = Depends(get_db)
):

    deleted = delete_communication_history(
        db,
        communication_id
    )

    if not deleted:

        raise HTTPException(
            status_code=404,
            detail="Communication not found"
        )

    return deleted