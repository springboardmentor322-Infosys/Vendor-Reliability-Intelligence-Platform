from math import ceil

from sqlalchemy.orm import Session, joinedload

from app.models.delivery import Delivery
from app.schemas.delivery import (
    DeliveryCreate,
    DeliveryUpdate
)


def get_all_deliveries(
    db: Session,
    page: int = 1,
    limit: int = 50
):
    """
    Return paginated deliveries.

    Only `limit` records are loaded from the database,
    instead of loading all deliveries.
    """

    if page < 1:
        page = 1

    if limit < 1:
        limit = 50

    if limit > 100:
        limit = 100

    total = (
        db.query(Delivery)
        .count()
    )

    offset = (
        page - 1
    ) * limit

    deliveries = (
        db.query(Delivery)
        .options(
            joinedload(
                Delivery.purchase_order
            ),
            joinedload(
                Delivery.vendor
            )
        )
        .order_by(
            Delivery.id.desc()
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    total_pages = (
        ceil(total / limit)
        if total > 0
        else 1
    )

    return {
        "items": deliveries,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }


def get_delivery_by_id(
    db: Session,
    delivery_id: int
):

    return (
        db.query(Delivery)
        .options(
            joinedload(
                Delivery.purchase_order
            ),
            joinedload(
                Delivery.vendor
            )
        )
        .filter(
            Delivery.id == delivery_id
        )
        .first()
    )


def create_delivery(
    db: Session,
    delivery: DeliveryCreate
):

    db_delivery = Delivery(
        purchase_order_id=(
            delivery.purchase_order_id
        ),

        vendor_id=(
            delivery.vendor_id
        ),

        delivery_date=(
            delivery.delivery_date
        ),

        expected_delivery_date=(
            delivery.expected_delivery_date
        ),

        delay_days=(
            delivery.delay_days
        ),

        delivery_status=(
            delivery.delivery_status
        ),

        damaged_goods=(
            delivery.damaged_goods
        ),

        delivery_notes=(
            delivery.delivery_notes
        )
    )

    db.add(db_delivery)

    db.commit()

    db.refresh(db_delivery)

    return get_delivery_by_id(
        db,
        db_delivery.id
    )


def update_delivery(
    db: Session,
    delivery_id: int,
    delivery: DeliveryUpdate
):

    db_delivery = get_delivery_by_id(
        db,
        delivery_id
    )

    if not db_delivery:
        return None

    update_data = delivery.model_dump(
        exclude_unset=True
    )

    for key, value in update_data.items():

        setattr(
            db_delivery,
            key,
            value
        )

    db.commit()

    return get_delivery_by_id(
        db,
        delivery_id
    )


def delete_delivery(
    db: Session,
    delivery_id: int
):

    db_delivery = get_delivery_by_id(
        db,
        delivery_id
    )

    if not db_delivery:
        return None

    db.delete(db_delivery)

    db.commit()

    return {
        "message": "Delivery deleted successfully"
    }