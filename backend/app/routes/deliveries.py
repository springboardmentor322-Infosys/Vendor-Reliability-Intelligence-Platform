from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.services.authorization import require_roles
from app.database import get_db

from app.schemas.delivery import (
    DeliveryCreate,
    DeliveryUpdate,
    DeliveryResponse,
)

from app.services.audit_log_service import create_audit_log

from app.services.delivery_service import (
    get_all_deliveries,
    get_delivery_by_id,
    create_delivery,
    update_delivery,
    delete_delivery,
)


router = APIRouter(
    prefix="/deliveries",
    tags=["Deliveries"],
)


# =========================================================
# RESPONSE HELPER
# =========================================================

def delivery_response(delivery):

    return {
        "id": delivery.id,

        "purchase_order_id":
            delivery.purchase_order_id,

        "vendor_id":
            delivery.vendor_id,

        "delivery_date":
            delivery.delivery_date,

        "expected_delivery_date":
            delivery.expected_delivery_date,

        "delay_days":
            delivery.delay_days,

        "delivery_status":
            delivery.delivery_status,

        "damaged_goods":
            delivery.damaged_goods,

        "delivery_notes":
            delivery.delivery_notes,

        "purchase_order_number": (
            delivery.purchase_order.po_number
            if delivery.purchase_order
            else None
        ),

        "vendor_name": (
            delivery.vendor.vendor_name
            if delivery.vendor
            else None
        ),
    }


# =========================================================
# AUDIT VALUES
# =========================================================

def delivery_audit_values(delivery):

    return {
        "purchase_order_id":
            delivery.purchase_order_id,

        "vendor_id":
            delivery.vendor_id,

        "delivery_date": (
            str(delivery.delivery_date)
            if delivery.delivery_date
            else None
        ),

        "expected_delivery_date": (
            str(delivery.expected_delivery_date)
            if delivery.expected_delivery_date
            else None
        ),

        "delay_days":
            delivery.delay_days,

        "delivery_status":
            delivery.delivery_status,

        "damaged_goods":
            delivery.damaged_goods,

        "delivery_notes":
            delivery.delivery_notes,
    }


# =========================================================
# GET ALL DELIVERIES
# =========================================================

@router.get("")
def read_deliveries(

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
            "Administrator",
            "Procurement Manager",
            "Supply Chain Manager",
            "Vendor",
            "Auditor",
        )
    ),

):

    result = get_all_deliveries(
        db,
        page,
        limit,
    )

    return {
        "items": [
            delivery_response(delivery)
            for delivery in result["items"]
        ],

        "total":
            result["total"],

        "page":
            result["page"],

        "limit":
            result["limit"],

        "total_pages":
            result["total_pages"],
    }


# =========================================================
# GET SINGLE DELIVERY
# =========================================================

@router.get(
    "/{delivery_id}",
    response_model=DeliveryResponse,
)
def read_delivery(

    delivery_id: int,

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            "Administrator",
            "Procurement Manager",
            "Supply Chain Manager",
            "Vendor",
            "Auditor",
        )
    ),

):

    delivery = get_delivery_by_id(
        db,
        delivery_id,
    )

    if not delivery:

        raise HTTPException(
            status_code=404,
            detail="Delivery not found",
        )

    return delivery_response(
        delivery
    )


# =========================================================
# CREATE DELIVERY
# =========================================================

@router.post(
    "",
    response_model=DeliveryResponse,
    status_code=201,
)
def add_delivery(

    delivery_data: DeliveryCreate,

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            "Administrator",
            "Procurement Manager",
            "Supply Chain Manager",
            "Vendor",
        )
    ),

):

    delivery = create_delivery(
        db,
        delivery_data,
    )

    create_audit_log(

        db=db,

        user=current_user,

        action="CREATE",

        module="Deliveries",

        entity_type="Delivery",

        entity_id=delivery.id,

        description=(
            f"Delivery for Purchase Order "
            f"#{delivery.purchase_order_id} "
            f"was created."
        ),

        new_values=
            delivery_audit_values(
                delivery
            ),
    )

    db.commit()

    db.refresh(
        delivery
    )

    return delivery_response(
        delivery
    )


# =========================================================
# UPDATE DELIVERY
# =========================================================

@router.put(
    "/{delivery_id}",
    response_model=DeliveryResponse,
)
def edit_delivery(

    delivery_id: int,

    delivery_data: DeliveryUpdate,

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            "Administrator",
            "Supply Chain Manager",
            "Vendor",
        )
    ),

):

    existing_delivery = get_delivery_by_id(
        db,
        delivery_id,
    )

    if not existing_delivery:

        raise HTTPException(
            status_code=404,
            detail="Delivery not found",
        )


    old_values = delivery_audit_values(
        existing_delivery
    )


    old_status = (
        existing_delivery.delivery_status
    )


    updated_delivery = update_delivery(
        db,
        delivery_id,
        delivery_data,
    )


    if not updated_delivery:

        raise HTTPException(
            status_code=404,
            detail="Delivery not found",
        )


    new_values = delivery_audit_values(
        updated_delivery
    )


    new_status = (
        updated_delivery.delivery_status
    )


    create_audit_log(

        db=db,

        user=current_user,

        action="UPDATE",

        module="Deliveries",

        entity_type="Delivery",

        entity_id=updated_delivery.id,

        description=(
            f"Delivery for Purchase Order "
            f"#{updated_delivery.purchase_order_id} "
            f"was updated."
        ),

        old_values=old_values,

        new_values=new_values,
    )


    # =====================================================
    # STATUS CHANGE AUDIT
    # =====================================================

    if old_status != new_status:

        create_audit_log(

            db=db,

            user=current_user,

            action="STATUS_CHANGE",

            module="Deliveries",

            entity_type="Delivery",

            entity_id=updated_delivery.id,

            description=(
                f"Delivery status changed "
                f"from '{old_status}' "
                f"to '{new_status}'."
            ),

            old_values={
                "delivery_status":
                    old_status,
            },

            new_values={
                "delivery_status":
                    new_status,
            },
        )


    db.commit()

    db.refresh(
        updated_delivery
    )

    return delivery_response(
        updated_delivery
    )


# =========================================================
# DELETE DELIVERY
# =========================================================

@router.delete(
    "/{delivery_id}",
)
def remove_delivery(

    delivery_id: int,

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            "Administrator",
            "Supply Chain Manager",
        )
    ),

):

    delivery = get_delivery_by_id(
        db,
        delivery_id,
    )

    if not delivery:

        raise HTTPException(
            status_code=404,
            detail="Delivery not found",
        )


    old_values = delivery_audit_values(
        delivery
    )


    deleted = delete_delivery(
        db,
        delivery_id,
    )


    if not deleted:

        raise HTTPException(
            status_code=404,
            detail="Delivery not found",
        )


    create_audit_log(

        db=db,

        user=current_user,

        action="DELETE",

        module="Deliveries",

        entity_type="Delivery",

        entity_id=delivery_id,

        description=(
            f"Delivery for Purchase Order "
            f"#{old_values['purchase_order_id']} "
            f"was deleted."
        ),

        old_values=old_values,
    )


    db.commit()

    return deleted