# fast_import_vendors.py
import pandas as pd
from database import SessionLocal, engine
import models

# Recreate tables or clear existing vendor data
models.Base.metadata.create_all(bind=engine)
db = SessionLocal()

print("Clearing existing vendors...")
db.query(models.Vendor).delete()
db.commit()

print("Reading vendors.csv in bulk...")
vendors_df = pd.read_csv("vendors.csv")

if "risk_tire" in vendors_df.columns and "risk_tier" not in vendors_df.columns:
    vendors_df = vendors_df.rename(columns={"risk_tire": "risk_tier"})

vendor_objects = []
seen_names = set()

for row in vendors_df.to_dict(orient="records"):
    vendor_name = str(row.get("vendor_name", "")).strip()
    
    # Handle duplicate names gracefully
    original_name = vendor_name
    counter = 1
    while vendor_name in seen_names:
        vendor_name = f"{original_name} ({counter})"
        counter += 1
    seen_names.add(vendor_name)

    vendor_objects.append(models.Vendor(
        vendor_name=vendor_name,
        contact_person=str(row.get("contact_person", "")),
        email=str(row.get("email", "")),
        phone=str(row.get("phone", "")),
        category=str(row.get("category", "General")),
        reliability_score=float(row.get("reliability_score", 100.0)),
        risk_tier=str(row.get("risk_tier", "Low Risk")),
        status=str(row.get("status", "Accepting Orders")),
        last_ordered_date=row.get("last_ordered_date") if pd.notna(row.get("last_ordered_date")) else None,
        contract_ended_date=row.get("contract_ended_date") if pd.notna(row.get("contract_ended_date")) else None
    ))

db.bulk_save_objects(vendor_objects)
db.commit()
db.close()
print(f"Successfully and efficiently imported {len(vendor_objects)} vendors!")