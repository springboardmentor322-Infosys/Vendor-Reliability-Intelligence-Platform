import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal
from app.modules.auth.models import Role, User
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

async def seed_db():
    async with AsyncSessionLocal() as db:
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
