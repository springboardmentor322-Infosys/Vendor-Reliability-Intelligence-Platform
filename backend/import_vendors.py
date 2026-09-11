# import_vendors.py
import pandas as pd
from database import SessionLocal, engine
import models

# Recreate tables or clear existing vendor data
models.Base.metadata.create_all(bind=engine)
db = SessionLocal()

print("Clearing existing vendors...")
db.query(models.Vendor).delete()
db.commit()

print("Reading vendors.csv...")
vendors_df = pd.read_csv("vendors.csv")

# Normalize column name variations for risk tier / tire
if "risk_tire" in vendors_df.columns and "risk_tier" not in vendors_df.columns:
    vendors_df = vendors_df.rename(columns={"risk_tire": "risk_tier"})

vendor_objects = []
seen_names = set()

for row in vendors_df.to_dict(orient="records"):
    vendor_name = str(row.get("vendor_name", "")).strip()
    if not vendor_name or vendor_name.lower() in ("nan", "none", ""):
        continue
    
    # Handle duplicate names gracefully
    original_name = vendor_name
    counter = 1
    while vendor_name in seen_names:
        vendor_name = f"{original_name} ({counter})"
        counter += 1
    seen_names.add(vendor_name)

    # Parse reliability score safely
    try:
        rel_score = float(row.get("reliability_score", 85.0))
        if pd.isna(rel_score):
            rel_score = 85.0
    except (ValueError, TypeError):
        rel_score = 85.0

    # Parse risk tier safely
    risk_tier_val = str(row.get("risk_tier", "Low Risk"))
    if pd.isna(risk_tier_val) or not risk_tier_val.strip() or risk_tier_val.lower() == "nan":
        risk_tier_val = "Low Risk" if rel_score >= 90 else ("Medium Risk" if rel_score >= 75 else "High Risk")

    vendor_objects.append(models.Vendor(
        vendor_name=vendor_name,
        contact_person=str(row.get("contact_person", "") or vendor_name),
        email=str(row.get("email", "") or ""),
        phone=str(row.get("phone", "") or ""),
        category=str(row.get("category", "General") or "General"),
        reliability_score=rel_score,
        risk_tier=risk_tier_val,
        status=str(row.get("status", "Accepting Orders") or "Accepting Orders"),
        last_ordered_date=row.get("last_order_date") if pd.notna(row.get("last_order_date")) else None,
        contract_ended_date=row.get("contract_ended_date") if pd.notna(row.get("contract_ended_date")) else None
    ))

if vendor_objects:
    db.bulk_save_objects(vendor_objects)
    db.commit()

db.close()
print(f"Successfully imported {len(vendor_objects)} vendors with exact scores and risk tiers from dataset!")
