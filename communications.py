import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.communication import Message
from app.models.notification import NotificationType
from app.models.user import RoleEnum, User
from app.models.vendor import Vendor
from app.schemas.communication import MessageCreate, MessageOut
from app.services.activity import log_activity
from app.services.notifications import notify

router = APIRouter(prefix="/communications", tags=["Communications"])


@router.get("", response_model=list[MessageOut])
def list_messages(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Message)
    if current_user.role not in (RoleEnum.ADMIN, RoleEnum.AUDITOR):
        query = query.filter(or_(Message.sender_id == current_user.id, Message.recipient_id == current_user.id))
    if current_user.role == RoleEnum.VENDOR:
        if current_user.vendor_id is None:
            return []
        query = query.filter(Message.vendor_id == current_user.vendor_id)
    return query.order_by(Message.created_at.desc()).limit(100).all()


@router.post("", response_model=MessageOut, status_code=201)
def send_message(payload: MessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if payload.recipient_id == current_user.id:
        raise HTTPException(status_code=422, detail="Choose a different recipient")
    recipient = db.query(User).filter(User.id == payload.recipient_id, User.is_active.is_(True)).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient account was not found or is inactive")

    # A Vendor must never write a message against another vendor. For staff,
    # infer the vendor context when the recipient is a vendor account; this is
    # what makes both sides see the same thread in their restricted inbox.
    vendor_id = payload.vendor_id
    if current_user.role == RoleEnum.VENDOR:
        if current_user.vendor_id is None:
            raise HTTPException(status_code=422, detail="Your Vendor account has not yet been linked to a supplier record")
        vendor_id = current_user.vendor_id
    elif recipient.role == RoleEnum.VENDOR:
        vendor_id = recipient.vendor_id
    if vendor_id is not None and not db.query(Vendor.id).filter(Vendor.id == vendor_id).first():
        raise HTTPException(status_code=422, detail="Invalid vendor message context")

    message = Message(**payload.model_dump(exclude={"vendor_id"}), vendor_id=vendor_id, sender_id=current_user.id)
    db.add(message)
    log_activity(db, current_user.id, "sent", "message", message.id, payload.subject)
    db.commit()
    db.refresh(message)
    notify(db, recipient.id, NotificationType.COMMUNICATION, f"New message: {message.subject}")
    return message


@router.patch("/{message_id}/read", response_model=MessageOut)
def mark_message_read(message_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    message = db.query(Message).filter(Message.id == message_id, Message.recipient_id == current_user.id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    message.is_read = True
    db.commit()
    db.refresh(message)
    return message
