import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from app.core.database import AsyncSessionLocal
from app.modules.procurement.models import PurchaseOrder, Invoice

async def fix():
    async with AsyncSessionLocal() as db:
        await db.execute(update(PurchaseOrder).where(PurchaseOrder.status == 'COMPLETED').values(status='Completed'))
        await db.execute(update(PurchaseOrder).where(PurchaseOrder.status == 'DELIVERED').values(status='Delivered'))
        await db.commit()
        print("Updated via direct SQL UPDATE.")
asyncio.run(fix())
