from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date

from app.database import get_db

from app.models.delivery import Delivery
from app.models.order import Order
from app.models.vendor import Vendor

from app.schemas.delivery import (
    DeliveryCreate,
    DeliveryUpdate
)

from app.utils.permissions import (
    require_roles,
    ADMINISTRATOR,
    PROCUREMENT_MANAGER,
    SUPPLY_CHAIN_MANAGER,
    FINANCE_OFFICER,
    AUDITOR,
    VENDOR
)


router = APIRouter(
    prefix="/deliveries",
    tags=["Deliveries"]
)


# ==========================================
# CREATE DELIVERY
# ==========================================

@router.post("/")
def create_delivery(
    data: DeliveryCreate,
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER
        )
    )
):

    # ======================================
    # CHECK ORDER
    # ======================================

    order = db.query(
        Order
    ).filter(
        Order.id == data.order_id
    ).first()

    if not order:

        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )


    # ======================================
    # CHECK VENDOR
    # ======================================

    vendor = db.query(
        Vendor
    ).filter(
        Vendor.id == data.vendor_id
    ).first()

    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    # ======================================
    # CHECK ORDER-VENDOR MATCH
    # ======================================

    if order.vendor_id != data.vendor_id:

        raise HTTPException(
            status_code=400,
            detail="Vendor does not match the order vendor"
        )


    # ======================================
    # CHECK DUPLICATE DELIVERY
    # ======================================

    existing_delivery = db.query(
        Delivery
    ).filter(
        Delivery.order_id == data.order_id
    ).first()

    if existing_delivery:

        raise HTTPException(
            status_code=400,
            detail="Delivery already exists for this order"
        )


    # ======================================
    # CREATE DELIVERY
    # ======================================

    delivery = Delivery(

        order_id=data.order_id,

        vendor_id=data.vendor_id,

        expected_delivery_date=
            data.expected_delivery_date,

        actual_delivery_date=
            data.actual_delivery_date,

        status=data.status,

        tracking_number=
            data.tracking_number,

        notes=data.notes

    )

    db.add(delivery)

    db.commit()

    db.refresh(delivery)

    return delivery


# ==========================================
# GET DELIVERY SUMMARY
# ==========================================

@router.get("/summary")
def get_delivery_summary(
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR,
            VENDOR
        )
    )
):

    today = date.today()


    # ======================================
    # TOTAL
    # ======================================

    total_deliveries = db.query(
        func.count(Delivery.id)
    ).scalar() or 0


    # ======================================
    # PENDING
    # ======================================

    pending_deliveries = db.query(
        func.count(Delivery.id)
    ).filter(
        Delivery.status == "Pending"
    ).scalar() or 0


    # ======================================
    # IN TRANSIT
    # ======================================

    in_transit_deliveries = db.query(
        func.count(Delivery.id)
    ).filter(
        Delivery.status == "In Transit"
    ).scalar() or 0


    # ======================================
    # DELIVERED
    # ======================================

    delivered_deliveries = db.query(
        func.count(Delivery.id)
    ).filter(
        Delivery.status.in_(
            [
                "Delivered",
                "Completed"
            ]
        )
    ).scalar() or 0


    # ======================================
    # DELAYED
    # ======================================

    delayed_deliveries = db.query(
        func.count(Delivery.id)
    ).filter(
        Delivery.expected_delivery_date < today,
        Delivery.status.notin_(
            [
                "Delivered",
                "Completed",
                "Cancelled"
            ]
        )
    ).scalar() or 0


    # ======================================
    # CANCELLED
    # ======================================

    cancelled_deliveries = db.query(
        func.count(Delivery.id)
    ).filter(
        Delivery.status == "Cancelled"
    ).scalar() or 0


    return {

        "total_deliveries":
            total_deliveries,

        "pending_deliveries":
            pending_deliveries,

        "in_transit_deliveries":
            in_transit_deliveries,

        "delivered_deliveries":
            delivered_deliveries,

        "delayed_deliveries":
            delayed_deliveries,

        "cancelled_deliveries":
            cancelled_deliveries

    }


# ==========================================
# GET DELAYED DELIVERIES
# ==========================================

# IMPORTANT:
# This route MUST come before
# /{delivery_id}

@router.get("/delayed")
def get_delayed_deliveries(
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    today = date.today()


    deliveries = db.query(
        Delivery
    ).filter(
        Delivery.expected_delivery_date < today,

        Delivery.status.notin_(
            [
                "Delivered",
                "Completed",
                "Cancelled"
            ]
        )
    ).order_by(
        Delivery.expected_delivery_date.asc()
    ).limit(
        100
    ).all()


    return deliveries


# ==========================================
# GET DELIVERIES BY ORDER
# ==========================================

@router.get("/order/{order_id}")
def get_order_deliveries(
    order_id: int,
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR,
            VENDOR
        )
    )
):

    deliveries = db.query(
        Delivery
    ).filter(
        Delivery.order_id == order_id
    ).order_by(
        Delivery.id.desc()
    ).all()


    return deliveries


# ==========================================
# GET DELIVERIES BY VENDOR
# ==========================================

@router.get("/vendor/{vendor_id}")
def get_vendor_deliveries(
    vendor_id: int,
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR,
            VENDOR
        )
    )
):

    deliveries = db.query(
        Delivery
    ).filter(
        Delivery.vendor_id == vendor_id
    ).order_by(
        Delivery.id.desc()
    ).all()


    return deliveries


# ==========================================
# GET ALL DELIVERIES - PAGINATED
# ==========================================

@router.get("/")
def get_deliveries(
    page: int = Query(
        1,
        ge=1
    ),

    limit: int = Query(
        50,
        ge=1,
        le=100
    ),

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR,
            VENDOR
        )
    )
):

    # ======================================
    # TOTAL COUNT
    # ======================================

    total = db.query(
        func.count(Delivery.id)
    ).scalar() or 0


    # ======================================
    # OFFSET
    # ======================================

    offset = (
        page - 1
    ) * limit


    # ======================================
    # GET CURRENT PAGE
    # ======================================

    deliveries = db.query(
        Delivery
    ).order_by(
        Delivery.id.desc()
    ).offset(
        offset
    ).limit(
        limit
    ).all()


    # ======================================
    # TOTAL PAGES
    # ======================================

    total_pages = (
        (total + limit - 1)
        // limit
        if total > 0
        else 1
    )


    return {

        "items":
            deliveries,

        "page":
            page,

        "limit":
            limit,

        "total":
            total,

        "total_pages":
            total_pages

    }


# ==========================================
# GET DELIVERY BY ID
# ==========================================

@router.get("/{delivery_id}")
def get_delivery(
    delivery_id: int,
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR,
            VENDOR
        )
    )
):

    delivery = db.query(
        Delivery
    ).filter(
        Delivery.id == delivery_id
    ).first()


    if not delivery:

        raise HTTPException(
            status_code=404,
            detail="Delivery not found"
        )


    return delivery


# ==========================================
# UPDATE DELIVERY
# ==========================================

@router.put("/{delivery_id}")
def update_delivery(
    delivery_id: int,
    data: DeliveryUpdate,
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER
        )
    )
):

    delivery = db.query(
        Delivery
    ).filter(
        Delivery.id == delivery_id
    ).first()


    if not delivery:

        raise HTTPException(
            status_code=404,
            detail="Delivery not found"
        )


    # ======================================
    # UPDATE EXPECTED DATE
    # ======================================

    if data.expected_delivery_date is not None:

        delivery.expected_delivery_date = (
            data.expected_delivery_date
        )


    # ======================================
    # UPDATE ACTUAL DATE
    # ======================================

    if data.actual_delivery_date is not None:

        delivery.actual_delivery_date = (
            data.actual_delivery_date
        )


    # ======================================
    # UPDATE STATUS
    # ======================================

    if data.status is not None:

        allowed_statuses = [

            "Pending",

            "In Transit",

            "Delivered",

            "Completed",

            "Cancelled"

        ]


        if data.status not in allowed_statuses:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid delivery status. "
                    "Allowed statuses: "
                    + ", ".join(
                        allowed_statuses
                    )
                )
            )


        delivery.status = data.status


    # ======================================
    # UPDATE TRACKING
    # ======================================

    if data.tracking_number is not None:

        delivery.tracking_number = (
            data.tracking_number
        )


    # ======================================
    # UPDATE NOTES
    # ======================================

    if data.notes is not None:

        delivery.notes = data.notes


    # ======================================
    # AUTO STATUS
    # ======================================

    if (
        delivery.actual_delivery_date
        and delivery.status == "Pending"
    ):

        delivery.status = "Delivered"


    db.commit()

    db.refresh(delivery)


    return delivery


# ==========================================
# DELETE DELIVERY
# ==========================================

@router.delete("/{delivery_id}")
def delete_delivery(
    delivery_id: int,
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR
        )
    )
):

    delivery = db.query(
        Delivery
    ).filter(
        Delivery.id == delivery_id
    ).first()


    if not delivery:

        raise HTTPException(
            status_code=404,
            detail="Delivery not found"
        )


    db.delete(delivery)

    db.commit()


    return {

        "message":
            "Delivery deleted successfully"

    }