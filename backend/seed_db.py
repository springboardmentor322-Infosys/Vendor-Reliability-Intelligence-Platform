import models
from database import SessionLocal, engine

# Create all tables in the engine
models.Base.metadata.create_all(bind=engine)

def seed_db():
    db = SessionLocal()
    
    # Check if we already have vendors
    if db.query(models.Vendor).count() > 0:
        print("Database already seeded with vendors.")
        db.close()
        return

    vendors_data = [
        {"company_name": "Alpha Technologies", "contact_email": "contact@alphatech.com", "status": "Active", "rating": 4.9, "risk_level": "Low", "delivery_rate": 98.0, "quality_score": 99.0},
        {"company_name": "Global Supplies Ltd.", "contact_email": "info@globalsupplies.com", "status": "Active", "rating": 4.8, "risk_level": "Low", "delivery_rate": 97.5, "quality_score": 98.5},
        {"company_name": "Prime Industrial Solutions", "contact_email": "sales@primeind.com", "status": "Active", "rating": 4.7, "risk_level": "Low", "delivery_rate": 95.0, "quality_score": 96.0},
        {"company_name": "Zenith Traders", "contact_email": "support@zenith.com", "status": "Active", "rating": 4.6, "risk_level": "Low", "delivery_rate": 94.0, "quality_score": 95.0},
        {"company_name": "Horizon Enterprises", "contact_email": "hello@horizonent.com", "status": "Active", "rating": 4.5, "risk_level": "Medium", "delivery_rate": 92.0, "quality_score": 93.0},
        {"company_name": "ABC Logistics", "contact_email": "abc@logistics.com", "status": "Suspended", "rating": 2.1, "risk_level": "High", "delivery_rate": 58.0, "quality_score": 62.5},
        {"company_name": "Nova Industries", "contact_email": "new@novaind.com", "status": "Pending", "rating": 0.0, "risk_level": "Low", "delivery_rate": 100.0, "quality_score": 100.0},
        {"company_name": "TechSource Pvt. Ltd.", "contact_email": "tech@source.com", "status": "Active", "rating": 4.2, "risk_level": "Medium", "delivery_rate": 88.0, "quality_score": 90.0},
        {"company_name": "Omega Corp", "contact_email": "contact@omega.com", "status": "Active", "rating": 3.5, "risk_level": "High", "delivery_rate": 75.0, "quality_score": 80.0},
        {"company_name": "Sigma Materials", "contact_email": "info@sigma.com", "status": "Active", "rating": 4.0, "risk_level": "Medium", "delivery_rate": 85.0, "quality_score": 85.0},
    ]

    for v_data in vendors_data:
        vendor = models.Vendor(**v_data)
        db.add(vendor)
    
    db.commit()
    print("Successfully seeded 10 mock vendors!")
    db.close()

if __name__ == "__main__":
    seed_db()
