"""
Creates in-app notifications. Email/SMS delivery (SMTP/Twilio per the spec)
would plug in here - e.g. call an SMTP client or Twilio's API right after
db.add(notification) below, once real provider credentials are configured.
"""
from sqlalchemy.orm import Session

from app.models.notification import Notification, NotificationType


def notify(db: Session, user_id, type: NotificationType, message: str) -> Notification:
    notification = Notification(user_id=user_id, type=type, message=message)
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification
