import models
from database import SessionLocal, engine
import database
import bcrypt

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def seed_db():
    print("Resetting database...")
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # 1. Base Admin, Procurement, Auditor, Finance & Supply Chain Users
    users_data = [
        {"name": "Admin User", "email": "admin@vendorintel.com", "password_hash": get_password_hash("1234"), "role": "admin"},
        {"name": "Procurement Manager", "email": "procumentor@vendorintel.com", "password_hash": get_password_hash("1234"), "role": "procumentor"},
        {"name": "Risk Auditor", "email": "auditor@vendorintel.com", "password_hash": get_password_hash("1234"), "role": "auditor"},
        {"name": "Finance Director", "email": "finance@vendorintel.com", "password_hash": get_password_hash("1234"), "role": "finance"},
        {"name": "Supply Chain Head", "email": "supplychain@vendorintel.com", "password_hash": get_password_hash("1234"), "role": "supply_chain"}
    ]
    for u_data in users_data:
        db.add(models.User(**u_data))
    db.commit()
    print("Base users seeded!")

    # 2. Vendors Data
    vendors_data = [
        {"company_name": "Alpha Technologies", "contact_email": "contact@alphatech.com", "approval_status": "Approved", "rating": 4.9, "risk_level": "Low", "delivery_rate": 98.0, "quality_score": 99.0},
        {"company_name": "Global Supplies Ltd.", "contact_email": "info@globalsupplies.com", "approval_status": "Approved", "rating": 4.8, "risk_level": "Low", "delivery_rate": 97.5, "quality_score": 98.5},
        {"company_name": "Prime Industrial Solutions", "contact_email": "sales@primeind.com", "approval_status": "Approved", "rating": 4.7, "risk_level": "Low", "delivery_rate": 95.0, "quality_score": 96.0},
        {"company_name": "Zenith Traders", "contact_email": "support@zenith.com", "approval_status": "Approved", "rating": 4.6, "risk_level": "Low", "delivery_rate": 94.0, "quality_score": 95.0},
        {"company_name": "Horizon Enterprises", "contact_email": "hello@horizonent.com", "approval_status": "Approved", "rating": 4.5, "risk_level": "Medium", "delivery_rate": 92.0, "quality_score": 93.0},
        {"company_name": "TechSource Pvt. Ltd.", "contact_email": "tech@source.com", "approval_status": "Approved", "rating": 4.2, "risk_level": "Medium", "delivery_rate": 88.0, "quality_score": 90.0},
        {"company_name": "Sigma Materials", "contact_email": "info@sigma.com", "approval_status": "Approved", "rating": 4.0, "risk_level": "Medium", "delivery_rate": 85.0, "quality_score": 85.0},
        {"company_name": "Vanguard Logistics", "contact_email": "contact@vanguard.com", "approval_status": "Rejected", "rating": 2.1, "risk_level": "High", "delivery_rate": 58.0, "quality_score": 62.5},
        {"company_name": "Nexus Supplies", "contact_email": "info@nexussupplies.com", "approval_status": "Suspended", "rating": 1.5, "risk_level": "High", "delivery_rate": 45.0, "quality_score": 50.0},
    ]

    for v_data in vendors_data:
        # Create user account for this vendor
        v_user = models.User(
            name=v_data["company_name"] + " Rep",
            email=v_data["contact_email"],
            password_hash=get_password_hash("1234"),
            role="vendor"
        )
        db.add(v_user)
        db.flush() # Get v_user.id
        
        # Create vendor record linked to the user
        vendor = models.Vendor(**v_data, user_id=v_user.id)
        db.add(vendor)
    
    db.commit()
    print("Successfully seeded 10 vendors with individual user accounts!")
    
    # 3. Procurement Requests
    prs_data = [
        {"request_number": "PR-1001", "department": "IT", "total_cost": 4500.0, "estimated_cost": 4500.0, "approval_status": "Approved"},
        {"request_number": "PR-1002", "department": "Operations", "total_cost": 1200.0, "estimated_cost": 1200.0, "approval_status": "Approved"},
        {"request_number": "PR-1003", "department": "Marketing", "total_cost": 8500.0, "estimated_cost": 8500.0, "approval_status": "Approved"},
        {"request_number": "PR-1004", "department": "HR", "total_cost": 300.0, "estimated_cost": 300.0, "approval_status": "Approved"}
    ]
    for pr in prs_data:
        db_pr = models.ProcurementRequest(**pr)
        db.add(db_pr)
        db.flush()
        db_item = models.PRItem(pr_id=db_pr.id, item_details=f"Supplies for {pr['department']}", quantity=1, estimated_cost=pr['total_cost'])
        db.add(db_item)
    db.commit()
    print("Procurement Requests seeded!")
    
    # 4. Contracts
    from datetime import date, timedelta
    today = date.today()
    contracts_data = [
        {"vendor_id": 1, "start_date": today - timedelta(days=100), "expiry_date": today + timedelta(days=265), "status": "Active"},
        {"vendor_id": 2, "start_date": today - timedelta(days=300), "expiry_date": today + timedelta(days=20), "status": "Active"},
        {"vendor_id": 3, "start_date": today - timedelta(days=400), "expiry_date": today - timedelta(days=10), "status": "Expired"}
    ]
    for c_data in contracts_data:
        db.add(models.Contract(**c_data))
    db.commit()
    print("Contracts seeded!")
    
    db.close()
    
    # 5. Purchase Orders
    po_data = [
        {"pr_id": 1, "vendor_id": 1, "po_number": "PO-2026-001", "fulfillment_status": "Delivered"},
        {"pr_id": 2, "vendor_id": 2, "po_number": "PO-2026-002", "fulfillment_status": "In Progress"},
        {"pr_id": 3, "vendor_id": 3, "po_number": "PO-2026-003", "fulfillment_status": "Pending"},
        {"pr_id": 4, "vendor_id": 8, "po_number": "PO-2026-004", "fulfillment_status": "Delayed"}
    ]
    db = SessionLocal()
    for p_data in po_data:
        po = models.PurchaseOrder(**p_data)
        db.add(po)
        db.flush()
        po_item = models.POItem(po_id=po.id, pr_item_id=po.pr_id)
        db.add(po_item)
    db.commit()
    print("Purchase Orders seeded!")
    db.close()


    # 6. Audit Logs
    audit_data = [
        {"action": "Vendor Approved", "entity_type": "Vendor", "entity_id": 1, "user_id": 1},
        {"action": "PR Created", "entity_type": "ProcurementRequest", "entity_id": 1, "user_id": 2},
        {"action": "PO Generated", "entity_type": "PurchaseOrder", "entity_id": 1, "user_id": 2},
        {"action": "Vendor Suspended", "entity_type": "Vendor", "entity_id": 9, "user_id": 1},
        {"action": "Contract Renewed", "entity_type": "Contract", "entity_id": 1, "user_id": 2}
    ]
    db = SessionLocal()
    for a_data in audit_data:
        db.add(models.AuditLog(**a_data))
    db.commit()
    print("Audit Logs seeded!")
    db.close()

if __name__ == "__main__":
    seed_db()
