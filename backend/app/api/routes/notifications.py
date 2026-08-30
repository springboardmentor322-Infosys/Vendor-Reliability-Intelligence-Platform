import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationOut])
def list_my_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_read(notification_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification
