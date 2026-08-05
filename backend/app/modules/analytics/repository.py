from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.modules.auth.models import User
from app.modules.vendors.models import Vendor
from app.modules.procurement.models import ProcurementRequest, PRItem
from app.modules.analytics.schemas import DashboardSummaryResponse, KPISummary
from sqlalchemy.orm import selectinload

async def get_dashboard_summary(db: AsyncSession, current_user: User):
    role_name = current_user.role.name
    response = DashboardSummaryResponse(role=role_name)

    # Base Metrics
    total_vendors = await db.scalar(select(func.count(Vendor.id)))
    pending_vendors = await db.scalar(select(func.count(Vendor.id)).filter(Vendor.status == "Pending"))
    active_vendors = await db.scalar(select(func.count(Vendor.id)).filter(Vendor.status == "Approved"))
    
    total_prs = await db.scalar(select(func.count(ProcurementRequest.id)))
    pending_prs = await db.scalar(select(func.count(ProcurementRequest.id)).filter(ProcurementRequest.status == "Pending"))

    # Recent Vendors
    recent_vendors_res = await db.execute(select(Vendor).options(selectinload(Vendor.category)).order_by(Vendor.id.desc()).limit(5))
    recent_vendors = []
    for v in recent_vendors_res.scalars().all():
        recent_vendors.append({
            "id": v.id,
            "name": v.name,
            "category": v.category.name if v.category else "Uncategorized",
            "status": v.status,
            "contact_email": v.contact_email
        })
    response.recent_vendors = recent_vendors

    # Recent PRs
    recent_prs_res = await db.execute(select(ProcurementRequest).options(selectinload(ProcurementRequest.items)).order_by(ProcurementRequest.id.desc()).limit(5))
    recent_prs = []
    for pr in recent_prs_res.scalars().all():
        total_cost = sum(item.estimated_cost * item.quantity for item in pr.items)
        recent_prs.append({
            "id": pr.id,
            "department": pr.department,
            "status": pr.status,
            "total_estimated_cost": total_cost,
            "created_at": str(pr.created_at)
        })
    response.recent_prs = recent_prs
    
    # Calculate Total PR Cost
    all_prs_res = await db.execute(select(ProcurementRequest).options(selectinload(ProcurementRequest.items)))
    total_spend = 0
    for pr in all_prs_res.scalars().all():
        total_spend += sum(item.estimated_cost * item.quantity for item in pr.items)

    if role_name == "Administrator":
        total_users = await db.scalar(select(func.count(User.id)))
        response.kpis = [
            KPISummary(label="Total Users", value=str(total_users), trend="Live", is_up=True),
            KPISummary(label="Total Vendors", value=str(total_vendors), trend=f"{pending_vendors} Pending", is_up=True),
            KPISummary(label="Total PRs", value=str(total_prs), trend=f"{pending_prs} Pending", is_up=True),
            KPISummary(label="Total PR Spend", value=f"${total_spend:,.2f}", trend="Live", is_up=True),
        ]

    elif role_name == "Procurement Manager":
        response.kpis = [
            KPISummary(label="Total PRs", value=str(total_prs), trend="Live", is_up=True),
            KPISummary(label="Pending PRs", value=str(pending_prs), trend="Action Required", is_up=False),
            KPISummary(label="Total Vendors", value=str(active_vendors), trend="Approved", is_up=True),
            KPISummary(label="PR Spend", value=f"${total_spend:,.2f}", trend="Live", is_up=True),
        ]
        
    elif role_name == "Supply Chain Manager":
        scm_prs = await db.scalar(select(func.count(ProcurementRequest.id)).filter(ProcurementRequest.requested_by_id == current_user.id))
        response.kpis = [
            KPISummary(label="My PRs", value=str(scm_prs), trend="Live", is_up=True),
            KPISummary(label="Active Vendors", value=str(active_vendors), trend="Available", is_up=True),
        ]
        
    elif role_name == "Finance Officer":
        response.kpis = [
            KPISummary(label="Pending PR Approvals", value=str(pending_prs), trend="Action Required", is_up=False),
            KPISummary(label="Total PR Spend", value=f"${total_spend:,.2f}", trend="Approved & Pending", is_up=True),
        ]

    elif role_name == "Auditor":
        response.kpis = [
            KPISummary(label="Total PRs Audited", value=str(total_prs), trend="Live", is_up=True),
            KPISummary(label="Total Vendors Audited", value=str(total_vendors), trend="Live", is_up=True),
        ]
        
    elif role_name == "Vendor":
        response.kpis = [
            KPISummary(label="Reliability Score", value="N/A", trend="Phase 4", is_up=True),
            KPISummary(label="Active POs", value="0", trend="Phase 3", is_up=True),
        ]

    return response
