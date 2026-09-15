from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from typing import List
from datetime import datetime

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications & Alerts"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=List[schemas.NotificationResponse])
@router.get("/", response_model=List[schemas.NotificationResponse])
def get_notifications(db: Session = Depends(get_db)):
    # Auto-scan live database entities for alerts
    existing_titles = set(n.title for n in db.query(models.Notification.title).all())

    # 1. Scan high-risk vendors
    risk_vendors = db.query(models.Vendor).filter((models.Vendor.score < 60) | (models.Vendor.risk_level == "High")).all()
    for v in risk_vendors:
        t = f"Vendor Risk Alert: {v.name}"
        if t not in existing_titles:
            db.add(models.Notification(
                title=t,
                message=f"Vendor '{v.name}' has a high risk level with reliability score of {v.score}/100.",
                category="Vendor Alert",
                type="danger"
            ))
            existing_titles.add(t)

    # 2. Scan delayed purchase orders
    delayed_orders = db.query(models.PurchaseOrder).filter((models.PurchaseOrder.status == "Delayed") | (models.PurchaseOrder.status == "Pending")).all()
    for o in delayed_orders:
        t = f"PO Alert: {o.order_id}"
        if t not in existing_titles:
            cat = "Purchase Order"
            ntype = "warning" if o.status == "Pending" else "danger"
            msg = f"Purchase order {o.order_id} for {o.product or 'items'} from {o.vendor or 'vendor'} is in status '{o.status}'."
            db.add(models.Notification(
                title=t,
                message=msg,
                category=cat,
                type=ntype
            ))
            existing_titles.add(t)

    # 3. Scan expiring contracts
    expiring_contracts = db.query(models.Contract).filter(models.Contract.status.in_(["Expiring Soon", "Expired"])).all()
    for c in expiring_contracts:
        t = f"Contract Alert: {c.contract_id}"
        if t not in existing_titles:
            db.add(models.Notification(
                title=t,
                message=f"Contract '{c.contract_name or c.contract_id}' with {c.vendor} is currently {c.status}.",
                category="Contract Warning",
                type="warning"
            ))
            existing_titles.add(t)

    db.commit()

    notifications = db.query(models.Notification).order_by(models.Notification.created_at.desc()).all()
    if not notifications:
        initial_alerts = [
            models.Notification(
                title="Delivery Delay Warning",
                message="Vendor 'Steel Craft Ltd' reported a 2-day delivery delay for PO-2026-004.",
                category="Purchase Order",
                type="warning"
            ),
            models.Notification(
                title="Contract Expiry Alert",
                message="Contract CON-9842 with TechSupply Solutions expires in 14 days.",
                category="Contract Warning",
                type="danger"
            ),
            models.Notification(
                title="Vendor Approval Request",
                message="New Vendor 'Apex Logistics' submitted registration documents for review.",
                category="Vendor Alert",
                type="info"
            )
        ]
        db.add_all(initial_alerts)
        db.commit()
        notifications = db.query(models.Notification).order_by(models.Notification.created_at.desc()).all()
        
    return notifications

@router.post("", response_model=dict)
@router.post("/", response_model=dict)
def create_notification(notif: schemas.NotificationCreate, db: Session = Depends(get_db)):
    new_notif = models.Notification(
        title=notif.title,
        message=notif.message,
        category=notif.category or "Procurement Alert",
        type=notif.type or "info"
    )
    db.add(new_notif)
    db.commit()
    db.refresh(new_notif)
    return {
        "message": "Notification created", 
        "data": {
            "id": new_notif.id,
            "title": new_notif.title,
            "message": new_notif.message,
            "category": new_notif.category,
            "type": new_notif.type,
            "is_read": new_notif.is_read
        }
    }

@router.put("/{notification_id}/read", response_model=dict)
def mark_as_read(notification_id: int, db: Session = Depends(get_db)):
    notif = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}

@router.post("/mark-all-read", response_model=dict)
def mark_all_as_read(db: Session = Depends(get_db)):
    db.query(models.Notification).update({models.Notification.is_read: True})
    db.commit()
    return {"message": "All notifications marked as read"}

@router.delete("/clear-read", response_model=dict)
def clear_read_notifications(db: Session = Depends(get_db)):
    db.query(models.Notification).filter(models.Notification.is_read == True).delete()
    db.commit()
    return {"message": "Read notifications cleared"}

@router.delete("/{notification_id}", response_model=dict)
def delete_notification(notification_id: int, db: Session = Depends(get_db)):
    notif = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notif)
    db.commit()
    return {"message": "Notification deleted"}
