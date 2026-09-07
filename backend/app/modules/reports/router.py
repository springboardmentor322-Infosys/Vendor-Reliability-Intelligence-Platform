from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.core.dependencies import get_db, RoleChecker
from app.modules.auth.models import User
from app.modules.procurement.models import PurchaseOrder

router = APIRouter()

allow_pm = RoleChecker(["Administrator", "Procurement Manager"])

@router.get("/generate")
async def generate_report(report_type: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(allow_pm)):
    # Currently just a dummy endpoint demonstrating database access for basic report metrics
    if report_type == "Procurement Spend":
         # Calculate Total Spend
        spend_res = await db.execute(select(func.sum(PurchaseOrder.amount)).filter(PurchaseOrder.status.in_(['Completed', 'Delivered', 'Confirmed'])))
        total_spend = spend_res.scalar() or 0
        return {"status": "success", "message": f"{report_type} report generated. Total Spend calculated as ${total_spend:,.2f}", "url": "/downloads/report.pdf"}
    
    return {"status": "success", "message": f"{report_type} report generated successfully from DB.", "url": "/downloads/report.pdf"}
