"""Product, delivery, invoice and quality-inspection workflows."""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models.operations import Delivery, DeliveryStatus, Invoice, InvoiceStatus, Product, QualityInspection
from app.models.performance import PerformanceRecord
from app.models.purchase_order import POStatus, PurchaseOrder
from app.models.user import RoleEnum, User
from app.models.notification import NotificationType
from app.models.vendor import Vendor
from app.schemas.operations import (
    DeliveryCreate, DeliveryOut, DeliveryUpdate, InvoiceCreate, InvoiceOut,
    InvoiceUpdate, ProductCreate, ProductOut, QualityInspectionCreate, QualityInspectionOut,
)
from app.services.activity import log_activity
from app.services.notifications import notify
from app.services.reliability import recompute_reliability_score


router = APIRouter(tags=["Operational Management"])
PRODUCT_MANAGERS = (RoleEnum.ADMIN, RoleEnum.PROCUREMENT_MANAGER, RoleEnum.SUPPLY_CHAIN_MANAGER)
INSPECTORS = (RoleEnum.ADMIN, RoleEnum.PROCUREMENT_MANAGER, RoleEnum.SUPPLY_CHAIN_MANAGER, RoleEnum.AUDITOR)
FINANCE = (RoleEnum.ADMIN, RoleEnum.PROCUREMENT_MANAGER, RoleEnum.FINANCE_OFFICER)


def _purchase_order_or_404(db: Session, po_id: uuid.UUID) -> PurchaseOrder:
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return po


def _require_vendor_scope(user: User, vendor_id: uuid.UUID) -> None:
    if user.role == RoleEnum.VENDOR and user.vendor_id != vendor_id:
        raise HTTPException(status_code=403, detail="Vendor accounts may only work with their own records")


def _notify_delivery_delay(db: Session, delivery: Delivery) -> None:
    """Record/email an event-driven alert when a delivery becomes delayed."""
    if delivery.status != DeliveryStatus.DELAYED and not (delivery.delay_days or 0) > 0:
        return
    message = (
        f"Delivery {delivery.delivery_number} is delayed by {delivery.delay_days or 0} day(s). "
        "Please review the purchase-order delivery commitment."
    )
    for user in db.query(User).filter(
        User.vendor_id == delivery.vendor_id,
        User.is_active.is_(True),
    ).all():
        notify(db, user.id, NotificationType.DELIVERY_DELAY, message)


@router.get("/products", response_model=list[ProductOut])
def list_products(vendor_id: uuid.UUID | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Product)
    if current_user.role == RoleEnum.VENDOR:
        if current_user.vendor_id is None:
            return []
        query = query.filter(Product.vendor_id == current_user.vendor_id)
    elif vendor_id:
        query = query.filter(Product.vendor_id == vendor_id)
    return query.order_by(Product.product_name).all()


@router.post("/products", response_model=ProductOut, status_code=201, dependencies=[Depends(require_roles(*PRODUCT_MANAGERS))])
def create_product(payload: ProductCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not db.query(Vendor.id).filter(Vendor.id == payload.vendor_id).first():
        raise HTTPException(status_code=404, detail="Vendor not found")
    if db.query(Product.id).filter(Product.sku == payload.sku).first():
        raise HTTPException(status_code=400, detail="SKU already exists")
    product = Product(**payload.model_dump())
    db.add(product)
    log_activity(db, current_user.id, "created", "product", product.id, product.product_name)
    db.commit()
    db.refresh(product)
    return product


@router.get("/deliveries", response_model=list[DeliveryOut])
def list_deliveries(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Delivery)
    if current_user.role == RoleEnum.VENDOR:
        if current_user.vendor_id is None:
            return []
        query = query.filter(Delivery.vendor_id == current_user.vendor_id)
    return query.order_by(Delivery.created_at.desc()).all()


@router.post("/deliveries", response_model=DeliveryOut, status_code=201)
def create_delivery(payload: DeliveryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    po = _purchase_order_or_404(db, payload.purchase_order_id)
    _require_vendor_scope(current_user, po.vendor_id)
    if current_user.role not in (*PRODUCT_MANAGERS, RoleEnum.VENDOR):
        raise HTTPException(status_code=403, detail="Your role cannot create delivery records")
    actual = payload.actual_delivery_date
    expected = payload.expected_delivery_date or po.expected_delivery_date
    delay_days = max(0, (actual.date() - expected.date()).days) if actual and expected else 0
    delivery = Delivery(
        delivery_number=f"DLV-{uuid.uuid4().hex[:10].upper()}", vendor_id=po.vendor_id,
        expected_delivery_date=expected, actual_delivery_date=actual, delay_days=delay_days,
        received_goods=payload.status == DeliveryStatus.DELIVERED, status=payload.status,
        delivery_notes=payload.delivery_notes, purchase_order_id=po.id,
    )
    if payload.status == DeliveryStatus.DELIVERED:
        po.status = POStatus.DELIVERED
        po.actual_delivery_date = actual
    db.add(delivery)
    log_activity(db, current_user.id, "created", "delivery", delivery.id, delivery.delivery_number)
    db.commit()
    db.refresh(delivery)
    _notify_delivery_delay(db, delivery)
    return delivery


@router.patch("/deliveries/{delivery_id}", response_model=DeliveryOut)
def update_delivery(delivery_id: uuid.UUID, payload: DeliveryUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    _require_vendor_scope(current_user, delivery.vendor_id)
    if current_user.role not in (*PRODUCT_MANAGERS, RoleEnum.VENDOR):
        raise HTTPException(status_code=403, detail="Your role cannot update delivery records")
    if payload.status == DeliveryStatus.DELIVERED and payload.actual_delivery_date is None and delivery.actual_delivery_date is None:
        raise HTTPException(status_code=422, detail="actual_delivery_date is required for a delivered shipment")
    delivery.status = payload.status
    if payload.actual_delivery_date:
        delivery.actual_delivery_date = payload.actual_delivery_date
    if payload.delivery_notes is not None:
        delivery.delivery_notes = payload.delivery_notes
    if delivery.actual_delivery_date and delivery.expected_delivery_date:
        delivery.delay_days = max(0, (delivery.actual_delivery_date.date() - delivery.expected_delivery_date.date()).days)
    if payload.status == DeliveryStatus.DELIVERED:
        delivery.received_goods = True
        po = _purchase_order_or_404(db, delivery.purchase_order_id)
        po.status = POStatus.DELIVERED
        po.actual_delivery_date = delivery.actual_delivery_date
    log_activity(db, current_user.id, "updated", "delivery", delivery.id, payload.status.value)
    db.commit()
    db.refresh(delivery)
    _notify_delivery_delay(db, delivery)
    return delivery


@router.get("/invoices", response_model=list[InvoiceOut])
def list_invoices(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Invoice)
    if current_user.role == RoleEnum.VENDOR:
        if current_user.vendor_id is None:
            return []
        query = query.filter(Invoice.vendor_id == current_user.vendor_id)
    return query.order_by(Invoice.invoice_date.desc()).all()


@router.post("/invoices", response_model=InvoiceOut, status_code=201)
def create_invoice(payload: InvoiceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    po = _purchase_order_or_404(db, payload.purchase_order_id)
    _require_vendor_scope(current_user, po.vendor_id)
    if current_user.role not in (*FINANCE, RoleEnum.VENDOR):
        raise HTTPException(status_code=403, detail="Your role cannot create invoices")
    if db.query(Invoice.id).filter(Invoice.invoice_number == payload.invoice_number).first():
        raise HTTPException(status_code=400, detail="Invoice number already exists")
    invoice = Invoice(**payload.model_dump(), vendor_id=po.vendor_id)
    db.add(invoice)
    log_activity(db, current_user.id, "created", "invoice", invoice.id, invoice.invoice_number)
    db.commit()
    db.refresh(invoice)
    return invoice


@router.patch("/invoices/{invoice_id}", response_model=InvoiceOut, dependencies=[Depends(require_roles(*FINANCE))])
def update_invoice(invoice_id: uuid.UUID, payload: InvoiceUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice.payment_status = payload.payment_status
    if payload.payment_date:
        invoice.payment_date = payload.payment_date
    elif payload.payment_status == InvoiceStatus.PAID:
        invoice.payment_date = datetime.utcnow()
    log_activity(db, current_user.id, "updated", "invoice", invoice.id, payload.payment_status.value)
    db.commit()
    db.refresh(invoice)
    if invoice.payment_status == InvoiceStatus.PAID:
        for user in db.query(User).filter(User.vendor_id == invoice.vendor_id, User.is_active.is_(True)).all():
            notify(
                db,
                user.id,
                NotificationType.PO_STATUS,
                f"Invoice {invoice.invoice_number} has been marked as paid.",
            )
    return invoice


@router.get("/quality-inspections", response_model=list[QualityInspectionOut])
def list_quality_inspections(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(QualityInspection)
    if current_user.role == RoleEnum.VENDOR:
        if current_user.vendor_id is None:
            return []
        query = query.filter(QualityInspection.vendor_id == current_user.vendor_id)
    return query.order_by(QualityInspection.inspection_date.desc()).all()


@router.post("/quality-inspections", response_model=QualityInspectionOut, status_code=201, dependencies=[Depends(require_roles(*INSPECTORS))])
def create_quality_inspection(payload: QualityInspectionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    po = _purchase_order_or_404(db, payload.purchase_order_id)
    inspection = QualityInspection(
        purchase_order_id=po.id, vendor_id=po.vendor_id, inspected_by_id=current_user.id,
        inspection_date=payload.inspection_date or datetime.utcnow(), quality_score=payload.quality_score,
        defective_quantity=payload.defective_quantity, remarks=payload.remarks,
    )
    db.add(inspection)
    db.add(PerformanceRecord(
        vendor_id=po.vendor_id, recorded_by_id=current_user.id, quality_rating=round(payload.quality_score / 20, 2),
        order_completion_rate=100 if po.status in (POStatus.DELIVERED, POStatus.COMPLETED) else None,
    ))
    log_activity(db, current_user.id, "created", "quality_inspection", inspection.id, f"score {payload.quality_score}")
    db.commit()
    recompute_reliability_score(db, po.vendor_id)
    db.refresh(inspection)
    return inspection
