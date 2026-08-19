"""Live vendor performance metrics computed from operational data."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.communication import ThreadMessage
from app.models.supply_chain import Delivery, QualityInspection
from app.models.vendor import Vendor
from app.models.vendoriq import Contract, PurchaseOrder, PurchaseOrderStatus
from app.schemas.performance import PerformanceSampleSizes, VendorPerformanceMetrics

ON_TIME_STATUS_PHRASES = ("shipping on time", "advance shipping")
COMPLETED_PO_STATUSES = {
    PurchaseOrderStatus.COMPLETED.value,
    PurchaseOrderStatus.DELIVERED.value,
}
EXCLUDED_PO_STATUSES = {PurchaseOrderStatus.CANCELLED.value}


@dataclass(frozen=True)
class _RawPerformance:
    on_time_delivery_pct: float | None
    average_quality_score: float | None
    order_completion_rate: float | None
    average_response_time_hours: float | None
    sample_sizes: PerformanceSampleSizes


def _is_on_time_delivery(delivery: Delivery) -> bool | None:
    """Return True/False for on-time, or None to exclude from denominator (e.g. canceled)."""
    status = (delivery.delivery_status or "").lower().strip()
    if "cancel" in status:
        return None
    if any(phrase in status for phrase in ON_TIME_STATUS_PHRASES):
        return True
    if "late" in status:
        return False
    if (
        delivery.actual_shipping_days is not None
        and delivery.scheduled_shipping_days is not None
    ):
        return delivery.actual_shipping_days <= delivery.scheduled_shipping_days
    return not delivery.late_delivery_risk


def _compute_on_time_delivery_pct(deliveries: list[Delivery]) -> tuple[float | None, int]:
    eligible = 0
    on_time = 0
    for delivery in deliveries:
        result = _is_on_time_delivery(delivery)
        if result is None:
            continue
        eligible += 1
        if result:
            on_time += 1

    if eligible == 0:
        return None, len(deliveries)
    return round(on_time / eligible * 100, 2), len(deliveries)


def _compute_order_completion_rate(purchase_orders: list[PurchaseOrder]) -> tuple[float | None, int]:
    active_orders = [
        po for po in purchase_orders if str(po.status) not in EXCLUDED_PO_STATUSES
    ]
    if not active_orders:
        return None, len(purchase_orders)

    completed = sum(1 for po in active_orders if str(po.status) in COMPLETED_PO_STATUSES)
    return round(completed / len(active_orders) * 100, 2), len(purchase_orders)


def _compute_average_quality_score(
    inspections: list[QualityInspection],
) -> tuple[float | None, int]:
    if not inspections:
        return None, 0
    total = sum(float(inspection.quality_score) for inspection in inspections)
    return round(total / len(inspections), 2), len(inspections)


def _vendor_user_ids(vendor: Vendor) -> set[int]:
    ids: set[int] = set()
    if vendor.user_id is not None:
        ids.add(vendor.user_id)
    if vendor.created_by is not None:
        ids.add(vendor.created_by)
    return ids


def _compute_average_response_time_hours(
    db: Session,
    vendor: Vendor,
    purchase_order_ids: list[int],
    contract_ids: list[int],
) -> tuple[float | None, int]:
    vendor_users = _vendor_user_ids(vendor)
    if not vendor_users:
        return None, 0

    threads: list[tuple[str, int]] = []
    threads.extend(("purchase_order", po_id) for po_id in purchase_order_ids)
    threads.extend(("contract", contract_id) for contract_id in contract_ids)
    if not threads:
        return None, 0

    response_deltas_hours: list[float] = []

    for thread_type, reference_id in threads:
        messages = list(
            db.scalars(
                select(ThreadMessage)
                .where(
                    ThreadMessage.thread_type == thread_type,
                    ThreadMessage.reference_id == reference_id,
                )
                .order_by(ThreadMessage.created_at.asc())
            )
        )
        if len(messages) < 2:
            continue

        for index in range(len(messages) - 1):
            current = messages[index]
            nxt = messages[index + 1]
            if current.sender_id in vendor_users or nxt.sender_id not in vendor_users:
                continue

            current_ts = _ensure_utc(current.created_at)
            next_ts = _ensure_utc(nxt.created_at)
            delta_hours = (next_ts - current_ts).total_seconds() / 3600
            if delta_hours >= 0:
                response_deltas_hours.append(delta_hours)

    if not response_deltas_hours:
        return None, 0

    average = sum(response_deltas_hours) / len(response_deltas_hours)
    return round(average, 2), len(response_deltas_hours)


def _ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _compute_raw_performance(db: Session, vendor: Vendor) -> _RawPerformance:
    purchase_orders = list(
        db.scalars(select(PurchaseOrder).where(PurchaseOrder.vendor_id == vendor.id))
    )
    po_ids = [po.id for po in purchase_orders]

    deliveries: list[Delivery] = []
    if po_ids:
        deliveries = list(
            db.scalars(
                select(Delivery).where(Delivery.purchase_order_id.in_(po_ids))
            )
        )

    inspections = list(
        db.scalars(
            select(QualityInspection).where(QualityInspection.vendor_id == vendor.id)
        )
    )

    contract_ids = list(
        db.scalars(select(Contract.id).where(Contract.vendor_id == vendor.id))
    )

    on_time_pct, delivery_count = _compute_on_time_delivery_pct(deliveries)
    completion_rate, po_count = _compute_order_completion_rate(purchase_orders)
    quality_avg, inspection_count = _compute_average_quality_score(inspections)
    response_hours, response_pairs = _compute_average_response_time_hours(
        db,
        vendor,
        po_ids,
        contract_ids,
    )

    return _RawPerformance(
        on_time_delivery_pct=on_time_pct,
        average_quality_score=quality_avg,
        order_completion_rate=completion_rate,
        average_response_time_hours=response_hours,
        sample_sizes=PerformanceSampleSizes(
            deliveries=delivery_count,
            quality_inspections=inspection_count,
            purchase_orders=po_count,
            response_pairs=response_pairs,
        ),
    )


def compute_vendor_performance(db: Session, vendor: Vendor) -> VendorPerformanceMetrics:
    raw = _compute_raw_performance(db, vendor)
    return VendorPerformanceMetrics(
        vendor_id=vendor.id,
        vendor_name=vendor.name,
        on_time_delivery_pct=raw.on_time_delivery_pct,
        average_quality_score=raw.average_quality_score,
        order_completion_rate=raw.order_completion_rate,
        average_response_time_hours=raw.average_response_time_hours,
        sample_sizes=raw.sample_sizes,
    )


def compute_all_vendors_performance(db: Session) -> list[VendorPerformanceMetrics]:
    vendors = list(db.scalars(select(Vendor).order_by(Vendor.name)))
    return [compute_vendor_performance(db, vendor) for vendor in vendors]


def get_raw_performance(db: Session, vendor: Vendor) -> _RawPerformance:
    """Expose raw metrics for reliability scoring."""
    return _compute_raw_performance(db, vendor)
