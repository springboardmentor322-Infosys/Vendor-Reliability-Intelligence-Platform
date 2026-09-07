import re

file_ana = r'D:\Vendor Reliability Intelligence Platform\backend\app\modules\analytics\router.py'
content_ana = open(file_ana, 'r', encoding='utf-8').read()

import_str = 'from app.modules.reliability.service import calculate_vendor_reliability\n'
if import_str not in content_ana:
    content_ana = content_ana.replace('from app.modules.audit.models import AuditLog', 'from app.modules.audit.models import AuditLog\n' + import_str)

new_logic = '''
    all_ven = await db.execute(select(Vendor.id))
    ven_ids = all_ven.scalars().all()
    high_risk_vendors = 0
    for vid in ven_ids:
        metrics = await calculate_vendor_reliability(db, vid)
        if metrics["score"] < 60:
            high_risk_vendors += 1

    kpis = {
'''

content_ana = re.sub(r'    kpis = {', new_logic, content_ana)
content_ana = content_ana.replace('"high_risk_vendors": await db.scalar(select(func.count(Vendor.id)).where(Vendor.reliability_score < 60)) or 0,', '"high_risk_vendors": high_risk_vendors,')

with open(file_ana, 'w', encoding='utf-8') as f:
    f.write(content_ana)

file_aud = r'D:\Vendor Reliability Intelligence Platform\backend\app\modules\audit\router.py'
content_aud = open(file_aud, 'r', encoding='utf-8').read()
content_aud = content_aud.replace('from app.modules.communications.models import Message', 'from app.modules.communications.models import Message\n' + import_str)

ven_block = r'''@router.get\("/vendors"\).*?return data'''
new_ven_block = '''@router.get("/vendors")
async def get_vendor_audit(db: AsyncSession = Depends(get_db), current_user: User = Depends(allow_auditor)):
    result = await db.execute(select(Vendor).limit(100))
    vendors = result.scalars().all()
    data = []
    for v in vendors:
        metrics = await calculate_vendor_reliability(db, v.id)
        sc = metrics["score"]
        risk = "Low"
        if sc < 60:
            risk = "High"
        elif sc < 80:
            risk = "Medium"
            
        data.append({
            "id": v.id,
            "name": v.name,
            "po_count": metrics.get("total_orders", 0),
            "reliability_score": sc,
            "risk_level": risk,
            "contract_status": "Active" if v.status == "active" else "Review",
            "audit_status": "Clear" if risk == "Low" else ("Needs Review" if risk == "Medium" else "Critical")
        })
    return data'''
content_aud = re.sub(ven_block, new_ven_block, content_aud, flags=re.DOTALL)

risk_block = r'''@router.get\("/risk-controls"\).*?return data'''
new_risk_block = '''@router.get("/risk-controls")
async def get_risk_controls(db: AsyncSession = Depends(get_db), current_user: User = Depends(allow_auditor)):
    result = await db.execute(select(Vendor).limit(20))
    v_risks = result.scalars().all()
    
    data = []
    for v in v_risks:
        metrics = await calculate_vendor_reliability(db, v.id)
        sc = metrics["score"]
        if sc < 70:
            data.append({
                "category": "Vendor",
                "entity": v.name,
                "risk_level": "High" if sc < 50 else "Medium",
                "reason": "Low reliability score.",
                "evidence": f"Score: {sc}",
                "recommended_review": "Vendor performance audit"
            })
    return data'''
content_aud = re.sub(risk_block, new_risk_block, content_aud, flags=re.DOTALL)

with open(file_aud, 'w', encoding='utf-8') as f:
    f.write(content_aud)

print("Fixed High Risk Vendor logic across all routes.")
