from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app import models


router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"]
)


@router.get("/")
def vendor_analytics(
    db: Session = Depends(get_db)
):
    total_vendors = db.query(
        models.Vendor
    ).count()

    average_score = db.query(
        func.avg(models.Vendor.reliability_score)
    ).scalar()

    highest_score = db.query(
        func.max(models.Vendor.reliability_score)
    ).scalar()

    lowest_score = db.query(
        func.min(models.Vendor.reliability_score)
    ).scalar()

    low_risk_vendors = db.query(
        models.Vendor
    ).filter(
        models.Vendor.risk_level == "Low"
    ).count()

    medium_risk_vendors = db.query(
        models.Vendor
    ).filter(
        models.Vendor.risk_level == "Medium"
    ).count()

    high_risk_vendors = db.query(
        models.Vendor
    ).filter(
        models.Vendor.risk_level == "High"
    ).count()

    return {
        "total_vendors": total_vendors,
        "average_reliability_score": round(
            float(average_score or 0),
            2
        ),
        "highest_reliability_score": round(
            float(highest_score or 0),
            2
        ),
        "lowest_reliability_score": round(
            float(lowest_score or 0),
            2
        ),
        "low_risk_vendors": low_risk_vendors,
        "medium_risk_vendors": medium_risk_vendors,
        "high_risk_vendors": high_risk_vendors
    }


@router.get("/procurement")
def procurement_analytics(
    db: Session = Depends(get_db)
):
    total_procurements = db.query(
        models.Procurement
    ).count()

    total_budget = db.query(
        func.sum(models.Procurement.budget)
    ).scalar()

    pending_procurements = db.query(
        models.Procurement
    ).filter(
        models.Procurement.status == "Pending"
    ).count()

    approved_procurements = db.query(
        models.Procurement
    ).filter(
        models.Procurement.status == "Approved"
    ).count()

    ordered_procurements = db.query(
        models.Procurement
    ).filter(
        models.Procurement.status == "Ordered"
    ).count()

    delivered_procurements = db.query(
        models.Procurement
    ).filter(
        models.Procurement.status == "Delivered"
    ).count()

    completed_procurements = db.query(
        models.Procurement
    ).filter(
        models.Procurement.status == "Completed"
    ).count()

    cancelled_procurements = db.query(
        models.Procurement
    ).filter(
        models.Procurement.status == "Cancelled"
    ).count()

    total_purchase_order_value = db.query(
        func.sum(models.PurchaseOrder.amount)
    ).scalar()

    total_purchase_orders = db.query(
        models.PurchaseOrder
    ).count()

    return {
        "total_procurements": total_procurements,
        "total_budget": round(
            float(total_budget or 0),
            2
        ),
        "pending_procurements": pending_procurements,
        "approved_procurements": approved_procurements,
        "ordered_procurements": ordered_procurements,
        "delivered_procurements": delivered_procurements,
        "completed_procurements": completed_procurements,
        "cancelled_procurements": cancelled_procurements,
        "total_purchase_orders": total_purchase_orders,
        "total_purchase_order_value": round(
            float(total_purchase_order_value or 0),
            2
        )
    }
