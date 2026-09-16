"""Vendor Risk Engine Service for VendorIQ.

Calculates multi-dimensional, deterministic risk scores:
  - Operational Risk (25%)
  - Compliance Risk (20%)
  - Financial Risk (20%)
  - Cyber/Security Risk (15%)
  - Dependency Risk (20%)
"""

from __future__ import annotations

import json
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    AuditLog,
    Contract,
    Notification,
    POFulfillment,
    PurchaseOrder,
    Vendor,
    VendorReliabilityHistory,
)
from app.services.reliability_service import (
    _calc_on_time_delivery_v2,
    _calc_contract_compliance,
    _calc_po_performance,
    _calc_communication_response,
)

# Centralized configurations for weights to support flexibility
RISK_WEIGHTS = {
    "operational": Decimal("0.25"),
    "compliance": Decimal("0.20"),
    "financial": Decimal("0.20"),
    "cyber": Decimal("0.15"),
    "dependency": Decimal("0.20"),
}


def get_risk_weights() -> dict[str, Decimal]:
    """Expose centralized weights config."""
    return RISK_WEIGHTS


def classify_risk_level(score: Decimal) -> str:
    """Map overall risk score to levels: LOW, MEDIUM, HIGH, CRITICAL."""
    s = float(score)
    if s < 25:
        return "LOW"
    elif s < 50:
        return "MEDIUM"
    elif s < 75:
        return "HIGH"
    else:
        return "CRITICAL"


def classify_blast_radius(score: Decimal) -> str:
    """Map dependency risk score to levels: LOW, MEDIUM, HIGH, CRITICAL."""
    s = float(score)
    if s < 25:
        return "LOW"
    elif s < 50:
        return "MEDIUM"
    elif s < 75:
        return "HIGH"
    else:
        return "CRITICAL"


def calculate_vendor_risk(db: Session, vendor_id: int) -> dict[str, Any]:
    """Calculate multi-dimensional risk for a vendor deterministically."""
    vendor = db.scalar(select(Vendor).where(Vendor.id == vendor_id))
    if not vendor:
        return {}

    # Load performance metrics
    on_time_delivery_rate = _calc_on_time_delivery_v2(db, vendor_id)
    contract_compliance_rate = _calc_contract_compliance(db, vendor_id)
    po_performance_rate = _calc_po_performance(db, vendor_id)
    comm_response_rate = _calc_communication_response(db, vendor_id)

    # Fetch active POs and Contracts
    pos = db.scalars(
        select(PurchaseOrder).where(PurchaseOrder.vendor_id == vendor_id)
    ).all()
    contracts = db.scalars(
        select(Contract).where(Contract.vendor_id == vendor_id)
    ).all()

    today = date.today()
    # Commercial exposure and delivery risk remain open until operational
    # receiving has been completed.  Keep this aligned with the supported PO
    # lifecycle, including the vendor fulfillment milestones.
    active_po_statuses = (
        "Created", "Sent", "Accepted", "In Progress", "Processing",
        "Ready for Shipment", "Shipped", "Delivered", "Received",
    )
    active_pos = [po for po in pos if po.status in active_po_statuses]

    # Calculate drivers
    delayed_orders_count = sum(
        1 for po in active_pos if po.expected_delivery_date < today
    )
    fulfillment_records = db.scalars(
        select(POFulfillment).where(POFulfillment.purchase_order_id.in_([po.id for po in pos]))
    ).all() if pos else []
    # Receiving records are the primary SLA evidence; an outright supplier
    # rejection is also an operational breach.
    sla_violations_count = sum(int(record.sla_violations or 0) for record in fulfillment_records) + sum(1 for po in pos if po.status == "Rejected")

    # 1. Operational Risk (0-100)
    # Based on: On-time delivery rate, delayed POs, SLA violations
    on_time_delivery_score = 100.0 - float(on_time_delivery_rate) if on_time_delivery_rate is not None else 20.0
    po_rejection_rate = 100.0 - float(po_performance_rate) if po_performance_rate is not None else 0.0
    delayed_penalty = float(delayed_orders_count) * 15.0
    sla_penalty = float(sla_violations_count) * 20.0
    operational_risk = min(100.0, max(0.0, 0.4 * on_time_delivery_score + 0.3 * po_rejection_rate + 0.3 * (delayed_penalty + sla_penalty)))

    # 2. Compliance Risk (0-100)
    # Based on: Contract compliance rate, expiring/expired contracts, missing documentation
    compliance_base_score = 100.0 - float(contract_compliance_rate) if contract_compliance_rate is not None else 20.0
    
    expiry_penalty = 0.0
    non_compliant_penalty = 0.0
    for contract in contracts:
        days_to_expiry = (contract.end_date - today).days
        if days_to_expiry < 0:
            expiry_penalty = max(expiry_penalty, 60.0)
        elif days_to_expiry <= 30:
            expiry_penalty = max(expiry_penalty, 30.0)
        elif days_to_expiry <= 60:
            expiry_penalty = max(expiry_penalty, 15.0)

        if contract.compliance_status == "Non-Compliant":
            non_compliant_penalty = max(non_compliant_penalty, 30.0)

    missing_docs_penalty = 0.0
    if (vendor.security_certification_status or "None") in ("None", "Expired"):
        missing_docs_penalty = 25.0

    compliance_risk = min(100.0, max(0.0, 0.4 * compliance_base_score + 0.6 * (expiry_penalty + non_compliant_penalty + missing_docs_penalty)))

    # 3. Financial Risk (0-100)
    # Based on: Financial health indicator, payment issues, outstanding exposure
    health_score_map = {"Critical": 90.0, "Medium Risk": 50.0, "Healthy": 10.0}
    financial_health_score = health_score_map.get(vendor.financial_health_indicator or "Healthy", 10.0)
    
    outstanding_exposure_val = sum(Decimal(str(po.total_amount)) for po in active_pos)
    exposure_penalty = 0.0
    if outstanding_exposure_val > 2500000:
        exposure_penalty = 40.0
    elif outstanding_exposure_val > 1000000:
        exposure_penalty = 25.0
    elif outstanding_exposure_val > 500000:
        exposure_penalty = 15.0

    payment_issues_penalty = min(40.0, float(vendor.payment_issues_count or 0) * 20.0)
    financial_risk = min(100.0, max(0.0, financial_health_score + exposure_penalty + payment_issues_penalty))

    # 4. Cyber/Security Risk (0-100)
    # Based on: Security assessment status, certification status, security incidents
    assessment_map = {"Failed": 90.0, "Pending": 50.0, "Passed": 10.0}
    security_assessment_score = assessment_map.get(vendor.security_assessment_status or "Passed", 10.0)

    cert_map = {"None": 40.0, "Expired": 60.0, "Certified": 10.0}
    security_cert_score = cert_map.get(vendor.security_certification_status or "Certified", 10.0)

    incidents_penalty = min(50.0, float(vendor.security_incidents_count or 0) * 25.0)
    cyber_risk = min(100.0, max(0.0, security_assessment_score + security_cert_score + incidents_penalty))

    # 5. Dependency Risk / Blast Radius (0-100)
    # Based on: Active POs count, total PO exposure, affected departments, alternates, criticality
    active_po_penalty = min(30.0, float(len(active_pos)) * 3.0)
    exposure_pct_penalty = min(30.0, float(outstanding_exposure_val) / 100000.0)
    
    # Calculate affected departments
    departments = {po.procurement_request.department for po in active_pos if po.procurement_request}
    depts_penalty = min(20.0, float(len(departments)) * 5.0)

    critical_supplier_penalty = 30.0 if vendor.is_critical_supplier else 0.0
    
    alt_count = vendor.alternative_vendors_count if vendor.alternative_vendors_count is not None else 1
    alternates_penalty = 30.0 if alt_count == 0 else (15.0 if alt_count == 1 else 0.0)

    dependency_risk = min(100.0, max(0.0, active_po_penalty + exposure_pct_penalty + depts_penalty + critical_supplier_penalty + alternates_penalty))

    # Calculate overall risk score using configurations
    overall_risk_score = (
        RISK_WEIGHTS["operational"] * Decimal(str(operational_risk)) +
        RISK_WEIGHTS["compliance"] * Decimal(str(compliance_risk)) +
        RISK_WEIGHTS["financial"] * Decimal(str(financial_risk)) +
        RISK_WEIGHTS["cyber"] * Decimal(str(cyber_risk)) +
        RISK_WEIGHTS["dependency"] * Decimal(str(dependency_risk))
    )

    overall_risk_score = min(Decimal("100.0"), max(Decimal("0.0"), overall_risk_score))
    risk_lvl = classify_risk_level(overall_risk_score)

    # 6. Blast Radius Explanation
    blast_lvl = classify_blast_radius(Decimal(str(dependency_risk)))
    blast_radius_explanation = (
        f"If {vendor.company_name} fails, {len(active_pos)} active purchase orders with an outstanding "
        f"exposure of ₹{float(outstanding_exposure_val):,.2f} may be affected across {len(departments)} departments."
    )

    # 7. Main Risk Drivers Explanation
    drivers = []
    if on_time_delivery_rate is not None and on_time_delivery_rate < 85:
        drivers.append(f"On-time delivery is {float(on_time_delivery_rate):.0f}% based on recorded receipts.")
    if delayed_orders_count:
        drivers.append(f"{delayed_orders_count} active purchase order(s) are past their expected delivery date.")
    if sla_violations_count:
        drivers.append(f"{sla_violations_count} recorded SLA violation(s) or supplier rejection(s) require review.")
    if operational_risk > 50:
        drivers.append(f"Operational risk is elevated ({operational_risk:.0f}%) from delivery and fulfillment evidence.")
    if compliance_risk > 50:
        drivers.append(f"Compliance risk is high ({compliance_risk:.0f}%) due to non-compliant or expiring contracts.")
    if financial_risk > 50:
        drivers.append(f"Financial exposure is high ({financial_risk:.0f}%) based on internal payment disputes and exposure.")
    if cyber_risk > 50:
        drivers.append(f"Cybersecurity risk is high ({cyber_risk:.0f}%) due to failed assessments or incidents.")
    if dependency_risk > 50:
        drivers.append(f"Dependency risk is high ({dependency_risk:.0f}%) with ₹{float(outstanding_exposure_val):,.0f} exposed and lack of alternate suppliers.")

    if not drivers:
        drivers.append("All risk dimensions are currently within acceptable thresholds.")

    risk_explanation = "\n".join(drivers)

    # 8. Actionable recommendations
    recommendations = []
    if operational_risk > 40:
        recommendations.append("Schedule vendor performance review.")
    if compliance_risk > 50:
        recommendations.append("Renew contract immediately / Request updated compliance documents.")
    if dependency_risk > 50:
        recommendations.append("Begin alternate supplier evaluation / Reduce dependency on this vendor.")
    if financial_risk > 50:
        recommendations.append("Increase monitoring frequency / Review outstanding purchase orders.")
    if cyber_risk > 50:
        recommendations.append("Conduct an urgent cybersecurity audit.")
    
    if not recommendations:
        recommendations.append("Continue standard monthly performance reviews.")

    # 9. Deterioration and Trend Detection
    history = db.scalars(
        select(VendorReliabilityHistory)
        .where(VendorReliabilityHistory.vendor_id == vendor_id)
        .order_by(VendorReliabilityHistory.created_at.desc())
        .limit(5)
    ).all()

    risk_trend = "→ Stable"
    early_warning = "Vendor risk score is stable based on recent performance history."
    
    if len(history) >= 2:
        # Check if score has increased or decreased
        latest_history_score = history[0].score
        older_history_score = history[-1].score
        
        # If overall risk score has gone up
        if latest_history_score is not None and older_history_score is not None:
            # Note: VendorReliabilityHistory tracks reliability (higher = better).
            # If reliability score went down, risk went up.
            if latest_history_score < older_history_score:
                risk_trend = "↑ Increasing Risk"
                early_warning = f"Vendor reliability score declined from {float(older_history_score):.1f} to {float(latest_history_score):.1f} over the last {len(history)} periods."
            elif latest_history_score > older_history_score:
                risk_trend = "↓ Decreasing Risk"
                early_warning = f"Vendor reliability score has improved from {float(older_history_score):.1f} to {float(latest_history_score):.1f} recently."

    # Prefer a transparent operational trend when receipt evidence exists.
    # It compares historical versus recent recorded delivery variance, not a
    # speculative prediction or an arbitrary seeded score.
    delivery_evidence = sorted(
        (record for record in fulfillment_records if record.actual_delivery_date is not None),
        key=lambda record: record.actual_delivery_date,
    )
    expected_dates = {po.id: po.expected_delivery_date for po in pos}
    if len(delivery_evidence) >= 3:
        delays = [(record.actual_delivery_date - expected_dates[record.purchase_order_id]).days for record in delivery_evidence]
        midpoint = max(1, len(delays) // 2)
        earlier_average = sum(delays[:midpoint]) / midpoint
        recent_average = sum(delays[midpoint:]) / len(delays[midpoint:])
        if recent_average >= earlier_average + 2:
            risk_trend = "Increasing Risk"
            early_warning = f"Recorded delivery delays increased from an average of {earlier_average:.1f} to {recent_average:.1f} days across recent fulfilled orders."

    return {
        "overall_risk_score": overall_risk_score,
        "risk_level": risk_lvl,
        "risk_explanation": risk_explanation,
        "risk_trend": risk_trend,
        "early_warning": early_warning,
        "operational_risk_score": Decimal(f"{operational_risk:.2f}"),
        "compliance_risk_score": Decimal(f"{compliance_risk:.2f}"),
        "financial_risk_score": Decimal(f"{financial_risk:.2f}"),
        "cyber_risk_score": Decimal(f"{cyber_risk:.2f}"),
        "dependency_risk_score": Decimal(f"{dependency_risk:.2f}"),
        "outstanding_exposure": outstanding_exposure_val,
        "blast_radius_level": blast_lvl,
        "blast_radius_explanation": blast_radius_explanation,
        "recommendations": recommendations,
        "active_pos_count": len(active_pos),
        "affected_depts_count": len(departments),
        "delayed_pos_count": delayed_orders_count,
        "sla_violations_count": sla_violations_count,
    }


def save_calculated_risk(db: Session, vendor_id: int, result: dict[str, Any]) -> None:
    """Save calculated risk results directly onto the Vendor record."""
    vendor = db.scalar(select(Vendor).where(Vendor.id == vendor_id))
    if not vendor or not result:
        return

    vendor.overall_risk_score = result["overall_risk_score"]
    vendor.risk_level = result["risk_level"]
    vendor.risk_explanation = result["risk_explanation"]
    vendor.risk_trend = result["risk_trend"]
    vendor.early_warning = result["early_warning"]
    vendor.operational_risk_score = result["operational_risk_score"]
    vendor.compliance_risk_score = result["compliance_risk_score"]
    vendor.financial_risk_score = result["financial_risk_score"]
    vendor.cyber_risk_score = result["cyber_risk_score"]
    vendor.dependency_risk_score = result["dependency_risk_score"]
    vendor.outstanding_exposure = result["outstanding_exposure"]
    vendor.blast_radius_level = result["blast_radius_level"]
    vendor.blast_radius_explanation = result["blast_radius_explanation"]


def run_alerts_check(db: Session, vendor: Vendor, risk_result: dict[str, Any]) -> None:
    """Generate risk alerts based on deterministic triggers and actual vendor data."""
    # Critical overall risk alert
    if risk_result["risk_level"] in ("HIGH", "CRITICAL"):
        alert_title = f"CRITICAL: High Risk Alert for {vendor.company_name}"
        alert_msg = f"{vendor.company_name} has registered a risk score of {risk_result['overall_risk_score']:.1f} ({risk_result['risk_level']}). Primary drivers: {risk_result['risk_explanation']}"
        _create_alert_for_roles(db, ("Administrator", "Procurement Manager", "Supply Chain Manager", "Finance Officer", "Auditor"), alert_title, alert_msg, "reliability", "critical", "Vendor", vendor.id)

    # Low delivery warning
    if float(risk_result["operational_risk_score"]) > 60:
        alert_title = f"HIGH: Operational Risk Warning for {vendor.company_name}"
        alert_msg = f"Delivery performance has degraded with {risk_result['delayed_pos_count']} delayed orders and {risk_result['sla_violations_count']} SLA violations."
        _create_alert_for_roles(db, ("Procurement Manager", "Supply Chain Manager", "Auditor"), alert_title, alert_msg, "reliability", "warning", "Vendor", vendor.id)

    # Dependency exposure warning
    if float(risk_result["outstanding_exposure"]) > 1000000 and risk_result["risk_level"] in ("HIGH", "CRITICAL"):
        alert_title = f"HIGH: Dependency Exposure warning for {vendor.company_name}"
        alert_msg = f"₹{float(risk_result['outstanding_exposure']):,.2f} worth of active POs depend on this high-risk vendor across {risk_result['affected_depts_count']} departments."
        _create_alert_for_roles(db, ("Procurement Manager", "Finance Officer", "Supply Chain Manager", "Auditor"), alert_title, alert_msg, "procurement", "warning", "Vendor", vendor.id)


def _create_alert_for_roles(db: Session, roles: tuple[str, ...], title: str, message: str, type_: str, severity: str, entity: str, entity_id: int) -> None:
    """Send an alert to responsible internal roles, never to an external vendor owner."""
    from app.models import Role, User, UserRole
    role_ids = db.scalars(select(Role.id).where(Role.name.in_(roles))).all()
    if not role_ids:
        return
    recipients = db.scalars(
        select(User.id).join(UserRole, UserRole.user_id == User.id).where(
            UserRole.role_id.in_(role_ids), User.is_active == True
        ).distinct()
    ).all()
    for recipient_id in recipients:
        _create_alert_if_not_exists(db, recipient_id, title, message, type_, severity, entity, entity_id)


def _create_alert_if_not_exists(
    db: Session,
    recipient_id: int,
    title: str,
    message: str,
    type_: str,
    severity: str,
    entity: str,
    entity_id: int,
) -> None:
    """Helper to insert unique notifications into the notifications table."""
    existing = db.scalar(
        select(Notification).where(
            Notification.recipient_id == recipient_id,
            Notification.title == title,
            Notification.is_read == False,
        )
    )
    if not existing:
        db.add(
            Notification(
                recipient_id=recipient_id,
                title=title,
                message=message,
                type=type_,
                severity=severity,
                related_entity=entity,
                related_entity_id=entity_id,
            )
        )
