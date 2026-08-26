"""
Vendor Reliability Score calculation.

Reliability Factors (from spec): Delivery History, Product Quality,
Communication Efficiency, Contract Compliance, Purchase History, Issue Resolution.

We compute a 0-100 weighted score from aggregated PerformanceRecord rows
plus contract compliance status. This is intentionally simple/transparent
so it's easy to explain in a demo/viva.
"""
from sqlalchemy.orm import Session
import models


WEIGHTS = {
    "delivery": 0.30,       # on-time vs delayed deliveries
    "quality": 0.20,        # quality rating (0-5 -> 0-100)
    "response": 0.15,       # response time (lower is better)
    "resolution": 0.15,     # issue resolution time (lower is better)
    "completion": 0.10,     # order completion rate
    "compliance": 0.10,     # contract compliance status
}


def _score_from_hours(hours: float, best: float, worst: float) -> float:
    """Linear scale: <=best -> 100, >=worst -> 0."""
    if hours <= best:
        return 100.0
    if hours >= worst:
        return 0.0
    return 100.0 * (worst - hours) / (worst - best)


def calculate_reliability_score(db: Session, vendor_id: int) -> float:
    records = (
        db.query(models.PerformanceRecord)
        .filter(models.PerformanceRecord.vendor_id == vendor_id)
        .all()
    )

    if not records:
        return 0.0

    total_on_time = sum(r.on_time_deliveries for r in records)
    total_delayed = sum(r.delayed_deliveries for r in records)
    total_deliveries = total_on_time + total_delayed
    delivery_score = (100.0 * total_on_time / total_deliveries) if total_deliveries else 50.0

    avg_quality = sum(r.quality_rating for r in records) / len(records)
    quality_score = min(100.0, (avg_quality / 5.0) * 100.0)

    avg_response = sum(r.response_time_hours for r in records) / len(records)
    response_score = _score_from_hours(avg_response, best=2, worst=72)

    avg_resolution = sum(r.issue_resolution_hours for r in records) / len(records)
    resolution_score = _score_from_hours(avg_resolution, best=4, worst=120)

    avg_completion = sum(r.order_completion_rate for r in records) / len(records)
    completion_score = min(100.0, avg_completion)

    contracts = db.query(models.Contract).filter(models.Contract.vendor_id == vendor_id).all()
    if contracts:
        compliant = sum(1 for c in contracts if c.compliance_status == models.ComplianceStatusEnum.COMPLIANT)
        compliance_score = 100.0 * compliant / len(contracts)
    else:
        compliance_score = 70.0  # neutral default when no contract on file yet

    score = (
        delivery_score * WEIGHTS["delivery"]
        + quality_score * WEIGHTS["quality"]
        + response_score * WEIGHTS["response"]
        + resolution_score * WEIGHTS["resolution"]
        + completion_score * WEIGHTS["completion"]
        + compliance_score * WEIGHTS["compliance"]
    )
    return round(score, 2)


def risk_level_from_score(score: float) -> models.RiskLevelEnum:
    if score >= 75:
        return models.RiskLevelEnum.LOW
    if score >= 50:
        return models.RiskLevelEnum.MEDIUM
    return models.RiskLevelEnum.HIGH


def refresh_vendor_score(db: Session, vendor_id: int) -> None:
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        return
    score = calculate_reliability_score(db, vendor_id)
    vendor.reliability_score = score
    vendor.risk_level = risk_level_from_score(score)
    db.commit()
