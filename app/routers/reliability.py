from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.security import get_current_user

router = APIRouter(prefix='/reliability', tags=['Vendor Reliability'])

def _score(vendor, perf, orders, contract_ok=True):
    on_time = perf.delivery_score if perf else 0
    quality = perf.quality_score if perf else 0
    response = perf.response_time_hours if perf else 0
    communication = max(0, min(100, 100 - response * 5)) if response else 0
    completion = perf.order_completion_rate if perf and perf.order_completion_rate else (round(sum(str(o.status).lower() in {'delivered','completed'} for o in orders)/len(orders)*100) if orders else 0)
    contract = 100 if contract_ok else 50
    issue = max(0, min(100, 100 - (perf.issue_resolution_time_hours if perf else 0) * 3)) if perf else 0
    purchase_history = min(100, len(orders) * 10)
    score = round(on_time*0.25 + quality*0.20 + communication*0.15 + contract*0.15 + purchase_history*0.10 + issue*0.15)
    return score, {"delivery_history": on_time, "product_quality": quality, "communication_efficiency": communication, "contract_compliance": contract, "purchase_history": purchase_history, "issue_resolution": issue}

@router.get('/')
def reliability_scores(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    result=[]
    for vendor in db.query(models.Vendor).all():
        perf=db.query(models.VendorPerformance).filter(models.VendorPerformance.vendor_name==vendor.vendor_name).order_by(models.VendorPerformance.id.desc()).first()
        orders=db.query(models.PurchaseOrder).filter(models.PurchaseOrder.vendor_name==vendor.vendor_name).all()
        contracts=db.query(models.Contract).filter(models.Contract.vendor_name==vendor.vendor_name).all() if hasattr(models,'Contract') else []
        contract_ok=not contracts or all(c.compliance_flag in {'Active','Compliant'} for c in contracts)
        score,factors=_score(vendor,perf,orders,contract_ok)
        risk='Low' if score>=80 else 'Medium' if score>=60 else 'High'
        result.append({"vendor_id":vendor.id,"vendor_name":vendor.vendor_name,"category":vendor.category,"reliability_score":score,"risk_level":risk,"factors":factors,"recommendation":"Preferred supplier" if score>=80 else "Monitor performance closely" if score>=60 else "Review before new allocation"})
    return sorted(result,key=lambda x:x['reliability_score'],reverse=True)

@router.get('/summary')
def reliability_summary(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    rows=reliability_scores(db,current_user); scores=[r['reliability_score'] for r in rows]
    return {"average_reliability_score":round(sum(scores)/len(scores),1) if scores else 0,"low_risk":sum(r['risk_level']=='Low' for r in rows),"medium_risk":sum(r['risk_level']=='Medium' for r in rows),"high_risk":sum(r['risk_level']=='High' for r in rows),"top_vendors":rows[:5]}

@router.get('/trend/{vendor_name}')
def reliability_trend(vendor_name:str,db:Session=Depends(get_db),current_user=Depends(get_current_user)):
    rows=db.query(models.VendorPerformance).filter(models.VendorPerformance.vendor_name==vendor_name).order_by(models.VendorPerformance.id.asc()).all()
    return [{"period":r.performance_period,"overall_score":r.overall_score,"delivery_score":r.delivery_score,"quality_score":r.quality_score} for r in rows]
