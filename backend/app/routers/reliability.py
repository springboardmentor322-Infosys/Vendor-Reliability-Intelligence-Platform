"""Vendor Reliability & Performance APIs for VendorIQ."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import cast, Date, func, select
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.database import get_db
from app.models import Vendor, VendorReliabilityHistory, Notification
from app.services.milestone_two import can, fail, item_or_404
from app.services.reliability_service import (
    NOT_YET_RATED,
    calculate_vendor_score,
    trigger_score_recalculation,
)
from app.services.risk_service import calculate_vendor_risk, save_calculated_risk, run_alerts_check, get_risk_weights

router = APIRouter(prefix="/api/v1/vendors", tags=["Vendor Reliability"])

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[object, Depends(get_current_user)]


def _vendor_accessible(user, vendor: Vendor) -> bool:
    """Check if the current user can access this vendor's intelligence data."""
    if can(user, "Administrator", "Procurement Manager", "Supply Chain Manager",
           "Finance Officer", "Auditor"):
        return True
    # Vendor users can only see their own vendor record
    if can(user, "Vendor") and getattr(user, "vendor_id", None) == vendor.id:
        return True
    return False


@router.get("/{vendor_id}/reliability", summary="Get vendor reliability score and breakdown")
def get_vendor_reliability(vendor_id: int, db: DatabaseSession, user: CurrentUser):
    """Return the current reliability score, risk category, and metric breakdown.

    Returns score=null and risk_category='Not Yet Rated' when insufficient
    performance data is available.
    """
    vendor = item_or_404(db, Vendor, vendor_id)
    if not _vendor_accessible(user, vendor):
        fail(403, "You do not have permission to view this vendor's reliability data.")

    # Return cached if available, otherwise compute on-the-fly without persisting
    if vendor.last_calculated_at is not None:
        return {
            "vendor_id": vendor.id,
            "company_name": vendor.company_name,
            "score": float(vendor.reliability_score) if vendor.reliability_score is not None else None,
            "risk_category": vendor.risk_category or NOT_YET_RATED,
            "breakdown": vendor.score_breakdown,
            "last_calculated_at": vendor.last_calculated_at,
        }

    # No cached score yet — calculate on-the-fly (read-only, no persist)
    result = calculate_vendor_score(db, vendor_id)
    return {
        "vendor_id": vendor.id,
        "company_name": vendor.company_name,
        "score": float(result["score"]) if result["score"] is not None else None,
        "risk_category": result["risk_category"],
        "breakdown": result["breakdown"],
        "last_calculated_at": None,
    }


@router.post("/{vendor_id}/reliability/recalculate", summary="Trigger reliability recalculation")
def recalculate_vendor_reliability(vendor_id: int, db: DatabaseSession, user: CurrentUser):
    """Force a reliability recalculation and persist the new score.

    Restricted to Administrators and Procurement Managers.
    """
    if not can(user, "Administrator", "Procurement Manager"):
        fail(403, "Only Administrators and Procurement Managers can trigger recalculations.")
    vendor = item_or_404(db, Vendor, vendor_id)
    result = trigger_score_recalculation(db, vendor_id, triggered_by_user_id=user.id)
    db.commit()
    return {
        "vendor_id": vendor_id,
        "company_name": vendor.company_name,
        "score": float(result["score"]) if result["score"] is not None else None,
        "risk_category": result["risk_category"],
        "breakdown": result["breakdown"],
    }


@router.get("/{vendor_id}/reliability/history", summary="Get vendor reliability history")
def get_vendor_reliability_history(
    vendor_id: int,
    db: DatabaseSession,
    user: CurrentUser,
    limit: int = Query(20, ge=1, le=100),
):
    """Return the reliability score evaluation history for a vendor."""
    vendor = item_or_404(db, Vendor, vendor_id)
    if not _vendor_accessible(user, vendor):
        fail(403, "You do not have permission to view this vendor's history.")

    records = db.scalars(
        select(VendorReliabilityHistory)
        .where(VendorReliabilityHistory.vendor_id == vendor_id)
        .order_by(VendorReliabilityHistory.created_at.desc())
        .limit(limit)
    ).all()

    return [
        {
            "id": r.id,
            "score": float(r.score) if r.score is not None else None,
            "risk_category": r.risk_category,
            "on_time_delivery_rate": float(r.on_time_delivery_rate) if r.on_time_delivery_rate is not None else None,
            "contract_compliance_rate": float(r.contract_compliance_rate) if r.contract_compliance_rate is not None else None,
            "communication_response_rate": float(r.communication_response_rate) if r.communication_response_rate is not None else None,
            "purchase_order_performance_rate": float(r.purchase_order_performance_rate) if r.purchase_order_performance_rate is not None else None,
            "quantity_fulfillment_rate": float(r.quantity_fulfillment_rate) if r.quantity_fulfillment_rate is not None else None,
            "quality_acceptance_rate": float(r.quality_acceptance_rate) if r.quality_acceptance_rate is not None else None,
            "created_at": r.created_at,
        }
        for r in records
    ]


@router.get("/risk/history-trend", summary="Vendor risk and reliability transition history")
def get_risk_history_trend(
    db: DatabaseSession,
    user: CurrentUser,
    limit: int = Query(20, ge=1, le=100),
):
    """Return historical risk transitions and daily evaluation aggregates for governance & auditor dashboards."""
    if not can(user, "Administrator", "Auditor", "Procurement Manager", "Supply Chain Manager", "Finance Officer"):
        fail(403, "You do not have permission to view risk transition history.")

    statement = (
        select(VendorReliabilityHistory, Vendor.company_name)
        .join(Vendor, Vendor.id == VendorReliabilityHistory.vendor_id)
        .order_by(VendorReliabilityHistory.created_at.desc())
        .limit(limit)
    )
    records = db.execute(statement).all()
    transitions = [
        {
            "id": r[0].id,
            "vendor_id": r[0].vendor_id,
            "vendor_name": r[1],
            "score": float(r[0].score) if r[0].score is not None else None,
            "risk_category": r[0].risk_category,
            "on_time_delivery_rate": float(r[0].on_time_delivery_rate) if r[0].on_time_delivery_rate is not None else None,
            "contract_compliance_rate": float(r[0].contract_compliance_rate) if r[0].contract_compliance_rate is not None else None,
            "quality_acceptance_rate": float(r[0].quality_acceptance_rate) if r[0].quality_acceptance_rate is not None else None,
            "created_at": r[0].created_at,
        }
        for r in records
    ]

    day_col = cast(VendorReliabilityHistory.created_at, Date)
    daily_rows = db.execute(
        select(
            day_col,
            func.count(VendorReliabilityHistory.id),
            func.avg(VendorReliabilityHistory.score),
        )
        .group_by(day_col)
        .order_by(day_col.desc())
        .limit(14)
    ).all()
    daily_trend = [
        {
            "date": str(r[0]),
            "evaluations_count": r[1],
            "avg_score": round(float(r[2]), 2) if r[2] is not None else None,
        }
        for r in reversed(daily_rows)
    ]

    cat_counts_rows = db.execute(
        select(VendorReliabilityHistory.risk_category, func.count(VendorReliabilityHistory.id))
        .group_by(VendorReliabilityHistory.risk_category)
    ).all()
    history_by_category = {r[0]: r[1] for r in cat_counts_rows}

    return {
        "transitions": transitions,
        "daily_trend": daily_trend,
        "history_by_category": history_by_category,
        "total_evaluations": sum(history_by_category.values()),
    }


@router.get("/performance/summary", summary="Vendor performance summary for dashboard")
def get_performance_summary(db: DatabaseSession, user: CurrentUser):
    """Return aggregate vendor performance statistics for the dashboard."""
    if not can(user, "Administrator", "Procurement Manager", "Supply Chain Manager",
               "Finance Officer", "Auditor"):
        fail(403, "You do not have permission to view performance summaries.")

    vendors = db.scalars(select(Vendor)).all()
    total = len(vendors)
    rated = [v for v in vendors if v.reliability_score is not None]
    avg_score = (
        float(sum(v.reliability_score for v in rated) / len(rated))
        if rated else None
    )

    risk_dist = {"Low Risk": 0, "Medium Risk": 0, "High Risk": 0, "Critical Risk": 0, NOT_YET_RATED: 0}
    for v in vendors:
        cat = v.risk_category or NOT_YET_RATED
        risk_dist[cat] = risk_dist.get(cat, 0) + 1

    return {
        "total_vendors": total,
        "rated_vendors": len(rated),
        "unrated_vendors": total - len(rated),
        "average_score": round(avg_score, 2) if avg_score is not None else None,
        "risk_distribution": risk_dist,
        "high_risk_count": risk_dist.get("High Risk", 0) + risk_dist.get("Critical Risk", 0),
    }


@router.get("/performance/ranking", summary="Vendor reliability ranking")
def get_vendor_ranking(
    db: DatabaseSession,
    user: CurrentUser,
    limit: int = Query(10, ge=1, le=50),
):
    """Return top vendors ranked by reliability score (highest first)."""
    if not can(user, "Administrator", "Procurement Manager", "Supply Chain Manager",
               "Finance Officer", "Auditor"):
        fail(403, "You do not have permission to view vendor rankings.")

    vendors = db.scalars(
        select(Vendor)
        .where(Vendor.reliability_score.isnot(None))
        .order_by(Vendor.reliability_score.desc())
        .limit(limit)
    ).all()

    return [
        {
            "rank": idx + 1,
            "vendor_id": v.id,
            "company_name": v.company_name,
            "approval_status": v.approval_status,
            "score": float(v.reliability_score),
            "risk_category": v.risk_category,
            "last_calculated_at": v.last_calculated_at,
        }
        for idx, v in enumerate(vendors)
    ]


@router.get("/{vendor_id}/risk", summary="Get vendor multi-dimensional risk scores")
def get_vendor_risk(vendor_id: int, db: DatabaseSession, user: CurrentUser):
    vendor = item_or_404(db, Vendor, vendor_id)
    if not _vendor_accessible(user, vendor):
        fail(403, "You do not have permission to view this vendor's risk data.")

    risk = calculate_vendor_risk(db, vendor_id)
    weights = get_risk_weights()
    return {
        "vendor_id": vendor.id,
        "company_name": vendor.company_name,
        "overall_risk_score": float(vendor.overall_risk_score) if vendor.overall_risk_score is not None else float(risk.get("overall_risk_score", 0.0)),
        "risk_level": vendor.risk_level or risk.get("risk_level", "LOW"),
        "risk_explanation": vendor.risk_explanation or risk.get("risk_explanation", ""),
        "risk_trend": vendor.risk_trend or risk.get("risk_trend", "→ Stable"),
        "early_warning": vendor.early_warning or risk.get("early_warning", ""),
        "operational_risk_score": float(vendor.operational_risk_score) if vendor.operational_risk_score is not None else float(risk.get("operational_risk_score", 0.0)),
        "compliance_risk_score": float(vendor.compliance_risk_score) if vendor.compliance_risk_score is not None else float(risk.get("compliance_risk_score", 0.0)),
        "financial_risk_score": float(vendor.financial_risk_score) if vendor.financial_risk_score is not None else float(risk.get("financial_risk_score", 0.0)),
        "cyber_risk_score": float(vendor.cyber_risk_score) if vendor.cyber_risk_score is not None else float(risk.get("cyber_risk_score", 0.0)),
        "dependency_risk_score": float(vendor.dependency_risk_score) if vendor.dependency_risk_score is not None else float(risk.get("dependency_risk_score", 0.0)),
        "blast_radius_level": vendor.blast_radius_level or risk.get("blast_radius_level", "LOW"),
        "blast_radius_explanation": vendor.blast_radius_explanation or risk.get("blast_radius_explanation", ""),
        "financial_health_indicator": vendor.financial_health_indicator or "Healthy",
        "security_assessment_status": vendor.security_assessment_status or "Passed",
        "security_certification_status": vendor.security_certification_status or "Certified",
        "security_incidents_count": vendor.security_incidents_count or 0,
        "alternative_vendors_count": vendor.alternative_vendors_count or 1,
        "is_critical_supplier": vendor.is_critical_supplier or False,
        "outstanding_exposure": float(vendor.outstanding_exposure) if vendor.outstanding_exposure is not None else float(risk.get("outstanding_exposure", 0.0)),
        "active_pos_count": risk.get("active_pos_count", 0),
        "affected_depts_count": risk.get("affected_depts_count", 0),
        "delayed_pos_count": risk.get("delayed_pos_count", 0),
        "sla_violations_count": risk.get("sla_violations_count", 0),
        "recommendations": risk.get("recommendations", ["Continue standard monitoring."]),
        "weights": {k: float(v) for k, v in weights.items()}
    }


@router.post("/{vendor_id}/risk/recalculate", summary="Trigger manual risk recalculation")
def recalculate_vendor_risk_route(vendor_id: int, db: DatabaseSession, user: CurrentUser):
    if not can(user, "Administrator", "Procurement Manager"):
        fail(403, "Only Administrators and Procurement Managers can trigger evidence-based risk recalculation.")
    vendor = item_or_404(db, Vendor, vendor_id)
    result = trigger_score_recalculation(db, vendor_id, triggered_by_user_id=user.id)
    db.commit()
    return {"message": "Recalculation complete", "vendor_id": vendor_id}


@router.get("/risk/summary", summary="Get overall executive risk summary")
def get_executive_risk_summary(db: DatabaseSession, user: CurrentUser):
    if not can(user, "Administrator", "Procurement Manager", "Supply Chain Manager", "Finance Officer", "Auditor"):
        fail(403, "You do not have permission to view executive risk summaries.")

    vendors = db.scalars(select(Vendor)).all()
    total_vendors = len(vendors)
    
    low_risk = 0
    med_risk = 0
    high_risk = 0
    crit_risk = 0
    deteriorating = 0
    critical_dependencies = 0
    total_exposure = Decimal("0.0")

    for v in vendors:
        level = v.risk_level or "LOW"
        if level == "LOW":
            low_risk += 1
        elif level == "MEDIUM":
            med_risk += 1
        elif level == "HIGH":
            high_risk += 1
        elif level == "CRITICAL":
            crit_risk += 1

        if v.risk_trend == "↑ Increasing Risk":
            deteriorating += 1

        if v.is_critical_supplier or (v.blast_radius_level in ("HIGH", "CRITICAL")):
            critical_dependencies += 1

        if v.outstanding_exposure is not None:
            total_exposure += v.outstanding_exposure

    # At risk POs count (POs linked to HIGH/CRITICAL risk vendors)
    at_risk_vendors = [v.id for v in vendors if (v.risk_level in ("HIGH", "CRITICAL"))]
    at_risk_pos_count = 0
    if at_risk_vendors:
        at_risk_pos_count = db.scalar(
            select(func.count(PurchaseOrder.id)).where(
                PurchaseOrder.vendor_id.in_(at_risk_vendors),
                PurchaseOrder.status.in_((
                    "Created", "Sent", "Accepted", "In Progress", "Processing",
                    "Ready for Shipment", "Shipped", "Delivered", "Received",
                ))
            )
        ) or 0

    # Contract compliance issues count
    contract_compliance_issues = db.scalar(
        select(func.count(Contract.id)).where(Contract.compliance_status == "Non-Compliant")
    ) or 0

    return {
        "total_vendors": total_vendors,
        "low_risk_count": low_risk,
        "medium_risk_count": med_risk,
        "high_risk_count": high_risk,
        "critical_risk_count": crit_risk,
        "deteriorating_count": deteriorating,
        "at_risk_pos_count": at_risk_pos_count,
        "contract_compliance_issues": contract_compliance_issues,
        "total_procurement_exposure": float(total_exposure),
        "critical_dependencies_count": critical_dependencies,
    }


@router.get("/risk/alerts", summary="Get all system risk alerts")
def get_risk_alerts(db: DatabaseSession, user: CurrentUser):
    statement = select(Notification).where(
        Notification.severity.in_(("warning", "error", "critical"))
    ).order_by(Notification.created_at.desc())
    
    if can(user, "Vendor") and not can(user, "Administrator", "Procurement Manager", "Supply Chain Manager", "Finance Officer", "Auditor"):
        if user.vendor_id is None:
            fail(403, "This Vendor account is not linked to a vendor company.")
        statement = statement.where(Notification.related_entity_id == user.vendor_id)
    elif not can(user, "Administrator", "Auditor", "Procurement Manager", "Supply Chain Manager", "Finance Officer"):
        statement = statement.where(Notification.recipient_id == user.id)

    alerts = db.scalars(statement).all()
    return [
        {
            "id": a.id,
            "severity": a.severity.upper(),
            "title": a.title,
            "reason": a.message,
            "type": a.type,
            "related_entity": a.related_entity,
            "related_entity_id": a.related_entity_id,
            "is_read": a.is_read,
            "created_at": a.created_at,
        }
        for a in alerts
    ]


@router.post("/risk/alerts/{alert_id}/resolve", summary="Resolve a risk alert")
def resolve_risk_alert(alert_id: int, db: DatabaseSession, user: CurrentUser):
    if not can(user, "Administrator", "Procurement Manager", "Supply Chain Manager", "Finance Officer"):
        fail(403, "You do not have permission to resolve alerts.")
    alert = item_or_404(db, Notification, alert_id)
    alert.is_read = True
    db.commit()
    return {"message": "Alert resolved successfully"}
