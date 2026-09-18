from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.schemas import (
    CommunicationCreate,
    CommunicationResponse
)


router = APIRouter(
    prefix="/communications",
    tags=["Communications"]
)


@router.post(
    "/",
    response_model=CommunicationResponse
)
def create_communication(
    communication: CommunicationCreate,
    db: Session = Depends(get_db)
):
    # Check vendor
    vendor = db.query(
        models.Vendor
    ).filter(
        models.Vendor.id == communication.vendor_id
    ).first()

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )

    # Check procurement if provided
    if communication.procurement_id is not None:
        procurement = db.query(
            models.Procurement
        ).filter(
            models.Procurement.id == communication.procurement_id
        ).first()

        if not procurement:
            raise HTTPException(
                status_code=404,
                detail="Procurement not found"
            )

    new_communication = models.Communication(
        vendor_id=communication.vendor_id,
        procurement_id=communication.procurement_id,
        sender=communication.sender,
        message=communication.message,
        communication_type=communication.communication_type,
        status=communication.status
    )

    db.add(new_communication)
    db.commit()
    db.refresh(new_communication)

    return new_communication


@router.get(
    "/",
    response_model=list[CommunicationResponse]
)
def get_communications(
    db: Session = Depends(get_db)
):
    communications = db.query(
        models.Communication
    ).all()

    return communications


@router.get(
    "/{communication_id}",
    response_model=CommunicationResponse
)
def get_communication(
    communication_id: int,
    db: Session = Depends(get_db)
):
    communication = db.query(
        models.Communication
    ).filter(
        models.Communication.id == communication_id
    ).first()

    if not communication:
        raise HTTPException(
            status_code=404,
            detail="Communication not found"
        )

    return communication


@router.get(
    "/vendor/{vendor_id}",
    response_model=list[CommunicationResponse]
)
def get_vendor_communications(
    vendor_id: int,
    db: Session = Depends(get_db)
):
    vendor = db.query(
        models.Vendor
    ).filter(
        models.Vendor.id == vendor_id
    ).first()

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )

    communications = db.query(
        models.Communication
    ).filter(
        models.Communication.vendor_id == vendor_id
    ).all()

    return communications


@router.put(
    "/{communication_id}/read"
)
def mark_communication_as_read(
    communication_id: int,
    db: Session = Depends(get_db)
):
    communication = db.query(
        models.Communication
    ).filter(
        models.Communication.id == communication_id
    ).first()

    if not communication:
        raise HTTPException(
            status_code=404,
            detail="Communication not found"
        )

    communication.status = "Read"

    db.commit()
    db.refresh(communication)

    return {
        "message": "Communication marked as read",
        "communication": communication
    }