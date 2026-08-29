import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.core.database import AsyncSessionLocal
from app.modules.vendors.models import Vendor, VendorContact
from app.modules.procurement.models import PurchaseOrder
from sqlalchemy.future import select

async def f():
    db = AsyncSessionLocal()
    res = await db.execute(select(VendorContact).filter(VendorContact.email == 'vendor@example.com'))
    c = res.scalars().first()
    if not c:
        print("No VendorContact found for vendor@example.com")
        await db.close()
        return
        
    print('Vendor ID:', c.vendor_id)
    po_res = await db.execute(select(PurchaseOrder).filter(PurchaseOrder.vendor_id == c.vendor_id))
    print('POs:', len(po_res.scalars().all()))
    await db.close()

if __name__ == '__main__':
    asyncio.run(f())
