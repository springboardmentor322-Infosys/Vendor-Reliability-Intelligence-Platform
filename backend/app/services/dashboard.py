"""Live dashboard summaries computed from PostgreSQL data."""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.communication import AuditLog
from app.models.supply_chain import Invoice, InvoiceStatus
from app.models.user import User
from app.models.vendor import Vendor
from app.models.vendoriq import (
    ComplianceDocument,
    ComplianceFlag,
    Contract,
    ContractStatus,
    Notification,
    ProcurementRequest,
    ProcurementRequestStatus,
    PurchaseOrder,
    PurchaseOrderStatus,
)
from app.schemas.dashboard import (
    ActivityItem,
    AdminDashboardResponse,
    AuditorDashboardResponse,
    ContractAlert,
    DocumentRow,
    FactorBar,
    FinanceDashboardResponse,
    MetricCard,
    NamedCount,
    OrderRow,
    PipelineColumn,
    ProcurementDashboardResponse,
    RankedVendor,
    RequestRow,
    SpendPoint,
    StatusItem,
    SupplyChainDashboardResponse,
    VendorDashboardResponse,
)
from app.services.analytics import compute_delivery_performance_summary, compute_spend_over_time
from app.services.performance import compute_all_vendors_performance, compute_vendor_performance
from app.services.reliability import compute_vendor_ranking, compute_vendor_reliability

EXCLUDED_PO = {PurchaseOrderStatus.CANCELLED.value}
IN_PROGRESS_PO = {
    PurchaseOrderStatus.ORDERED.value,
    PurchaseOrderStatus.IN_PROGRESS.value,
    PurchaseOrderStatus.SHIPPED.value,
    PurchaseOrderStatus.PARTIAL_DELIVERY.value,
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _fmt_int(value: int) -> str:
    return f"{int(value):,}"


def _fmt_money(value: float) -> str:
    amount = float(value or 0)
    if abs(amount) >= 1_000_000:
        return f"${amount / 1_000_000:.1f}M"
    if abs(amount) >= 1_000:
        return f"${amount / 1_000:.1f}K"
    return f"${amount:,.2f}"


def _fmt_pct(value: float | None) -> str:
    if value is None:
        return "—"
    return f"{float(value):.1f}%"


def _count(db: Session, model, *where) -> int:
    query = select(func.count()).select_from(model)
    for clause in where:
        query = query.where(clause)
    return db.scalar(query) or 0


def _vendor_for_user(db: Session, user: User) -> Vendor | None:
    return db.scalar(
        select(Vendor)
        .options(selectinload(Vendor.documents), selectinload(Vendor.category))
        .where((Vendor.user_id == user.id) | (Vendor.created_by == user.id))
        .order_by(Vendor.id.desc())
    )


def _expiring_contracts(db: Session, days: int = 30, vendor_id: int | None = None) -> list[Contract]:
    now = _now()
    horizon = now + timedelta(days=days)
    query = (
        select(Contract)
        .options(selectinload(Contract.vendor))
        .where(Contract.expiry_date >= now, Contract.expiry_date <= horizon)
        .order_by(Contract.expiry_date.asc())
    )
    if vendor_id is not None:
        query = query.where(Contract.vendor_id == vendor_id)
    return list(db.scalars(query))


def _order_row(order: PurchaseOrder) -> OrderRow:
    return OrderRow(
        po_number=order.po_number,
        vendor_name=order.vendor.name if order.vendor else "—",
        amount=float(order.total_amount or 0),
        status=str(order.status),
        order_date=order.order_date,
    )


def _compliance_pct(db: Session, vendor_id: int | None = None) -> float:
    query = select(Contract)
    if vendor_id is not None:
        query = query.where(Contract.vendor_id == vendor_id)
    contracts = list(db.scalars(query))
    if not contracts:
        return 0.0
    compliant = sum(1 for item in contracts if str(item.compliance_flag) == ComplianceFlag.COMPLIANT.value)
    return round(compliant / len(contracts) * 100, 1)


def _uploads_status() -> str:
    uploads = Path(__file__).resolve().parent.parent.parent / "uploads"
    return "Healthy" if uploads.exists() else "Warning"


def build_admin_dashboard(db: Session) -> AdminDashboardResponse:
    users = _count(db, User)
    vendors = _count(db, Vendor)
    purchase_orders = _count(db, PurchaseOrder)
    pending_pos = _count(db, PurchaseOrder, PurchaseOrder.status == PurchaseOrderStatus.PENDING.value)
    spend = compute_spend_over_time(db)
    active_contracts = _count(db, Contract, Contract.status == ContractStatus.ACTIVE.value)
    expiring = _expiring_contracts(db, 30)
    delivery = compute_delivery_performance_summary(db)
    ranking = compute_vendor_ranking(db)
    risk_counts = Counter(entry.risk_level for entry in ranking)
    compliance_pct = _compliance_pct(db)

    quarter_start = datetime(_now().year, ((_now().month - 1) // 3) * 3 + 1, 1, tzinfo=timezone.utc)
    new_vendors = _count(db, Vendor, Vendor.created_at >= quarter_start)

    role_rows = db.execute(select(User.role, func.count(User.id)).group_by(User.role)).all()
    role_counts = [
        NamedCount(name=str(row[0].value if hasattr(row[0], "value") else row[0]), count=int(row[1]))
        for row in role_rows
    ]

    recent_orders = [
        _order_row(order)
        for order in db.scalars(
            select(PurchaseOrder)
            .options(selectinload(PurchaseOrder.vendor))
            .order_by(PurchaseOrder.order_date.desc())
            .limit(6)
        )
    ]

    activity = [
        ActivityItem(
            title=entry.action_description[:80],
            detail=entry.timestamp.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
            if entry.timestamp
            else "",
        )
        for entry in db.scalars(select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(5))
    ]

    cards = [
        MetricCard(label="Total Users", value=_fmt_int(users), hint=f"{len(role_counts)} roles in use"),
        MetricCard(label="Total Vendors", value=_fmt_int(vendors), hint=f"{new_vendors} added this quarter"),
        MetricCard(label="Total Purchase Orders", value=_fmt_int(purchase_orders), hint=f"{pending_pos} pending"),
        MetricCard(label="Total Spend", value=_fmt_money(spend.total_spend), hint="Excluding cancelled POs"),
        MetricCard(
            label="Active Contracts",
            value=_fmt_int(active_contracts),
            hint=f"{len(expiring)} expiring in 30 days",
        ),
        MetricCard(label="Compliance Score", value=_fmt_pct(compliance_pct), hint="Share of compliant contracts"),
    ]

    performance = compute_all_vendors_performance(db)
    hours = [item.average_response_time_hours for item in performance if item.average_response_time_hours is not None]
    avg_response_hours = sum(hours) / len(hours) if hours else None

    completed = _count(db, PurchaseOrder, PurchaseOrder.status == PurchaseOrderStatus.COMPLETED.value)
    audit_recent = _count(db, AuditLog, AuditLog.timestamp >= _now() - timedelta(days=14))
    total_contracts = _count(db, Contract)
    renewal_coverage = (active_contracts / total_contracts * 100) if total_contracts else None

    kpis = [
        MetricCard(label="On-Time Delivery", value=_fmt_pct(delivery.on_time_pct)),
        MetricCard(
            label="Avg. Response Time",
            value=f"{avg_response_hours:.1f}h" if avg_response_hours is not None else "—",
        ),
        MetricCard(label="Open Risks", value=_fmt_int(risk_counts.get("High", 0))),
        MetricCard(label="Completed Orders", value=_fmt_int(completed)),
        MetricCard(label="Audit Events (14d)", value=_fmt_int(audit_recent)),
        MetricCard(label="Renewal Coverage", value=_fmt_pct(renewal_coverage)),
    ]

    return AdminDashboardResponse(
        cards=cards,
        kpis=kpis,
        risk_distribution={
            "Low": risk_counts.get("Low", 0),
            "Medium": risk_counts.get("Medium", 0),
            "High": risk_counts.get("High", 0),
            "total": len(ranking),
        },
        spend_points=[
            SpendPoint(period=point.period, total_spend=point.total_spend) for point in spend.points[-6:]
        ],
        top_vendors=[
            RankedVendor(
                vendor_id=entry.vendor_id,
                vendor_name=entry.vendor_name,
                overall_score=entry.overall_score,
                risk_level=entry.risk_level,
            )
            for entry in ranking[:5]
        ],
        role_counts=role_counts,
        contract_alerts=[
            ContractAlert(
                title=f"{contract.contract_number} expires {_fmt_date_short(contract.expiry_date)}",
                severity="High" if (_as_utc(contract.expiry_date) - _now()).days <= 7 else "Medium",
                vendor_name=contract.vendor.name if contract.vendor else None,
            )
            for contract in expiring[:5]
        ],
        compliance_pct=compliance_pct,
        recent_orders=recent_orders,
        activity=activity,
        health=[
            StatusItem(label="Database", status="Healthy"),
            StatusItem(label="Document Storage", status=_uploads_status()),
            StatusItem(label="API Service", status="Healthy"),
        ],
    )


def _fmt_date_short(value: datetime | None) -> str:
    if value is None:
        return "—"
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).strftime("%Y-%m-%d")


def build_vendor_dashboard(db: Session, user: User) -> VendorDashboardResponse:
    vendor = _vendor_for_user(db, user)
    if vendor is None:
        return VendorDashboardResponse(
            cards=[MetricCard(label="Vendor Profile", value="Not found", hint="Complete onboarding first")],
            factors=[],
            recent_orders=[],
            contract_alerts=[],
            notifications=[],
            account_status="Unknown",
            contract_counts={"Active": 0, "Expiring Soon": 0, "Expired": 0, "Draft": 0},
            documents=[],
        )

    performance = compute_vendor_performance(db, vendor)
    reliability = compute_vendor_reliability(db, vendor)
    invoices = list(
        db.scalars(
            select(Invoice)
            .join(PurchaseOrder, Invoice.purchase_order_id == PurchaseOrder.id)
            .where(PurchaseOrder.vendor_id == vendor.id)
        )
    )
    pending_invoices = [item for item in invoices if str(item.status) != InvoiceStatus.PAID.value]
    invoiced_total = sum(float(item.amount or 0) for item in invoices)
    pending_total = sum(float(item.amount or 0) for item in pending_invoices)
    po_count = _count(db, PurchaseOrder, PurchaseOrder.vendor_id == vendor.id)

    contracts = list(db.scalars(select(Contract).where(Contract.vendor_id == vendor.id)))
    contract_counts = Counter(str(item.status) for item in contracts)
    expiring = _expiring_contracts(db, 30, vendor.id)

    recent_orders = [
        _order_row(order)
        for order in db.scalars(
            select(PurchaseOrder)
            .options(selectinload(PurchaseOrder.vendor))
            .where(PurchaseOrder.vendor_id == vendor.id)
            .order_by(PurchaseOrder.order_date.desc())
            .limit(6)
        )
    ]

    notifications = [
        ActivityItem(
            title=item.title,
            detail=item.created_at.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
            if item.created_at
            else "",
        )
        for item in db.scalars(
            select(Notification)
            .where(Notification.user_id == user.id)
            .order_by(Notification.created_at.desc())
            .limit(5)
        )
    ]

    documents = [
        DocumentRow(
            name=Path(doc.file_url).name if doc.file_url else doc.doc_type,
            doc_type=doc.doc_type,
            uploaded_at=doc.uploaded_at,
            file_url=doc.file_url,
        )
        for doc in vendor.documents[:8]
    ]

    factors = [
        FactorBar(label=factor.factor, value=factor.raw_score) for factor in reliability.factors[:4]
    ]

    cards = [
        MetricCard(
            label="Reliability Score",
            value=f"{reliability.overall_score:.1f}/100",
            hint=f"{reliability.risk_level} risk",
        ),
        MetricCard(label="Total Purchase Orders", value=_fmt_int(po_count), hint="Assigned to your profile"),
        MetricCard(label="On-Time Delivery %", value=_fmt_pct(performance.on_time_delivery_pct), hint="From delivery records"),
        MetricCard(label="Quality Rating", value=_fmt_pct(performance.average_quality_score), hint="Inspection average"),
        MetricCard(label="Total Invoiced", value=_fmt_money(invoiced_total), hint=f"{len(invoices)} invoices"),
        MetricCard(
            label="Pending Payments",
            value=_fmt_money(pending_total),
            hint=f"{len(pending_invoices)} unpaid",
        ),
    ]

    return VendorDashboardResponse(
        vendor_id=vendor.id,
        vendor_name=vendor.name,
        cards=cards,
        reliability_score=reliability.overall_score,
        risk_level=reliability.risk_level,
        factors=factors,
        recent_orders=recent_orders,
        contract_alerts=[
            ContractAlert(
                title=f"{contract.title} expires {_fmt_date_short(contract.expiry_date)}",
                severity="High" if (_as_utc(contract.expiry_date) - _now()).days <= 7 else "Medium",
                vendor_name=vendor.name,
            )
            for contract in expiring[:5]
        ],
        notifications=notifications,
        account_status=str(vendor.status.value if hasattr(vendor.status, "value") else vendor.status),
        contract_counts={
            "Active": contract_counts.get(ContractStatus.ACTIVE.value, 0),
            "Expiring Soon": contract_counts.get(ContractStatus.EXPIRING_SOON.value, 0),
            "Expired": contract_counts.get(ContractStatus.EXPIRED.value, 0),
            "Draft": contract_counts.get(ContractStatus.DRAFT.value, 0),
        },
        documents=documents,
    )


def build_finance_dashboard(db: Session) -> FinanceDashboardResponse:
    invoices = list(db.scalars(select(Invoice)))
    open_invoices = [item for item in invoices if str(item.status) != InvoiceStatus.PAID.value]
    pending_amount = sum(
        float(item.amount or 0) for item in invoices if str(item.status) == InvoiceStatus.PENDING.value
    )
    overdue_amount = sum(
        float(item.amount or 0) for item in invoices if str(item.status) == InvoiceStatus.OVERDUE.value
    )
    paid = sum(1 for item in invoices if str(item.status) == InvoiceStatus.PAID.value)
    approval_rate = (paid / len(invoices) * 100) if invoices else None

    spend = compute_spend_over_time(db)
    points = spend.points[-6:]
    variance = None
    if len(points) >= 2 and points[-2].total_spend:
        variance = (points[-1].total_spend - points[-2].total_spend) / points[-2].total_spend * 100

    month_start = _now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    spend_this_month = float(
        db.scalar(
            select(func.coalesce(func.sum(PurchaseOrder.total_amount), 0)).where(
                PurchaseOrder.order_date >= month_start,
                PurchaseOrder.status.notin_(list(EXCLUDED_PO)),
            )
        )
        or 0
    )

    cards = [
        MetricCard(label="Open Invoices", value=_fmt_int(len(open_invoices)), hint=f"{len(invoices)} total"),
        MetricCard(label="Pending Payments", value=_fmt_money(pending_amount + overdue_amount), hint=f"{_fmt_money(overdue_amount)} overdue"),
        MetricCard(label="Paid Invoice Rate", value=_fmt_pct(approval_rate), hint="Paid vs all invoices"),
        MetricCard(
            label="Spend Variance",
            value=("—" if variance is None else f"{variance:+.1f}%"),
            hint=f"This month {_fmt_money(spend_this_month)}",
        ),
    ]

    recent = [
        {
            "invoice_number": item.invoice_number,
            "amount": float(item.amount or 0),
            "status": str(item.status),
            "due_date": item.due_date.isoformat() if item.due_date else None,
        }
        for item in sorted(invoices, key=lambda row: row.due_date or _now(), reverse=True)[:8]
    ]

    return FinanceDashboardResponse(
        cards=cards,
        spend_points=[SpendPoint(period=point.period, total_spend=point.total_spend) for point in points],
        recent_invoices=recent,
    )


def build_procurement_dashboard(db: Session) -> ProcurementDashboardResponse:
    pending = _count(db, PurchaseOrder, PurchaseOrder.status == PurchaseOrderStatus.PENDING.value)
    approved_spend = db.scalar(
        select(func.coalesce(func.sum(PurchaseOrder.total_amount), 0)).where(
            PurchaseOrder.status.notin_(list(EXCLUDED_PO))
        )
    )
    open_requests = _count(
        db,
        ProcurementRequest,
        ProcurementRequest.status.in_(
            [ProcurementRequestStatus.PENDING.value, ProcurementRequestStatus.APPROVED.value]
        ),
    )

    cycle_rows = db.execute(
        select(PurchaseOrder.order_date, PurchaseOrder.expected_delivery_date).where(
            PurchaseOrder.expected_delivery_date.is_not(None)
        )
    ).all()
    cycle_days = []
    for order_date, expected in cycle_rows:
        if order_date and expected:
            cycle_days.append(max((expected - order_date).days, 0))
    avg_cycle = round(sum(cycle_days) / len(cycle_days), 1) if cycle_days else None

    buckets = {
        "Pending": [PurchaseOrderStatus.PENDING.value],
        "Approved": [PurchaseOrderStatus.APPROVED.value],
        "Ordered": [PurchaseOrderStatus.ORDERED.value, PurchaseOrderStatus.IN_PROGRESS.value],
        "Delivered": [
            PurchaseOrderStatus.SHIPPED.value,
            PurchaseOrderStatus.PARTIAL_DELIVERY.value,
            PurchaseOrderStatus.DELIVERED.value,
        ],
        "Completed": [PurchaseOrderStatus.COMPLETED.value],
    }
    pipeline: list[PipelineColumn] = []
    for title, statuses in buckets.items():
        orders = list(
            db.scalars(
                select(PurchaseOrder)
                .options(selectinload(PurchaseOrder.vendor))
                .where(PurchaseOrder.status.in_(statuses))
                .order_by(PurchaseOrder.order_date.desc())
                .limit(5)
            )
        )
        pipeline.append(PipelineColumn(title=title, items=[_order_row(order) for order in orders]))

    cards = [
        MetricCard(label="Pending Orders", value=_fmt_int(pending), hint="Awaiting approval"),
        MetricCard(label="Approved Spend", value=_fmt_money(float(approved_spend or 0)), hint="Non-cancelled POs"),
        MetricCard(label="Open Requests", value=_fmt_int(open_requests), hint="Pending or approved"),
        MetricCard(
            label="Average PO Cycle",
            value=f"{avg_cycle} days" if avg_cycle is not None else "—",
            hint="Order date to expected delivery",
        ),
    ]
    return ProcurementDashboardResponse(cards=cards, pipeline=pipeline)


def build_supply_chain_dashboard(db: Session, user: User) -> SupplyChainDashboardResponse:
    my_requests = list(
        db.scalars(
            select(ProcurementRequest)
            .where(ProcurementRequest.requested_by == user.id)
            .order_by(ProcurementRequest.created_at.desc())
        )
    )
    pending = sum(1 for item in my_requests if str(item.status) == ProcurementRequestStatus.PENDING.value)
    in_progress_pos = _count(db, PurchaseOrder, PurchaseOrder.status.in_(list(IN_PROGRESS_PO)))

    week_end = _now() + timedelta(days=7)
    deliveries_due = _count(
        db,
        PurchaseOrder,
        PurchaseOrder.expected_delivery_date.is_not(None),
        PurchaseOrder.expected_delivery_date >= _now(),
        PurchaseOrder.expected_delivery_date <= week_end,
        PurchaseOrder.status.notin_([PurchaseOrderStatus.COMPLETED.value, PurchaseOrderStatus.CANCELLED.value]),
    )

    recent = [
        RequestRow(
            id=item.id,
            title=item.department,
            status=str(item.status),
            created_at=item.created_at,
        )
        for item in my_requests[:8]
    ]

    cards = [
        MetricCard(label="My Procurement Requests", value=_fmt_int(len(my_requests)), hint="Created by you"),
        MetricCard(label="Requests Pending Approval", value=_fmt_int(pending), hint="Waiting on review"),
        MetricCard(label="Purchase Orders In Progress", value=_fmt_int(in_progress_pos), hint="Ordered through shipped"),
        MetricCard(label="Deliveries Due This Week", value=_fmt_int(deliveries_due), hint="Expected in next 7 days"),
    ]
    return SupplyChainDashboardResponse(cards=cards, recent_requests=recent)


def build_auditor_dashboard(db: Session) -> AuditorDashboardResponse:
    compliance_pct = _compliance_pct(db)
    expiring = _expiring_contracts(db, 30)
    ranking = compute_vendor_ranking(db)
    high_risk = [entry for entry in ranking if entry.risk_level == "High"]
    audit_recent = list(
        db.scalars(
            select(AuditLog)
            .where(AuditLog.timestamp >= _now() - timedelta(days=14))
            .order_by(AuditLog.timestamp.desc())
        )
    )
    docs = _count(db, ComplianceDocument)
    non_compliant = _count(db, Contract, Contract.compliance_flag == ComplianceFlag.NON_COMPLIANT.value)
    overdue_invoices = _count(db, Invoice, Invoice.status == InvoiceStatus.OVERDUE.value)

    tasks: list[StatusItem] = []
    if non_compliant:
        tasks.append(StatusItem(label=f"Review {non_compliant} non-compliant contract(s)", status="Pending"))
    if overdue_invoices:
        tasks.append(StatusItem(label=f"Inspect {overdue_invoices} overdue invoice(s)", status="Pending"))
    if high_risk:
        tasks.append(StatusItem(label=f"Assess {len(high_risk)} high-risk vendor(s)", status="In progress"))
    if not tasks:
        tasks.append(StatusItem(label="No open compliance exceptions", status="Clear"))

    cards = [
        MetricCard(label="Compliance Score", value=_fmt_pct(compliance_pct), hint="Compliant contracts"),
        MetricCard(label="Contracts Expiring", value=_fmt_int(len(expiring)), hint="Next 30 days"),
        MetricCard(label="Flagged Vendors", value=_fmt_int(len(high_risk)), hint="High reliability risk"),
        MetricCard(label="Recent Audit Events", value=_fmt_int(len(audit_recent)), hint="Last 14 days"),
    ]
    insights = [
        MetricCard(label="Compliance documents", value=_fmt_int(docs)),
        MetricCard(label="Non-compliant contracts", value=_fmt_int(non_compliant)),
        MetricCard(label="High-risk vendors", value=_fmt_int(len(high_risk))),
    ]
    events = [
        ActivityItem(
            title=entry.action_description[:90],
            detail=_fmt_date_short(entry.timestamp),
        )
        for entry in audit_recent[:6]
    ]
    return AuditorDashboardResponse(cards=cards, tasks=tasks, insights=insights, recent_events=events)
