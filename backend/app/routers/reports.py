from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models
import csv
import io

router = APIRouter(
    prefix="/reports",
    tags=["Reports & Export"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=dict)
@router.get("/", response_model=dict)
@router.get("/summary")
def get_reports_summary(db: Session = Depends(get_db)):
    total_vendors = db.query(models.Vendor).count()
    total_orders = db.query(models.PurchaseOrder).count()
    total_contracts = db.query(models.Contract).count()
    total_procurements = db.query(models.Procurement).count()
    
    return {
        "summary": {
            "total_vendors": total_vendors,
            "total_purchase_orders": total_orders,
            "total_active_contracts": total_contracts,
            "total_procurement_requests": total_procurements
        },
        "available_reports": [
            {"id": "vendor_performance", "title": "Vendor Performance Report", "format": "CSV/Excel"},
            {"id": "purchase_orders", "title": "Purchase Order Status Report", "format": "CSV/Excel"},
            {"id": "contract_compliance", "title": "Contract Compliance & Expiry Report", "format": "CSV/Excel"}
        ]
    }

@router.get("/export/vendors.csv")
def export_vendors_csv(db: Session = Depends(get_db)):
    vendors = db.query(models.Vendor).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Name", "Category", "Delivery Status", "Score", "Quality Rating", "Response Time (hrs)", "Risk Level", "Approval Status"])
    
    for v in vendors:
        writer.writerow([v.id, v.name, v.category, v.delivery, v.score, v.quality, v.response_time, v.risk_level, v.approval_status])
        
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=vendor_performance_report.csv"
    return response

@router.get("/export/purchase-orders.csv")
def export_orders_csv(db: Session = Depends(get_db)):
    orders = db.query(models.PurchaseOrder).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Order ID", "Vendor", "Product", "Amount", "Status", "Invoice Status"])
    
    for o in orders:
        writer.writerow([o.id, o.order_id, o.vendor, o.product, o.amount, o.status, o.invoice_status])
        
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=purchase_orders_report.csv"
    return response

@router.get("/export/contracts.csv")
def export_contracts_csv(db: Session = Depends(get_db)):
    contracts = db.query(models.Contract).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Contract ID", "Vendor", "Contract Name", "Start Date", "Expiry Date", "Compliance Score", "Status"])
    
    for c in contracts:
        writer.writerow([c.id, c.contract_id, c.vendor, c.contract_name, c.start_date, c.expiry_date, c.compliance_score, c.status])
        
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=contract_compliance_report.csv"
    return response

@router.get("/export/procurements.csv")
def export_procurements_csv(db: Session = Depends(get_db)):
    procurements = db.query(models.Procurement).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Item Name", "Quantity", "Estimated Cost", "Department", "Vendor Assigned", "Status"])
    
    for p in procurements:
        writer.writerow([p.id, p.item_name, p.quantity, p.estimated_cost, p.department, p.vendor_assigned, p.status])
        
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=procurement_requisitions_report.csv"
    return response
