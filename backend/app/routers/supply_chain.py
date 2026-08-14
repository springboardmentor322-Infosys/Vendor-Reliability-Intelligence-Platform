"""GET endpoints for supply chain models: products, deliveries, invoices, quality inspections."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.supply_chain import Delivery, Invoice, Product, QualityInspection
from app.models.user import Role, User
from app.models.vendor import Vendor
from app.schemas.supply_chain import (
    DeliveryResponse,
    InvoiceResponse,
    ProductResponse,
    QualityInspectionResponse,
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


def _get_invoice_or_404(invoice_id: int, db: Session) -> Invoice:
    invoice = db.scalar(select(Invoice).where(Invoice.id == invoice_id))
    if invoice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return invoice


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
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Invoice]:
    from app.models.vendoriq import PurchaseOrder

    query = select(Invoice)

    if current_user.role == Role.VENDOR:
        vendor = _get_vendor_for_user(current_user, db)
        if vendor is None:
            return []
        query = query.join(PurchaseOrder).where(PurchaseOrder.vendor_id == vendor.id)
    elif purchase_order_id is not None:
        query = query.where(Invoice.purchase_order_id == purchase_order_id)

    if status_filter:
        query = query.where(Invoice.status == status_filter)

    query = query.order_by(Invoice.id).offset(skip).limit(limit)
    return list(db.scalars(query))


@invoices_router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Invoice:
    from app.models.vendoriq import PurchaseOrder

    invoice = _get_invoice_or_404(invoice_id, db)
    if current_user.role == Role.VENDOR:
        vendor = _get_vendor_for_user(current_user, db)
        po = db.scalar(
            select(PurchaseOrder).where(PurchaseOrder.id == invoice.purchase_order_id)
        )
        if vendor is None or po is None or po.vendor_id != vendor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return invoice


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
