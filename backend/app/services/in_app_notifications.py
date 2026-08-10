"""Helpers for creating in-app Notification records."""

from sqlalchemy.orm import Session

from app.models.vendoriq import Notification


def create_notification(
    db: Session,
    *,
    user_id: int,
    notification_type: str,
    title: str,
    message: str,
    related_entity_type: str | None = None,
    related_entity_id: int | None = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        message=message,
        is_read=False,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id,
    )
    db.add(notification)
    return notification
