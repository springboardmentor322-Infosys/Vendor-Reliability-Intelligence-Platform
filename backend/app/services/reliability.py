"""Live vendor reliability scoring computed from weighted performance factors."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.vendor import Vendor
from app.models.vendoriq import ComplianceFlag, Contract
from app.schemas.reliability import ReliabilityFactorBreakdown, VendorRankingEntry, VendorReliabilityScore
from app.services.performance import get_raw_performance

WEIGHTS = {
    "delivery_performance": 30.0,
    "quality": 25.0,
    "communication_response": 15.0,
    "contract_compliance": 15.0,
    "order_completion": 15.0,
}

NEUTRAL_SCORE = 0.0

RECOMMENDATIONS = {
    "High": "Consider alternate supplier, review delivery history",
    "Medium": "Monitor delivery and quality",
    "Low": "Suitable for continued procurement",
    "Unscored": "No operational history yet. Score stays at 0 until POs, deliveries, or inspections are recorded.",
}


def _risk_level(score: float) -> str:
    if score >= 75:
        return "Low"
    if score >= 50:
        return "Medium"
    return "High"


def _recommendation(risk_level: str) -> str:
    return RECOMMENDATIONS.get(risk_level, RECOMMENDATIONS["Medium"])


def _response_time_score(hours: float | None) -> float:
    if hours is None:
        return NEUTRAL_SCORE
    if hours <= 2:
        return 100.0
    if hours <= 8:
        return 85.0
    if hours <= 24:
        return 70.0
    if hours <= 48:
        return 50.0
    return 25.0


def _contract_compliance_score(db: Session, vendor_id: int) -> tuple[float, bool]:
    contracts = list(
        db.scalars(select(Contract).where(Contract.vendor_id == vendor_id))
    )
    if not contracts:
        return NEUTRAL_SCORE, False

    compliant = sum(
        1 for contract in contracts if str(contract.compliance_flag) == ComplianceFlag.COMPLIANT.value
    )
    return round(compliant / len(contracts) * 100, 2), True


def compute_vendor_reliability(db: Session, vendor: Vendor) -> VendorReliabilityScore:
    raw = get_raw_performance(db, vendor)

    delivery_raw = raw.on_time_delivery_pct if raw.on_time_delivery_pct is not None else NEUTRAL_SCORE
    quality_raw = raw.average_quality_score if raw.average_quality_score is not None else NEUTRAL_SCORE
    completion_raw = (
        raw.order_completion_rate if raw.order_completion_rate is not None else NEUTRAL_SCORE
    )
    communication_raw = _response_time_score(raw.average_response_time_hours)
    compliance_raw, has_contracts = _contract_compliance_score(db, vendor.id)

    factor_scores = {
        "delivery_performance": delivery_raw,
        "quality": quality_raw,
        "communication_response": communication_raw,
        "contract_compliance": compliance_raw,
        "order_completion": completion_raw,
    }

    factors: list[ReliabilityFactorBreakdown] = []
    overall = 0.0

    label_map = {
        "delivery_performance": "Delivery Performance",
        "quality": "Quality",
        "communication_response": "Communication / Response",
        "contract_compliance": "Contract Compliance",
        "order_completion": "Order Completion",
    }

    for key, weight in WEIGHTS.items():
        raw_score = round(factor_scores[key], 2)
        weighted = round(raw_score * weight / 100, 2)
        overall += weighted
        factors.append(
            ReliabilityFactorBreakdown(
                factor=label_map[key],
                weight_pct=weight,
                raw_score=raw_score,
                weighted_score=weighted,
            )
        )

    overall_score = round(overall, 2)
    sizes = raw.sample_sizes
    has_history = any(
        [
            sizes.deliveries,
            sizes.quality_inspections,
            sizes.purchase_orders,
            sizes.response_pairs,
            has_contracts,
        ]
    )
    risk_level = "Unscored" if not has_history else _risk_level(overall_score)

    return VendorReliabilityScore(
        vendor_id=vendor.id,
        vendor_name=vendor.name,
        overall_score=overall_score,
        risk_level=risk_level,
        recommendation=_recommendation(risk_level),
        factors=factors,
    )


def compute_vendor_ranking(db: Session) -> list[VendorRankingEntry]:
    vendors = list(db.scalars(select(Vendor).order_by(Vendor.name)))
    scored = [compute_vendor_reliability(db, vendor) for vendor in vendors]
    scored.sort(key=lambda entry: (-entry.overall_score, entry.vendor_name.lower()))

    return [
        VendorRankingEntry(
            rank=index,
            vendor_id=entry.vendor_id,
            vendor_name=entry.vendor_name,
            overall_score=entry.overall_score,
            risk_level=entry.risk_level,
        )
        for index, entry in enumerate(scored, start=1)
    ]
