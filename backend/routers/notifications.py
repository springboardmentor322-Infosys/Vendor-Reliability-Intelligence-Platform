from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("", response_model=List[schemas.NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Notification)

    # Vendors should only see notifications related to their own vendor.
    if current_user.role == models.RoleEnum.VENDOR:
        if not current_user.vendor_id:
            return []

        query = query.filter(
            models.Notification.vendor_id == current_user.vendor_id
        )

    return (
        query
        .order_by(models.Notification.created_at.desc())
        .limit(100)
        .all()
    )

@router.post("/{notif_id}/read", response_model=schemas.NotificationOut)
def mark_read(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Notification).filter(
        models.Notification.id == notif_id
    )

    if current_user.role == models.RoleEnum.VENDOR:
        if not current_user.vendor_id:
            raise HTTPException(
                status_code=403,
                detail="Vendor account is not linked to a vendor."
            )

        query = query.filter(
            models.Notification.vendor_id == current_user.vendor_id
        )

    notif = query.first()

    if not notif:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    notif.is_read = True
    db.commit()
    db.refresh(notif)

    return notif


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Notification).filter(
        models.Notification.is_read == False
    )

    if current_user.role == models.RoleEnum.VENDOR:
        if not current_user.vendor_id:
            return {"unread": 0}

        query = query.filter(
            models.Notification.vendor_id == current_user.vendor_id
        )

    return {"unread": query.count()}
