"""Role-specific dashboard summaries from live database data."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_user_with_role
from app.db.session import get_db
from app.models.user import Role, User
from app.schemas.dashboard import (
    AdminDashboardResponse,
    AuditorDashboardResponse,
    FinanceDashboardResponse,
    ProcurementDashboardResponse,
    SupplyChainDashboardResponse,
    VendorDashboardResponse,
)
from app.services.dashboard import (
    build_admin_dashboard,
    build_auditor_dashboard,
    build_finance_dashboard,
    build_procurement_dashboard,
    build_supply_chain_dashboard,
    build_vendor_dashboard,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/admin", response_model=AdminDashboardResponse)
def admin_dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user_with_role([Role.ADMINISTRATOR])),
) -> AdminDashboardResponse:
    return build_admin_dashboard(db)


@router.get("/vendor", response_model=VendorDashboardResponse)
def vendor_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role([Role.VENDOR])),
) -> VendorDashboardResponse:
    return build_vendor_dashboard(db, current_user)


@router.get("/finance", response_model=FinanceDashboardResponse)
def finance_dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user_with_role([Role.FINANCE_OFFICER, Role.ADMINISTRATOR])),
) -> FinanceDashboardResponse:
    return build_finance_dashboard(db)


@router.get("/procurement", response_model=ProcurementDashboardResponse)
def procurement_dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(
        get_current_user_with_role([Role.PROCUREMENT_MANAGER, Role.ADMINISTRATOR])
    ),
) -> ProcurementDashboardResponse:
    return build_procurement_dashboard(db)


@router.get("/supply-chain", response_model=SupplyChainDashboardResponse)
def supply_chain_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user_with_role([Role.SUPPLY_CHAIN_MANAGER, Role.ADMINISTRATOR])
    ),
) -> SupplyChainDashboardResponse:
    return build_supply_chain_dashboard(db, current_user)


@router.get("/auditor", response_model=AuditorDashboardResponse)
def auditor_dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user_with_role([Role.AUDITOR, Role.ADMINISTRATOR])),
) -> AuditorDashboardResponse:
    return build_auditor_dashboard(db)
