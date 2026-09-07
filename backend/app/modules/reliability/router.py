from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db, RoleChecker
from app.modules.reliability.service import calculate_vendor_reliability
from app.modules.auth.models import User
from app.modules.vendors.models import Vendor
from sqlalchemy.future import select

router = APIRouter()

allow_all_roles = RoleChecker(["Administrator", "Procurement Manager", "Supply Chain Manager", "Finance Officer", "Auditor", "Vendor"])

@router.get("/score/{vendor_id}")
async def get_reliability_score(vendor_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(allow_all_roles)):
    
    vendor = await db.scalar(select(Vendor).filter(Vendor.id == vendor_id))
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
        
    metrics = await calculate_vendor_reliability(db, vendor_id)
    return {
        "vendor_id": vendor_id,
        "vendor_name": vendor.name,
        "score": metrics["score"],
        "status": "Excellent" if metrics["score"] >= 90 else "Good" if metrics["score"] >= 75 else "Average" if metrics["score"] >= 60 else "Poor",
        "details": {
            "delivery_performance": metrics["delivery_score"],
            "quality_performance": metrics["quality_score"],
            "contract_compliance": metrics["contract_score"]
        }
    }

@router.get("/vendors-metrics")
async def get_all_vendor_metrics(db: AsyncSession = Depends(get_db), current_user: User = Depends(allow_all_roles)):
    vendors_query = await db.execute(select(Vendor))
    vendors = vendors_query.scalars().all()
    results = []
    for vendor in vendors:
        metrics = await calculate_vendor_reliability(db, vendor.id)
        # Replicate defect rates and real risk
        from app.modules.procurement.models import Delivery, PurchaseOrder
        from sqlalchemy import func
        delays = await db.scalar(
             select(func.count(Delivery.id))
             .join(PurchaseOrder, PurchaseOrder.id == Delivery.po_id)
             .filter(PurchaseOrder.vendor_id == vendor.id, Delivery.late_risk_flag == 1)
        ) or 0
        total_d = await db.scalar(
             select(func.count(Delivery.id))
             .join(PurchaseOrder, PurchaseOrder.id == Delivery.po_id)
             .filter(PurchaseOrder.vendor_id == vendor.id)
        ) or 0
        defect_rate = round((delays / total_d) * 100, 1) if total_d > 0 else 0
        
        results.append({
            "vendor_id": vendor.id,
            "vendor_name": vendor.name,
            "category": vendor.category.name if vendor.category else "General Supplier",
            "score": metrics["score"],
            "defect_rate": defect_rate,
            "status": "Excellent" if metrics["score"] >= 90 else "Good" if metrics["score"] >= 75 else "Average" if metrics["score"] >= 60 else "Poor",
            "risk_level": metrics["risk_level"]
        })
    results.sort(key=lambda x: x["score"], reverse=True)
    return results
