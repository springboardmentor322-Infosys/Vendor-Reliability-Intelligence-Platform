from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_
from app.modules.auth.models import User
from app.modules.vendors.models import Vendor, VendorContact
from app.modules.procurement.models import ProcurementRequest, PRItem, PurchaseOrder, POItem
from app.modules.analytics.schemas import DashboardSummaryResponse, KPISummary
from app.modules.contracts.models import Contract
from app.modules.communications.models import Message
from datetime import date, timedelta
from sqlalchemy.orm import selectinload

async def get_dashboard_summary(db: AsyncSession, current_user: User):
    role_name = current_user.role.name
    response = DashboardSummaryResponse(role=role_name)
    
    # Base Unread Messages Count
    unread_messages = await db.scalar(select(func.count(Message.id)).filter(Message.receiver_id == current_user.id, Message.is_read == False))
    response.unread_messages_count = unread_messages or 0

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
        
        # Contract Stats
        total_contracts = await db.scalar(select(func.count(Contract.id)))
        active_contracts = await db.scalar(select(func.count(Contract.id)).filter(Contract.status == "Active"))
        expired_contracts = await db.scalar(select(func.count(Contract.id)).filter(Contract.status == "Expired"))
        target_date = date.today() + timedelta(days=90)
        expiring_soon = await db.scalar(select(func.count(Contract.id)).filter(Contract.end_date <= target_date, Contract.status != "Expired"))
        
        active_pos_res = await db.execute(select(PurchaseOrder).options(selectinload(PurchaseOrder.vendor)).order_by(PurchaseOrder.id.desc()).limit(10))
        response.active_pos = [
            {"id": po.id, "po_number": po.po_number, "vendor": po.vendor.name if po.vendor else None, "amount": po.amount, "status": po.status}
            for po in active_pos_res.scalars().all()
        ]
        
        # Recent Communications
        recent_comms_res = await db.execute(select(Message).options(selectinload(Message.sender)).order_by(Message.id.desc()).limit(5))
        response.recent_communications = [
            {"id": msg.id, "thread_type": msg.thread_type, "thread_id": msg.thread_id, "message": msg.message[:50] + "...", "sender": msg.sender.email if msg.sender else "Unknown", "is_read": msg.is_read, "created_at": str(msg.created_at)}
            for msg in recent_comms_res.scalars().all()
        ]
        
        response.kpis = [
            KPISummary(label="Total Users", value=str(total_users), trend="Live", is_up=True),
            KPISummary(label="Total Vendors", value=str(total_vendors), trend=f"{pending_vendors} Pending", is_up=True),
            KPISummary(label="Total Contracts", value=str(total_contracts), trend=f"{active_contracts} Active, {expiring_soon} Expiring Soon", is_up=True),
            KPISummary(label="Unread Messages", value=str(response.unread_messages_count), trend="Action Required", is_up=False),
        ]

    elif role_name == "Procurement Manager":
        active_pos_res = await db.execute(select(PurchaseOrder).options(selectinload(PurchaseOrder.vendor)).order_by(PurchaseOrder.id.desc()).limit(10))
        response.active_pos = [
            {"id": po.id, "po_number": po.po_number, "vendor": po.vendor.name if po.vendor else None, "amount": po.amount, "status": po.status}
            for po in active_pos_res.scalars().all()
        ]
        
        vendor_contracts = await db.scalar(select(func.count(Contract.id)))
        target_date = date.today() + timedelta(days=90)
        renewals_needed = await db.scalar(select(func.count(Contract.id)).filter(Contract.end_date <= target_date, Contract.renewal_required == True, Contract.status != "Expired"))
        
        # Recent Communications
        recent_comms_res = await db.execute(select(Message).options(selectinload(Message.sender)).order_by(Message.id.desc()).limit(5))
        response.recent_communications = [
            {"id": msg.id, "thread_type": msg.thread_type, "thread_id": msg.thread_id, "message": msg.message[:50] + "...", "sender": msg.sender.email if msg.sender else "Unknown", "is_read": msg.is_read, "created_at": str(msg.created_at)}
            for msg in recent_comms_res.scalars().all()
        ]
        
        response.kpis = [
            KPISummary(label="Vendor Contracts", value=str(vendor_contracts), trend="Live", is_up=True),
            KPISummary(label="Unread Messages", value=str(response.unread_messages_count), trend="Action Required", is_up=False),
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
        # Calculate total active contract value
        contracts_res = await db.execute(select(Contract).filter(Contract.status == "Active"))
        total_contract_val = sum(c.contract_value or 0 for c in contracts_res.scalars().all())
        
        response.kpis = [
            KPISummary(label="Total Active Contract Value", value=f"${total_contract_val:,.2f}", trend="Live", is_up=True),
            KPISummary(label="Pending PR Approvals", value=str(pending_prs), trend="Action Required", is_up=False),
            KPISummary(label="Total PR Spend", value=f"${total_spend:,.2f}", trend="Approved & Pending", is_up=True),
        ]

    elif role_name == "Auditor":
        # Check compliance issues
        all_contracts_res = await db.execute(select(Contract))
        compliance_issues = 0
        for c in all_contracts_res.scalars().all():
            if c.compliance_flags:
                # Count if there are multiple flags
                if isinstance(c.compliance_flags, list):
                    compliance_issues += len(c.compliance_flags)
                elif isinstance(c.compliance_flags, str):
                    compliance_issues += 1
                    
        active_contracts = await db.scalar(select(func.count(Contract.id)).filter(Contract.status == "Active"))
        
        response.kpis = [
            KPISummary(label="Compliance Issues (Contracts)", value=str(compliance_issues), trend="Requires Review", is_up=False),
            KPISummary(label="Active Contracts", value=str(active_contracts), trend="Live", is_up=True),
            KPISummary(label="Total PRs Audited", value=str(total_prs), trend="Live", is_up=True),
            KPISummary(label="Total Vendors Audited", value=str(total_vendors), trend="Live", is_up=True),
        ]
        
    elif role_name == "Vendor":
        vendor_id = None
        contact_res = await db.execute(select(VendorContact).filter(VendorContact.email == current_user.email))
        contact = contact_res.scalars().first()
        my_contracts_count = 0
        expiring_contracts = 0
        
        if contact:
            vendor_id = contact.vendor_id
            active_pos_res = await db.execute(select(PurchaseOrder).options(selectinload(PurchaseOrder.vendor)).filter(PurchaseOrder.vendor_id == vendor_id).order_by(PurchaseOrder.id.desc()).limit(10))
            response.active_pos = [
                {"id": po.id, "po_number": po.po_number, "vendor": po.vendor.name if po.vendor else None, "amount": po.amount, "status": po.status}
                for po in active_pos_res.scalars().all()
            ]
            my_contracts_count = await db.scalar(select(func.count(Contract.id)).filter(Contract.vendor_id == vendor_id))
            target_date = date.today() + timedelta(days=90)
            expiring_contracts = await db.scalar(select(func.count(Contract.id)).filter(Contract.vendor_id == vendor_id, Contract.end_date <= target_date, Contract.status != "Expired"))
            
            # Recent Communications
            recent_comms_res = await db.execute(select(Message).options(selectinload(Message.sender)).filter(or_(Message.receiver_id == current_user.id, Message.sender_id == current_user.id)).order_by(Message.id.desc()).limit(5))
            response.recent_communications = [
                {"id": msg.id, "thread_type": msg.thread_type, "thread_id": msg.thread_id, "message": msg.message[:50] + "...", "sender": msg.sender.email if msg.sender else "Unknown", "is_read": msg.is_read, "created_at": str(msg.created_at)}
                for msg in recent_comms_res.scalars().all()
            ]
        
        response.kpis = [
            KPISummary(label="My Contracts", value=str(my_contracts_count), trend="Assigned", is_up=True),
            KPISummary(label="Unread Messages", value=str(response.unread_messages_count), trend="Action Required", is_up=False),
            KPISummary(label="Active POs", value=str(len(response.active_pos or [])), trend="Live", is_up=True),
        ]

    return response
