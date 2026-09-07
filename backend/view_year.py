import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal
from app.modules.procurement.models import PurchaseOrder

async def check():
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(PurchaseOrder).limit(10))
        for po in r.scalars():
            print(po.created_at.year)
asyncio.run(check())
