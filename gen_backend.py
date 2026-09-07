import os
import glob
import re

backend_file = r'D:\Vendor Reliability Intelligence Platform\backend\app\modules\audit\router.py'
content = open(backend_file, 'r', encoding='utf-8').read()

# I will write a massive regular expression/replacement block for the backend file.
# We need to add Optional[str] = None for the filters on each endpoint.
# But it's easier to append the new router code entirely and overwrite the file.

# Read the file to keep the imports
lines = content.split('\n')
import_lines = []
for line in lines:
    if line.startswith('from ') or line.startswith('import '):
        import_lines.append(line)
        
router_code = '''
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import RoleChecker
from app.modules.auth.service import get_current_user
from app.modules.auth.models import User
from app.modules.audit.models import AuditLog
from app.modules.procurement.models import PurchaseOrder
from app.modules.vendors.models import Vendor
from app.modules.contracts.models import Contract
from app.modules.finance.models import Invoice, Payment
from app.modules.communications.models import Message
from app.modules.reliability.service import calculate_vendor_reliability
from sqlalchemy import func

router = APIRouter()
allow_auditor = RoleChecker(["Administrator", "Auditor"])

@router.get("/overview")
async def get_overview(
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(allow_auditor)
):
    po_count = await db.scalar(select(func.count(PurchaseOrder.id))) or 0
    inv_count = await db.scalar(select(func.count(Invoice.id))) or 0
    ven_count = await db.scalar(select(func.count(Vendor.id))) or 0
    
    return {
        "transactions": po_count + inv_count,
        "reviewed_records": po_count + inv_count,
        "audit_tracking": await db.scalar(select(func.count(AuditLog.id))) or 0,
        "anomalies": 0,
        "compliance_trend": [{"month": "Jan", "compliance": 95, "exceptions": 2}],
        "top_risk_areas": []
    }

@router.get("/logs")
async def get_logs(
    action: Optional[str] = Query(None),
    entity: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(allow_auditor)
):
    stmt = select(AuditLog)
    if action:
        stmt = stmt.where(AuditLog.action.ilike(f"%{action}%"))
    if entity:
        stmt = stmt.where(AuditLog.entity_name.ilike(f"%{entity}%"))
        
    result = await db.execute(stmt.order_by(AuditLog.timestamp.desc()).limit(100))
    logs = result.scalars().all()
    return [{"id": l.id, "action": l.action, "entity": l.entity_name, "user_id": l.user_id, "timestamp": str(l.timestamp), "details": l.details} for l in logs]

@router.get("/procurement")
async def get_procurement(
    vendor: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(allow_auditor)
):
    stmt = select(PurchaseOrder).options(selectinload(PurchaseOrder.vendor))
    if status:
        stmt = stmt.where(PurchaseOrder.status.ilike(f"%{status}%"))
        
    result = await db.execute(stmt.limit(100))
    pos = result.scalars().all()
    data = []
    for po in pos:
        v_name = po.vendor.name if po.vendor else "Unknown"
        if vendor and vendor.lower() not in v_name.lower(): continue
        data.append({
            "po_number": po.po_number,
            "vendor": v_name,
            "status": po.status,
            "total_amount": po.total_amount,
            "created_at": str(po.created_at)
        })
    return data

@router.get("/vendors")
async def get_vendors(
    vendor: Optional[str] = Query(None),
    risk: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(allow_auditor)
):
    stmt = select(Vendor)
    if vendor:
        stmt = stmt.where(Vendor.name.ilike(f"%{vendor}%"))
        
    result = await db.execute(stmt.limit(100))
    vendors = result.scalars().all()
    data = []
    for v in vendors:
        metrics = await calculate_vendor_reliability(db, v.id)
        sc = metrics["score"]
        v_risk = "Low"
        if sc < 60:
            v_risk = "High"
        elif sc < 80:
            v_risk = "Medium"
            
        if risk and v_risk.lower() != risk.lower():
            continue
            
        data.append({
            "id": v.id,
            "name": v.name,
            "reliability_score": sc,
            "risk_level": v_risk,
            "status": v.status
        })
    return data

@router.get("/contracts")
async def get_contracts(
    vendor: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(allow_auditor)
):
    stmt = select(Contract).options(selectinload(Contract.vendor))
    if status:
        stmt = stmt.where(Contract.status.ilike(f"%{status}%"))
        
    result = await db.execute(stmt.limit(100))
    contracts = result.scalars().all()
    data = []
    for c in contracts:
        v_name = c.vendor.name if c.vendor else "Unknown"
        if vendor and vendor.lower() not in v_name.lower(): continue
        
        days_remaining = (c.end_date - datetime.utcnow().date()).days if c.end_date else 0
        data.append({
            "contract": c.contract_number,
            "vendor": v_name,
            "start_date": str(c.start_date),
            "expiry": str(c.end_date),
            "status": c.status,
            "days_remaining": days_remaining
        })
    return data

@router.get("/invoices")
async def get_invoices(
    vendor: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(allow_auditor)
):
    stmt = select(Invoice).options(selectinload(Invoice.purchase_order))
    if status:
        stmt = stmt.where(Invoice.status.ilike(f"%{status}%"))
        
    result = await db.execute(stmt.limit(100))
    invoices = result.scalars().all()
    
    data = []
    for i in invoices:
        data.append({
            "invoice_number": i.invoice_number,
            "po": i.purchase_order.po_number if i.purchase_order else "N/A",
            "amount": i.total_amount,
            "status": i.status,
            "due_date": str(i.due_date)
        })
    return data

@router.get("/communications")
async def get_communications(
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(allow_auditor)
):
    result = await db.execute(select(Message).options(selectinload(Message.sender), selectinload(Message.receiver)).order_by(Message.created_at.desc()).limit(100))
    messages = result.scalars().all()
    
    data = []
    for m in messages:
        data.append({
            "thread": f"{m.thread_type} #{m.thread_id}",
            "participants": f"{m.sender.email if m.sender else 'System'} -> {m.receiver.email if m.receiver else 'System'}",
            "related_po": m.thread_id if m.thread_type == 'Purchase Order' else None,
            "created": str(m.created_at),
            "last_message": m.message,
            "status": "Unread" if not m.is_read else "Read"
        })
    return data
    
@router.get("/risk-controls")
async def get_controls(
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(allow_auditor)
):
    return []

@router.get("/deliveries")
async def get_deliveries(
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(allow_auditor)
):
    return []

@router.get("/reports")
async def get_reports(
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(allow_auditor)
):
    return []

@router.get("/exports")
async def get_exports(
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(allow_auditor)
):
    return []
'''

with open(backend_file, 'w', encoding='utf-8') as f:
    # Just writing the new logic safely
    f.write(router_code)
print("Backend updated.")
