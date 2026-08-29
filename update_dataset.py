import csv
import os
import sys

# Add backend to path so its internal imports work
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

DATASET_DIR = r"c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\dataset"

def export_table_to_csv(query, headers, filename):
    filepath = os.path.join(DATASET_DIR, filename)
    with open(filepath, mode='w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for row in query:
            writer.writerow(row)
    print(f"Exported {len(query)} records to {filename}")

def main():
    if not os.path.exists(DATASET_DIR):
        os.makedirs(DATASET_DIR)
        
    db = SessionLocal()
    
    # 1. Export Vendors
    vendors = db.query(
        models.Vendor.id, models.Vendor.company_name, models.Vendor.category, 
        models.Vendor.approval_status, models.Vendor.risk_level, 
        models.Vendor.rating, models.Vendor.delivery_rate, models.Vendor.quality_score
    ).all()
    export_table_to_csv(
        vendors, 
        ["Vendor ID", "Company Name", "Category", "Status", "Risk Level", "Rating", "Delivery Rate", "Quality Score"],
        "vendors_dataset.csv"
    )
    
    # 2. Export Procurement Requests
    prs = db.query(
        models.ProcurementRequest.id, models.ProcurementRequest.request_number,
        models.ProcurementRequest.department, models.ProcurementRequest.estimated_cost,
        models.ProcurementRequest.approval_status
    ).all()
    export_table_to_csv(
        prs,
        ["PR ID", "Request Number", "Department", "Estimated Cost", "Status"],
        "procurement_requests_dataset.csv"
    )
    
    # 3. Export Purchase Orders
    pos = db.query(
        models.PurchaseOrder.id, models.PurchaseOrder.po_number,
        models.PurchaseOrder.vendor_id, models.PurchaseOrder.fulfillment_status
    ).all()
    export_table_to_csv(
        pos,
        ["PO ID", "PO Number", "Vendor ID", "Fulfillment Status"],
        "purchase_orders_dataset.csv"
    )

    db.close()
    print("Dataset successfully updated!")

if __name__ == "__main__":
    main()
