from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Vendor, PurchaseOrder, Contract, Procurement

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    vendors = db.query(Vendor).all()
    orders = db.query(PurchaseOrder).all()
    contracts = db.query(Contract).all()
    procurements = db.query(Procurement).all()

    total_vendors = len(vendors)
    scores = [v.score for v in vendors if v.score is not None]
    average_vendor_score = round(sum(scores) / len(scores), 1) if scores else 0

    on_time_count = sum(1 for v in vendors if v.delivery == "On Time")
    on_time_delivery_pct = round((on_time_count / total_vendors) * 100, 1) if total_vendors > 0 else 0

    risk_vendors = sum(1 for v in vendors if (v.score or 0) < 60)
    good_vendors = sum(1 for v in vendors if 70 <= (v.score or 0) < 90)
    excellent_vendors = sum(1 for v in vendors if (v.score or 0) >= 90)

    # Rating distribution for Pie Chart
    rating_distribution = {
        "Excellent": sum(1 for v in vendors if (v.score or 0) >= 90),
        "Good": sum(1 for v in vendors if 75 <= (v.score or 0) < 90),
        "Average": sum(1 for v in vendors if 60 <= (v.score or 0) < 75),
        "Poor": sum(1 for v in vendors if (v.score or 0) < 60),
    }

    total_orders = len(orders)
    pending_orders = sum(1 for o in orders if o.status == "Pending")
    completed_orders = sum(1 for o in orders if o.status in ["Delivered", "Paid", "Completed", "Received"])
    total_spend = sum(o.amount for o in orders if o.amount is not None)

    active_contracts = sum(1 for c in contracts if c.status == "Active") if contracts else 0
    total_procurements = len(procurements)

    # Order status counts for Bar Chart
    order_status_counts = {}
    for o in orders:
        st = o.status or "Unknown"
        order_status_counts[st] = order_status_counts.get(st, 0) + 1

    # Format total spend e.g. ₹2.5M or ₹250,000
    if total_spend >= 1_000_000:
        formatted_spend = f"₹{total_spend / 1_000_000:.1f}M"
    elif total_spend >= 1_000:
        formatted_spend = f"₹{total_spend / 1_000:.1f}K"
    else:
        formatted_spend = f"₹{total_spend}"

    return {
        "total_vendors": total_vendors,
        "total_orders": total_orders,
        "average_vendor_score": average_vendor_score,
        "pending_orders": pending_orders,
        "completed_orders": completed_orders,
        "total_spend": total_spend,
        "formatted_spend": formatted_spend,
        "active_contracts": active_contracts,
        "total_procurements": total_procurements,
        "on_time_delivery_pct": on_time_delivery_pct,
        "risk_vendors": risk_vendors,
        "good_vendors": good_vendors,
        "excellent_vendors": excellent_vendors,
        "rating_distribution": rating_distribution,
        "order_status_counts": order_status_counts
    }
