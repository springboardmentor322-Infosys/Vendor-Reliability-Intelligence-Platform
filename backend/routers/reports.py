import csv
import io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

import models
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/reports", tags=["Reports & Export"])


def _csv_response(rows, headers, filename):
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(headers)
    for row in rows:
        writer.writerow(row)
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/vendor-performance.csv")
def vendor_performance_report(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    vendors = db.query(models.Vendor).all()
    rows = [
        (v.id, v.name, v.category.value, v.status.value, v.reliability_score, v.risk_level.value)
        for v in vendors
    ]
    headers = ["Vendor ID", "Name", "Category", "Status", "Reliability Score", "Risk Level"]
    return _csv_response(rows, headers, "vendor_performance_report.csv")


@router.get("/purchase-orders.csv")
def purchase_orders_report(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    pos = db.query(models.PurchaseOrder).all()
    rows = [
        (po.po_number, po.vendor_id, po.item_description, po.quantity, po.unit_price,
         po.total_amount, po.status.value, po.order_date, po.expected_delivery, po.actual_delivery)
        for po in pos
    ]
    headers = ["PO Number", "Vendor ID", "Item", "Qty", "Unit Price", "Total", "Status", "Order Date", "Expected Delivery", "Actual Delivery"]
    return _csv_response(rows, headers, "purchase_orders_report.csv")


@router.get("/contracts.csv")
def contracts_report(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    contracts = db.query(models.Contract).all()
    rows = [
        (c.id, c.vendor_id, c.contract_title, c.start_date, c.end_date, c.compliance_status.value)
        for c in contracts
    ]
    headers = ["Contract ID", "Vendor ID", "Title", "Start Date", "End Date", "Compliance Status"]
    return _csv_response(rows, headers, "contracts_report.csv")
