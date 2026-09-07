from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.dependencies import get_db, RoleChecker
from app.modules.auth.models import User
from app.modules.notifications.models import Notification

router = APIRouter()

allow_all = RoleChecker(["Administrator", "Procurement Manager", "Supply Chain Manager", "Finance Officer", "Auditor", "Vendor"])

@router.get("/alerts")
async def get_alerts(db: AsyncSession = Depends(get_db), current_user: User = Depends(allow_all)):
    # Fetch notifications from the database
    notifications_res = await db.execute(select(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).limit(10))
    notifications = notifications_res.scalars().all()
    
    return [
        {
            "id": n.id,
            "type": "warning" if "delay" in n.message.lower() or "expiry" in n.message.lower() else "info",
            "message": n.message,
            "time": str(n.created_at)
        }
        for n in notifications
    ]
