import asyncio
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal
from app.modules.procurement.models import PurchaseOrder

async def check():
    async with AsyncSessionLocal() as db:
        r1 = await db.execute(select(PurchaseOrder))
        pos = r1.scalars().all()
        statuses = {}
        for po in pos:
            if po.status:
                statuses[po.status] = statuses.get(po.status, 0) + 1
        with open('stat.json', 'w') as f:
            json.dump(statuses, f)
asyncio.run(check())
