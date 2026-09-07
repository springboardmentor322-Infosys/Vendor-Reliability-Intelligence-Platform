import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal
from app.modules.procurement.models import PurchaseOrder
async def debug():
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(PurchaseOrder).limit(5))
        for po in r.scalars():
            print(po.status, po.created_at, po.amount)
asyncio.run(debug())
