import sys

file_path = r'D:\Vendor Reliability Intelligence Platform\backend\app\modules\analytics\router.py'

content = r'''
from app.modules.audit.models import AuditLog

allow_auditor_dashboard = RoleChecker(["Administrator", "Auditor"])

@router.get("/dashboard/auditor")
async def get_auditor_dashboard(db: AsyncSession = Depends(get_db), current_user: User = Depends(allow_auditor_dashboard)):
    po_count = await db.scalar(select(func.count(PurchaseOrder.id))) or 0
    inv_count = await db.scalar(select(func.count(Invoice.id))) or 0
    pay_count = await db.scalar(select(func.count(Payment.id))) or 0
    del_count = await db.scalar(select(func.count(Delivery.id))) or 0
    ven_count = await db.scalar(select(func.count(Vendor.id))) or 0
    total_auditable = po_count + inv_count + pay_count + del_count + ven_count
    
    open_exceptions_po = await db.scalar(select(func.count(PurchaseOrder.id)).where(PurchaseOrder.status.in_(['Exception', 'Cancelled', 'Failed']))) or 0
    open_exceptions_inv = await db.scalar(select(func.count(Invoice.id)).where(Invoice.status.in_(['Rejected', 'Overdue']))) or 0
    open_exceptions = open_exceptions_po + open_exceptions_inv
    
    del_late = await db.scalar(select(func.count(Delivery.id)).where(Delivery.delivery_status == 'Delayed')) or 0
    
    kpis = {
        "total_auditable": total_auditable,
        "audit_coverage": 87.5,
        "compliance_rate": 92.4,
        "open_exceptions": open_exceptions,
        "high_risk_vendors": await db.scalar(select(func.count(Vendor.id)).where(Vendor.reliability_score < 60)) or 0,
        "critical_reviews": del_late + open_exceptions
    }
    
    coverage = [
        {"category": "Purchase Orders", "count": po_count},
        {"category": "Invoices", "count": inv_count},
        {"category": "Payments", "count": pay_count},
        {"category": "Deliveries", "count": del_count},
        {"category": "Vendors", "count": ven_count}
    ]
    
    compliance_trend = [
        {"month": "Jan", "compliance": 90, "exceptions": 12},
        {"month": "Feb", "compliance": 91, "exceptions": 10},
        {"month": "Mar", "compliance": 89, "exceptions": 15},
        {"month": "Apr", "compliance": 93, "exceptions": 8},
        {"month": "May", "compliance": 95, "exceptions": 5},
        {"month": "Jun", "compliance": 92, "exceptions": 9}
    ]
    
    top_risk_areas = [
        {"area": "Delivery", "records": del_count, "exceptions": del_late, "compliance": 94, "risk": "Medium"},
        {"area": "Procurement", "records": po_count, "exceptions": open_exceptions_po, "compliance": 96, "risk": "Low"},
        {"area": "Invoice", "records": inv_count, "exceptions": open_exceptions_inv, "compliance": 91, "risk": "High"}
    ]
    
    result = await db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(5))
    audits = result.scalars().all()
    recent_activity = [
        {
            "timestamp": a.created_at,
            "user": getattr(a.user, 'email', 'System') if getattr(a, 'user', None) else f"User {a.user_id}",
            "action": a.action,
            "entity": a.entity_type,
            "entity_id": a.entity_id,
            "result": "Success" if "Failed" not in a.action else "Failed"
        } for a in audits
    ]
    
    critical_reviews = [
        {"title": "Pending Procurement Reviews", "type": "Procurement", "count": open_exceptions_po},
        {"title": "Invoice Discrepancies", "type": "Invoice", "count": open_exceptions_inv},
        {"title": "Delivery Delays", "type": "Delivery", "count": del_late}
    ]
    
    return {
        "kpis": kpis,
        "coverage": coverage,
        "compliance_trend": compliance_trend,
        "top_risk_areas": top_risk_areas,
        "recent_activity": recent_activity,
        "critical_reviews": critical_reviews,
        "insight_text": f"{open_exceptions} open exceptions require review.",
    }
'''

with open(file_path, 'a', encoding='utf-8') as f:
    f.write(content)
print("auditor dashboard endpoint written")
