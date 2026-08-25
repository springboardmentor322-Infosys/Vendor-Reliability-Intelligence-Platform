"""Analytics endpoints — live aggregates from database data."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import Role, User
from app.schemas.analytics import (
    DeliveryPerformanceSummaryResponse,
    ProcurementCostTrendsResponse,
    SpendOverTimeResponse,
    VendorCategoryDistributionResponse,
)
from app.services.analytics import (
    compute_delivery_performance_summary,
    compute_procurement_cost_trends,
    compute_spend_over_time,
    compute_vendor_category_distribution,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])

ANALYTICS_ROLES = {
    Role.ADMINISTRATOR,
    Role.FINANCE_OFFICER,
    Role.SUPPLY_CHAIN_MANAGER,
    Role.AUDITOR,
    Role.PROCUREMENT_MANAGER,
}


def _ensure_analytics_access(user: User) -> None:
    if user.role not in ANALYTICS_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


@router.get("/spend-over-time", response_model=SpendOverTimeResponse)
def get_spend_over_time(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SpendOverTimeResponse:
    _ensure_analytics_access(current_user)
    return compute_spend_over_time(db)


@router.get("/vendor-category-distribution", response_model=VendorCategoryDistributionResponse)
def get_vendor_category_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VendorCategoryDistributionResponse:
    _ensure_analytics_access(current_user)
    return compute_vendor_category_distribution(db)


@router.get("/procurement-cost-trends", response_model=ProcurementCostTrendsResponse)
def get_procurement_cost_trends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProcurementCostTrendsResponse:
    _ensure_analytics_access(current_user)
    return compute_procurement_cost_trends(db)


@router.get("/delivery-performance-summary", response_model=DeliveryPerformanceSummaryResponse)
def get_delivery_performance_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DeliveryPerformanceSummaryResponse:
    _ensure_analytics_access(current_user)
    return compute_delivery_performance_summary(db)
