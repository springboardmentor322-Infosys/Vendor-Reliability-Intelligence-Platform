import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from app.core.database import AsyncSessionLocal
from app.modules.procurement.models import PurchaseOrder

async def fix():
    async with AsyncSessionLocal() as db:
        await db.execute(update(PurchaseOrder).where(PurchaseOrder.status == 'COMPLETE').values(status='Completed'))
        await db.commit()
        print("Updated COMPLETE to Completed!")
asyncio.run(fix())
