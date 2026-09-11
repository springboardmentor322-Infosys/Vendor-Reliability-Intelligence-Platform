# fast_import_all.py
import pandas as pd
from database import SessionLocal, engine
import models
from sqlalchemy import text

# Recreate tables cleanly
models.Base.metadata.drop_all(bind=engine)
models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

print("Importing users in bulk...")
users_df = pd.read_csv("users.csv")
if "hashed_passworrd" in users_df.columns and "hashed_password" not in users_df.columns:
    users_df = users_df.rename(columns={"hashed_passworrd": "hashed_password"})

user_objects = []
for row in users_df.to_dict(orient="records"):
    user_objects.append(models.User(
        fullname=str(row.get("fullname", "")),
        email=str(row.get("email", "")),
        phone=str(row.get("phone", "")),
        role=str(row.get("role", "vendor")),
        hashed_password=str(row.get("hashed_password", "")),
        status=str(row.get("status", "approved"))
    ))

db.bulk_save_objects(user_objects)
db.commit()
print(f"Successfully imported {len(user_objects)} users!")

print("Importing vendors with duplicate handling...")
vendors_df = pd.read_csv("vendors.csv")
if "risk_tire" in vendors_df.columns and "risk_tier" not in vendors_df.columns:
    vendors_df = vendors_df.rename(columns={"risk_tire": "risk_tier"})

vendor_objects = []
seen_names = set()

for row in vendors_df.to_dict(orient="records"):
    vendor_name = str(row.get("vendor_name", "")).strip()
    
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
print(f"Successfully imported {len(vendor_objects)} vendors!")
