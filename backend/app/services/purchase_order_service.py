from sqlalchemy.orm import Session

from app.models.purchase_order import PurchaseOrder
from app.schemas.purchase_order import (
    PurchaseOrderCreate,
    PurchaseOrderUpdate
)


def get_all_purchase_orders(
    db: Session,
    page: int = 1,
    limit: int = 50
):

    if page < 1:
        page = 1

    if limit < 1:
        limit = 50

    if limit > 100:
        limit = 100

    total = (
        db.query(PurchaseOrder)
        .count()
    )

    offset = (page - 1) * limit

    items = (
        db.query(PurchaseOrder)
        .order_by(
            PurchaseOrder.id.desc()
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    return items, total


def get_purchase_order_by_id(
    db: Session,
    po_id: int
):

    return (
        db.query(PurchaseOrder)
        .filter(
            PurchaseOrder.id == po_id
        )
        .first()
    )


def create_purchase_order(
    db: Session,
    purchase_order: PurchaseOrderCreate
):

    db_po = PurchaseOrder(
        po_number=purchase_order.po_number,
        vendor_id=purchase_order.vendor_id,
        product_id=purchase_order.product_id,
        amount=purchase_order.amount,
        order_date=purchase_order.order_date,
        delivery_date=purchase_order.delivery_date,
        status=purchase_order.status,
        description=purchase_order.description
    )

    db.add(db_po)

    db.commit()

    db.refresh(db_po)

    return db_po


def update_purchase_order(
    db: Session,
    po_id: int,
    purchase_order: PurchaseOrderUpdate
):

    db_po = get_purchase_order_by_id(
        db,
        po_id
    )

    if not db_po:
        return None

    update_data = purchase_order.model_dump(
        exclude_unset=True
    )

    for key, value in update_data.items():

        setattr(
            db_po,
            key,
            value
        )

    db.commit()

    db.refresh(db_po)

    return db_po


def delete_purchase_order(
    db: Session,
    po_id: int
):

    db_po = get_purchase_order_by_id(
        db,
        po_id
    )

    if not db_po:
        return None

    db.delete(db_po)

    db.commit()

    return {
        "message": "Purchase Order deleted successfully"
    }