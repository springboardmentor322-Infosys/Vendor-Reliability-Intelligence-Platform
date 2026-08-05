from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.modules.auth.service import get_current_user
from app.modules.auth.models import User
from app.modules.analytics import schemas, repository

router = APIRouter(tags=["Analytics"])

@router.get("/dashboard-summary", response_model=schemas.DashboardSummaryResponse)
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await repository.get_dashboard_summary(db, current_user)
