"""
recommendations.py — turns a vendor's reliability score, performance history
and contract compliance into concrete, explainable recommendations.

Deliberately rule-based rather than ML: every recommendation traces back to
a specific number crossing a specific threshold, which keeps it consistent
with the "explainable scoring" idea used throughout VendorIQ (see
reliability.py and the "One score, six inputs" section of the landing page).
It also means it works from day one, without needing training data.
"""
from typing import List
from sqlalchemy.orm import Session

import models

# Thresholds are intentionally the same ballpark as reliability.py's scoring
# curve (see WEIGHTS / _score_from_hours), so the recommendations agree with
# what the score itself is already saying.
QUALITY_LOW_THRESHOLD = 3.0            # out of 5
RESPONSE_SLOW_THRESHOLD_HOURS = 48
RESOLUTION_SLOW_THRESHOLD_HOURS = 96
DELAYED_RATIO_HIGH_THRESHOLD = 0.25    # 25% or more deliveries late


def generate_recommendations(db: Session, vendor_id: int) -> List[str]:
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        return []

    recs: List[str] = []

    # ---- Overall risk-level guidance ----
    if vendor.risk_level == models.RiskLevelEnum.HIGH:
        recs.append(
            "High risk overall — consider capping new order volume with this vendor and "
            "evaluating an alternate supplier in the same category until scores improve."
        )
    elif vendor.risk_level == models.RiskLevelEnum.MEDIUM:
        recs.append(
            "Medium risk — suitable for continued orders, but schedule a performance review "
            "before renewing or expanding this contract."
        )
    else:
        recs.append(
            "Low risk — consistently reliable. A reasonable candidate for expanded volume or "
            "a longer-term contract."
        )

    # ---- Performance-record-driven specifics ----
    records = (
        db.query(models.PerformanceRecord)
        .filter(models.PerformanceRecord.vendor_id == vendor_id)
        .all()
    )

    if not records:
        recs.append("No performance history logged yet — record at least one performance "
                     "entry before relying on this vendor for time-sensitive orders.")
    else:
        total_on_time = sum(r.on_time_deliveries for r in records)
        total_delayed = sum(r.delayed_deliveries for r in records)
        total_deliveries = total_on_time + total_delayed
        if total_deliveries > 0:
            delayed_ratio = total_delayed / total_deliveries
            if delayed_ratio >= DELAYED_RATIO_HIGH_THRESHOLD:
                recs.append(
                    f"{delayed_ratio:.0%} of deliveries have been late — raise this directly with "
                    "the vendor and consider building buffer time into future delivery dates."
                )

        avg_quality = sum(r.quality_rating for r in records) / len(records)
        if avg_quality < QUALITY_LOW_THRESHOLD:
            recs.append(
                f"Average quality rating is {avg_quality:.1f}/5, below an acceptable threshold — "
                "a quality audit or corrective action request is warranted."
            )

        avg_response = sum(r.response_time_hours for r in records) / len(records)
        if avg_response > RESPONSE_SLOW_THRESHOLD_HOURS:
            recs.append(
                f"Average response time is {avg_response:.0f} hours — set a clearer SLA for "
                "communication turnaround with this vendor."
            )

        avg_resolution = sum(r.issue_resolution_hours for r in records) / len(records)
        if avg_resolution > RESOLUTION_SLOW_THRESHOLD_HOURS:
            recs.append(
                f"Issue resolution is taking {avg_resolution:.0f} hours on average — confirm "
                "the vendor has an adequate support escalation path."
            )

        # Lightweight trend signal: compare the most recent record's quality
        # and delivery reliability against the vendor's own historical average.
        if len(records) >= 2:
            sorted_records = sorted(records, key=lambda r: r.recorded_at)
            latest = sorted_records[-1]
            historical = sorted_records[:-1]
            hist_avg_quality = sum(r.quality_rating for r in historical) / len(historical)
            if latest.quality_rating < hist_avg_quality - 0.5:
                recs.append(
                    "Quality has declined in the most recent record compared to this vendor's "
                    "own historical average — worth confirming this isn't the start of a trend."
                )
            elif latest.quality_rating > hist_avg_quality + 0.5:
                recs.append(
                    "Quality has improved in the most recent record compared to this vendor's "
                    "own historical average — a good sign if it holds."
                )

    # ---- Contract compliance ----
    contracts = db.query(models.Contract).filter(models.Contract.vendor_id == vendor_id).all()
    non_compliant = [c for c in contracts if c.compliance_status == models.ComplianceStatusEnum.NON_COMPLIANT]
    if non_compliant:
        recs.append(
            f"{len(non_compliant)} contract(s) are currently marked Non-Compliant — resolve "
            "before placing further orders under those agreements."
        )

    return recs
