from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Vendor, VendorPerformance
from app.schemas import (
    VendorPerformanceCreate,
    VendorPerformanceResponse
)
from app.services.risk_engine import calculate_performance_score


router = APIRouter(
    prefix="/vendor-performance",
    tags=["Vendor Performance"]
)


@router.post(
    "/",
    response_model=VendorPerformanceResponse
)
def create_vendor_performance(
    performance: VendorPerformanceCreate,
    db: Session = Depends(get_db)
):
    vendor = db.query(Vendor).filter(
        Vendor.id == performance.vendor_id
    ).first()

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )

    new_performance = VendorPerformance(
        vendor_id=performance.vendor_id,
        on_time_deliveries=performance.on_time_deliveries,
        delayed_deliveries=performance.delayed_deliveries,
        quality_rating=performance.quality_rating,
        response_time=performance.response_time,
        issue_resolution_time=performance.issue_resolution_time,
        order_completion_rate=performance.order_completion_rate
    )

    db.add(new_performance)
    db.commit()
    db.refresh(new_performance)

    return new_performance


@router.get(
    "/score/{vendor_id}"
)
def get_vendor_performance_score(
    vendor_id: int,
    db: Session = Depends(get_db)
):
    vendor = db.query(Vendor).filter(
        Vendor.id == vendor_id
    ).first()

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )

    performances = db.query(VendorPerformance).filter(
        VendorPerformance.vendor_id == vendor_id
    ).all()

    if not performances:
        raise HTTPException(
            status_code=404,
            detail="No performance records found for this vendor"
        )

    latest_performance = performances[-1]

    performance_score = calculate_performance_score(
        latest_performance.on_time_deliveries,
        latest_performance.delayed_deliveries,
        latest_performance.quality_rating,
        latest_performance.order_completion_rate
    )

    if performance_score >= 80:
        risk_level = "Low"
    elif performance_score >= 50:
        risk_level = "Medium"
    else:
        risk_level = "High"

    # Update vendor reliability information
    vendor.reliability_score = performance_score
    vendor.risk_level = risk_level

    db.commit()
    db.refresh(vendor)

    return {
        "vendor_id": vendor_id,
        "performance_score": performance_score,
        "risk_level": risk_level
    }
