import uuid
import datetime as dt
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth import get_current_user, require_roles
from models import RoleEnum

def create_audit_log(
    db: Session,
    current_user: models.User,
    action: str,
    module: str,
    details: str,
    record_id: Optional[int] = None,
):
    log = models.AuditLog(
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_role=current_user.role.value,
        action=action,
        module=module,
        details=details,
        record_id=record_id,
    )

    db.add(log)


router = APIRouter(
    prefix="/api/procurement",
    tags=["Procurement & Purchase Orders"]
)


MANAGE_ROLES = (
    RoleEnum.ADMIN,
    RoleEnum.PROCUREMENT_MANAGER,
    RoleEnum.SUPPLY_CHAIN_MANAGER,
)


REQUEST_MANAGE_ROLES = (
    RoleEnum.ADMIN,
    RoleEnum.PROCUREMENT_MANAGER,
    RoleEnum.SUPPLY_CHAIN_MANAGER,
)


# --------------------------------------------------
# NUMBER GENERATORS
# --------------------------------------------------

def _generate_po_number() -> str:
    return (
        f"PO-{dt.datetime.utcnow().strftime('%Y%m%d')}-"
        f"{uuid.uuid4().hex[:6].upper()}"
    )


def _generate_request_number() -> str:
    return (
        f"REQ-{dt.datetime.utcnow().strftime('%Y%m%d')}-"
        f"{uuid.uuid4().hex[:6].upper()}"
    )


# ==================================================
# PURCHASE ORDERS
# ==================================================

@router.get(
    "",
    response_model=List[schemas.PurchaseOrderOut]
)
def list_orders(
    status: Optional[models.ProcurementStatusEnum] = None,
    vendor_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.PurchaseOrder)

    if current_user.role == models.RoleEnum.VENDOR:
         if not current_user.vendor_id:
            return []

         query = query.filter(
            models.PurchaseOrder.vendor_id == current_user.vendor_id
        )

    if status:
        query = query.filter(
            models.PurchaseOrder.status == status
        )

    if vendor_id:
        query = query.filter(
            models.PurchaseOrder.vendor_id == vendor_id
        )

    return query.order_by(
        models.PurchaseOrder.order_date.desc()
    ).all()


@router.post(
    "",
    response_model=schemas.PurchaseOrderOut,
    status_code=201
)
def create_order(
    payload: schemas.PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles(*MANAGE_ROLES)
    ),
):
    vendor = (
        db.query(models.Vendor)
        .filter(models.Vendor.id == payload.vendor_id)
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )

    if vendor.status != models.VendorStatusEnum.APPROVED:
        raise HTTPException(
            status_code=400,
            detail="Purchase orders can only be raised for approved vendors"
        )

    po = models.PurchaseOrder(
        po_number=_generate_po_number(),
        vendor_id=payload.vendor_id,
        item_description=payload.item_description,
        quantity=payload.quantity,
        unit_price=payload.unit_price,
        total_amount=round(
            payload.quantity * payload.unit_price,
            2
        ),
        requested_by=(
            payload.requested_by
            or current_user.full_name
        ),
        expected_delivery=payload.expected_delivery,
    )

    db.add(po)

    db.commit()
    db.refresh(po)

    create_audit_log(
        db=db,
        current_user=current_user,
        action="CREATE",
        module="Purchase Order",
        details=(
            f"Created PO {po.po_number} for "
            f"{vendor.name}, amount ₹{po.total_amount}"
        ),
        record_id=po.id,
    )

    db.commit()

    return po

@router.put(
    "/{po_id}",
    response_model=schemas.PurchaseOrderOut
)
def update_order(
    po_id: int,
    payload: schemas.PurchaseOrderUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    po = (
        db.query(models.PurchaseOrder)
        .filter(models.PurchaseOrder.id == po_id)
        .first()
    )

    if not po:
        raise HTTPException(
            status_code=404,
            detail="Purchase order not found"
        )

    # --------------------------------------------------
    # COMPLETED / CANCELLED ORDERS
    # --------------------------------------------------

    if po.status in (
        models.ProcurementStatusEnum.COMPLETED,
        models.ProcurementStatusEnum.CANCELLED,
    ):
        raise HTTPException(
            status_code=400,
            detail="Completed or cancelled purchase orders cannot be modified"
        )

    # --------------------------------------------------
    # FINANCE OFFICER
    # --------------------------------------------------

    if current_user.role == RoleEnum.FINANCE_OFFICER:

        allowed_fields = {
            "invoice_number",
            "invoice_paid",
        }

        submitted_fields = set(
            payload.dict(exclude_unset=True).keys()
        )

        if not submitted_fields.issubset(allowed_fields):
            raise HTTPException(
                status_code=403,
                detail=(
                    "Finance Officer can only update "
                    "invoice information."
                )
            )

        for field, value in payload.dict(
            exclude_unset=True
        ).items():
            setattr(po, field, value)

        db.commit()
        db.refresh(po)

        create_audit_log(
            db=db,
            current_user=current_user,
            action="UPDATE",
            module="Purchase Order",
            details=(
                f"Updated invoice information for "
                f"PO {po.po_number}"
            ),
            record_id=po.id,
        )

        db.commit()

        return po

    # --------------------------------------------------
    # ADMINISTRATOR
    # PROCUREMENT MANAGER
    # --------------------------------------------------

    if current_user.role in (
        RoleEnum.ADMIN,
        RoleEnum.PROCUREMENT_MANAGER,
    ):

        previous_status = po.status

        updated_fields = list(
            payload.dict(exclude_unset=True).keys()
        )

        for field, value in payload.dict(
            exclude_unset=True
        ).items():
            setattr(po, field, value)

        db.commit()
        db.refresh(po)

        create_audit_log(
            db=db,
            current_user=current_user,
            action="UPDATE",
            module="Purchase Order",
            details=(
                f"Updated PO {po.po_number}. "
                f"Changed fields: {', '.join(updated_fields)}"
            ),
            record_id=po.id,
        )

        db.commit()

        # Delivery notification
        if (
            payload.status
            == models.ProcurementStatusEnum.DELIVERED
            and previous_status
            != models.ProcurementStatusEnum.DELIVERED
        ):

            if not po.actual_delivery:
                po.actual_delivery = dt.datetime.utcnow()

            is_delayed = bool(
                po.expected_delivery
                and po.actual_delivery
                > po.expected_delivery
            )

            notif = models.Notification(
                vendor_id=po.vendor_id,
                title=(
                    "Delivery Delay"
                    if is_delayed
                    else "Delivery Completed"
                ),
                message=(
                    f"PO {po.po_number} was delivered "
                    f"{'late' if is_delayed else 'on time'}."
                ),
                category=(
                    "Delivery Delay Notifications"
                    if is_delayed
                    else "Procurement Alerts"
                ),
            )

            db.add(notif)
            db.commit()
            db.refresh(po)

        return po

    # --------------------------------------------------
    # SUPPLY CHAIN MANAGER
    # --------------------------------------------------

    if current_user.role == RoleEnum.SUPPLY_CHAIN_MANAGER:

        submitted_fields = payload.dict(
            exclude_unset=True
        )

        if set(submitted_fields.keys()) != {"status"}:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Supply Chain Manager can only "
                    "update delivery status."
                )
            )

        if (
            po.status
            != models.ProcurementStatusEnum.ORDERED
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Only Ordered purchase orders "
                    "can be marked as Delivered."
                )
            )

        if (
            payload.status
            != models.ProcurementStatusEnum.DELIVERED
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Supply Chain Manager can only "
                    "mark an order as Delivered."
                )
            )

        po.status = (
            models.ProcurementStatusEnum.DELIVERED
        )

        if not po.actual_delivery:
            po.actual_delivery = dt.datetime.utcnow()

        is_delayed = bool(
            po.expected_delivery
            and po.actual_delivery
            > po.expected_delivery
        )

        notif = models.Notification(
            vendor_id=po.vendor_id,
            title=(
                "Delivery Delay"
                if is_delayed
                else "Delivery Completed"
            ),
            message=(
                f"PO {po.po_number} was delivered "
                f"{'late' if is_delayed else 'on time'}."
            ),
            category=(
                "Delivery Delay Notifications"
                if is_delayed
                else "Procurement Alerts"
            ),
        )

        db.add(notif)

        db.commit()
        db.refresh(po)

        create_audit_log(
            db=db,
            current_user=current_user,
            action="UPDATE",
            module="Purchase Order",
            details=(
                f"Marked PO {po.po_number} as Delivered. "
                f"Delivery was "
                f"{'late' if is_delayed else 'on time'}."
            ),
            record_id=po.id,
        )

        db.commit()

        return po

    # --------------------------------------------------
    # OTHER ROLES
    # --------------------------------------------------

    raise HTTPException(
        status_code=403,
        detail="You do not have permission to update this purchase order."
    )


@router.delete(
    "/{po_id}",
    status_code=204
)
def cancel_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles(*MANAGE_ROLES)
    ),
):
    po = (
        db.query(models.PurchaseOrder)
        .filter(models.PurchaseOrder.id == po_id)
        .first()
    )

    if not po:
        raise HTTPException(
            status_code=404,
            detail="Purchase order not found"
        )

    po.status = models.ProcurementStatusEnum.CANCELLED

    db.commit()

    create_audit_log(
        db=db,
        current_user=current_user,
        action="CANCEL",
        module="Purchase Order",
        details=(
            f"Cancelled PO {po.po_number}"
        ),
        record_id=po.id,
    )

    db.commit()

    return None

# ==================================================
# PROCUREMENT REQUESTS
# ==================================================

@router.get(
    "/po/{po_id}",
    response_model=schemas.PurchaseOrderOut
)
def get_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    po = (
        db.query(models.PurchaseOrder)
        .filter(models.PurchaseOrder.id == po_id)
        .first()
    )

    if not po:
        raise HTTPException(
            status_code=404,
            detail="Purchase order not found"
        )

    # Vendors can only view their own purchase orders
    if current_user.role == models.RoleEnum.VENDOR:
        if (
            not current_user.vendor_id
            or po.vendor_id != current_user.vendor_id
        ):
            raise HTTPException(
                status_code=403,
                detail="You can only view your own purchase orders."
            )

    return po

@router.post(
    "/requests",
    response_model=schemas.ProcurementRequestOut,
    status_code=201
)
def create_request(
    payload: schemas.ProcurementRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if payload.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than 0"
        )

    request = models.ProcurementRequest(
        request_number=_generate_request_number(),
        item_description=payload.item_description,
        quantity=payload.quantity,
        requested_by=current_user.full_name,
        priority=payload.priority,
        status=models.ProcurementRequestStatusEnum.PENDING,
    )

    db.add(request)
    db.commit()
    db.refresh(request)

    create_audit_log(
        db=db,
        current_user=current_user,
        action="CREATE",
        module="Procurement Request",
        details=(
            f"Created procurement request "
            f"{request.request_number} for "
            f"{request.item_description}, quantity {request.quantity}"
        ),
        record_id=request.id,
    )

    db.commit()

    return request

@router.get(
    "/requests",
    response_model=List[schemas.ProcurementRequestOut]
)
def list_requests(
    status: Optional[
        models.ProcurementRequestStatusEnum
    ] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.ProcurementRequest)

    # Vendor can only see requests assigned to its own vendor/company
    if current_user.role == models.RoleEnum.VENDOR:
        if not current_user.vendor_id:
            return []

        query = query.filter(
            models.ProcurementRequest.vendor_id == current_user.vendor_id
        )

    if status:
        query = query.filter(
            models.ProcurementRequest.status == status
        )

    return query.order_by(
        models.ProcurementRequest.created_at.desc()
    ).all()

@router.put(
    "/requests/{request_id}",
    response_model=schemas.ProcurementRequestOut
)
def update_request(
    request_id: int,
    payload: schemas.ProcurementRequestUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles(*REQUEST_MANAGE_ROLES)
    ),
):
    request = (
        db.query(models.ProcurementRequest)
        .filter(
            models.ProcurementRequest.id == request_id
        )
        .first()
    )

    if not request:
        raise HTTPException(
            status_code=404,
            detail="Procurement request not found"
        )

    # --------------------------------------------------
    # REQUEST STATUS MANAGEMENT
    # --------------------------------------------------

    if payload.status:

        # PO Created requests are locked
        if (
            request.status
            == models.ProcurementRequestStatusEnum.PO_CREATED
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Purchase order has already been "
                    "created for this request"
                )
            )

        # Rejected requests cannot be changed
        if (
            request.status
            == models.ProcurementRequestStatusEnum.REJECTED
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Rejected procurement requests "
                    "cannot be modified"
                )
            )

        # Approve request
        if (
            payload.status
            == models.ProcurementRequestStatusEnum.APPROVED
        ):
            request.status = (
                models.ProcurementRequestStatusEnum.APPROVED
            )

        # Reject request
        elif (
            payload.status
            == models.ProcurementRequestStatusEnum.REJECTED
        ):
            request.status = (
                models.ProcurementRequestStatusEnum.REJECTED
            )

        # Cannot go back to Pending
        elif (
            payload.status
            == models.ProcurementRequestStatusEnum.PENDING
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "A procurement request cannot be "
                    "moved back to Pending"
                )
            )

        # PO Created cannot be manually selected
        elif (
            payload.status
            == models.ProcurementRequestStatusEnum.PO_CREATED
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "PO Created status is set automatically "
                    "when a purchase order is created"
                )
            )

        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid procurement request status"
            )

    # --------------------------------------------------
    # ASSIGN VENDOR
    # --------------------------------------------------

    if payload.vendor_id is not None:

        # Cannot assign vendor after PO creation
        if (
            request.status
            == models.ProcurementRequestStatusEnum.PO_CREATED
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Vendor cannot be changed after "
                    "the purchase order is created"
                )
            )

        # Rejected requests cannot receive vendors
        if (
            request.status
            == models.ProcurementRequestStatusEnum.REJECTED
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "A vendor cannot be assigned to "
                    "a rejected procurement request"
                )
            )

        vendor = (
            db.query(models.Vendor)
            .filter(
                models.Vendor.id == payload.vendor_id
            )
            .first()
        )

        if not vendor:
            raise HTTPException(
                status_code=404,
                detail="Vendor not found"
            )

        if vendor.status != models.VendorStatusEnum.APPROVED:
            raise HTTPException(
                status_code=400,
                detail="Only approved vendors can be assigned"
            )

        request.vendor_id = payload.vendor_id

    # --------------------------------------------------
    # SAVE REQUEST + AUDIT LOG
    # --------------------------------------------------

    updated_fields = []

    if payload.status is not None:
        updated_fields.append("status")

    if payload.vendor_id is not None:
        updated_fields.append("vendor_id")

    db.commit()
    db.refresh(request)

    create_audit_log(
        db=db,
        current_user=current_user,
        action="UPDATE",
        module="Procurement Request",
        details=(
            f"Updated procurement request "
            f"{request.request_number}. "
            f"Changed fields: {', '.join(updated_fields)}"
        ),
        record_id=request.id,
    )

    db.commit()

    return request


# ==================================================
# CREATE PO FROM PROCUREMENT REQUEST
# ==================================================

@router.post(
    "/requests/{request_id}/create-po",
    response_model=schemas.PurchaseOrderOut,
    status_code=201
)
def create_po_from_request(
    request_id: int,
    unit_price: float,
    expected_delivery: Optional[dt.datetime] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles(*REQUEST_MANAGE_ROLES)
    ),
):
    request = (
        db.query(models.ProcurementRequest)
        .filter(
            models.ProcurementRequest.id == request_id
        )
        .first()
    )

    if not request:
        raise HTTPException(
            status_code=404,
            detail="Procurement request not found"
        )

    # Must be approved
    if (
        request.status
        != models.ProcurementRequestStatusEnum.APPROVED
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Only approved procurement requests "
                "can create purchase orders"
            )
        )

    # Vendor required
    if not request.vendor_id:
        raise HTTPException(
            status_code=400,
            detail=(
                "Please assign an approved vendor before "
                "creating the purchase order"
            )
        )

    # Price validation
    if unit_price < 0:
        raise HTTPException(
            status_code=400,
            detail="Unit price cannot be negative"
        )

    vendor = (
        db.query(models.Vendor)
        .filter(
            models.Vendor.id == request.vendor_id
        )
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )

    if vendor.status != models.VendorStatusEnum.APPROVED:
        raise HTTPException(
            status_code=400,
            detail=(
                "Purchase orders can only be created "
                "for approved vendors"
            )
        )

    # Create PO
    po = models.PurchaseOrder(
        po_number=_generate_po_number(),
        vendor_id=request.vendor_id,
        item_description=request.item_description,
        quantity=request.quantity,
        unit_price=unit_price,
        total_amount=round(
            request.quantity * unit_price,
            2
        ),
        requested_by=request.requested_by,
        expected_delivery=expected_delivery,
        status=models.ProcurementStatusEnum.APPROVED,
    )

    db.add(po)

    # Automatically mark request as PO Created
    request.status = (
        models.ProcurementRequestStatusEnum.PO_CREATED
    )

    db.commit()
    db.refresh(po)

    # --------------------------------------------------
    # AUDIT LOG
    # --------------------------------------------------

    create_audit_log(
        db=db,
        current_user=current_user,
        action="CREATE",
        module="Purchase Order",
        details=(
            f"Created PO {po.po_number} from procurement "
            f"request {request.request_number}. "
            f"Vendor: {vendor.name}, "
            f"Amount: ₹{po.total_amount}"
        ),
        record_id=po.id,
    )

    db.commit()

    return po

# ==================================================
# PROCUREMENT COST ANALYSIS
# ==================================================

@router.get("/cost-analysis")
def procurement_cost_analysis(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles(
            RoleEnum.ADMIN,
            RoleEnum.PROCUREMENT_MANAGER
        )
    ),
):
    orders = (
        db.query(models.PurchaseOrder)
        .filter(
            models.PurchaseOrder.status
            != models.ProcurementStatusEnum.CANCELLED
        )
        .all()
    )

    total_spend = sum(
        (po.total_amount or 0)
        for po in orders
    )

    # Spending by vendor
    vendor_spend = {}

    for po in orders:
        vendor_name = (
            po.vendor.name
            if po.vendor
            else "Unknown Vendor"
        )

        vendor_spend[vendor_name] = (
            vendor_spend.get(vendor_name, 0)
            + (po.total_amount or 0)
        )

    vendor_spend_list = [
        {
            "vendor": vendor,
            "amount": round(amount, 2)
        }
        for vendor, amount in vendor_spend.items()
    ]

    vendor_spend_list.sort(
        key=lambda x: x["amount"],
        reverse=True
    )

    # Spending by month
    monthly_spend = {}

    for po in orders:
        if not po.order_date:
            continue

        month = po.order_date.strftime("%Y-%m")

        monthly_spend[month] = (
            monthly_spend.get(month, 0)
            + (po.total_amount or 0)
        )

    monthly_spend_list = [
        {
            "month": month,
            "amount": round(amount, 2)
        }
        for month, amount in sorted(
            monthly_spend.items()
        )
    ]

    return {
        "total_spend": round(total_spend, 2),
        "order_count": len(orders),
        "vendor_spend": vendor_spend_list,
        "monthly_spend": monthly_spend_list,
    }