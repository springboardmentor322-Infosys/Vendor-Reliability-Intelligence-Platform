from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db

from app.models.vendor import Vendor
from app.models.order import Order
from app.models.vendor_performance import VendorPerformance
from app.models.contract import Contract

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
    prefix="/dashboard",
    tags=["Dashboard"]
)


# ==========================================
# DASHBOARD SUMMARY
# ==========================================

@router.get("/summary")
def get_dashboard_summary(
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

    # ======================================
    # VENDORS
    # ======================================

    total_vendors = db.query(
        Vendor
    ).count()


    # ======================================
    # ORDERS
    # ======================================

    total_orders = db.query(
        Order
    ).count()


    total_revenue = db.query(
        func.sum(Order.amount)
    ).scalar()


    pending_orders = db.query(
        Order
    ).filter(
        Order.status == "Pending"
    ).count()


    delivered_orders = db.query(
        Order
    ).filter(
        Order.status == "Delivered"
    ).count()


    completed_orders = db.query(
        Order
    ).filter(
        Order.status == "Completed"
    ).count()


    # ======================================
    # CONTRACTS
    # ======================================

    total_contracts = db.query(
        Contract
    ).count()


    active_contracts = db.query(
        Contract
    ).filter(
        Contract.status == "Active"
    ).count()


    # ======================================
    # PERFORMANCE
    # ======================================

    performance_records = db.query(
        VendorPerformance
    ).all()


    reliability_scores = []


    for performance in performance_records:

        score = calculate_reliability_score(
            performance
        )

        reliability_scores.append(score)


    # ======================================
    # AVERAGE RELIABILITY
    # ======================================

    if reliability_scores:

        average_reliability = round(
            sum(reliability_scores)
            / len(reliability_scores),
            2
        )

    else:

        average_reliability = 0


    # ======================================
    # RISK COUNTS
    # ======================================

    low_risk = 0

    medium_risk = 0

    high_risk = 0


    for score in reliability_scores:

        risk = get_risk_level(score)


        if risk == "Low Risk":

            low_risk += 1

        elif risk == "Medium Risk":

            medium_risk += 1

        else:

            high_risk += 1


    # ======================================
    # RESPONSE
    # ======================================

    return {

        "vendors": {

            "total":
                total_vendors

        },

        "orders": {

            "total":
                total_orders,

            "pending":
                pending_orders,

            "delivered":
                delivered_orders,

            "completed":
                completed_orders,

            "revenue":
                total_revenue or 0

        },

        "contracts": {

            "total":
                total_contracts,

            "active":
                active_contracts

        },

        "reliability": {

            "average_score":
                average_reliability,

            "low_risk":
                low_risk,

            "medium_risk":
                medium_risk,

            "high_risk":
                high_risk

        }

    }


# ==========================================
# ORDER STATUS ANALYTICS
# ==========================================

@router.get("/order-status")
def get_order_status_analytics(
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

    statuses = [

        "Pending",
        "Approved",
        "Ordered",
        "Delivered",
        "Completed",
        "Cancelled"

    ]


    result = []


    for status in statuses:

        count = db.query(
            Order
        ).filter(
            Order.status == status
        ).count()


        result.append({

            "status":
                status,

            "count":
                count

        })


    return result


# ==========================================
# VENDOR RELIABILITY ANALYTICS
# ==========================================

@router.get("/vendor-reliability")
def get_vendor_reliability_analytics(
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


        vendor = db.query(
            Vendor
        ).filter(
            Vendor.id ==
            performance.vendor_id
        ).first()


        result.append({

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
                get_risk_level(score)

        })


    result.sort(

        key=lambda item:
            item["reliability_score"],

        reverse=True

    )


    return result


# ==========================================
# REVENUE ANALYTICS
# ==========================================

@router.get("/revenue")
def get_revenue_analytics(
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

    result = db.query(
        Order.status,
        func.sum(Order.amount).label(
            "revenue"
        )
    ).group_by(
        Order.status
    ).all()


    return [

        {

            "status":
                row.status,

            "revenue":
                row.revenue or 0

        }

        for row in result

    ]