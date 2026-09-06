from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.vendor import Vendor
from app.models.purchase_order import PurchaseOrder
from app.models.delivery import Delivery
from app.models.invoice import Invoice
from app.models.contract import Contract
from app.models.quality_inspection import QualityInspection
from app.models.procurement_request import ProcurementRequest
from app.services.authorization import require_roles

router = APIRouter(prefix="/reports", tags=["Reports"])

REPORT_ROLES = (
    "Administrator",
    "Procurement Manager",
    "Supply Chain Manager",
    "Finance Officer",
    "Auditor",
)


def _filter(query, column, start_date, end_date):
    if start_date:
        query = query.filter(column >= start_date)
    if end_date:
        query = query.filter(column <= end_date)
    return query


@router.get("/overview")
def report_overview(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*REPORT_ROLES)),
):
    po = _filter(db.query(PurchaseOrder), PurchaseOrder.order_date, start_date, end_date)
    deliveries = _filter(db.query(Delivery), Delivery.delivery_date, start_date, end_date)
    invoices = _filter(db.query(Invoice), Invoice.invoice_date, start_date, end_date)
    inspections = _filter(db.query(QualityInspection), QualityInspection.inspection_date, start_date, end_date)
    requests = _filter(db.query(ProcurementRequest), ProcurementRequest.request_date, start_date, end_date)

    return {
        "role": current_user.role,
        "vendors": db.query(Vendor).count(),
        "active_vendors": db.query(Vendor).filter(Vendor.status == "Active").count(),
        "purchase_orders": po.count(),
        "procurement_value": float(po.with_entities(func.coalesce(func.sum(PurchaseOrder.amount), 0)).scalar() or 0),
        "deliveries": deliveries.count(),
        "delayed_deliveries": deliveries.filter(Delivery.delivery_status == "Delayed").count(),
        "invoices": invoices.count(),
        "invoice_value": float(invoices.with_entities(func.coalesce(func.sum(Invoice.amount), 0)).scalar() or 0),
        "pending_invoices": invoices.filter(Invoice.payment_status == "Pending").count(),
        "overdue_invoices": invoices.filter(Invoice.payment_status == "Overdue").count(),
        "active_contracts": db.query(Contract).filter(Contract.contract_status == "Active").count(),
        "contract_value": float(db.query(func.coalesce(func.sum(Contract.contract_value), 0)).scalar() or 0),
        "quality_inspections": inspections.count(),
        "failed_inspections": inspections.filter(QualityInspection.status == "Failed").count(),
        "procurement_requests": requests.count(),
    }


@router.get("/vendors")
def vendor_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*REPORT_ROLES)),
):
    vendors = db.query(Vendor).order_by(Vendor.reliability_score.desc()).all()
    result = []
    for vendor in vendors:
        po_count = _filter(db.query(PurchaseOrder), PurchaseOrder.order_date, start_date, end_date).filter(PurchaseOrder.vendor_id == vendor.id).count()
        delivery_q = _filter(db.query(Delivery), Delivery.delivery_date, start_date, end_date).filter(Delivery.vendor_id == vendor.id)
        delivery_count = delivery_q.count()
        delayed = delivery_q.filter(Delivery.delivery_status == "Delayed").count()
        quality_q = _filter(db.query(QualityInspection), QualityInspection.inspection_date, start_date, end_date).filter(QualityInspection.vendor_id == vendor.id)
        quality = quality_q.with_entities(func.avg(QualityInspection.quality_score)).scalar() or 0
        result.append({
            "id": vendor.id,
            "vendor_name": vendor.vendor_name,
            "category": vendor.category,
            "status": vendor.status,
            "reliability_score": float(vendor.reliability_score or 0),
            "compliance_score": float(vendor.compliance_score or 0),
            "purchase_orders": po_count,
            "deliveries": delivery_count,
            "delayed_deliveries": delayed,
            "on_time_rate": round(((delivery_count - delayed) / delivery_count) * 100, 2) if delivery_count else 0,
            "average_quality": round(float(quality), 2),
        })
    return result


@router.get("/procurement")
def procurement_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*REPORT_ROLES)),
):
    orders = _filter(db.query(PurchaseOrder), PurchaseOrder.order_date, start_date, end_date).order_by(PurchaseOrder.order_date.desc()).all()
    return [
        {
            "id": order.id,
            "po_number": order.po_number,
            "vendor": order.vendor.vendor_name if order.vendor else "Unknown",
            "amount": float(order.amount or 0),
            "order_date": order.order_date.isoformat() if order.order_date else None,
            "delivery_date": order.delivery_date.isoformat() if order.delivery_date else None,
            "status": order.status,
        }
        for order in orders
    ]


@router.get("/deliveries")
def delivery_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*REPORT_ROLES)),
):
    rows = _filter(db.query(Delivery), Delivery.delivery_date, start_date, end_date).order_by(Delivery.delivery_date.desc()).all()
    return [
        {
            "id": row.id,
            "po_number": row.purchase_order.po_number if row.purchase_order else "Unknown",
            "vendor": row.vendor.vendor_name if row.vendor else "Unknown",
            "delivery_date": row.delivery_date.isoformat() if row.delivery_date else None,
            "expected_delivery_date": row.expected_delivery_date.isoformat() if row.expected_delivery_date else None,
            "delay_days": int(row.delay_days or 0),
            "status": row.delivery_status,
            "damaged_goods": int(row.damaged_goods or 0),
        }
        for row in rows
    ]


@router.get("/financial")
def financial_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("Administrator", "Procurement Manager", "Finance Officer", "Auditor")),
):
    rows = _filter(db.query(Invoice), Invoice.invoice_date, start_date, end_date).order_by(Invoice.invoice_date.desc()).all()
    return [
        {
            "id": row.id,
            "invoice_number": row.invoice_number,
            "po_number": row.purchase_order.po_number if row.purchase_order else "Unknown",
            "vendor": row.vendor.vendor_name if row.vendor else "Unknown",
            "invoice_date": row.invoice_date.isoformat() if row.invoice_date else None,
            "due_date": row.due_date.isoformat() if row.due_date else None,
            "amount": float(row.amount or 0),
            "payment_status": row.payment_status,
        }
        for row in rows
    ]


@router.get("/contracts")
def contract_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*REPORT_ROLES)),
):
    rows = db.query(Contract).order_by(Contract.end_date.asc()).all()
    return [
        {
            "id": row.id,
            "contract_number": row.contract_number,
            "vendor": row.vendor.vendor_name if row.vendor else "Unknown",
            "start_date": row.start_date.isoformat() if row.start_date else None,
            "end_date": row.end_date.isoformat() if row.end_date else None,
            "value": float(row.contract_value or 0),
            "status": row.contract_status,
        }
        for row in rows
    ]


@router.get("/quality")
def quality_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*REPORT_ROLES)),
):
    rows = _filter(db.query(QualityInspection), QualityInspection.inspection_date, start_date, end_date).order_by(QualityInspection.inspection_date.desc()).all()
    return [
        {
            "id": row.id,
            "po_number": row.purchase_order.po_number if row.purchase_order else "Unknown",
            "vendor": row.vendor.vendor_name if row.vendor else "Unknown",
            "inspection_date": row.inspection_date.isoformat() if row.inspection_date else None,
            "inspector": row.inspector,
            "quality_score": float(row.quality_score or 0),
            "defects_found": int(row.defects_found or 0),
            "status": row.status,
        }
        for row in rows
    ]
