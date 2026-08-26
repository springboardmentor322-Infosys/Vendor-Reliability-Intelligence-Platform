"""
Run this once after starting the app for the first time to populate demo data:
    python seed.py
"""
import datetime as dt
from database import SessionLocal, engine, Base
import models
from auth import hash_password
from reliability import refresh_vendor_score

Base.metadata.create_all(bind=engine)
db = SessionLocal()

def get_or_create_user(email, full_name, password, role):
    user = db.query(models.User).filter(models.User.email == email).first()
    if user:
        return user
    user = models.User(email=email, full_name=full_name, hashed_password=hash_password(password), role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# ---- Demo users (one per role) ----
users = [
    ("admin@vendoriq.com", "Aditi Sharma", "Admin@123", models.RoleEnum.ADMIN),
    ("procurement@vendoriq.com", "Rahul Mehta", "Proc@123", models.RoleEnum.PROCUREMENT_MANAGER),
    ("supplychain@vendoriq.com", "Neha Verma", "Supply@123", models.RoleEnum.SUPPLY_CHAIN_MANAGER),
    ("finance@vendoriq.com", "Karan Singh", "Finance@123", models.RoleEnum.FINANCE_OFFICER),
    ("auditor@vendoriq.com", "Priya Nair", "Audit@123", models.RoleEnum.AUDITOR),
]
for email, name, pwd, role in users:
    get_or_create_user(email, name, pwd, role)
print("Demo users created (see README for login credentials).")

# ---- Demo vendors ----
if db.query(models.Vendor).count() == 0:
    vendors_data = [
        ("Bharat Steel Works", models.VendorCategoryEnum.RAW_MATERIAL, models.VendorStatusEnum.APPROVED),
        ("TechNova IT Solutions", models.VendorCategoryEnum.IT, models.VendorStatusEnum.APPROVED),
        ("Swift Logistics Pvt Ltd", models.VendorCategoryEnum.LOGISTICS, models.VendorStatusEnum.APPROVED),
        ("Precision Equipment Co.", models.VendorCategoryEnum.EQUIPMENT, models.VendorStatusEnum.PENDING),
        ("CleanServ Facility Services", models.VendorCategoryEnum.SERVICE, models.VendorStatusEnum.APPROVED),
        ("Apex Maintenance Group", models.VendorCategoryEnum.MAINTENANCE, models.VendorStatusEnum.SUSPENDED),
    ]
    vendors = []
    for name, cat, status in vendors_data:
        v = models.Vendor(
            name=name, category=cat, status=status,
            contact_person=f"{name.split()[0]} Contact",
            email=f"contact@{name.split()[0].lower()}.com",
            phone="+91-9876500000",
            address="Bengaluru, India",
        )
        db.add(v)
        vendors.append(v)
    db.commit()
    for v in vendors:
        db.refresh(v)

    # Performance records
    perf_data = [
        (vendors[0].id, 18, 2, 4.2, 6, 12, 92),
        (vendors[1].id, 22, 1, 4.7, 3, 5, 97),
        (vendors[2].id, 14, 6, 3.5, 10, 20, 78),
        (vendors[4].id, 20, 0, 4.9, 2, 4, 99),
        (vendors[5].id, 8, 10, 2.8, 30, 60, 55),
    ]
    for vid, ot, dl, q, rt, ir, cr in perf_data:
        db.add(models.PerformanceRecord(
            vendor_id=vid, on_time_deliveries=ot, delayed_deliveries=dl,
            quality_rating=q, response_time_hours=rt, issue_resolution_hours=ir,
            order_completion_rate=cr,
        ))
    db.commit()

    # Contracts
    now = dt.datetime.utcnow()
    contracts_data = [
        (vendors[0].id, "Annual Steel Supply Agreement", now - dt.timedelta(days=200), now + dt.timedelta(days=20), models.ComplianceStatusEnum.COMPLIANT),
        (vendors[1].id, "IT Support & Maintenance", now - dt.timedelta(days=100), now + dt.timedelta(days=265), models.ComplianceStatusEnum.COMPLIANT),
        (vendors[2].id, "Logistics Service Contract", now - dt.timedelta(days=300), now + dt.timedelta(days=10), models.ComplianceStatusEnum.AT_RISK),
        (vendors[5].id, "Facility Maintenance Contract", now - dt.timedelta(days=400), now - dt.timedelta(days=5), models.ComplianceStatusEnum.NON_COMPLIANT),
    ]
    for vid, title, start, end, comp in contracts_data:
        db.add(models.Contract(vendor_id=vid, contract_title=title, start_date=start, end_date=end, compliance_status=comp))
    db.commit()

    # Purchase orders
    po_data = [
        (vendors[0].id, "Cold-rolled steel sheets - 5MT", 5, 65000, models.ProcurementStatusEnum.COMPLETED),
        (vendors[1].id, "Annual software licenses (50 seats)", 50, 4200, models.ProcurementStatusEnum.DELIVERED),
        (vendors[2].id, "Warehouse-to-plant freight - Q3", 1, 180000, models.ProcurementStatusEnum.ORDERED),
        (vendors[4].id, "Facility deep-cleaning contract", 1, 35000, models.ProcurementStatusEnum.APPROVED),
    ]
    for i, (vid, desc, qty, price, status) in enumerate(po_data):
        db.add(models.PurchaseOrder(
            po_number=f"PO-DEMO-{1000+i}", vendor_id=vid, item_description=desc,
            quantity=qty, unit_price=price, total_amount=qty * price, status=status,
            requested_by="Rahul Mehta",
        ))
    db.commit()

    # Messages
    db.add(models.Message(vendor_id=vendors[2].id, sender="Procurement Team", content="Please confirm dispatch schedule for the Q3 freight order."))
    db.add(models.Message(vendor_id=vendors[2].id, sender=vendors[2].name, content="Dispatch confirmed for next Monday, 9 AM."))
    db.commit()

    # Recalculate reliability scores for all vendors with performance data
    for vid, *_ in perf_data:
        refresh_vendor_score(db, vid)

    # Notifications
    db.add(models.Notification(title="Contract Expiring Soon", message="Logistics Service Contract expires in 10 days.", category="Contract Expiry Alerts"))
    db.add(models.Notification(title="Vendor Pending Approval", message="Precision Equipment Co. is awaiting approval.", category="Vendor Approval Notifications"))
    db.commit()

    print("Demo vendors, performance data, contracts, purchase orders and messages seeded.")
else:
    print("Vendors already exist - skipping demo data seeding.")

db.close()
print("\nSeed complete. Login credentials:")
for email, name, pwd, role in users:
    print(f"  {role.value:<25} | {email:<28} | {pwd}")
