from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db

from app.models.notification import Notification
from app.models.vendor import Vendor

from app.schemas.notification import (
    NotificationCreate,
    NotificationUpdate,
    NotificationResponse
)

from app.utils.email import send_email

from app.utils.permissions import (
    require_roles,
    ADMINISTRATOR,
    PROCUREMENT_MANAGER,
    SUPPLY_CHAIN_MANAGER,
    VENDOR,
    FINANCE_OFFICER,
    AUDITOR
)


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)


# ==========================================
# GET ALL NOTIFICATIONS
# ==========================================

@router.get(
    "/",
    response_model=list[NotificationResponse]
)
def get_notifications(
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    notifications = (
        db.query(Notification)
        .order_by(
            Notification.created_at.desc()
        )
        .all()
    )

    return notifications


# ==========================================
# GET UNREAD NOTIFICATIONS
# ==========================================

@router.get(
    "/unread",
    response_model=list[NotificationResponse]
)
def get_unread_notifications(
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    notifications = (
        db.query(Notification)
        .filter(
            Notification.is_read == False
        )
        .order_by(
            Notification.created_at.desc()
        )
        .all()
    )

    return notifications


# ==========================================
# GET UNREAD COUNT
# ==========================================

@router.get("/unread/count")
def get_unread_count(
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    count = (
        db.query(Notification)
        .filter(
            Notification.is_read == False
        )
        .count()
    )

    return {
        "count": count
    }


# ==========================================
# MARK ALL AS READ
# IMPORTANT:
# This route must come BEFORE /{notification_id}
# ==========================================

@router.put("/read-all")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    notifications = (
        db.query(Notification)
        .filter(
            Notification.is_read == False
        )
        .all()
    )

    for notification in notifications:

        notification.is_read = True

    db.commit()

    return {
        "message":
            "All notifications marked as read",

        "updated":
            len(notifications)
    }


# ==========================================
# GET SINGLE NOTIFICATION
# ==========================================

@router.get(
    "/{notification_id}",
    response_model=NotificationResponse
)
def get_notification(
    notification_id: int,
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id
        )
        .first()
    )

    if not notification:

        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    return notification


# ==========================================
# CREATE NOTIFICATION
# ==========================================

@router.post(
    "/",
    response_model=NotificationResponse
)
def create_notification(
    data: NotificationCreate,
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR
        )
    )
):

    # ======================================
    # CREATE NOTIFICATION
    # ======================================

    notification = Notification(

        title=data.title,

        message=data.message,

        notification_type=
            data.notification_type,

        vendor_id=data.vendor_id,

        is_read=False

    )


    db.add(
        notification
    )

    db.commit()

    db.refresh(
        notification
    )


    # ======================================
    # SEND EMAIL TO VENDOR
    # ======================================

    if data.vendor_id:

        vendor = (
            db.query(Vendor)
            .filter(
                Vendor.id ==
                data.vendor_id
            )
            .first()
        )


        if vendor and vendor.email:

            send_email(

                recipient_email=
                    vendor.email,

                subject=
                    notification.title,

                message=
                    notification.message

            )


    # ======================================
    # RETURN NOTIFICATION
    # ======================================

    return notification


# ==========================================
# UPDATE NOTIFICATION
# ==========================================

@router.put(
    "/{notification_id}",
    response_model=NotificationResponse
)
def update_notification(
    notification_id: int,
    data: NotificationUpdate,
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id
        )
        .first()
    )

    if not notification:

        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )


    if data.is_read is not None:

        notification.is_read = data.is_read


    db.commit()

    db.refresh(
        notification
    )

    return notification


# ==========================================
# MARK AS READ
# ==========================================

@router.put(
    "/{notification_id}/read",
    response_model=NotificationResponse
)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id
        )
        .first()
    )

    if not notification:

        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )


    notification.is_read = True


    db.commit()

    db.refresh(
        notification
    )


    return notification


# ==========================================
# DELETE NOTIFICATION
# ==========================================

@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR
        )
    )
):

    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id
        )
        .first()
    )

    if not notification:

        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )


    db.delete(
        notification
    )

    db.commit()


    return {

        "message":
            "Notification deleted successfully"

    }