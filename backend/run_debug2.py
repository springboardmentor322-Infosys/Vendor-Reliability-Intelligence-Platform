import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal
from app.modules.procurement.models import PurchaseOrder
async def debug():
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(PurchaseOrder.status).distinct())
        print(r.scalars().all())
asyncio.run(debug())
