from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("", response_model=List[schemas.NotificationOut])
def list_notifications(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Notification).order_by(models.Notification.created_at.desc()).limit(100).all()


@router.post("/{notif_id}/read", response_model=schemas.NotificationOut)
def mark_read(notif_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    notif = db.query(models.Notification).filter(models.Notification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.get("/unread-count")
def unread_count(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    count = db.query(models.Notification).filter(models.Notification.is_read == False).count()  # noqa: E712
    return {"unread": count}
