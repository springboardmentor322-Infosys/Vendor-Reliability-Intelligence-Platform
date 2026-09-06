from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth import get_current_user


router = APIRouter(
    prefix="/api/messages",
    tags=["Communication"]
)


# Roles allowed to send messages
MESSAGE_SEND_ROLES = (
    models.RoleEnum.ADMIN,
    models.RoleEnum.PROCUREMENT_MANAGER,
    models.RoleEnum.SUPPLY_CHAIN_MANAGER,
    models.RoleEnum.VENDOR,
)


@router.get(
    "/vendor/{vendor_id}",
    response_model=List[schemas.MessageOut]
)
def vendor_messages(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Vendor can only view their own vendor messages
    if current_user.role == models.RoleEnum.VENDOR:
        if (
            not current_user.vendor_id
            or current_user.vendor_id != vendor_id
        ):
            raise HTTPException(
                status_code=403,
                detail="You can only view messages for your own vendor.",
            )

    return (
        db.query(models.Message)
        .filter(models.Message.vendor_id == vendor_id)
        .order_by(models.Message.sent_at.asc())
        .all()
    )


@router.post(
    "",
    response_model=schemas.MessageOut,
    status_code=201
)
def send_message(
    payload: schemas.MessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Finance Officer and Auditor are view-only
    if current_user.role not in MESSAGE_SEND_ROLES:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to send messages.",
        )

    vendor = (
        db.query(models.Vendor)
        .filter(models.Vendor.id == payload.vendor_id)
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )

    # Vendor can only send messages for their own vendor
    if current_user.role == models.RoleEnum.VENDOR:
        if (
            not current_user.vendor_id
            or current_user.vendor_id != payload.vendor_id
        ):
            raise HTTPException(
                status_code=403,
                detail="You can only send messages for your own vendor.",
            )

    message = models.Message(**payload.dict())

    db.add(message)
    db.commit()
    db.refresh(message)

    return message