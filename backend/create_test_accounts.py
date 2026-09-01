from app.database import Base, engine, SessionLocal
from app.models.user import User
from app.utils.security import hash_password

# Demo/test credentials for local evaluation only. Change passwords in production.
ACCOUNTS = [
    ("Administrator", "admin@vendoriq.com", "Admin@123", "Administrator"),
    ("Procurement Manager", "procurement@vendoriq.com", "Procurement@123", "Procurement Manager"),
    ("Supply Chain Manager", "supplychain@vendoriq.com", "SupplyChain@123", "Supply Chain Manager"),
    ("Vendor Test Account", "vendor@vendoriq.com", "Vendor@123", "Vendor"),
    ("Auditor", "auditor@vendoriq.com", "Auditor@123", "Auditor"),
    ("Finance Officer", "finance@vendoriq.com", "Finance@123", "Finance Officer"),
]

Base.metadata.create_all(bind=engine)
db = SessionLocal()
try:
    for full_name, email, password, role in ACCOUNTS:
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            user = User(full_name=full_name, email=email, password=hash_password(password), role=role)
            db.add(user)
        else:
            user.full_name = full_name
            user.role = role
            user.password = hash_password(password)
    db.commit()
    print("VendorIQ test accounts are ready.")
    for _, email, password, role in ACCOUNTS:
        print(f"{role}: {email} / {password}")
finally:
    db.close()
