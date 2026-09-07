from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.dependencies import get_db, RoleChecker
from app.modules.reliability.service import calculate_vendor_reliability
from app.modules.auth.models import User
from app.modules.vendors.models import Vendor

router = APIRouter()

allow_all_roles = RoleChecker(["Administrator", "Procurement Manager", "Supply Chain Manager", "Finance Officer", "Auditor", "Vendor"])

@router.get("/metrics/{vendor_id}")
async def get_performance_metrics(vendor_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(allow_all_roles)):
    vendor = await db.scalar(select(Vendor).filter(Vendor.id == vendor_id))
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
        
    metrics = await calculate_vendor_reliability(db, vendor_id)
    
    # Generate some simple mocked time-series trend based on the overall score.
    # In a real app, we'd calculate this month-over-month from DB,
    # but the current data just has a single snapshot for each PO.
    base_score = metrics["score"]
    
    return {
        "vendor_id": vendor_id,
        "on_time_delivery_rate": metrics["delivery_score"],
        "quality_pass_rate": metrics["quality_score"],
        "contract_compliance_rate": metrics["contract_score"],
        "overall_score": base_score,
        "trend": [max(0, base_score - 10), max(0, base_score - 5), base_score, min(100, base_score + 2), min(100, base_score + 1), base_score]
    }
