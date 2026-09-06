import math

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.services.authorization import require_roles
from app.database import get_db
from app.schemas.purchase_order import (
    PurchaseOrderCreate,
    PurchaseOrderUpdate,
    PurchaseOrderResponse,
    PurchaseOrderPaginatedResponse,
)
from app.services.audit_log_service import create_audit_log
from app.services.purchase_order_service import (
    get_all_purchase_orders,
    get_purchase_order_by_id,
    create_purchase_order,
    update_purchase_order,
    delete_purchase_order,
)


router = APIRouter(
    prefix="/purchase-orders",
    tags=["Purchase Orders"],
)


def purchase_order_audit_values(po):
    return {
        "po_number": po.po_number,
        "vendor_id": po.vendor_id,
        "product_id": po.product_id,
        "amount": (
            float(po.amount)
            if po.amount is not None
            else None
        ),
        "status": po.status,
        "order_date": (
            str(po.order_date)
            if po.order_date
            else None
        ),
        "delivery_date": (
            str(po.delivery_date)
            if po.delivery_date
            else None
        ),
        "description": po.description,
    }


@router.get(
    "",
    response_model=PurchaseOrderPaginatedResponse,
)
def read_purchase_orders(
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Procurement Manager",
            "Supply Chain Manager",
            "Vendor",
            "Finance Officer",
            "Auditor",
        )
    ),
):
    if page < 1:
        raise HTTPException(
            status_code=400,
            detail="Page must be greater than 0",
        )

    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=400,
            detail="Limit must be between 1 and 100",
        )

    items, total = get_all_purchase_orders(
        db,
        page,
        limit,
    )

    total_pages = (
        math.ceil(total / limit)
        if total
        else 1
    )

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }


@router.get(
    "/{po_id}",
    response_model=PurchaseOrderResponse,
)
def read_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Procurement Manager",
            "Supply Chain Manager",
            "Vendor",
            "Finance Officer",
            "Auditor",
        )
    ),
):
    purchase_order = get_purchase_order_by_id(
        db,
        po_id,
    )

    if not purchase_order:
        raise HTTPException(
            status_code=404,
            detail="Purchase Order not found",
        )

    return purchase_order


@router.post(
    "",
    response_model=PurchaseOrderResponse,
    status_code=201,
)
def add_purchase_order(
    purchase_order_data: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Procurement Manager",
        )
    ),
):
    po = create_purchase_order(
        db,
        purchase_order_data,
    )

    create_audit_log(
        db=db,
        user=current_user,
        action="CREATE",
        module="Purchase Orders",
        entity_type="PurchaseOrder",
        entity_id=po.id,
        description=(
            f"Purchase Order '{po.po_number}' "
            f"was created."
        ),
        new_values=purchase_order_audit_values(po),
    )

    db.commit()
    db.refresh(po)

    return po


@router.put(
    "/{po_id}",
    response_model=PurchaseOrderResponse,
)
def edit_purchase_order(
    po_id: int,
    purchase_order_data: PurchaseOrderUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Procurement Manager",
            "Supply Chain Manager",
        )
    ),
):
    existing_po = get_purchase_order_by_id(
        db,
        po_id,
    )

    if not existing_po:
        raise HTTPException(
            status_code=404,
            detail="Purchase Order not found",
        )

    old_values = purchase_order_audit_values(
        existing_po
    )

    old_status = existing_po.status

    updated_po = update_purchase_order(
        db,
        po_id,
        purchase_order_data,
    )

    if not updated_po:
        raise HTTPException(
            status_code=404,
            detail="Purchase Order not found",
        )

    new_values = purchase_order_audit_values(
        updated_po
    )

    new_status = updated_po.status

    create_audit_log(
        db=db,
        user=current_user,
        action="UPDATE",
        module="Purchase Orders",
        entity_type="PurchaseOrder",
        entity_id=updated_po.id,
        description=(
            f"Purchase Order '{updated_po.po_number}' "
            f"was updated."
        ),
        old_values=old_values,
        new_values=new_values,
    )

    if old_status != new_status:
        create_audit_log(
            db=db,
            user=current_user,
            action="STATUS_CHANGE",
            module="Purchase Orders",
            entity_type="PurchaseOrder",
            entity_id=updated_po.id,
            description=(
                f"Purchase Order "
                f"'{updated_po.po_number}' status "
                f"changed from '{old_status}' "
                f"to '{new_status}'."
            ),
            old_values={
                "status": old_status,
            },
            new_values={
                "status": new_status,
            },
        )

    db.commit()
    db.refresh(updated_po)

    return updated_po


@router.delete(
    "/{po_id}",
)
def remove_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Procurement Manager",
        )
    ),
):
    po = get_purchase_order_by_id(
        db,
        po_id,
    )

    if not po:
        raise HTTPException(
            status_code=404,
            detail="Purchase Order not found",
        )

    old_values = purchase_order_audit_values(po)

    deleted = delete_purchase_order(
        db,
        po_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Purchase Order not found",
        )

    create_audit_log(
        db=db,
        user=current_user,
        action="DELETE",
        module="Purchase Orders",
        entity_type="PurchaseOrder",
        entity_id=po_id,
        description=(
            f"Purchase Order "
            f"'{old_values['po_number']}' "
            f"was deleted."
        ),
        old_values=old_values,
    )

    db.commit()

    return deleted