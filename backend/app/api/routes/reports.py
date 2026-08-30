import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.vendor import Vendor
from app.models.purchase_order import PurchaseOrder
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports & Export"])


def _csv_response(rows: list[dict], filename: str) -> StreamingResponse:
    buffer = io.StringIO()
    if rows:
        writer = csv.DictWriter(buffer, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/vendor-performance.csv")
def vendor_performance_report(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Vendor)
    if current_user.role.value == "vendor":
        if current_user.vendor_id is None:
            return _csv_response([], "vendor_performance_report.csv")
        query = query.filter(Vendor.id == current_user.vendor_id)
    vendors = query.all()
    rows = [
        {
            "company_name": v.company_name,
            "category": v.category.value,
            "status": v.status.value,
            "reliability_score": v.reliability_score,
            "contact_email": v.contact_email or "",
        }
        for v in vendors
    ]
    return _csv_response(rows, "vendor_performance_report.csv")


@router.get("/purchase-orders.csv")
def purchase_orders_report(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(PurchaseOrder)
    if current_user.role.value == "vendor":
        if current_user.vendor_id is None:
            return _csv_response([], "purchase_orders_report.csv")
        query = query.filter(PurchaseOrder.vendor_id == current_user.vendor_id)
    orders = query.all()
    rows = [
        {
            "po_number": o.po_number,
            "vendor_id": str(o.vendor_id),
            "description": o.description,
            "quantity": o.quantity,
            "total_amount": o.total_amount,
            "status": o.status.value,
            "created_at": o.created_at.isoformat(),
        }
        for o in orders
    ]
    return _csv_response(rows, "purchase_orders_report.csv")
