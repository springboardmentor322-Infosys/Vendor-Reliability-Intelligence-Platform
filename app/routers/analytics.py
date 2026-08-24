from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app import models
from app.security import get_current_user

router = APIRouter(prefix='/analytics', tags=['Procurement Analytics'])

@router.get('/')
def analytics(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    orders = db.query(models.PurchaseOrder).all()
    requests = db.query(models.ProcurementRequest).all()
    performances = db.query(models.VendorPerformance).all()
    vendors = db.query(models.Vendor).all()
    total_spend = sum(int(o.total_amount or 0) for o in orders)
    status_counts = {}
    for o in orders:
        status_counts[o.status] = status_counts.get(o.status, 0) + 1
    avg_performance = round(sum(p.overall_score for p in performances) / len(performances), 1) if performances else 0
    return {
        'total_vendors': len(vendors),
        'total_procurement_requests': len(requests),
        'total_purchase_orders': len(orders),
        'total_spend': total_spend,
        'average_vendor_performance': avg_performance,
        'purchase_order_status': status_counts,
        'approved_vendors': sum(v.status == 'Approved' for v in vendors),
        'pending_requests': sum(r.status == 'Pending' for r in requests),
        'completed_orders': sum(str(o.status).lower() in {'completed','delivered'} for o in orders),
        'delivery_status': {
            'delivered': sum(str(o.status).lower() == 'delivered' for o in orders),
            'in_progress': sum(str(o.status).lower() in {'shipped','in progress'} for o in orders),
            'pending': sum(str(o.status).lower() == 'pending' for o in orders),
        }
    }
