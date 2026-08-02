from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.modules.auth.models import Role, User
from app.core.security import get_password_hash
from app.modules.vendors.models import Vendor
from app.modules.procurement.models import PurchaseOrder
from app.modules.performance.models import VendorPerformance
from app.modules.reliability.models import VendorReliability
from app.modules.contracts.models import Contract

# Make sure all models are imported so metadata is populated
Base.metadata.create_all(bind=engine)

def seed_data():
    db: Session = SessionLocal()
    
    roles_data = [
        {"name": "Administrator", "permissions": "all"},
        {"name": "Procurement Manager", "permissions": "procurement_read,procurement_write"},
        {"name": "Supply Chain Manager", "permissions": "vendor_read,vendor_write"},
        {"name": "Finance Officer", "permissions": "contract_read,contract_write"},
        {"name": "Vendor", "permissions": "own_data_read,own_data_write"},
        {"name": "Auditor", "permissions": "all_read"}
    ]
    
    print("Seeding Roles...")
    for role_info in roles_data:
        existing_role = db.query(Role).filter(Role.name == role_info["name"]).first()
        if not existing_role:
            role = Role(name=role_info["name"], permissions=role_info["permissions"])
            db.add(role)
    db.commit()
    
    print("Seeding Users...")
    for role_info in roles_data:
        role = db.query(Role).filter(Role.name == role_info["name"]).first()
        email = f"{role_info['name'].lower().replace(' ', '_')}@example.com"
        existing_user = db.query(User).filter(User.email == email).first()
        if not existing_user:
            user = User(
                email=email,
                password_hash=get_password_hash("password123"),
                role_id=role.id,
                is_active=True
            )
            db.add(user)
    db.commit()
    
    print("Seeding complete.")
    db.close()

if __name__ == "__main__":
    seed_data()
