from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db

from app.schemas.procurement_request import (
    ProcurementRequestCreate,
    ProcurementRequestUpdate,
    ProcurementRequestResponse
)

from app.services.procurement_request_service import (
    get_all_requests,
    get_request_by_id,
    create_request,
    update_request,
    delete_request
)

router = APIRouter(
    prefix="/procurement-requests",
    tags=["Procurement Requests"]
)


@router.get(
    "/",
    response_model=list[ProcurementRequestResponse]
)
def read_requests(
    db: Session = Depends(get_db)
):
    return get_all_requests(db)


@router.get(
    "/{request_id}",
    response_model=ProcurementRequestResponse
)
def read_request(
    request_id: int,
    db: Session = Depends(get_db)
):

    request = get_request_by_id(
        db,
        request_id
    )

    if not request:

        raise HTTPException(
            status_code=404,
            detail="Request not found"
        )

    return request


@router.post(
    "/",
    response_model=ProcurementRequestResponse,
    status_code=201
)
def add_request(
    request: ProcurementRequestCreate,
    db: Session = Depends(get_db)
):
    return create_request(
        db,
        request
    )


@router.put(
    "/{request_id}",
    response_model=ProcurementRequestResponse
)
def edit_request(
    request_id: int,
    request: ProcurementRequestUpdate,
    db: Session = Depends(get_db)
):

    updated = update_request(
        db,
        request_id,
        request
    )

    if not updated:

        raise HTTPException(
            status_code=404,
            detail="Request not found"
        )

    return updated


@router.delete("/{request_id}")
def remove_request(
    request_id: int,
    db: Session = Depends(get_db)
):

    deleted = delete_request(
        db,
        request_id
    )

    if not deleted:

        raise HTTPException(
            status_code=404,
            detail="Request not found"
        )

    return deleted