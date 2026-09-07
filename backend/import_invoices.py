# import_invoices_safe.py
import pandas as pd
from database import SessionLocal, engine
import models

# Ensure tables exist without affecting other tables
models.Base.metadata.create_all(bind=engine)
db = SessionLocal()

print("Clearing existing invoices only...")
db.query(models.Invoice).delete()
db.commit()

print("Reading invoices.csv...")
df = pd.read_csv("invoices.csv")

invoice_objects = []
seen_invoices = set()

for row in df.to_dict(orient="records"):
    row_id = row.get("id")
    base_invoice = str(row.get("invoice_no", f"INV-{row_id}"))
    
    # Ensure invoice_no is unique if there are duplicates in the CSV
    invoice_no = base_invoice
    if invoice_no in seen_invoices:
        invoice_no = f"{base_invoice}-{row_id}"
    seen_invoices.add(invoice_no)

    invoice_objects.append(models.Invoice(
        invoice_no=invoice_no,
        vendor_name=str(row.get("vendor_name", "")),
        product_name=str(row.get("product_name", "")),
        department=str(row.get("department", "General")),
        quantity=int(row.get("quantity", 0)),
        amount=float(row.get("amount", 0.0)),
        status=str(row.get("status", "Pending")),
        delivery_status=str(row.get("delivery_status", "In Transit")),
        quality_status=str(row.get("quality_status", "In Progress")),
        payment_status=str(row.get("payment_status", "Unpaid")),
        transaction_id=str(row.get("transaction_id", "")) if pd.notna(row.get("transaction_id")) else None
    ))

db.bulk_save_objects(invoice_objects)
db.commit()
db.close()

print(f"Successfully imported {len(invoice_objects)} invoices into the database without affecting other tables!")