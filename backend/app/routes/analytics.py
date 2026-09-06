from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, extract
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

router = APIRouter(prefix="/analytics", tags=["Analytics"])

ANALYTICS_ROLES = (
    "Administrator",
    "Procurement Manager",
    "Supply Chain Manager",
    "Finance Officer",
)


def _date_filter(query, column, start_date, end_date):
    if start_date:
        query = query.filter(column >= start_date)
    if end_date:
        query = query.filter(column <= end_date)
    return query


@router.get("/overview")
def analytics_overview(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*ANALYTICS_ROLES)),
):
    po_query = _date_filter(db.query(PurchaseOrder), PurchaseOrder.order_date, start_date, end_date)
    delivery_query = _date_filter(db.query(Delivery), Delivery.delivery_date, start_date, end_date)
    invoice_query = _date_filter(db.query(Invoice), Invoice.invoice_date, start_date, end_date)
    inspection_query = _date_filter(db.query(QualityInspection), QualityInspection.inspection_date, start_date, end_date)
    request_query = _date_filter(db.query(ProcurementRequest), ProcurementRequest.request_date, start_date, end_date)

    total_vendors = db.query(Vendor).count()
    active_vendors = db.query(Vendor).filter(Vendor.status == "Active").count()
    avg_reliability = db.query(func.avg(Vendor.reliability_score)).scalar() or 0
    avg_compliance = db.query(func.avg(Vendor.compliance_score)).scalar() or 0

    po_count = po_query.count()
    po_value = po_query.with_entities(func.coalesce(func.sum(PurchaseOrder.amount), 0)).scalar() or 0

    delivery_count = delivery_query.count()
    on_time_count = delivery_query.filter(
        (Delivery.delay_days <= 0) | (Delivery.delivery_status.in_(["On Time", "Completed"]))
    ).count()
    delayed_count = delivery_query.filter(Delivery.delivery_status == "Delayed").count()

    invoice_count = invoice_query.count()
    invoice_value = invoice_query.with_entities(func.coalesce(func.sum(Invoice.amount), 0)).scalar() or 0
    paid_invoice_count = invoice_query.filter(Invoice.payment_status == "Paid").count()
    pending_invoice_count = invoice_query.filter(Invoice.payment_status == "Pending").count()
    overdue_invoice_count = invoice_query.filter(Invoice.payment_status == "Overdue").count()

    inspection_count = inspection_query.count()
    failed_inspection_count = inspection_query.filter(QualityInspection.status == "Failed").count()
    avg_quality = inspection_query.with_entities(func.avg(QualityInspection.quality_score)).scalar() or 0

    request_count = request_query.count()
    active_contracts = db.query(Contract).filter(Contract.contract_status == "Active").count()
    contract_value = db.query(func.coalesce(func.sum(Contract.contract_value), 0)).scalar() or 0

    monthly_rows = (
        po_query.with_entities(
            extract("year", PurchaseOrder.order_date).label("year"),
            extract("month", PurchaseOrder.order_date).label("month"),
            func.count(PurchaseOrder.id).label("count"),
            func.coalesce(func.sum(PurchaseOrder.amount), 0).label("value"),
        )
        .group_by(
            extract("year", PurchaseOrder.order_date),
            extract("month", PurchaseOrder.order_date),
        )
        .order_by(
            extract("year", PurchaseOrder.order_date),
            extract("month", PurchaseOrder.order_date),
        )
        .all()
    )

    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    vendor_rows = (
        db.query(Vendor.vendor_name, Vendor.reliability_score, Vendor.compliance_score)
        .order_by(Vendor.reliability_score.desc())
        .limit(10)
        .all()
    )

    category_rows = (
        db.query(Vendor.category, func.count(Vendor.id))
        .group_by(Vendor.category)
        .order_by(func.count(Vendor.id).desc())
        .all()
    )

    delivery_status_rows = (
        delivery_query.with_entities(Delivery.delivery_status, func.count(Delivery.id))
        .group_by(Delivery.delivery_status)
        .order_by(func.count(Delivery.id).desc())
        .all()
    )

    payment_rows = (
        invoice_query.with_entities(Invoice.payment_status, func.count(Invoice.id))
        .group_by(Invoice.payment_status)
        .order_by(func.count(Invoice.id).desc())
        .all()
    )

    return {
        "role": current_user.role,
        "summary": {
            "total_vendors": total_vendors,
            "active_vendors": active_vendors,
            "average_reliability": round(float(avg_reliability), 2),
            "average_compliance": round(float(avg_compliance), 2),
            "purchase_orders": po_count,
            "procurement_value": float(po_value),
            "deliveries": delivery_count,
            "on_time_deliveries": on_time_count,
            "delayed_deliveries": delayed_count,
            "on_time_rate": round((on_time_count / delivery_count) * 100, 2) if delivery_count else 0,
            "invoices": invoice_count,
            "invoice_value": float(invoice_value),
            "paid_invoices": paid_invoice_count,
            "pending_invoices": pending_invoice_count,
            "overdue_invoices": overdue_invoice_count,
            "quality_inspections": inspection_count,
            "failed_inspections": failed_inspection_count,
            "average_quality": round(float(avg_quality), 2),
            "procurement_requests": request_count,
            "active_contracts": active_contracts,
            "contract_value": float(contract_value),
        },
        "monthly_procurement": [
            {
                "period": f"{int(year)}-{month_names[int(month) - 1]}",
                "orders": int(count),
                "value": float(value),
            }
            for year, month, count, value in monthly_rows
        ],
        "top_vendors": [
            {
                "vendor_name": name,
                "reliability_score": float(reliability or 0),
                "compliance_score": float(compliance or 0),
            }
            for name, reliability, compliance in vendor_rows
        ],
        "vendor_categories": [
            {"category": category or "Uncategorized", "count": int(count)}
            for category, count in category_rows
        ],
        "delivery_status": [
            {"status": status or "Unknown", "count": int(count)}
            for status, count in delivery_status_rows
        ],
        "payment_status": [
            {"status": status or "Unknown", "count": int(count)}
            for status, count in payment_rows
        ],
    }
