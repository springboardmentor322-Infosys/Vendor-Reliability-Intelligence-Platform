from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db

from app.schemas.notification import (
    NotificationCreate,
    NotificationUpdate,
    NotificationResponse
)

from app.services.notification_service import (
    get_all_notifications,
    get_notification_by_id,
    create_notification,
    update_notification,
    delete_notification
)

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)


@router.get(
    "/",
    response_model=list[NotificationResponse]
)
def read_notifications(
    db: Session = Depends(get_db)
):

    return get_all_notifications(db)


@router.get(
    "/{notification_id}",
    response_model=NotificationResponse
)
def read_notification(
    notification_id: int,
    db: Session = Depends(get_db)
):

    notification = get_notification_by_id(
        db,
        notification_id
    )

    if not notification:

        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    return notification


@router.post(
    "/",
    response_model=NotificationResponse,
    status_code=201
)
def add_notification(
    notification: NotificationCreate,
    db: Session = Depends(get_db)
):

    return create_notification(
        db,
        notification
    )


@router.put(
    "/{notification_id}",
    response_model=NotificationResponse
)
def edit_notification(
    notification_id: int,
    notification: NotificationUpdate,
    db: Session = Depends(get_db)
):

    updated = update_notification(
        db,
        notification_id,
        notification
    )

    if not updated:

        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    return updated


@router.delete("/{notification_id}")
def remove_notification(
    notification_id: int,
    db: Session = Depends(get_db)
):

    deleted = delete_notification(
        db,
        notification_id
    )

    if not deleted:

        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    return deleted