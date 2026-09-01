from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from datetime import date

from app.schemas.order import OrderResponse
from app.models.procurement_request import ProcurementRequest
from app.models.order import Order
from app.models.vendor import Vendor
from app.models.notification import Notification

from app.database import get_db

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
    prefix="/orders",
    tags=["Orders"]
)


# ==========================================
# DELIVERY DELAY CHECK
# ==========================================

def check_delivery_delay(
    order: Order,
    db: Session
):

    # ======================================
    # NO DELIVERY DATE
    # ======================================

    if not order.expected_delivery_date:
        return


    # ======================================
    # COMPLETED / CANCELLED ORDERS
    # ======================================

    if order.status in [
        "Delivered",
        "Completed",
        "Cancelled"
    ]:
        return


    # ======================================
    # CHECK DELIVERY DATE
    # ======================================

    today = date.today()

    if order.expected_delivery_date >= today:
        return


    # ======================================
    # CALCULATE DAYS DELAYED
    # ======================================

    days_delayed = (
        today -
        order.expected_delivery_date
    ).days


    # ======================================
    # NOTIFICATION MESSAGE
    # ======================================

    message = (
        f"Order #{order.id} "
        f"for {order.product_name} "
        f"is delayed by "
        f"{days_delayed} days."
    )


    # ======================================
    # CHECK DUPLICATE NOTIFICATION
    # ======================================

    existing_notification = (
        db.query(Notification)
        .filter(
            Notification.notification_type
            == "Delivery Delay",

            Notification.vendor_id
            == order.vendor_id,

            Notification.message
            == message
        )
        .first()
    )


    if existing_notification:
        return


    # ======================================
    # CREATE NOTIFICATION
    # ======================================

    notification = Notification(

        title="Delivery Delay",

        message=message,

        notification_type="Delivery Delay",

        vendor_id=order.vendor_id,

        is_read=False

    )


    db.add(notification)

    db.commit()


# ==========================================
# CHECK ALL DELAYED ORDERS
# ==========================================

def check_all_delivery_delays(
    db: Session
):

    orders = (
        db.query(Order)
        .filter(
            Order.expected_delivery_date.isnot(None)
        )
        .all()
    )


    for order in orders:

        check_delivery_delay(
            order,
            db
        )


# ==========================================
# GET ALL ORDERS
# ==========================================

@router.get(
    "/",
    response_model=list[OrderResponse]
)
def get_orders(
    status: str | None = None,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),

    current_user = Depends(
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
    """Return a paginated order list.

    DataCo contains 65k+ unique orders, so loading the entire table and
    running a notification query for every order on every page load is
    intentionally avoided. Delivery-delay checks are performed when an
    order is created/updated instead.
    """
    limit = max(1, min(limit, 500))
    offset = max(0, offset)

    query = db.query(Order)

    if status and status != "All":
        query = query.filter(Order.status == status)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.outerjoin(Vendor, Vendor.id == Order.vendor_id).filter(
            or_(
                Order.product_name.ilike(term),
                Vendor.vendor_name.ilike(term),
                Order.source_order_id.ilike(term)
            )
        )

    return (
        query.order_by(Order.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


# ==========================================
# GET TOTAL ORDER COUNT
# ==========================================

@router.get("/count")
def get_order_count(
    status: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    query = db.query(Order)

    if status and status != "All":
        query = query.filter(Order.status == status)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.outerjoin(Vendor, Vendor.id == Order.vendor_id).filter(
            or_(
                Order.product_name.ilike(term),
                Vendor.vendor_name.ilike(term),
                Order.source_order_id.ilike(term)
            )
        )

    return {"count": query.count()}


# ==========================================
# GET TOTAL ORDER REVENUE
# ==========================================

@router.get("/revenue")
def get_total_revenue(
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    total = (
        db.query(Order)
        .with_entities(
            func.sum(Order.amount)
        )
        .scalar()
    )


    return {
        "revenue": total or 0
    }


# ==========================================
# GET PENDING ORDER COUNT
# ==========================================

@router.get("/pending/count")
def get_pending_order_count(
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    count = (
        db.query(Order)
        .filter(
            Order.status == "Pending"
        )
        .count()
    )


    return {
        "count": count
    }


# ==========================================
# GET ORDER STATUS SUMMARY
# IMPORTANT:
# This route MUST appear before /{order_id}
# ==========================================

@router.get("/status-summary")
def get_order_status_summary(
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    statuses = [
        "Pending",
        "Approved",
        "Ordered",
        "Delivered",
        "Completed",
        "Cancelled"
    ]


    result = {}


    for status in statuses:

        count = (
            db.query(Order)
            .filter(
                Order.status == status
            )
            .count()
        )


        result[status] = count


    return result


# ==========================================
# CREATE ORDER
# ==========================================

@router.post(
    "/",
    response_model=OrderResponse
)
def create_order(
    data: dict,

    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER
        )
    )
):

    required_fields = [
        "vendor_id",
        "product_name",
        "quantity",
        "amount"
    ]


    for field in required_fields:

        if field not in data:

            raise HTTPException(
                status_code=400,
                detail=(
                    f"Missing required field: {field}"
                )
            )


    # ======================================
    # VALIDATE QUANTITY
    # ======================================

    if data["quantity"] <= 0:

        raise HTTPException(
            status_code=400,
            detail=(
                "Quantity must be greater than 0"
            )
        )


    # ======================================
    # VALIDATE AMOUNT
    # ======================================

    if data["amount"] < 0:

        raise HTTPException(
            status_code=400,
            detail=(
                "Amount cannot be negative"
            )
        )


    # ======================================
    # DELIVERY DATE
    # ======================================

    expected_delivery_date = None


    if data.get(
        "expected_delivery_date"
    ):

        try:

            expected_delivery_date = (
                date.fromisoformat(
                    data["expected_delivery_date"]
                )
            )

        except ValueError:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid expected_delivery_date. "
                    "Use YYYY-MM-DD format."
                )
            )


    # ======================================
    # CREATE ORDER
    # ======================================

    order = Order(

        vendor_id=data["vendor_id"],

        product_name=data["product_name"],

        quantity=data["quantity"],

        amount=data["amount"],

        status=data.get(
            "status",
            "Pending"
        ),

        expected_delivery_date=
            expected_delivery_date

    )


    db.add(order)

    db.commit()

    db.refresh(order)


    # ======================================
    # CHECK DELIVERY DELAY
    # ======================================

    check_delivery_delay(
        order,
        db
    )


    return order


# ==========================================
# CREATE ORDER FROM APPROVED PROCUREMENT
# ==========================================

@router.post(
    "/from-procurement/{request_id}"
)
def create_order_from_procurement(
    request_id: int,

    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER
        )
    )
):

    # ======================================
    # FIND PROCUREMENT REQUEST
    # ======================================

    request = (
        db.query(ProcurementRequest)
        .filter(
            ProcurementRequest.id == request_id
        )
        .first()
    )


    if not request:

        raise HTTPException(
            status_code=404,
            detail=(
                "Procurement request not found"
            )
        )


    # ======================================
    # CHECK APPROVAL
    # ======================================

    if request.status != "Approved":

        raise HTTPException(
            status_code=400,
            detail=(
                "Only approved procurement "
                "requests can create orders"
            )
        )


    # ======================================
    # CREATE ORDER
    # ======================================

    order = Order(

        vendor_id=request.vendor_id,

        product_name=request.product_name,

        quantity=request.quantity,

        amount=request.estimated_amount,

        status="Ordered"

    )


    db.add(order)


    # ======================================
    # UPDATE PROCUREMENT STATUS
    # ======================================

    request.status = "Ordered"


    db.commit()

    db.refresh(order)


    return order


# ==========================================
# UPDATE ORDER STATUS
# ==========================================

@router.put(
    "/{order_id}/status"
)
def update_order_status(
    order_id: int,

    data: dict,

    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER
        )
    )
):

    order = (
        db.query(Order)
        .filter(
            Order.id == order_id
        )
        .first()
    )


    if not order:

        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )


    if "status" not in data:

        raise HTTPException(
            status_code=400,
            detail="Status is required"
        )


    new_status = data["status"]


    allowed_statuses = [
        "Pending",
        "Approved",
        "Ordered",
        "Delivered",
        "Completed",
        "Cancelled"
    ]


    if new_status not in allowed_statuses:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid status. "
                "Allowed statuses: "
                + ", ".join(allowed_statuses)
            )
        )


    order.status = new_status


    db.commit()

    db.refresh(order)


    # ======================================
    # CHECK DELIVERY DELAY
    # ======================================

    check_delivery_delay(
        order,
        db
    )


    return order


# ==========================================
# UPDATE ORDER
# ==========================================

@router.put(
    "/{order_id}"
)
def update_order(
    order_id: int,

    data: dict,

    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER
        )
    )
):

    order = (
        db.query(Order)
        .filter(
            Order.id == order_id
        )
        .first()
    )


    if not order:

        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )


    # ======================================
    # VALIDATE QUANTITY
    # ======================================

    if "quantity" in data:

        if data["quantity"] <= 0:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Quantity must be greater than 0"
                )
            )


    # ======================================
    # VALIDATE AMOUNT
    # ======================================

    if "amount" in data:

        if data["amount"] < 0:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Amount cannot be negative"
                )
            )


    # ======================================
    # DELIVERY DATE
    # ======================================

    if "expected_delivery_date" in data:

        if data["expected_delivery_date"]:

            try:

                order.expected_delivery_date = (
                    date.fromisoformat(
                        data["expected_delivery_date"]
                    )
                )

            except ValueError:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Invalid expected_delivery_date. "
                        "Use YYYY-MM-DD format."
                    )
                )

        else:

            order.expected_delivery_date = None


    # ======================================
    # UPDATE ORDER FIELDS
    # ======================================

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


    # ======================================
    # CHECK DELIVERY DELAY
    # ======================================

    check_delivery_delay(
        order,
        db
    )


    return order


# ==========================================
# DELETE ORDER
# ==========================================

@router.delete(
    "/{order_id}"
)
def delete_order(
    order_id: int,

    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR
        )
    )
):

    order = (
        db.query(Order)
        .filter(
            Order.id == order_id
        )
        .first()
    )


    if not order:

        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )


    db.delete(order)

    db.commit()


    return {
        "message":
            "Order deleted successfully"
    }