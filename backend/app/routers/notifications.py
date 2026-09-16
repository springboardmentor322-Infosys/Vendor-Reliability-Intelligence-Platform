"""Notification center API endpoints for VendorIQ."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.database import get_db
from app.models import Notification
from app.services.milestone_two import commit, fail
from app.services.notification_service import mark_all_read, mark_as_read

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[object, Depends(get_current_user)]


@router.get("", summary="Get current user's notifications")
def get_notifications(
    db: DatabaseSession,
    user: CurrentUser,
    unread_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Return paginated notifications for the authenticated user."""
    stmt = (
        select(Notification)
        .where(
            Notification.recipient_id == user.id,
            Notification.type != "message",
            Notification.related_entity != "Message",
        )
        .order_by(Notification.created_at.desc())
    )
    if unread_only:
        stmt = stmt.where(Notification.is_read == False)

    from sqlalchemy import func
    total = db.scalar(
        select(func.count()).select_from(
            select(Notification).where(
                Notification.recipient_id == user.id,
                Notification.type != "message",
                Notification.related_entity != "Message",
            ).subquery()
        )
    ) or 0
    unread_count = db.scalar(
        select(func.count()).select_from(
            select(Notification).where(
                Notification.recipient_id == user.id,
                Notification.type != "message",
                Notification.related_entity != "Message",
                Notification.is_read == False,
            ).subquery()
        )
    ) or 0

    items = db.scalars(
        stmt.offset((page - 1) * page_size).limit(page_size)
    ).all()

    return {
        "items": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "type": n.type,
                "severity": n.severity,
                "related_entity": n.related_entity,
                "related_entity_id": n.related_entity_id,
                "is_read": n.is_read,
                "created_at": n.created_at,
            }
            for n in items
        ],
        "total": total,
        "unread_count": unread_count,
        "page": page,
        "page_size": page_size,
    }


@router.patch("/{notification_id}/read", summary="Mark a notification as read")
def mark_notification_read(notification_id: int, db: DatabaseSession, user: CurrentUser):
    """Mark a single notification as read. Only the recipient can do this."""
    notif = mark_as_read(db, notification_id, user.id)
    if notif is None:
        fail(404, "Notification not found.")
    commit(db)
    return {"id": notif.id, "is_read": notif.is_read}


@router.patch("/read-all", summary="Mark all notifications as read")
def mark_all_notifications_read(db: DatabaseSession, user: CurrentUser):
    """Mark all unread notifications for the current user as read."""
    count = mark_all_read(db, user.id)
    commit(db)
    return {"marked_read": count}
