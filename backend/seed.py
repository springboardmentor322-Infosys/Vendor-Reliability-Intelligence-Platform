import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal
from app.modules.auth.models import Role, User
from app.modules.vendors.models import VendorCategory, Vendor, VendorContact
from app.modules.procurement.models import ProcurementRequest, PurchaseOrder, POItem
from app.modules.contracts.models import Contract, ContractDocument
from app.core.security import get_password_hash

ROLES = [
    "Administrator",
    "Procurement Manager",
    "Supply Chain Manager",
    "Finance Officer",
    "Auditor",
    "Vendor"
]

USERS = [
    {"email": "administrator@example.com", "role": "Administrator"},
    {"email": "procurement_manager@example.com", "role": "Procurement Manager"},
    {"email": "supply_chain_manager@example.com", "role": "Supply Chain Manager"},
    {"email": "finance_officer@example.com", "role": "Finance Officer"},
    {"email": "auditor@example.com", "role": "Auditor"},
    {"email": "vendor@example.com", "role": "Vendor"},
]

VENDOR_CATEGORIES = [
    "Raw Material Suppliers",
    "Equipment Vendors",
    "IT Vendors",
    "Service Providers",
    "Logistics Partners",
    "Maintenance Vendors"
]

async def seed_db():
    async with AsyncSessionLocal() as db:
        print("Seeding Vendor Categories...")
        for cat_name in VENDOR_CATEGORIES:
            result = await db.execute(select(VendorCategory).filter_by(name=cat_name))
            cat = result.scalars().first()
            if not cat:
                db.add(VendorCategory(name=cat_name, description=cat_name))
        await db.commit()

        print("Seeding Roles...")
        for role_name in ROLES:
            result = await db.execute(select(Role).filter_by(name=role_name))
            role = result.scalars().first()
            if not role:
                db.add(Role(name=role_name, permissions="all"))
        await db.commit()

        print("Seeding Default Users...")
        for u_data in USERS:
            result = await db.execute(select(User).filter_by(email=u_data["email"]))
            user = result.scalars().first()
            if not user:
                result_role = await db.execute(select(Role).filter_by(name=u_data["role"]))
                role = result_role.scalars().first()
                if role:
                    db.add(User(
                        email=u_data["email"],
                        password_hash=get_password_hash("password123"),
                        is_active=True,
                        role_id=role.id,
                        status="active"
                    ))
        await db.commit()
        print("Database seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_db())
