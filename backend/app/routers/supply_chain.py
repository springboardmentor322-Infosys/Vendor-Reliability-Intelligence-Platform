"""Supply chain APIs: products, deliveries, invoices, and quality inspections."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.supply_chain import Delivery, Invoice, Product, QualityInspection
from app.models.user import Role, User
from app.models.vendor import Vendor
from app.models.vendoriq import PurchaseOrder
from app.schemas.supply_chain import (
    DeliveryResponse,
    InvoiceCreate,
    InvoiceResponse,
    InvoiceStatusUpdate,
    InvoiceSummaryResponse,
    ProductResponse,
    QualityInspectionResponse,
)
from app.services.audit import format_status_change_description, record_audit_log
from app.services.invoices import (
    INVOICE_TRIGGER_STATUSES,
    VALID_INVOICE_STATUSES,
    apply_invoice_status,
    compute_invoice_summary,
    ensure_invoice_for_po,
    get_invoice_with_po,
    invoice_to_response,
    invoices_query,
)

products_router = APIRouter(prefix="/products", tags=["products"])
deliveries_router = APIRouter(prefix="/deliveries", tags=["deliveries"])
invoices_router = APIRouter(prefix="/invoices", tags=["invoices"])
quality_inspections_router = APIRouter(prefix="/quality-inspections", tags=["quality-inspections"])


def _get_vendor_for_user(user: User, db: Session) -> Vendor | None:
    if user.role != Role.VENDOR:
        return None
    return db.scalar(
        select(Vendor).where(
            (Vendor.user_id == user.id) | (Vendor.created_by == user.id)
        )
    )


def _get_product_or_404(product_id: int, db: Session) -> Product:
    product = db.scalar(select(Product).where(Product.id == product_id))
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


def _get_delivery_or_404(delivery_id: int, db: Session) -> Delivery:
    delivery = db.scalar(select(Delivery).where(Delivery.id == delivery_id))
    if delivery is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery not found")
    return delivery


def _get_inspection_or_404(inspection_id: int, db: Session) -> QualityInspection:
    inspection = db.scalar(select(QualityInspection).where(QualityInspection.id == inspection_id))
    if inspection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quality inspection not found",
        )
    return inspection


@products_router.get("", response_model=list[ProductResponse])
def list_products(
    vendor_id: int | None = Query(None),
    category: str | None = Query(None),
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Product]:
    query = select(Product)

    if current_user.role == Role.VENDOR:
        vendor = _get_vendor_for_user(current_user, db)
        if vendor is None:
            return []
        query = query.where(Product.vendor_id == vendor.id)
    elif vendor_id is not None:
        query = query.where(Product.vendor_id == vendor_id)

    if category:
        query = query.where(Product.category.ilike(f"%{category}%"))
    if search:
        query = query.where(Product.name.ilike(f"%{search}%"))

    query = query.order_by(Product.id).offset(skip).limit(limit)
    return list(db.scalars(query))


@products_router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Product:
    product = _get_product_or_404(product_id, db)
    if current_user.role == Role.VENDOR:
        vendor = _get_vendor_for_user(current_user, db)
        if vendor is None or product.vendor_id != vendor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return product


@deliveries_router.get("", response_model=list[DeliveryResponse])
def list_deliveries(
    purchase_order_id: int | None = Query(None),
    delivery_status: str | None = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Delivery]:
    from app.models.vendoriq import PurchaseOrder

    query = select(Delivery)

    if current_user.role == Role.VENDOR:
        vendor = _get_vendor_for_user(current_user, db)
        if vendor is None:
            return []
        query = query.join(PurchaseOrder).where(PurchaseOrder.vendor_id == vendor.id)
    elif purchase_order_id is not None:
        query = query.where(Delivery.purchase_order_id == purchase_order_id)

    if delivery_status:
        query = query.where(Delivery.delivery_status.ilike(f"%{delivery_status}%"))

    query = query.order_by(Delivery.id).offset(skip).limit(limit)
    return list(db.scalars(query))


@deliveries_router.get("/{delivery_id}", response_model=DeliveryResponse)
def get_delivery(
    delivery_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Delivery:
    from app.models.vendoriq import PurchaseOrder

    delivery = _get_delivery_or_404(delivery_id, db)
    if current_user.role == Role.VENDOR:
        vendor = _get_vendor_for_user(current_user, db)
        po = db.scalar(
            select(PurchaseOrder).where(PurchaseOrder.id == delivery.purchase_order_id)
        )
        if vendor is None or po is None or po.vendor_id != vendor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return delivery


@invoices_router.get("", response_model=list[InvoiceResponse])
def list_invoices(
    purchase_order_id: int | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[InvoiceResponse]:
    query = invoices_query(db)

    if current_user.role == Role.VENDOR:
        vendor = _get_vendor_for_user(current_user, db)
        if vendor is None:
            return []
        query = query.join(PurchaseOrder).where(PurchaseOrder.vendor_id == vendor.id)

    if purchase_order_id is not None:
        query = query.where(Invoice.purchase_order_id == purchase_order_id)

    if status_filter:
        query = query.where(Invoice.status == status_filter)

    invoices = list(db.scalars(query.order_by(Invoice.id.desc()).offset(skip).limit(limit)).unique())
    return [invoice_to_response(invoice) for invoice in invoices]


@invoices_router.get("/summary", response_model=InvoiceSummaryResponse)
def get_invoice_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InvoiceSummaryResponse:
    query = select(Invoice)

    if current_user.role == Role.VENDOR:
        vendor = _get_vendor_for_user(current_user, db)
        if vendor is None:
            return compute_invoice_summary([])
        query = query.join(PurchaseOrder).where(PurchaseOrder.vendor_id == vendor.id)
    elif current_user.role not in {
        Role.ADMINISTRATOR,
        Role.FINANCE_OFFICER,
        Role.PROCUREMENT_MANAGER,
        Role.AUDITOR,
    }:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    invoices = list(db.scalars(query).unique())
    return compute_invoice_summary(invoices)


@invoices_router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(
    payload: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InvoiceResponse:
    if current_user.role not in {Role.ADMINISTRATOR, Role.PROCUREMENT_MANAGER, Role.VENDOR}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    po = db.scalar(
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.vendor))
        .where(PurchaseOrder.id == payload.purchase_order_id)
    )
    if po is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")

    if current_user.role == Role.VENDOR:
        vendor = _get_vendor_for_user(current_user, db)
        if vendor is None or po.vendor_id != vendor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    po_status = po.status.value if hasattr(po.status, "value") else str(po.status)
    if po_status not in INVOICE_TRIGGER_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice can only be created when the purchase order is Delivered or Completed",
        )

    invoice = ensure_invoice_for_po(db, po)
    db.commit()
    invoice = get_invoice_with_po(db, invoice.id)
    if invoice is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Invoice could not be loaded")
    return invoice_to_response(invoice)


@invoices_router.put("/{invoice_id}/status", response_model=InvoiceResponse)
def update_invoice_status(
    invoice_id: int,
    payload: InvoiceStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InvoiceResponse:
    if current_user.role != Role.FINANCE_OFFICER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Finance Officers can update invoice status",
        )

    status_value = payload.status.strip()
    if status_value not in VALID_INVOICE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Status must be one of: {', '.join(sorted(VALID_INVOICE_STATUSES))}",
        )

    invoice = get_invoice_with_po(db, invoice_id)
    if invoice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    apply_invoice_status(invoice, status_value)
    record_audit_log(
        db,
        action_description=format_status_change_description(
            f"Invoice {invoice.invoice_number}",
            status_value,
            current_user,
        ),
        performed_by=current_user.id,
        entity_type="invoice",
        entity_id=invoice.id,
    )
    db.commit()
    invoice = get_invoice_with_po(db, invoice_id)
    return invoice_to_response(invoice)


@invoices_router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InvoiceResponse:
    invoice = get_invoice_with_po(db, invoice_id)
    if invoice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    if current_user.role == Role.VENDOR:
        vendor = _get_vendor_for_user(current_user, db)
        po = invoice.purchase_order
        if vendor is None or po is None or po.vendor_id != vendor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return invoice_to_response(invoice)


@quality_inspections_router.get("", response_model=list[QualityInspectionResponse])
def list_quality_inspections(
    vendor_id: int | None = Query(None),
    purchase_order_id: int | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[QualityInspection]:
    query = select(QualityInspection)

    if current_user.role == Role.VENDOR:
        vendor = _get_vendor_for_user(current_user, db)
        if vendor is None:
            return []
        query = query.where(QualityInspection.vendor_id == vendor.id)
    elif vendor_id is not None:
        query = query.where(QualityInspection.vendor_id == vendor_id)

    if purchase_order_id is not None:
        query = query.where(QualityInspection.purchase_order_id == purchase_order_id)

    query = query.order_by(QualityInspection.id).offset(skip).limit(limit)
    return list(db.scalars(query))


@quality_inspections_router.get("/{inspection_id}", response_model=QualityInspectionResponse)
def get_quality_inspection(
    inspection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QualityInspection:
    inspection = _get_inspection_or_404(inspection_id, db)
    if current_user.role == Role.VENDOR:
        vendor = _get_vendor_for_user(current_user, db)
        if vendor is None or inspection.vendor_id != vendor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return inspection
