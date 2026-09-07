import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal
from app.modules.procurement.models import PurchaseOrder

async def check():
    async with AsyncSessionLocal() as db:
        r1 = await db.execute(select(PurchaseOrder))
        pos = r1.scalars().all()
        s = 0
        cat = 0
        for po in pos:
            if po.status in ('Completed', 'Delivered'):
                cat += 1
                s += po.amount or 0
        print('DB Manual Check:', cat, 'POs', s, 'Amount')
asyncio.run(check())
