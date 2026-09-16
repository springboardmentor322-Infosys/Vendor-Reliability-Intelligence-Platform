"""Vendor Reliability Scoring Engine for VendorIQ.

Scoring weights (when all metrics are available):
  - On-Time Delivery Rate:          35%
  - Contract Compliance Rate:        25%
  - Purchase Order Performance:      25%
  - Communication Response Rate:     15%

If a metric has no data, its weight is redistributed proportionally
among the metrics that do have data. If NO metrics have data, the
score is set to None and the risk category to "Not Yet Rated".

The full breakdown — including effective weights and which metrics
were used — is persisted with every evaluation so the result is
transparent and auditable.
"""

from __future__ import annotations

import json
from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    AuditLog,
    Contract,
    Message,
    POFulfillment,
    Notification,
    PurchaseOrder,
    Vendor,
    VendorReliabilityHistory,
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

BASE_WEIGHTS: dict[str, float] = {
    "on_time_delivery": 0.30,
    "quantity_fulfillment": 0.20,
    "quality_acceptance": 0.15,
    "contract_compliance": 0.15,
    "po_performance": 0.10,
    "communication_response": 0.10,
}

RISK_THRESHOLDS = {
    "Low Risk": 80,
    "Medium Risk": 60,
    "High Risk": 40,
    "Critical Risk": 0,
}

NOT_YET_RATED = "Not Yet Rated"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _classify_risk(score: Decimal) -> str:
    """Map a numeric score to a risk category label."""
    s = float(score)
    if s >= 80:
        return "Low Risk"
    if s >= 60:
        return "Medium Risk"
    if s >= 40:
        return "High Risk"
    return "Critical Risk"


def _pct(numerator: int, denominator: int) -> Optional[Decimal]:
    """Return a 0-100 percentage or None when denominator is zero."""
    if denominator == 0:
        return None
    return Decimal(str(round(numerator / denominator * 100, 2)))


def _redistribute_weights(available: dict[str, float]) -> dict[str, float]:
    """Proportionally redistribute BASE_WEIGHTS to only available metrics."""
    total = sum(available.values())
    if total == 0:
        return {}
    return {k: v / total for k, v in available.items()}


# ---------------------------------------------------------------------------
# Individual metric calculators
# ---------------------------------------------------------------------------

def _calc_on_time_delivery(db: Session, vendor_id: int) -> Optional[Decimal]:
    """Fraction of POs delivered on or before their expected delivery date.

    Only POs that reached a terminal delivery state are counted.
    """
    terminal_statuses = ("Delivered", "Completed")
    pos = db.scalars(
        select(PurchaseOrder).where(
            PurchaseOrder.vendor_id == vendor_id,
            PurchaseOrder.status.in_(terminal_statuses),
        )
    ).all()

    if not pos:
        return None

    today = date.today()
    on_time = sum(
        1 for po in pos if po.expected_delivery_date >= today
        or po.status == "Completed"
    )
    # Refined: treat Completed POs as on-time; others compare expected vs today
    on_time = 0
    for po in pos:
        # If status is Completed we assume it was delivered; we don't have the
        # actual delivery date, so we use expected_delivery_date as a proxy.
        if po.expected_delivery_date >= date.today() - __import__("datetime").timedelta(days=1):
            on_time += 1

    return _pct(on_time, len(pos))


def _calc_on_time_delivery_v2(db: Session, vendor_id: int) -> Optional[Decimal]:
    """Measure on-time delivery from actual receiving evidence when available."""
    all_pos = db.scalars(
        select(PurchaseOrder).where(PurchaseOrder.vendor_id == vendor_id)
    ).all()

    terminal = [po for po in all_pos if po.status in ("Delivered", "Received", "Completed")]
    if not terminal:
        return None

    fulfillment_by_po = {record.purchase_order_id: record for record in db.scalars(select(POFulfillment).where(POFulfillment.purchase_order_id.in_([po.id for po in terminal]))).all()}
    on_time = 0
    for po in terminal:
        actual_date = fulfillment_by_po.get(po.id).actual_delivery_date if po.id in fulfillment_by_po else None
        # Historical records without a receipt retain their legacy terminal outcome;
        # every new receipt is evaluated against its actual delivery date.
        if actual_date is None or actual_date <= po.expected_delivery_date:
            on_time += 1
    return _pct(on_time, len(terminal))


def _calc_quantity_fulfillment(db: Session, vendor_id: int) -> Optional[Decimal]:
    records = db.scalars(
        select(POFulfillment).join(PurchaseOrder).where(
            PurchaseOrder.vendor_id == vendor_id,
            POFulfillment.received_quantity.isnot(None),
        )
    ).all()
    if not records:
        return None
    ordered = sum((record.ordered_quantity for record in records), Decimal("0"))
    accepted = sum(((record.accepted_quantity if record.accepted_quantity is not None else record.received_quantity) for record in records), Decimal("0"))
    if not ordered:
        return None
    return min(Decimal("100"), (accepted / ordered * Decimal("100")).quantize(Decimal("0.01")))


def _calc_quality_acceptance(db: Session, vendor_id: int) -> Optional[Decimal]:
    records = db.scalars(
        select(POFulfillment).join(PurchaseOrder).where(
            PurchaseOrder.vendor_id == vendor_id,
            POFulfillment.quality_status.in_(("Passed", "Conditional", "Failed")),
        )
    ).all()
    if not records:
        return None
    accepted = sum((record.accepted_quantity or Decimal("0") for record in records), Decimal("0"))
    rejected = sum((record.rejected_quantity or Decimal("0") for record in records), Decimal("0"))
    total_checked = accepted + rejected
    if not total_checked:
        return Decimal("100") if all(record.quality_status == "Passed" for record in records) else Decimal("0")
    return (accepted / total_checked * Decimal("100")).quantize(Decimal("0.01"))


def _calc_contract_compliance(db: Session, vendor_id: int) -> Optional[Decimal]:
    """Percentage of vendor contracts that are Compliant."""
    contracts = db.scalars(
        select(Contract).where(Contract.vendor_id == vendor_id)
    ).all()

    if not contracts:
        return None

    compliant = sum(1 for c in contracts if c.compliance_status == "Compliant")
    return _pct(compliant, len(contracts))


def _calc_po_performance(db: Session, vendor_id: int) -> Optional[Decimal]:
    """Percentage of POs with a positive outcome (Accepted / Delivered / Completed).

    Rejected POs count negatively; Created/Sent/In-Progress are neutral (excluded).
    """
    decided = db.scalars(
        select(PurchaseOrder).where(
            PurchaseOrder.vendor_id == vendor_id,
            PurchaseOrder.status.in_(
                ("Accepted", "Delivered", "Completed", "Rejected")
            ),
        )
    ).all()

    if not decided:
        return None

    positive = sum(
        1 for po in decided if po.status in ("Accepted", "Delivered", "Completed")
    )
    return _pct(positive, len(decided))


def _calc_communication_response(db: Session, vendor_id: int) -> Optional[Decimal]:
    """Fraction of messages addressed to any vendor-owned user that were read.

    Uses the PO ↔ Vendor relationship: find all POs for this vendor, then look
    at messages where the receiver is the vendor's creator (the vendor user).
    This is a reasonable proxy given the current messaging model.
    """
    # Get all purchase orders for this vendor
    vendor_pos = db.scalars(
        select(PurchaseOrder.id).where(PurchaseOrder.vendor_id == vendor_id)
    ).all()

    if not vendor_pos:
        return None

    all_messages = db.scalars(
        select(Message).where(
            Message.purchase_order_id.in_(vendor_pos)
        )
    ).all()

    if not all_messages:
        return None

    read = sum(1 for m in all_messages if m.is_read)
    return _pct(read, len(all_messages))


# ---------------------------------------------------------------------------
# Core scoring engine
# ---------------------------------------------------------------------------

def calculate_vendor_score(db: Session, vendor_id: int) -> dict:
    """Calculate reliability score for a vendor.

    Returns a dict with keys:
      score           – Decimal | None
      risk_category   – str
      breakdown       – dict (detailed per-metric data)
      metrics_used    – list[str]
    """
    raw_metrics = {
        "on_time_delivery": _calc_on_time_delivery_v2(db, vendor_id),
        "quantity_fulfillment": _calc_quantity_fulfillment(db, vendor_id),
        "quality_acceptance": _calc_quality_acceptance(db, vendor_id),
        "contract_compliance": _calc_contract_compliance(db, vendor_id),
        "po_performance": _calc_po_performance(db, vendor_id),
        "communication_response": _calc_communication_response(db, vendor_id),
    }

    available_base = {
        k: BASE_WEIGHTS[k] for k, v in raw_metrics.items() if v is not None
    }

    if not available_base:
        # No performance data at all
        return {
            "score": None,
            "risk_category": NOT_YET_RATED,
            "breakdown": {
                "note": "Insufficient performance data. Score will be calculated once vendor has delivery, contract, or PO activity.",
                "metrics": {k: {"value": None, "effective_weight": 0, "available": False} for k in BASE_WEIGHTS},
            },
            "metrics_used": [],
        }

    effective_weights = _redistribute_weights(available_base)

    weighted_sum = Decimal("0")
    for metric, ew in effective_weights.items():
        weighted_sum += raw_metrics[metric] * Decimal(str(ew))

    final_score = weighted_sum.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    # Clamp to [0, 100]
    final_score = max(Decimal("0"), min(Decimal("100"), final_score))

    breakdown = {
        "metrics": {
            k: {
                "value": float(raw_metrics[k]) if raw_metrics[k] is not None else None,
                "base_weight": BASE_WEIGHTS[k],
                "effective_weight": round(effective_weights.get(k, 0), 4),
                "available": raw_metrics[k] is not None,
                "contribution": round(float(raw_metrics[k]) * effective_weights.get(k, 0), 2)
                    if raw_metrics[k] is not None else 0,
            }
            for k in BASE_WEIGHTS
        },
        "total_base_weight_used": round(sum(available_base.values()), 4),
        "metrics_available_count": len(available_base),
        "metrics_total_count": len(BASE_WEIGHTS),
    }

    return {
        "score": final_score,
        "risk_category": _classify_risk(final_score),
        "breakdown": breakdown,
        "metrics_used": list(available_base.keys()),
        "raw_metrics": raw_metrics,
    }


# ---------------------------------------------------------------------------
# Persistence helpers
# ---------------------------------------------------------------------------

def _save_score_to_vendor(db: Session, vendor: Vendor, result: dict) -> None:
    """Update the cached score columns on the Vendor row."""
    vendor.reliability_score = result["score"]
    vendor.risk_category = result["risk_category"]
    vendor.score_breakdown = result["breakdown"]
    vendor.last_calculated_at = datetime.now(timezone.utc)


def _save_history_record(db: Session, vendor_id: int, result: dict) -> VendorReliabilityHistory:
    """Append a VendorReliabilityHistory log entry."""
    raw = result.get("raw_metrics", {})
    record = VendorReliabilityHistory(
        vendor_id=vendor_id,
        score=result["score"],
        risk_category=result["risk_category"],
        on_time_delivery_rate=raw.get("on_time_delivery"),
        contract_compliance_rate=raw.get("contract_compliance"),
        communication_response_rate=raw.get("communication_response"),
        purchase_order_performance_rate=raw.get("po_performance"),
        quantity_fulfillment_rate=raw.get("quantity_fulfillment"),
        quality_acceptance_rate=raw.get("quality_acceptance"),
        breakdown=json.dumps(result["breakdown"], default=str),
    )
    db.add(record)
    return record


# ---------------------------------------------------------------------------
# Public trigger
# ---------------------------------------------------------------------------

def trigger_score_recalculation(
    db: Session,
    vendor_id: int,
    triggered_by_user_id: Optional[int] = None,
) -> dict:
    """Recalculate a vendor's reliability score, risk scores, and persist results."""
    from app.services.notification_service import notify_risk_change
    from app.services.risk_service import calculate_vendor_risk, save_calculated_risk, run_alerts_check

    vendor = db.scalar(select(Vendor).where(Vendor.id == vendor_id))
    if vendor is None:
        return {}

    previous_category = vendor.risk_category
    result = calculate_vendor_score(db, vendor_id)

    # First save reliability scores
    _save_score_to_vendor(db, vendor, result)
    _save_history_record(db, vendor_id, result)

    # Calculate and save risk scores
    risk_result = calculate_vendor_risk(db, vendor_id)
    if risk_result:
        save_calculated_risk(db, vendor_id, risk_result)
        run_alerts_check(db, vendor, risk_result)
        # Update result breakdown with risk details for transparency
        result["breakdown"]["risk_details"] = {
            k: float(v) if isinstance(v, Decimal) else v
            for k, v in risk_result.items()
        }

    db.add(AuditLog(
        user_id=triggered_by_user_id,
        action="Reliability & Risk Recalculated",
        entity="Vendor",
        entity_id=vendor_id,
    ))
    db.flush()

    # Notify managers when risk category changes to High/Critical
    new_category = result["risk_category"]
    if new_category != previous_category and new_category in ("High Risk", "Critical Risk"):
        notify_risk_change(db, vendor, new_category, result["score"])

    return result
