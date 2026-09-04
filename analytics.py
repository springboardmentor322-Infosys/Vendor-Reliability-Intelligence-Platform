import time
import uuid
from collections import Counter
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.activity import ActivityLog
from app.models.communication import Message
from app.models.contract import Contract, ContractStatus
from app.models.document import VendorDocument
from app.models.notification import Notification
from app.models.operations import Delivery
from app.models.operations import DeliveryStatus, Invoice, InvoiceStatus
from app.models.performance import PerformanceRecord
from app.models.procurement_request import ProcurementRequest, RequestStatus
from app.models.purchase_order import POStatus, PurchaseOrder
from app.models.user import RoleEnum, User
from app.models.vendor import Vendor, VendorStatus
from app.schemas.analytics import AnalyticsOverview, PerformanceMetrics

router = APIRouter(prefix="/analytics", tags=["Dashboard Analytics"])


def _vendor_query(db: Session, user: User):
    query = db.query(Vendor)
    if user.role == RoleEnum.VENDOR:
        if user.vendor_id is None:
            return query.filter(False)
        return query.filter(Vendor.id == user.vendor_id)
    return query


@router.get("/overview", response_model=AnalyticsOverview)
def overview(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vendors = _vendor_query(db, current_user).all()
    ids = [v.id for v in vendors]
    active_orders = db.query(PurchaseOrder).filter(PurchaseOrder.status.in_([POStatus.PENDING, POStatus.APPROVED, POStatus.ORDERED, POStatus.DELIVERED]))
    pending_requests = db.query(ProcurementRequest).filter(ProcurementRequest.status == RequestStatus.SUBMITTED)
    if current_user.role == RoleEnum.VENDOR:
        active_orders = active_orders.filter(PurchaseOrder.vendor_id.in_(ids))
        pending_requests = pending_requests.filter(ProcurementRequest.vendor_id.in_(ids))
    total_value = active_orders.with_entities(func.coalesce(func.sum(PurchaseOrder.total_amount), 0)).scalar()
    scores = [v.reliability_score or 50 for v in vendors]
    return AnalyticsOverview(
        total_vendors=len(vendors),
        approved_vendors=sum(v.status == VendorStatus.APPROVED for v in vendors),
        active_purchase_orders=active_orders.count(),
        pending_requests=pending_requests.count(),
        average_reliability=round(sum(scores) / len(scores), 1) if scores else 0,
        high_risk_vendors=sum(score < 50 for score in scores),
        total_procurement_value=float(total_value or 0),
    )


def _average(values: list[float]) -> float | None:
    return round(sum(values) / len(values), 2) if values else None


@router.get("/performance-metrics", response_model=PerformanceMetrics)
def performance_metrics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return the PDF evaluation metrics using stored operational data.

    Where there is not enough real data for a metric, the API returns null.
    This avoids inventing performance results and makes the dashboard useful
    during both a fresh demo and a real deployment.
    """
    started = time.perf_counter()
    vendors = _vendor_query(db, current_user).all()
    vendor_ids = [vendor.id for vendor in vendors]

    def scoped(query, column):
        return query.filter(column.in_(vendor_ids)) if current_user.role == RoleEnum.VENDOR else query

    performance_records = scoped(db.query(PerformanceRecord), PerformanceRecord.vendor_id).all()
    purchase_orders = scoped(db.query(PurchaseOrder), PurchaseOrder.vendor_id).all()
    contracts = scoped(db.query(Contract), Contract.vendor_id).all()
    deliveries = scoped(db.query(Delivery), Delivery.vendor_id).all()

    approved_vendors = [vendor for vendor in vendors if vendor.status == VendorStatus.APPROVED]
    approval_hours = [
        max(0.0, (vendor.updated_at - vendor.registration_date).total_seconds() / 3600)
        for vendor in approved_vendors
        if vendor.updated_at and vendor.registration_date
    ]
    response_hours = [float(record.response_time_hours) for record in performance_records if record.response_time_hours is not None]
    resolution_hours = [float(record.issue_resolution_hours) for record in performance_records if record.issue_resolution_hours is not None]
    completion_rates = [float(record.order_completion_rate) for record in performance_records if record.order_completion_rate is not None]
    completed_orders = [order for order in purchase_orders if order.status == POStatus.COMPLETED]
    processing_hours = [
        max(0.0, (order.updated_at - order.created_at).total_seconds() / 3600)
        for order in completed_orders
        if order.updated_at and order.created_at
    ]
    measurable_deliveries = [
        delivery for delivery in deliveries
        if delivery.actual_delivery_date is not None and delivery.expected_delivery_date is not None
    ]
    on_time_deliveries = [
        delivery for delivery in measurable_deliveries
        if delivery.actual_delivery_date <= delivery.expected_delivery_date
    ]
    scores = [float(vendor.reliability_score) for vendor in vendors if vendor.reliability_score is not None]
    query_time_ms = round((time.perf_counter() - started) * 1000, 2)

    return PerformanceMetrics(
        vendor_registration_success_rate=round(len(approved_vendors) / len(vendors) * 100, 2) if vendors else None,
        average_vendor_approval_time_hours=_average(approval_hours),
        average_vendor_response_time_hours=_average(response_hours),
        purchase_order_processing_time_hours=_average(processing_hours),
        order_completion_rate=_average(completion_rates) if completion_rates else (round(len(completed_orders) / len(purchase_orders) * 100, 2) if purchase_orders else None),
        contract_compliance_rate=round(sum(contract.is_compliant for contract in contracts) / len(contracts) * 100, 2) if contracts else None,
        delivery_accuracy=round(len(on_time_deliveries) / len(measurable_deliveries) * 100, 2) if measurable_deliveries else None,
        average_issue_resolution_time_hours=_average(resolution_hours),
        average_reliability_score=_average(scores),
        database_query_time_ms=query_time_ms,
    )


@router.get("/vendors/{vendor_id}/insights")
def vendor_insights(vendor_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == RoleEnum.VENDOR and current_user.vendor_id != vendor_id:
        raise HTTPException(status_code=403, detail="Vendor accounts may only access their own insights")
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    records = db.query(PerformanceRecord).filter(PerformanceRecord.vendor_id == vendor_id).order_by(PerformanceRecord.created_at.asc()).all()
    score = vendor.reliability_score or 50
    risk_level = "high" if score < 50 else "medium" if score < 75 else "low"
    recommendation = (
        "Prioritize a corrective-action plan before issuing new high-value orders."
        if risk_level == "high" else
        "Monitor delivery and contract performance closely."
        if risk_level == "medium" else
        "Eligible for preferred-supplier consideration."
    )
    return {
        "vendor_id": str(vendor_id), "reliability_score": score, "risk_level": risk_level,
        "recommendation": recommendation,
        "trend": [{"date": r.created_at.isoformat(), "quality_rating": r.quality_rating,
                   "completion_rate": r.order_completion_rate} for r in records],
    }


def _decimal(value) -> float:
    """Convert Numeric/Decimal values into JSON-safe floats at the API edge."""
    return float(value or Decimal("0"))


def _risk_level(score: float | None) -> str:
    score = float(score or 0)
    if score < 50:
        return "high"
    if score < 75:
        return "medium"
    return "low"


def _month_points(months: int) -> list[datetime]:
    """Return the first day of the current month and preceding months."""
    now = datetime.utcnow()
    year, month = now.year, now.month
    points: list[datetime] = []
    for offset in range(months - 1, -1, -1):
        total = year * 12 + month - 1 - offset
        point_year, point_month_index = divmod(total, 12)
        points.append(datetime(point_year, point_month_index + 1, 1))
    return points


def _month_key(value: datetime | None) -> tuple[int, int] | None:
    return (value.year, value.month) if value else None


def _count_status(items, attribute: str) -> dict[str, int]:
    return dict(sorted(Counter(getattr(item, attribute).value for item in items).items()))


def _delivery_risk_forecast(vendors: list[Vendor], deliveries: list[Delivery]) -> list[dict]:
    """Forecast the chance that each vendor's *next* delivery will be late.

    This is deliberately a transparent historical probability model rather
    than pretending a small local demo database is a trained ML model.  A
    Laplace/Beta(1, 1) prior makes the prediction stable for new vendors:
    (late deliveries + 1) / (recorded deliveries + 2).  It can be explained,
    audited, and replaced by a supervised ML model once enough labelled
    organisation data has accumulated.
    """
    by_vendor: dict[uuid.UUID, list[Delivery]] = {}
    for delivery in deliveries:
        by_vendor.setdefault(delivery.vendor_id, []).append(delivery)
    forecasts = []
    for vendor in vendors:
        history = by_vendor.get(vendor.id, [])
        total = len(history)
        late = sum(item.status == DeliveryStatus.DELAYED or (item.delay_days or 0) > 0 for item in history)
        probability = round((late + 1) / (total + 2) * 100, 1) if total else None
        level = "unknown" if probability is None else "high" if probability >= 50 else "medium" if probability >= 25 else "low"
        forecasts.append({
            "vendor_id": str(vendor.id),
            "name": vendor.company_name,
            "historical_deliveries": total,
            "late_deliveries": late,
            "predicted_delay_probability": probability,
            "risk_level": level,
        })
    return sorted(forecasts, key=lambda item: item["predicted_delay_probability"] if item["predicted_delay_probability"] is not None else -1, reverse=True)


def _role_cards(
    role: RoleEnum,
    *,
    users: list[User], vendors: list[Vendor], orders: list[PurchaseOrder],
    invoices: list[Invoice], contracts: list[Contract], deliveries: list[Delivery],
    total_spend: float, paid_amount: float, on_time_rate: float | None,
    compliance_rate: float | None, average_reliability: float, high_risk: int,
) -> list[dict]:
    active_orders = sum(order.status in (POStatus.PENDING, POStatus.APPROVED, POStatus.ORDERED, POStatus.DELIVERED) for order in orders)
    completed_orders = sum(order.status == POStatus.COMPLETED for order in orders)
    delayed_deliveries = sum(delivery.status == DeliveryStatus.DELAYED or (delivery.delay_days or 0) > 0 for delivery in deliveries)
    active_contracts = sum(contract.status in (ContractStatus.ACTIVE, ContractStatus.EXPIRING_SOON) for contract in contracts)
    pending_invoices = sum(invoice.payment_status in (InvoiceStatus.RECEIVED, InvoiceStatus.APPROVED) for invoice in invoices)
    overdue_invoices = sum(invoice.payment_status == InvoiceStatus.OVERDUE for invoice in invoices)

    def card(label: str, value, hint: str, tone: str = "blue") -> dict:
        return {"label": label, "value": value, "hint": hint, "tone": tone}

    if role == RoleEnum.ADMIN:
        return [
            card("Total users", len(users), f"{sum(user.is_active for user in users)} active", "violet"),
            card("Total vendors", len(vendors), f"{sum(v.status == VendorStatus.APPROVED for v in vendors)} approved", "green"),
            card("Purchase orders", len(orders), f"{active_orders} active", "blue"),
            card("Total spend", total_spend, "Live PO value", "amber"),
            card("Active contracts", active_contracts, "Compliance monitored", "rose"),
            card("Compliance score", compliance_rate, "Current contracts", "green"),
        ]
    if role == RoleEnum.PROCUREMENT_MANAGER:
        return [
            card("Total purchase orders", len(orders), "All tracked orders", "violet"),
            card("Active purchase orders", active_orders, "Pending to delivered", "green"),
            card("Orders in transit", sum(order.status == POStatus.ORDERED for order in orders), "Ordered status", "blue"),
            card("Total spend", total_spend, "Current PO value", "amber"),
            card("Delayed deliveries", delayed_deliveries, "Needs review", "rose"),
            card("Avg. reliability", average_reliability, "Vendor selection signal", "green"),
        ]
    if role == RoleEnum.SUPPLY_CHAIN_MANAGER:
        overall_risk = "High" if high_risk else "Medium" if average_reliability < 75 else "Low"
        return [
            card("Total suppliers", len(vendors), "Available vendor records", "violet"),
            card("Active purchase orders", active_orders, "Supply movement", "blue"),
            card("On-time delivery", on_time_rate, "Recorded delivery performance", "green"),
            card("Supply-chain risk", overall_risk, f"{high_risk} high-risk suppliers", "rose"),
            card("Delayed deliveries", delayed_deliveries, "Operational attention", "amber"),
            card("Supply-chain cost", total_spend, "Tracked procurement value", "green"),
        ]
    if role == RoleEnum.VENDOR:
        paid_days = [
            (invoice.payment_date - invoice.invoice_date).total_seconds() / 86400
            for invoice in invoices if invoice.payment_date and invoice.invoice_date
        ]
        average_payment_days = round(sum(paid_days) / len(paid_days), 1) if paid_days else None
        return [
            card("Reliability score", average_reliability, "Your current supplier score", "violet"),
            card("On-time deliveries", on_time_rate, "Recorded delivery performance", "green"),
            card("Active purchase orders", active_orders, "Orders requiring attention", "blue"),
            card("Orders completed", completed_orders, "Completed status", "green"),
            card("Total invoiced", sum(_decimal(invoice.invoice_amount) for invoice in invoices), "Invoice history", "amber"),
            card("Average payment time", average_payment_days, "Paid invoice history", "rose"),
        ]
    if role == RoleEnum.FINANCE_OFFICER:
        return [
            card("Total spend", total_spend, "PO value", "violet"),
            card("Payments made", paid_amount, "Paid invoices", "green"),
            card("Total invoices", len(invoices), "Financial records", "blue"),
            card("Pending payments", pending_invoices, "Received or approved", "amber"),
            card("Overdue invoices", overdue_invoices, "Needs action", "rose"),
            card("Cash flow", paid_amount, "Recorded payments", "green"),
        ]
    return [
        card("Vendor records", len(vendors), "Available for audit", "violet"),
        card("Compliance score", compliance_rate, "Contract compliance", "green"),
        card("High-risk vendors", high_risk, "Reliability score below 50", "rose"),
        card("Expiring contracts", sum(c.status == ContractStatus.EXPIRING_SOON for c in contracts), "Renewal attention", "amber"),
        card("Pending approvals", sum(order.status == POStatus.PENDING for order in orders), "Purchase orders", "blue"),
        card("Overdue invoices", overdue_invoices, "Evidence for review", "rose"),
    ]


@router.get("/role-dashboard")
def role_dashboard(
    months: int = 6,
    vendor_id: uuid.UUID | None = None,
    risk: str = "all",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Interactive dashboard data, scoped by role and filter choices.

    The frontend changes ``months``, ``vendor_id`` and ``risk`` in response to
    user controls.  Every value below is calculated from PostgreSQL records;
    no dashboard value is a hard-coded demonstration number.
    """
    if months not in (3, 6, 12):
        raise HTTPException(status_code=422, detail="months must be 3, 6, or 12")
    if risk not in ("all", "high", "medium", "low"):
        raise HTTPException(status_code=422, detail="risk must be all, high, medium, or low")

    allowed_vendors = _vendor_query(db, current_user).order_by(Vendor.company_name).all()
    if current_user.role == RoleEnum.VENDOR:
        vendor_id = current_user.vendor_id
    elif vendor_id and not any(vendor.id == vendor_id for vendor in allowed_vendors):
        raise HTTPException(status_code=404, detail="Vendor not found")

    selected_vendors = allowed_vendors
    if vendor_id:
        selected_vendors = [vendor for vendor in selected_vendors if vendor.id == vendor_id]
    if risk != "all":
        selected_vendors = [vendor for vendor in selected_vendors if _risk_level(vendor.reliability_score) == risk]
    selected_vendor_ids = [vendor.id for vendor in selected_vendors]

    def for_vendors(model, column):
        return db.query(model).filter(column.in_(selected_vendor_ids)).all() if selected_vendor_ids else []

    orders = for_vendors(PurchaseOrder, PurchaseOrder.vendor_id)
    invoices = for_vendors(Invoice, Invoice.vendor_id)
    deliveries = for_vendors(Delivery, Delivery.vendor_id)
    contracts = for_vendors(Contract, Contract.vendor_id)
    documents = for_vendors(VendorDocument, VendorDocument.vendor_id)
    performance_records = for_vendors(PerformanceRecord, PerformanceRecord.vendor_id)
    users = db.query(User).order_by(User.created_at.desc()).all() if current_user.role == RoleEnum.ADMIN else []

    message_query = db.query(Message)
    if current_user.role == RoleEnum.VENDOR:
        messages = message_query.filter(Message.vendor_id == current_user.vendor_id).order_by(Message.created_at.desc()).limit(8).all()
    elif current_user.role in (RoleEnum.ADMIN, RoleEnum.AUDITOR):
        messages = message_query.order_by(Message.created_at.desc()).limit(8).all()
    else:
        messages = message_query.filter(
            or_(Message.sender_id == current_user.id, Message.recipient_id == current_user.id)
        ).order_by(Message.created_at.desc()).limit(8).all()
    notifications = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).limit(8).all()
    activity_query = db.query(ActivityLog)
    if current_user.role not in (RoleEnum.ADMIN, RoleEnum.AUDITOR):
        activity_query = activity_query.filter(ActivityLog.actor_id == current_user.id)
    activities = activity_query.order_by(ActivityLog.created_at.desc()).limit(12).all()

    total_spend = sum(_decimal(order.total_amount) for order in orders)
    paid_amount = sum(_decimal(invoice.invoice_amount) for invoice in invoices if invoice.payment_status == InvoiceStatus.PAID)
    measurable_deliveries = [delivery for delivery in deliveries if delivery.actual_delivery_date and delivery.expected_delivery_date]
    on_time_rate = round(sum(delivery.actual_delivery_date <= delivery.expected_delivery_date for delivery in measurable_deliveries) / len(measurable_deliveries) * 100, 1) if measurable_deliveries else None
    average_reliability = round(sum(float(vendor.reliability_score or 0) for vendor in selected_vendors) / len(selected_vendors), 1) if selected_vendors else 0
    compliance_rate = round(sum(bool(contract.is_compliant) for contract in contracts) / len(contracts) * 100, 1) if contracts else None
    high_risk = sum(_risk_level(vendor.reliability_score) == "high" for vendor in selected_vendors)

    monthly = []
    for point in _month_points(months):
        key = (point.year, point.month)
        month_orders = [order for order in orders if _month_key(order.created_at) == key]
        month_deliveries = [delivery for delivery in deliveries if _month_key(delivery.created_at) == key]
        month_on_time = [delivery for delivery in month_deliveries if delivery.actual_delivery_date and delivery.expected_delivery_date]
        monthly.append({
            "label": point.strftime("%b %y"),
            "orders": len(month_orders),
            "spend": round(sum(_decimal(order.total_amount) for order in month_orders), 2),
            "deliveries": len(month_deliveries),
            "on_time_rate": round(sum(delivery.actual_delivery_date <= delivery.expected_delivery_date for delivery in month_on_time) / len(month_on_time) * 100, 1) if month_on_time else None,
        })

    vendor_spend = Counter()
    for order in orders:
        vendor_spend[str(order.vendor_id)] += _decimal(order.total_amount)
    vendor_names = {str(vendor.id): vendor.company_name for vendor in selected_vendors}
    top_spend = [
        {"vendor_id": vendor_id_value, "company_name": vendor_names.get(vendor_id_value, "Vendor"), "spend": round(amount, 2)}
        for vendor_id_value, amount in vendor_spend.most_common(5)
    ]
    recent_orders = sorted(orders, key=lambda order: order.created_at or datetime.min, reverse=True)[:6]
    upcoming_deliveries = sorted(
        [delivery for delivery in deliveries if delivery.expected_delivery_date and delivery.status not in (DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED)],
        key=lambda delivery: delivery.expected_delivery_date,
    )[:6]
    documents_expiring = sorted(
        [document for document in documents if document.expires_at], key=lambda document: document.expires_at
    )[:6]
    now = datetime.utcnow()
    expiring_contracts = sorted(
        [contract for contract in contracts if contract.status in (ContractStatus.EXPIRING_SOON, ContractStatus.EXPIRED) or contract.end_date <= now],
        key=lambda contract: contract.end_date,
    )[:6]

    role_counts = Counter(user.role.value for user in users)
    performance_summary = {
        "quality_rating": round(sum(float(record.quality_rating or 0) for record in performance_records) / len(performance_records), 1) if performance_records else None,
        "response_time_hours": round(sum(float(record.response_time_hours or 0) for record in performance_records) / len(performance_records), 1) if performance_records else None,
        "issue_resolution_hours": round(sum(float(record.issue_resolution_hours or 0) for record in performance_records) / len(performance_records), 1) if performance_records else None,
        "completion_rate": round(sum(float(record.order_completion_rate or 0) for record in performance_records) / len(performance_records), 1) if performance_records else None,
    }
    delivery_forecast = _delivery_risk_forecast(selected_vendors, deliveries)

    return {
        "role": current_user.role.value,
        "filters": {"months": months, "vendor_id": str(vendor_id) if vendor_id else None, "risk": risk},
        "vendor_selector": [{"id": str(vendor.id), "name": vendor.company_name, "risk": _risk_level(vendor.reliability_score)} for vendor in allowed_vendors],
        "cards": _role_cards(
            current_user.role, users=users, vendors=selected_vendors, orders=orders,
            invoices=invoices, contracts=contracts, deliveries=deliveries, total_spend=round(total_spend, 2),
            paid_amount=round(paid_amount, 2), on_time_rate=on_time_rate,
            compliance_rate=compliance_rate, average_reliability=average_reliability, high_risk=high_risk,
        ),
        "summary": {
            "vendor_count": len(selected_vendors), "order_count": len(orders), "invoice_count": len(invoices),
            "contract_count": len(contracts), "document_count": len(documents), "total_spend": round(total_spend, 2),
            "paid_amount": round(paid_amount, 2), "on_time_rate": on_time_rate,
            "compliance_rate": compliance_rate, "average_reliability": average_reliability,
            "high_risk_count": high_risk, "delayed_delivery_count": sum(delivery.status == DeliveryStatus.DELAYED or (delivery.delay_days or 0) > 0 for delivery in deliveries),
            "performance": performance_summary,
        },
        "status": {"vendors": _count_status(selected_vendors, "status"), "orders": _count_status(orders, "status"), "invoices": _count_status(invoices, "payment_status")},
        "monthly": monthly,
        "top_vendors": [{"id": str(vendor.id), "name": vendor.company_name, "category": vendor.category.value, "score": round(float(vendor.reliability_score or 0), 1), "risk": _risk_level(vendor.reliability_score)} for vendor in sorted(selected_vendors, key=lambda item: item.reliability_score or 0, reverse=True)[:6]],
        "top_spend": top_spend,
        "delivery_risk_forecast": delivery_forecast[:6],
        "recent_orders": [{"id": str(order.id), "number": order.po_number, "vendor": vendor_names.get(str(order.vendor_id), "Vendor"), "amount": _decimal(order.total_amount), "status": order.status.value, "expected_delivery": order.expected_delivery_date.isoformat() if order.expected_delivery_date else None, "created_at": order.created_at.isoformat() if order.created_at else None} for order in recent_orders],
        "recent_invoices": [{"id": str(invoice.id), "number": invoice.invoice_number, "vendor": vendor_names.get(str(invoice.vendor_id), "Vendor"), "amount": _decimal(invoice.invoice_amount), "status": invoice.payment_status.value, "due_date": invoice.due_date.isoformat() if invoice.due_date else None} for invoice in sorted(invoices, key=lambda item: item.invoice_date or datetime.min, reverse=True)[:6]],
        "upcoming_deliveries": [{"id": str(delivery.id), "number": delivery.delivery_number, "vendor": vendor_names.get(str(delivery.vendor_id), "Vendor"), "expected_delivery": delivery.expected_delivery_date.isoformat() if delivery.expected_delivery_date else None, "status": delivery.status.value, "delay_days": delivery.delay_days} for delivery in upcoming_deliveries],
        "contracts": [{"id": str(contract.id), "number": contract.contract_number, "title": contract.title, "vendor": vendor_names.get(str(contract.vendor_id), "Vendor"), "end_date": contract.end_date.isoformat(), "status": contract.status.value, "compliant": bool(contract.is_compliant)} for contract in expiring_contracts],
        "documents": [{"id": str(document.id), "title": document.title, "type": document.type.value, "expires_at": document.expires_at.isoformat() if document.expires_at else None, "filename": document.filename} for document in documents_expiring],
        "notifications": [{"id": str(notification.id), "message": notification.message, "type": notification.type.value, "created_at": notification.created_at.isoformat(), "is_read": notification.is_read} for notification in notifications],
        "messages": [{"id": str(message.id), "subject": message.subject, "created_at": message.created_at.isoformat(), "is_read": message.is_read} for message in messages],
        "activities": [{"id": str(activity.id), "action": activity.action, "entity_type": activity.entity_type, "detail": activity.detail, "created_at": activity.created_at.isoformat()} for activity in activities],
        "role_counts": dict(role_counts),
    }
