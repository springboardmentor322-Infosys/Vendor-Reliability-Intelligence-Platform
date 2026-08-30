"""
Vendor Reliability Module - turns raw performance data into a single
0-100 reliability score, using the factors named in the spec:
Delivery History, Product Quality, Communication Efficiency,
Contract Compliance, Issue Resolution.

This is a transparent weighted-average model (easy to explain to a
vendor who asks "why is my score X") rather than a black box - that
matters for a procurement risk tool people have to trust and audit.
"""
from sqlalchemy.orm import Session

from app.models.performance import PerformanceRecord
from app.models.contract import Contract, ContractStatus
from app.models.vendor import Vendor

# Weights sum to 1.0 - tune these as the business prioritizes differently.
WEIGHTS = {
    "delivery": 0.30,       # on-time delivery rate
    "quality": 0.25,        # product/service quality rating
    "completion": 0.20,     # order completion rate
    "responsiveness": 0.15, # communication + issue resolution speed
    "compliance": 0.10,     # contract compliance
}


def _score_delivery(records: list[PerformanceRecord]) -> float:
    on_time = sum(r.on_time_deliveries or 0 for r in records)
    delayed = sum(r.delayed_deliveries or 0 for r in records)
    total = on_time + delayed
    if total == 0:
        return 50.0  # neutral default until we have data
    return (on_time / total) * 100


def _score_quality(records: list[PerformanceRecord]) -> float:
    ratings = [r.quality_rating for r in records if r.quality_rating is not None]
    if not ratings:
        return 50.0
    avg = sum(ratings) / len(ratings)  # 0-5 scale
    return (avg / 5) * 100


def _score_completion(records: list[PerformanceRecord]) -> float:
    rates = [r.order_completion_rate for r in records if r.order_completion_rate is not None]
    if not rates:
        return 50.0
    return sum(rates) / len(rates)


def _score_responsiveness(records: list[PerformanceRecord]) -> float:
    """Faster response/resolution times -> higher score. Uses a simple decay curve."""
    response_times = [r.response_time_hours for r in records if r.response_time_hours is not None]
    resolution_times = [r.issue_resolution_hours for r in records if r.issue_resolution_hours is not None]

    def decay(hours_list: list[float], midpoint: float) -> float:
        if not hours_list:
            return 50.0
        avg = sum(hours_list) / len(hours_list)
        # score = 100 at 0 hours, ~50 at `midpoint` hours, approaching 0 for very slow responses
        return max(0.0, min(100.0, 100 * (midpoint / (midpoint + avg))))

    return (decay(response_times, midpoint=8) + decay(resolution_times, midpoint=24)) / 2


def _score_compliance(contracts: list[Contract]) -> float:
    if not contracts:
        return 50.0
    relevant = [c for c in contracts if c.status != ContractStatus.TERMINATED]
    if not relevant:
        return 50.0
    compliant = sum(1 for c in relevant if c.is_compliant)
    return (compliant / len(relevant)) * 100


def recompute_reliability_score(db: Session, vendor_id) -> float:
    records = db.query(PerformanceRecord).filter(PerformanceRecord.vendor_id == vendor_id).all()
    contracts = db.query(Contract).filter(Contract.vendor_id == vendor_id).all()

    breakdown = {
        "delivery": _score_delivery(records),
        "quality": _score_quality(records),
        "completion": _score_completion(records),
        "responsiveness": _score_responsiveness(records),
        "compliance": _score_compliance(contracts),
    }

    total = sum(breakdown[k] * WEIGHTS[k] for k in WEIGHTS)
    total = round(max(0.0, min(100.0, total)), 1)

    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if vendor:
        vendor.reliability_score = total
        db.commit()

    return total
