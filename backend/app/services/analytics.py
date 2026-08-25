"""Live analytics aggregates computed from operational database data."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.supply_chain import Delivery
from app.models.vendor import Vendor, VendorCategory
from app.models.vendoriq import PurchaseOrder, PurchaseOrderStatus
from app.schemas.analytics import (
    DeliveryPerformanceSummaryResponse,
    DeliveryStatusBreakdown,
    ProcurementCostTrendPoint,
    ProcurementCostTrendsResponse,
    ShippingModeBreakdown,
    SpendOverTimePoint,
    SpendOverTimeResponse,
    VendorCategoryDistributionItem,
    VendorCategoryDistributionResponse,
)
from app.services.performance import _is_on_time_delivery

EXCLUDED_PO_STATUSES = {PurchaseOrderStatus.CANCELLED.value}


def _month_key(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y-%m")


def compute_spend_over_time(db: Session) -> SpendOverTimeResponse:
    rows = db.execute(
        select(
            func.date_trunc("month", PurchaseOrder.order_date).label("period"),
            func.sum(PurchaseOrder.total_amount).label("total_spend"),
            func.count(PurchaseOrder.id).label("order_count"),
        )
        .where(PurchaseOrder.status.notin_(list(EXCLUDED_PO_STATUSES)))
        .group_by("period")
        .order_by("period")
    ).all()

    points = [
        SpendOverTimePoint(
            period=row.period.strftime("%Y-%m"),
            total_spend=round(float(row.total_spend or 0), 2),
            order_count=int(row.order_count or 0),
        )
        for row in rows
    ]
    total = round(sum(point.total_spend for point in points), 2)
    return SpendOverTimeResponse(points=points, total_spend=total)


def compute_vendor_category_distribution(db: Session) -> VendorCategoryDistributionResponse:
    vendor_counts = {
        row.category_id: int(row.vendor_count)
        for row in db.execute(
            select(
                Vendor.category_id,
                func.count(Vendor.id).label("vendor_count"),
            ).group_by(Vendor.category_id)
        ).all()
    }

    spend_rows = db.execute(
        select(
            Vendor.category_id,
            func.sum(PurchaseOrder.total_amount).label("total_spend"),
            func.count(PurchaseOrder.id).label("order_count"),
        )
        .join(PurchaseOrder, PurchaseOrder.vendor_id == Vendor.id)
        .where(PurchaseOrder.status.notin_(list(EXCLUDED_PO_STATUSES)))
        .group_by(Vendor.category_id)
    ).all()

    spend_by_category = {
        row.category_id: (
            round(float(row.total_spend or 0), 2),
            int(row.order_count or 0),
        )
        for row in spend_rows
    }

    categories = list(db.scalars(select(VendorCategory).order_by(VendorCategory.name)))
    items: list[VendorCategoryDistributionItem] = []

    for category in categories:
        spend, order_count = spend_by_category.get(category.id, (0.0, 0))
        items.append(
            VendorCategoryDistributionItem(
                category_id=category.id,
                category_name=category.name,
                vendor_count=vendor_counts.get(category.id, 0),
                total_spend=spend,
                order_count=order_count,
            )
        )

    total_vendors = db.scalar(select(func.count()).select_from(Vendor)) or 0
    return VendorCategoryDistributionResponse(categories=items, total_vendors=total_vendors)


def compute_procurement_cost_trends(db: Session) -> ProcurementCostTrendsResponse:
    rows = db.execute(
        select(
            func.date_trunc("month", PurchaseOrder.order_date).label("period"),
            func.sum(PurchaseOrder.total_amount).label("total_spend"),
            func.avg(PurchaseOrder.total_amount).label("average_order_value"),
            func.count(PurchaseOrder.id).label("order_count"),
        )
        .where(PurchaseOrder.status.notin_(list(EXCLUDED_PO_STATUSES)))
        .group_by("period")
        .order_by("period")
    ).all()

    points = [
        ProcurementCostTrendPoint(
            period=row.period.strftime("%Y-%m"),
            total_spend=round(float(row.total_spend or 0), 2),
            average_order_value=round(float(row.average_order_value or 0), 2),
            order_count=int(row.order_count or 0),
        )
        for row in rows
    ]

    qoq_change: float | None = None
    if len(points) >= 6:
        recent = sum(point.total_spend for point in points[-3:])
        previous = sum(point.total_spend for point in points[-6:-3])
        if previous > 0:
            qoq_change = round((recent - previous) / previous * 100, 2)

    return ProcurementCostTrendsResponse(points=points, quarter_over_quarter_change_pct=qoq_change)


def compute_delivery_performance_summary(db: Session) -> DeliveryPerformanceSummaryResponse:
    deliveries = list(db.scalars(select(Delivery)))

    on_time = 0
    late = 0
    canceled = 0
    eligible = 0

    status_counts: dict[str, int] = defaultdict(int)
    mode_stats: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "on_time": 0})

    for delivery in deliveries:
        status = (delivery.delivery_status or "Unknown").strip()
        status_counts[status] += 1

        mode = (delivery.shipping_mode or "Unknown").strip()
        mode_stats[mode]["total"] += 1

        result = _is_on_time_delivery(delivery)
        if result is None:
            canceled += 1
            continue

        eligible += 1
        if result:
            on_time += 1
            mode_stats[mode]["on_time"] += 1
        else:
            late += 1

    total = len(deliveries)
    on_time_pct = round(on_time / eligible * 100, 2) if eligible else 0.0
    late_pct = round(late / eligible * 100, 2) if eligible else 0.0

    by_status = [
        DeliveryStatusBreakdown(
            status=status,
            count=count,
            percentage=round(count / total * 100, 2) if total else 0.0,
        )
        for status, count in sorted(status_counts.items(), key=lambda item: -item[1])
    ]

    by_shipping_mode = [
        ShippingModeBreakdown(
            mode=mode,
            count=stats["total"],
            on_time_pct=(
                round(stats["on_time"] / stats["total"] * 100, 2) if stats["total"] else None
            ),
        )
        for mode, stats in sorted(mode_stats.items(), key=lambda item: -item[1]["total"])
    ]

    return DeliveryPerformanceSummaryResponse(
        total_deliveries=total,
        on_time_count=on_time,
        late_count=late,
        canceled_count=canceled,
        on_time_pct=on_time_pct,
        late_pct=late_pct,
        by_status=by_status,
        by_shipping_mode=by_shipping_mode,
    )
