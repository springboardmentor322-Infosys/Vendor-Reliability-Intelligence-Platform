from fastapi import APIRouter, Depends, UploadFile, File, Form
import os
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
async def create_purchase_order(
    order_id: str = Form(...),
    vendor: str = Form(...),
    product: str = Form(...),
    amount: int = Form(...),
    status: str = Form(...),
    invoice_number: str = Form(""),
    invoice_status: str = Form("Pending"),
    invoice_file: UploadFile = File(None),
    proof_of_delivery: UploadFile = File(None),
    db: Session = Depends(get_db)
):

    upload_dir = "uploads/purchase_orders"
    os.makedirs(upload_dir, exist_ok=True)

    invoice_file_path = None
    proof_file_path = None

    if invoice_file:
        invoice_file_path = os.path.join(
            upload_dir,
            invoice_file.filename
        )

        with open(invoice_file_path, "wb") as file:
            file.write(await invoice_file.read())

    if proof_of_delivery:
        proof_file_path = os.path.join(
            upload_dir,
            proof_of_delivery.filename
        )

        with open(proof_file_path, "wb") as file:
            file.write(await proof_of_delivery.read())

    new_order = PurchaseOrder(
        order_id=order_id,
        vendor=vendor,
        product=product,
        amount=amount,
        status=status,
        invoice_number=invoice_number,
        invoice_status=invoice_status,
        invoice_file=invoice_file_path,
        proof_of_delivery=proof_file_path
    )

    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    return new_order
@router.put("/{order_id}")
def update_purchase_order_status(
    order_id: str,
    status_data: dict,
    db: Session = Depends(get_db)
):
    order = db.query(PurchaseOrder).filter(
        PurchaseOrder.order_id == order_id
    ).first()

    if not order:
        return {"message": "Purchase Order not found"}

    order.status = status_data["status"]

    db.commit()
    db.refresh(order)

    return order