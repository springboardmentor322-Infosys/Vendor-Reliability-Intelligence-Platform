from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/messages", tags=["Communication"])


@router.get("/vendor/{vendor_id}", response_model=List[schemas.MessageOut])
def vendor_messages(vendor_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return (
        db.query(models.Message)
        .filter(models.Message.vendor_id == vendor_id)
        .order_by(models.Message.sent_at.asc())
        .all()
    )


@router.post("", response_model=schemas.MessageOut, status_code=201)
def send_message(payload: schemas.MessageCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == payload.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    message = models.Message(**payload.dict())
    db.add(message)
    db.commit()
    db.refresh(message)
    return message
