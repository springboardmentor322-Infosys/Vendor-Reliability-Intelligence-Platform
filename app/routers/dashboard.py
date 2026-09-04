from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.security import get_current_user

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


@router.get("/")
def dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    total_vendors = db.query(models.Vendor).count()

    active_vendors = db.query(models.Vendor).filter(
        models.Vendor.status == "Approved"
    ).count()

    inactive_vendors = db.query(models.Vendor).filter(
        models.Vendor.status == "Rejected"
    ).count()

    total_procurement_requests = db.query(
        models.ProcurementRequest
    ).count()

    pending_procurement_requests = db.query(
        models.ProcurementRequest
    ).filter(
        models.ProcurementRequest.status == "Pending"
    ).count()

    total_purchase_orders = db.query(
        models.PurchaseOrder
    ).count()

    approved_purchase_orders = db.query(
        models.PurchaseOrder
    ).filter(
        models.PurchaseOrder.status == "Approved"
    ).count()

    completed_purchase_orders = db.query(
        models.PurchaseOrder
    ).filter(
        models.PurchaseOrder.status == "Completed"
    ).count()

    total_vendor_performance = db.query(
        models.VendorPerformance
    ).count()

    return {
        "total_vendors": total_vendors,
        "active_vendors": active_vendors,
        "inactive_vendors": inactive_vendors,
        "total_procurement_requests": total_procurement_requests,
        "pending_procurement_requests": pending_procurement_requests,
        "total_purchase_orders": total_purchase_orders,
        "approved_purchase_orders": approved_purchase_orders,
        "completed_purchase_orders": completed_purchase_orders,
        "total_vendor_performance": total_vendor_performance
    }