import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal
from app.modules.procurement.models import PurchaseOrder, Invoice, Payment

async def count():
    async with AsyncSessionLocal() as db:
        r1 = await db.execute(select(PurchaseOrder))
        pos = r1.scalars().all()
        r2 = await db.execute(select(Invoice))
        invs = r2.scalars().all()
        print('POs:', len(pos), [(po.status, po.created_at) for po in pos])
        print('Invoices:', len(invs))

asyncio.run(count())
