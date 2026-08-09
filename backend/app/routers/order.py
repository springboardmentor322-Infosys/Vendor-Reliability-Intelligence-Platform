from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.order import Order


router = APIRouter(
    prefix="/orders",
    tags=["Orders"]
)


# GET ALL ORDERS
@router.get("/")
def get_orders(
    db: Session = Depends(get_db)
):

    orders = db.query(Order).all()

    return orders


# GET PENDING ORDER COUNT
@router.get("/pending/count")
def get_pending_order_count(
    db: Session = Depends(get_db)
):

    count = db.query(Order).filter(
        Order.status == "Pending"
    ).count()

    return {
        "count": count
    }


# CREATE ORDER
@router.post("/")
def create_order(
    data: dict,
    db: Session = Depends(get_db)
):

    order = Order(
        vendor_id=data["vendor_id"],
        product_name=data["product_name"],
        quantity=data["quantity"],
        amount=data["amount"],
        status=data.get("status", "Pending")
    )

    db.add(order)
    db.commit()
    db.refresh(order)

    return order


# UPDATE ORDER
@router.put("/{order_id}")
def update_order(
    order_id: int,
    data: dict,
    db: Session = Depends(get_db)
):

    order = db.query(Order).filter(
        Order.id == order_id
    ).first()

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    order.vendor_id = data.get(
        "vendor_id",
        order.vendor_id
    )

    order.product_name = data.get(
        "product_name",
        order.product_name
    )

    order.quantity = data.get(
        "quantity",
        order.quantity
    )

    order.amount = data.get(
        "amount",
        order.amount
    )

    order.status = data.get(
        "status",
        order.status
    )

    db.commit()
    db.refresh(order)

    return order


# DELETE ORDER
@router.delete("/{order_id}")
def delete_order(
    order_id: int,
    db: Session = Depends(get_db)
):

    order = db.query(Order).filter(
        Order.id == order_id
    ).first()

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    db.delete(order)
    db.commit()

    return {
        "message": "Order deleted successfully"
    }