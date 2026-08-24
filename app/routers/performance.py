from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import VendorPerformance
from app.schemas import VendorPerformanceCreate, VendorPerformanceResponse
from app.security import get_current_user

router = APIRouter(prefix="/performance", tags=["Vendor Performance"])

@router.post("/add", response_model=VendorPerformanceResponse)
def create_performance(performance: VendorPerformanceCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    row = VendorPerformance(**performance.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row

@router.get("/", response_model=list[VendorPerformanceResponse])
def get_all_performance(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(VendorPerformance).order_by(VendorPerformance.overall_score.desc()).all()

@router.get("/summary")
def performance_summary(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    rows = db.query(VendorPerformance).all()
    return {
        "total_records": len(rows),
        "average_overall_score": round(sum(r.overall_score for r in rows)/len(rows), 1) if rows else 0,
        "average_delivery_score": round(sum(r.delivery_score for r in rows)/len(rows), 1) if rows else 0,
        "average_quality_score": round(sum(r.quality_score for r in rows)/len(rows), 1) if rows else 0,
        "average_service_rating": round(sum(r.service_rating for r in rows)/len(rows), 1) if rows else 0,
        "average_response_time_hours": round(sum(r.response_time_hours for r in rows)/len(rows), 1) if rows else 0,
        "average_issue_resolution_time_hours": round(sum(r.issue_resolution_time_hours for r in rows)/len(rows), 1) if rows else 0,
        "average_order_completion_rate": round(sum(r.order_completion_rate for r in rows)/len(rows), 1) if rows else 0,
    }

@router.get("/{performance_id}", response_model=VendorPerformanceResponse)
def get_performance(performance_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    row = db.query(VendorPerformance).filter(VendorPerformance.id == performance_id).first()
    if not row: raise HTTPException(status_code=404, detail="Performance record not found")
    return row

@router.put("/{performance_id}", response_model=VendorPerformanceResponse)
def update_performance(performance_id: int, updated: VendorPerformanceCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    row = db.query(VendorPerformance).filter(VendorPerformance.id == performance_id).first()
    if not row: raise HTTPException(status_code=404, detail="Performance record not found")
    for key, value in updated.model_dump().items(): setattr(row, key, value)
    db.commit(); db.refresh(row)
    return row

@router.delete("/{performance_id}")
def delete_performance(performance_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    row = db.query(VendorPerformance).filter(VendorPerformance.id == performance_id).first()
    if not row: raise HTTPException(status_code=404, detail="Performance record not found")
    db.delete(row); db.commit()
    return {"message": "Performance record deleted successfully"}

@router.get('/history/{vendor_name}')
def performance_history(vendor_name: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    rows = db.query(VendorPerformance).filter(VendorPerformance.vendor_name == vendor_name).order_by(VendorPerformance.id.asc()).all()
    return [{'period': r.performance_period, 'overall_score': r.overall_score, 'delivery_score': r.delivery_score, 'quality_score': r.quality_score, 'service_rating': r.service_rating, 'response_time_hours': r.response_time_hours, 'issue_resolution_time_hours': r.issue_resolution_time_hours, 'order_completion_rate': r.order_completion_rate} for r in rows]
