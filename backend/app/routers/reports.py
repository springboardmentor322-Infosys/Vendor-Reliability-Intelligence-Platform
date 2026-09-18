from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app import models


router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)


@router.get("/vendors")
def vendor_report(
    db: Session = Depends(get_db)
):
    vendors = db.query(
        models.Vendor
    ).all()

    report = []

    for vendor in vendors:
        report.append({
            "vendor_name": vendor.vendor_name,
            "category": vendor.category,
            "reliability_score": vendor.reliability_score,
            "risk_level": vendor.risk_level,
            "status": vendor.status
        })

    return report


@router.get("/vendor-performance")
def vendor_performance_report(
    db: Session = Depends(get_db)
):
    vendors = db.query(
        models.Vendor
    ).all()

    report = []

    for vendor in vendors:

        performances = db.query(
            models.VendorPerformance
        ).filter(
            models.VendorPerformance.vendor_id == vendor.id
        ).all()

        total_on_time = sum(
            performance.on_time_deliveries
            for performance in performances
        )

        total_delayed = sum(
            performance.delayed_deliveries
            for performance in performances
        )

        if performances:
            average_quality = sum(
                performance.quality_rating
                for performance in performances
            ) / len(performances)

            average_response_time = sum(
                performance.response_time
                for performance in performances
            ) / len(performances)

            average_issue_resolution = sum(
                performance.issue_resolution_time
                for performance in performances
            ) / len(performances)

            average_completion_rate = sum(
                performance.order_completion_rate
                for performance in performances
            ) / len(performances)

        else:
            average_quality = 0
            average_response_time = 0
            average_issue_resolution = 0
            average_completion_rate = 0

        report.append({
            "vendor_id": vendor.id,
            "vendor_name": vendor.vendor_name,
            "category": vendor.category,
            "reliability_score": vendor.reliability_score,
            "risk_level": vendor.risk_level,
            "total_on_time_deliveries": total_on_time,
            "total_delayed_deliveries": total_delayed,
            "average_quality_rating": round(
                average_quality,
                2
            ),
            "average_response_time": round(
                average_response_time,
                2
            ),
            "average_issue_resolution_time": round(
                average_issue_resolution,
                2
            ),
            "average_order_completion_rate": round(
                average_completion_rate,
                2
            ),
            "status": vendor.status
        })

    return report
