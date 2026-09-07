# import_purchase_orders_safe.py
import pandas as pd
from database import SessionLocal, engine
import models

# Ensure tables exist without touching others
models.Base.metadata.create_all(bind=engine)
db = SessionLocal()

print("Clearing existing purchase orders only...")
db.query(models.PurchaseOrder).delete()
db.commit()

print("Reading order.csv...")
df = pd.read_csv("order.csv")

po_objects = []
seen_invoices = set()

for row in df.to_dict(orient="records"):
    row_id = row.get("id")
    base_invoice = str(row.get("invoice_no", f"INV-{row_id}"))
    
    invoice_no = base_invoice
    if invoice_no in seen_invoices:
        invoice_no = f"{base_invoice}-{row_id}"
    seen_invoices.add(invoice_no)

    po_objects.append(models.PurchaseOrder(
        invoice_no=invoice_no,
        vendor_name=str(row.get("vendor_name", "")),
        product_name=str(row.get("product_name", "")),
        quantity=int(row.get("quantity", 0)),
        department=str(row.get("department", "General")),
        creation_date=str(row.get("creation_date", "")),
        expiry_date=str(row.get("expiry_date", "")),
        total_value=float(row.get("total_value", 0.0)),
        order_status=str(row.get("order_status", "Pending")),
        production_status=str(row.get("production_status", "In Progress")),
        completed_units=int(row.get("completed_units", 0))
    ))

db.bulk_save_objects(po_objects)
db.commit()
db.close()

print(f"Successfully imported {len(po_objects)} purchase orders without affecting other tables!")