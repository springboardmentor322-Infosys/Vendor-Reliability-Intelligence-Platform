import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.core.database import AsyncSessionLocal
from app.modules.vendors.models import VendorCategory
from app.modules.procurement.models import ProcurementRequest
from sqlalchemy.future import select

async def f():
    db = AsyncSessionLocal()
    res = await db.execute(select(VendorCategory))
    cats = res.scalars().all()
    print("Vendor Categories:")
    for c in cats:
        print(c.id, c.name)

    res = await db.execute(select(ProcurementRequest))
    prs = res.scalars().all()
    print("\nPR Categories:")
    for pr in prs:
        print(pr.id, pr.category)
    await db.close()

if __name__ == '__main__':
    asyncio.run(f())
