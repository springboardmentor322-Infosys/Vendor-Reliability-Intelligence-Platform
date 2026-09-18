
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


@router.get("/")
def dashboard(db: Session = Depends(get_db)):

    # ⭐ TOTAL VENDORS
    total_vendors = db.query(
        models.Vendor
    ).count()

    # ⭐ TOTAL PROCUREMENTS
    total_procurements = db.query(
        models.Procurement
    ).count()

    # ⭐ LOW RISK
    low_risk_vendors = db.query(
        models.Vendor
    ).filter(
        models.Vendor.risk_level == "Low"
    ).count()

    # ⭐ MEDIUM RISK
    medium_risk_vendors = db.query(
        models.Vendor
    ).filter(
        models.Vendor.risk_level == "Medium"
    ).count()

    # ⭐ HIGH RISK
    high_risk_vendors = db.query(
        models.Vendor
    ).filter(
        models.Vendor.risk_level == "High"
    ).count()

    # ⭐ DASHBOARD RESPONSE
    return {
        "total_vendors": total_vendors,
        "total_procurements": total_procurements,
        "low_risk_vendors": low_risk_vendors,
        "medium_risk_vendors": medium_risk_vendors,
        "high_risk_vendors": high_risk_vendors
    }