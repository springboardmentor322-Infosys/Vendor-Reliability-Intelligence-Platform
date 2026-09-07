import asyncio
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal
from app.modules.procurement.models import PurchaseOrder

async def test_agg():
    async with AsyncSessionLocal() as db:
        now = datetime.utcnow()
        current_year = now.year
        r1 = await db.execute(select(PurchaseOrder))
        all_pos = r1.scalars().all()
        s = 0
        cat = 0
        for po in all_pos:
            st = po.status
            dt = po.created_at
            if st and st.lower() in ('delivered', 'completed'):
                if dt and dt.year == current_year:
                    s += po.amount or 0
                    cat += 1
                else:
                    print(f"Skipped year: {dt.year if dt else None}")
        print(f"Found {cat} POs, sum: {s}")

asyncio.run(test_agg())
