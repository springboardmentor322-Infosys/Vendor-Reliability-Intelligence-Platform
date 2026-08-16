from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import PurchaseOrder

router = APIRouter(
    prefix="/purchase-orders",
    tags=["Purchase Orders"]
)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/")
def get_purchase_orders(db: Session = Depends(get_db)):
    orders = db.query(PurchaseOrder).all()
    return orders
@router.post("/")
def create_purchase_order(
    order: dict,
    db: Session = Depends(get_db)
):
    new_order = PurchaseOrder(
        order_id=order["order_id"],
        vendor=order["vendor"],
        product=order["product"],
        amount=order["amount"],
        status=order["status"],
        invoice_number=order.get("invoice_number", ""),
        invoice_status=order.get("invoice_status", "Pending")
    )

    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    return new_order