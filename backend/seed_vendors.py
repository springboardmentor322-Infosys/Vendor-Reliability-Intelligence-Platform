from database import SessionLocal, engine
import models

# Ensure tables exist in the database
models.Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Initial vendor records with category mapping
initial_vendors = [
    {
        "vendor_name": "Acme Logistics",
        "contact_person": "John Doe",
        "email": "j.doe@acmelogistics.com",
        "category": "Logistics Partners",
        "reliability_score": 98.0,
        "risk_tier": "Low Risk",
        "status": "Accepting Orders",
        "last_ordered_date": "2026-07-15",
        "contract_ended_date": "2026-12-31"
    },
    {
        "vendor_name": "TechSupply Corp",
        "contact_person": "Sarah Smith",
        "email": "contact@techsupply.com",
        "category": "IT Vendors",
        "reliability_score": 82.0,
        "risk_tier": "Medium Risk",
        "status": "Accepting Orders",
        "last_ordered_date": "2026-07-20",
        "contract_ended_date": "2026-11-15"
    },
    {
        "vendor_name": "Global Raw Materials",
        "contact_person": "Mike Johnson",
        "email": "m.johnson@globalraw.com",
        "category": "Raw Material Suppliers",
        "reliability_score": 95.0,
        "risk_tier": "Low Risk",
        "status": "Not Accepting",
        "last_ordered_date": "2026-05-10",
        "contract_ended_date": "2027-03-20"
    },
    {
        "vendor_name": "Apex Heavy Machinery",
        "contact_person": "Robert Brown",
        "email": "r.brown@apexmachinery.com",
        "category": "Equipment Vendors",
        "reliability_score": 64.0,
        "risk_tier": "High Risk",
        "status": "Accepting Orders",
        "last_ordered_date": "2026-06-01",
        "contract_ended_date": "2026-08-15"
    }
]

# Insert vendors if they don't already exist
for v in initial_vendors:
    if not db.query(models.Vendor).filter_by(vendor_name=v["vendor_name"]).first():
        vendor_obj = models.Vendor(**v)
        db.add(vendor_obj)

db.commit()
db.close()
print("Vendors seeded successfully with categories!")
