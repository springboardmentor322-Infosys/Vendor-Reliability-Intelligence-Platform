from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db

from app.models.vendor_performance import VendorPerformance
from app.models.vendor import Vendor

from app.schemas.vendor_performance import VendorPerformanceCreate

from app.utils.permissions import (
    require_roles,
    ADMINISTRATOR,
    PROCUREMENT_MANAGER,
    SUPPLY_CHAIN_MANAGER,
    VENDOR,
    FINANCE_OFFICER,
    AUDITOR
)

from app.utils.reliability import (
    calculate_reliability_score,
    get_risk_level
)


router = APIRouter(
    prefix="/performance",
    tags=["Vendor Performance"]
)


# ==========================================
# PROCUREMENT RECOMMENDATION
# ==========================================

def get_procurement_recommendation(
    score: float,
    risk_level: str,
    performance: VendorPerformance
) -> dict:

    # ======================================
    # HIGH RISK
    # ======================================

    if risk_level == "High Risk":

        reasons = []

        if performance.delayed_deliveries > \
           performance.on_time_deliveries:

            reasons.append(
                "high delivery delay rate"
            )

        if performance.quality_rating < 3:

            reasons.append(
                "low quality rating"
            )

        if performance.order_completion_rate < 80:

            reasons.append(
                "low order completion rate"
            )

        if performance.service_rating < 3:

            reasons.append(
                "low service rating"
            )

        reason_text = (
            ", ".join(reasons)
            if reasons
            else
            "low overall reliability"
        )

        return {

            "priority":
                "High",

            "action":
                "Review Supplier",

            "recommendation":
                (
                    "Consider alternative suppliers. "
                    "Immediate vendor performance review "
                    "is recommended."
                ),

            "reason":
                (
                    f"Primary concern: "
                    f"{reason_text}."
                )
        }


    # ======================================
    # MEDIUM RISK
    # ======================================

    if risk_level == "Medium Risk":

        reasons = []

        if performance.delayed_deliveries > 0:

            reasons.append(
                "delivery delays"
            )

        if performance.quality_rating < 4:

            reasons.append(
                "quality requires monitoring"
            )

        if performance.order_completion_rate < 90:

            reasons.append(
                "completion rate below target"
            )

        reason_text = (
            ", ".join(reasons)
            if reasons
            else
            "performance requires monitoring"
        )

        return {

            "priority":
                "Medium",

            "action":
                "Monitor Supplier",

            "recommendation":
                (
                    "Continue using the vendor "
                    "with closer performance monitoring. "
                    "Consider a backup supplier for "
                    "critical procurement."
                ),

            "reason":
                (
                    f"Areas to monitor: "
                    f"{reason_text}."
                )
        }


    # ======================================
    # LOW RISK
    # ======================================

    return {

        "priority":
            "Low",

        "action":
            "Preferred Supplier",

        "recommendation":
            (
                "Preferred supplier. "
                "Suitable for regular and "
                "critical procurement."
            ),

        "reason":
            (
                "Vendor demonstrates strong "
                "overall reliability."
            )
    }


# ==========================================
# CREATE PERFORMANCE RECORD
# ==========================================

@router.post("/")
def create_performance(
    data: VendorPerformanceCreate,
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            SUPPLY_CHAIN_MANAGER
        )
    )
):

    vendor = db.query(Vendor).filter(
        Vendor.id == data.vendor_id
    ).first()

    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    performance = VendorPerformance(

        vendor_id=data.vendor_id,

        on_time_deliveries=
            data.on_time_deliveries,

        delayed_deliveries=
            data.delayed_deliveries,

        quality_rating=
            data.quality_rating,

        response_time=
            data.response_time,

        issue_resolution_time=
            data.issue_resolution_time,

        order_completion_rate=
            data.order_completion_rate,

        service_rating=
            data.service_rating,

        performance_date=
            data.performance_date
    )


    db.add(performance)

    db.commit()

    db.refresh(performance)


    return performance


# ==========================================
# GET ALL PERFORMANCE RECORDS
# ==========================================

@router.get("/")
def get_performance(
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    performance = db.query(
        VendorPerformance
    ).all()


    return performance


# ==========================================
# GET PERFORMANCE BY VENDOR
# ==========================================

@router.get("/vendor/{vendor_id}")
def get_vendor_performance(
    vendor_id: int,
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    vendor = db.query(Vendor).filter(
        Vendor.id == vendor_id
    ).first()


    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    performance = db.query(
        VendorPerformance
    ).filter(
        VendorPerformance.vendor_id == vendor_id
    ).all()


    return performance


# ==========================================
# GET VENDOR RELIABILITY
# ==========================================

@router.get("/reliability")
def get_vendor_reliability(
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    performances = db.query(
        VendorPerformance
    ).all()


    result = []


    for performance in performances:

        score = calculate_reliability_score(
            performance
        )


        risk_level = get_risk_level(
            score
        )


        vendor = db.query(
            Vendor
        ).filter(
            Vendor.id == performance.vendor_id
        ).first()


        # ======================================
        # PROCUREMENT RECOMMENDATION
        # ======================================

        recommendation = (
            get_procurement_recommendation(
                score,
                risk_level,
                performance
            )
        )


        result.append({

            "id":
                performance.id,

            "vendor_id":
                performance.vendor_id,

            "vendor_name":
                vendor.vendor_name
                if vendor
                else
                f"Vendor #{performance.vendor_id}",

            "reliability_score":
                score,

            "risk_level":
                risk_level,

            "on_time_deliveries":
                performance.on_time_deliveries,

            "delayed_deliveries":
                performance.delayed_deliveries,

            "quality_rating":
                performance.quality_rating,

            "response_time":
                performance.response_time,

            "issue_resolution_time":
                performance.issue_resolution_time,

            "order_completion_rate":
                performance.order_completion_rate,

            "service_rating":
                performance.service_rating,

            "performance_date":
                performance.performance_date,

            # ==================================
            # PROCUREMENT RECOMMENDATION
            # ==================================

            "recommendation_priority":
                recommendation["priority"],

            "recommendation_action":
                recommendation["action"],

            "procurement_recommendation":
                recommendation["recommendation"],

            "recommendation_reason":
                recommendation["reason"]

        })


    # Highest reliability score first

    result.sort(
        key=lambda item:
            item["reliability_score"],
        reverse=True
    )


    # Add ranking

    for index, item in enumerate(
        result,
        start=1
    ):

        item["rank"] = index


    return result


# ==========================================
# GET VENDOR RISK ALERTS
# ==========================================

@router.get("/risk-alerts")
def get_risk_alerts(
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    performances = db.query(
        VendorPerformance
    ).all()


    alerts = []


    for performance in performances:

        score = calculate_reliability_score(
            performance
        )


        risk_level = get_risk_level(
            score
        )


        # Get vendor

        vendor = db.query(
            Vendor
        ).filter(
            Vendor.id == performance.vendor_id
        ).first()


        vendor_name = (
            vendor.vendor_name
            if vendor
            else
            f"Vendor #{performance.vendor_id}"
        )


        # ==========================================
        # HIGH RISK
        # ==========================================

        if risk_level == "High Risk":

            alerts.append({

                "vendor_id":
                    performance.vendor_id,

                "vendor_name":
                    vendor_name,

                "performance_id":
                    performance.id,

                "reliability_score":
                    score,

                "risk_level":
                    risk_level,

                "alert_type":
                    "High Risk",

                "message":
                    "Vendor reliability is critically low.",

                "performance_date":
                    performance.performance_date

            })


        # ==========================================
        # MEDIUM RISK
        # ==========================================

        elif risk_level == "Medium Risk":

            alerts.append({

                "vendor_id":
                    performance.vendor_id,

                "vendor_name":
                    vendor_name,

                "performance_id":
                    performance.id,

                "reliability_score":
                    score,

                "risk_level":
                    risk_level,

                "alert_type":
                    "Medium Risk",

                "message":
                    "Vendor performance requires attention.",

                "performance_date":
                    performance.performance_date

            })


    return alerts


# ==========================================
# COMPARE TWO VENDORS
# ==========================================

@router.get("/compare/{vendor_a_id}/{vendor_b_id}")
def compare_vendors(
    vendor_a_id: int,
    vendor_b_id: int,
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    # ==========================================
    # CHECK VENDOR A
    # ==========================================

    vendor_a = db.query(
        Vendor
    ).filter(
        Vendor.id == vendor_a_id
    ).first()


    if not vendor_a:

        raise HTTPException(
            status_code=404,
            detail="Vendor A not found"
        )


    # ==========================================
    # CHECK VENDOR B
    # ==========================================

    vendor_b = db.query(
        Vendor
    ).filter(
        Vendor.id == vendor_b_id
    ).first()


    if not vendor_b:

        raise HTTPException(
            status_code=404,
            detail="Vendor B not found"
        )


    # ==========================================
    # PREVENT SAME VENDOR
    # ==========================================

    if vendor_a_id == vendor_b_id:

        raise HTTPException(
            status_code=400,
            detail="Please select two different vendors"
        )


    # ==========================================
    # GET PERFORMANCE RECORDS
    # ==========================================

    performance_a = db.query(
        VendorPerformance
    ).filter(
        VendorPerformance.vendor_id == vendor_a_id
    ).order_by(
        VendorPerformance.performance_date.desc()
    ).first()


    performance_b = db.query(
        VendorPerformance
    ).filter(
        VendorPerformance.vendor_id == vendor_b_id
    ).order_by(
        VendorPerformance.performance_date.desc()
    ).first()


    # ==========================================
    # CHECK PERFORMANCE DATA
    # ==========================================

    if not performance_a:

        raise HTTPException(
            status_code=404,
            detail="No performance data available for Vendor A"
        )


    if not performance_b:

        raise HTTPException(
            status_code=404,
            detail="No performance data available for Vendor B"
        )


    # ==========================================
    # CALCULATE RELIABILITY
    # ==========================================

    score_a = calculate_reliability_score(
        performance_a
    )


    score_b = calculate_reliability_score(
        performance_b
    )


    risk_a = get_risk_level(
        score_a
    )


    risk_b = get_risk_level(
        score_b
    )


    # ==========================================
    # DELIVERY PERCENTAGE
    # ==========================================

    total_a = (
        performance_a.on_time_deliveries
        + performance_a.delayed_deliveries
    )


    total_b = (
        performance_b.on_time_deliveries
        + performance_b.delayed_deliveries
    )


    delivery_a = (
        (
            performance_a.on_time_deliveries
            / total_a
        ) * 100
        if total_a > 0
        else 0
    )


    delivery_b = (
        (
            performance_b.on_time_deliveries
            / total_b
        ) * 100
        if total_b > 0
        else 0
    )


    # ==========================================
    # RETURN COMPARISON
    # ==========================================

    return {

        "vendor_a": {

            "vendor_id":
                vendor_a.id,

            "vendor_name":
                vendor_a.vendor_name,

            "reliability_score":
                score_a,

            "risk_level":
                risk_a,

            "delivery_percentage":
                round(delivery_a, 2),

            "quality_rating":
                performance_a.quality_rating,

            "response_time":
                performance_a.response_time,

            "issue_resolution_time":
                performance_a.issue_resolution_time,

            "order_completion_rate":
                performance_a.order_completion_rate,

            "service_rating":
                performance_a.service_rating,

            "performance_date":
                performance_a.performance_date

        },


        "vendor_b": {

            "vendor_id":
                vendor_b.id,

            "vendor_name":
                vendor_b.vendor_name,

            "reliability_score":
                score_b,

            "risk_level":
                risk_b,

            "delivery_percentage":
                round(delivery_b, 2),

            "quality_rating":
                performance_b.quality_rating,

            "response_time":
                performance_b.response_time,

            "issue_resolution_time":
                performance_b.issue_resolution_time,

            "order_completion_rate":
                performance_b.order_completion_rate,

            "service_rating":
                performance_b.service_rating,

            "performance_date":
                performance_b.performance_date

        }

    }


# ==========================================
# PERFORMANCE TREND ANALYSIS
# ==========================================

@router.get("/trend/{vendor_id}")
def get_performance_trend(
    vendor_id: int,
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    # Check if vendor exists

    vendor = db.query(
        Vendor
    ).filter(
        Vendor.id == vendor_id
    ).first()


    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    # Get performance records

    performance = db.query(
        VendorPerformance
    ).filter(
        VendorPerformance.vendor_id == vendor_id
    ).order_by(
        VendorPerformance.performance_date.asc()
    ).all()


    return [

        {

            "id":
                record.id,

            "vendor_id":
                record.vendor_id,

            "performance_date":
                record.performance_date,

            "on_time_deliveries":
                record.on_time_deliveries,

            "delayed_deliveries":
                record.delayed_deliveries,

            "quality_rating":
                record.quality_rating,

            "response_time":
                record.response_time,

            "issue_resolution_time":
                record.issue_resolution_time,

            "order_completion_rate":
                record.order_completion_rate,

            "service_rating":
                record.service_rating

        }

        for record in performance

    ]


# ==========================================
# GET SINGLE PERFORMANCE RECORD
# ==========================================

@router.get("/{performance_id}")
def get_single_performance(
    performance_id: int,
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    performance = db.query(
        VendorPerformance
    ).filter(
        VendorPerformance.id == performance_id
    ).first()


    if not performance:

        raise HTTPException(
            status_code=404,
            detail="Performance record not found"
        )


    return performance


# ==========================================
# UPDATE PERFORMANCE
# ==========================================

@router.put("/{performance_id}")
def update_performance(
    performance_id: int,
    data: VendorPerformanceCreate,
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR,
            SUPPLY_CHAIN_MANAGER
        )
    )
):

    performance = db.query(
        VendorPerformance
    ).filter(
        VendorPerformance.id == performance_id
    ).first()


    if not performance:

        raise HTTPException(
            status_code=404,
            detail="Performance record not found"
        )


    vendor = db.query(Vendor).filter(
        Vendor.id == data.vendor_id
    ).first()


    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    performance.vendor_id = (
        data.vendor_id
    )


    performance.on_time_deliveries = (
        data.on_time_deliveries
    )


    performance.delayed_deliveries = (
        data.delayed_deliveries
    )


    performance.quality_rating = (
        data.quality_rating
    )


    performance.response_time = (
        data.response_time
    )


    performance.issue_resolution_time = (
        data.issue_resolution_time
    )


    performance.order_completion_rate = (
        data.order_completion_rate
    )


    performance.service_rating = (
        data.service_rating
    )


    performance.performance_date = (
        data.performance_date
    )


    db.commit()

    db.refresh(performance)


    return performance


# ==========================================
# DELETE PERFORMANCE
# ==========================================

@router.delete("/{performance_id}")
def delete_performance(
    performance_id: int,
    db: Session = Depends(get_db),

    current_user = Depends(
        require_roles(
            ADMINISTRATOR
        )
    )
):

    performance = db.query(
        VendorPerformance
    ).filter(
        VendorPerformance.id == performance_id
    ).first()


    if not performance:

        raise HTTPException(
            status_code=404,
            detail="Performance record not found"
        )


    db.delete(performance)

    db.commit()


    return {
        "message":
            "Performance record deleted successfully"
    }