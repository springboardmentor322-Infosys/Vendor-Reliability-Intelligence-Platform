from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import Role, User
from app.models.vendor import Vendor
from app.models.vendoriq import (
    DeliveryDocument,
    POItem,
    ProcurementRequest,
    ProcurementRequestStatus,
    PurchaseOrder,
    PurchaseOrderStatus,
)
from app.schemas.purchase_order import (
    DeliveryDocumentResponse,
    POItemResponse,
    PurchaseOrderCreate,
    PurchaseOrderListResponse,
    PurchaseOrderResponse,
    PurchaseOrderStatusUpdate,
    PM_ALLOWED_STATUSES,
    VENDOR_ALLOWED_STATUSES,
)
from app.services.audit import format_status_change_description, record_audit_log
from app.services.po_documents import ensure_po_upload_dir, save_po_document

router = APIRouter(prefix="/purchase-orders", tags=["purchase-orders"])


def _generate_po_number(db: Session) -> str:
    """Generate a unique PO number based on timestamp and sequence."""
    # Get the count of POs today to create a sequence
    today = datetime.now(timezone.utc).date()
    count = db.scalar(
        select(PurchaseOrder.id).where(
            PurchaseOrder.order_date >= datetime.combine(today, datetime.min.time())
        )
    )
    seq = (count or 0) + 1
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"PO-{timestamp}-{seq:04d}"


def _get_po_or_404(po_id: int, db: Session, *, with_items: bool = False) -> PurchaseOrder:
    options = [selectinload(PurchaseOrder.vendor)]
    if with_items:
        options.extend([
            selectinload(PurchaseOrder.items),
            selectinload(PurchaseOrder.documents),
        ])

    po = db.scalar(
        select(PurchaseOrder)
        .options(*options)
        .where(PurchaseOrder.id == po_id)
    )
    if po is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found",
        )
    return po


def _ensure_vendor_can_modify(po: PurchaseOrder, user: User) -> None:
    """Ensure Vendor can only modify their own assigned POs."""
    if user.role == Role.VENDOR:
        vendor = po.vendor
        vendor_owner_id = vendor.user_id if vendor.user_id else vendor.created_by
        if vendor_owner_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only modify purchase orders assigned to your vendor profile",
            )


def _validate_status_transition(current: str, new: str, user: User) -> None:
    """Validate status change based on user role and current status."""
    # Terminal states cannot be changed
    if current in {"Completed", "Cancelled"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot change status from '{current}' — order is finalized",
        )

    if user.role == Role.VENDOR:
        if new not in VENDOR_ALLOWED_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Vendors can only set status to: {', '.join(sorted(VENDOR_ALLOWED_STATUSES))}",
            )
    elif user.role == Role.PROCUREMENT_MANAGER:
        if new not in PM_ALLOWED_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Procurement Managers can only set status to: {', '.join(sorted(PM_ALLOWED_STATUSES))}",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Vendors and Procurement Managers can update PO status",
        )


# ---------------------------------------------------------------------------
# POST /purchase-orders — Create PO from approved Procurement Request
# ---------------------------------------------------------------------------
@router.post("", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    payload: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
) -> PurchaseOrder:
    """Create a Purchase Order from an approved Procurement Request.

    Only Procurement Managers can create POs.
    Line items are copied from the procurement request.
    """
    if current_user.role != Role.PROCUREMENT_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Procurement Managers can create purchase orders",
        )

    # Verify procurement request exists and is approved
    pr = db.scalar(
        select(ProcurementRequest)
        .options(selectinload(ProcurementRequest.items))
        .where(ProcurementRequest.id == payload.procurement_request_id)
    )
    if pr is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Procurement request not found",
        )
    if pr.status != ProcurementRequestStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Procurement request must be approved (current status: {pr.status.value})",
        )

    # Verify vendor exists and is approved
    vendor = db.scalar(select(Vendor).where(Vendor.id == payload.vendor_id))
    if vendor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found",
        )
    if vendor.status.value != "Approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vendor must be approved (current status: {vendor.status.value})",
        )

    # Create PO
    po_number = _generate_po_number(db)
    total_amount = sum(
        Decimal(str(item.quantity)) * Decimal(str(item.estimated_unit_cost))
        for item in pr.items
    )

    po = PurchaseOrder(
        po_number=po_number,
        procurement_request_id=pr.id,
        vendor_id=vendor.id,
        order_date=datetime.now(timezone.utc),
        expected_delivery_date=payload.expected_delivery_date,
        total_amount=total_amount,
        status=PurchaseOrderStatus.PENDING,
        notes=payload.notes,
        created_by=current_user.id,
    )

    # Copy line items from procurement request
    po.items = [
        POItem(
            item_name=item.item_name,
            quantity=item.quantity,
            unit_price=Decimal(str(item.estimated_unit_cost)),
        )
        for item in pr.items
    ]

    db.add(po)
    db.commit()
    db.refresh(po)

    # Update PR status to Ordered
    pr.status = ProcurementRequestStatus.ORDERED
    db.commit()

    # Reload with relationships
    return _get_po_or_404(po.id, db, with_items=True)


# ---------------------------------------------------------------------------
# GET /purchase-orders — List POs with optional filters
# ---------------------------------------------------------------------------
@router.get("", response_model=list[PurchaseOrderListResponse])
def list_purchase_orders(
    vendor_id: int | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PurchaseOrder]:
    """List purchase orders with optional filters.

    Vendors can only see their own POs.
    Other roles can see all POs.
    """
    query = select(PurchaseOrder).order_by(PurchaseOrder.id.desc())

    # Vendors can only see their own POs
    if current_user.role == Role.VENDOR:
        vendor = db.scalar(
            select(Vendor).where(
                (Vendor.user_id == current_user.id) | (Vendor.created_by == current_user.id)
            )
        )
        if vendor:
            query = query.where(PurchaseOrder.vendor_id == vendor.id)
        else:
            return []

    if vendor_id is not None:
        query = query.where(PurchaseOrder.vendor_id == vendor_id)

    if status_filter:
        query = query.where(PurchaseOrder.status == status_filter)

    return list(db.scalars(query))


# ---------------------------------------------------------------------------
# GET /purchase-orders/{id} — Get PO detail
# ---------------------------------------------------------------------------
@router.get("/{po_id}", response_model=PurchaseOrderResponse)
def get_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PurchaseOrder:
    """Get a purchase order with its line items and documents."""
    po = _get_po_or_404(po_id, db, with_items=True)

    # Vendors can only see their own POs
    if current_user.role == Role.VENDOR:
        _ensure_vendor_can_modify(po, current_user)

    return po


# ---------------------------------------------------------------------------
# PUT /purchase-orders/{id}/status — Update PO status
# ---------------------------------------------------------------------------
@router.put("/{po_id}/status", response_model=PurchaseOrderResponse)
def update_purchase_order_status(
    po_id: int,
    payload: PurchaseOrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PurchaseOrder:
    """Update purchase order status.

    Role-based restrictions:
    - Vendor: In Progress, Shipped, Partial Delivery, Delivered (own POs only)
    - Procurement Manager: Approved, Ordered, Completed, Cancelled (all POs)
    """
    po = _get_po_or_404(po_id, db, with_items=True)

    # Check role permissions
    if current_user.role not in {Role.VENDOR, Role.PROCUREMENT_MANAGER}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Vendors and Procurement Managers can update PO status",
        )

    # Vendors can only modify their own POs
    if current_user.role == Role.VENDOR:
        _ensure_vendor_can_modify(po, current_user)

    current_status = po.status.value if hasattr(po.status, "value") else po.status
    _validate_status_transition(current_status, payload.status, current_user)

    po.status = PurchaseOrderStatus(payload.status)
    if payload.notes is not None:
        po.notes = payload.notes

    record_audit_log(
        db,
        action_description=format_status_change_description(
            f"PO {po.po_number}",
            payload.status,
            current_user,
        ),
        performed_by=current_user.id,
        entity_type="purchase_order",
        entity_id=po.id,
    )

    db.commit()
    db.refresh(po)

    return _get_po_or_404(po.id, db, with_items=True)


# ---------------------------------------------------------------------------
# POST /purchase-orders/{id}/documents — Upload document
# ---------------------------------------------------------------------------
@router.post(
    "/{po_id}/documents",
    response_model=DeliveryDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_po_document(
    po_id: int,
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DeliveryDocument:
    """Upload a delivery document (Invoice, Receipt, or Proof of Delivery).

    Vendors can only upload for their own POs.
    Procurement Managers can upload for any PO.
    """
    po = _get_po_or_404(po_id, db)

    # Check permissions
    if current_user.role == Role.VENDOR:
        _ensure_vendor_can_modify(po, current_user)
    elif current_user.role != Role.PROCUREMENT_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Vendors (own POs) and Procurement Managers can upload documents",
        )

    # Validate doc type
    valid_types = {"Invoice", "Receipt", "Proof of Delivery"}
    if doc_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Document type must be one of: {', '.join(sorted(valid_types))}",
        )

    try:
        file_url = await save_po_document(po_id, file)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    document = DeliveryDocument(
        purchase_order_id=po_id,
        doc_type=doc_type,
        file_url=file_url,
        uploaded_by=current_user.id,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


# ---------------------------------------------------------------------------
# GET /purchase-orders/{id}/documents — List documents
# ---------------------------------------------------------------------------
@router.get("/{po_id}/documents", response_model=list[DeliveryDocumentResponse])
def list_po_documents(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DeliveryDocument]:
    """List all delivery documents for a purchase order."""
    po = _get_po_or_404(po_id, db)

    # Vendors can only see their own POs
    if current_user.role == Role.VENDOR:
        _ensure_vendor_can_modify(po, current_user)

    return list(
        db.scalars(
            select(DeliveryDocument)
            .where(DeliveryDocument.purchase_order_id == po_id)
            .order_by(DeliveryDocument.uploaded_at.desc())
        )
    )
