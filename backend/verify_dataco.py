import asyncio
from sqlalchemy.future import select
from sqlalchemy import func
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.core.database import AsyncSessionLocal
from app.modules.vendors.models import Vendor
from app.modules.inventory.models import Product
from app.modules.procurement.models import PurchaseOrder, POItem, Delivery, Invoice, QualityInspection
from app.modules.contracts.models import Contract

async def verify_db():
    async with AsyncSessionLocal() as session:
        print("Database Record Counts:")
        
        vendors = await session.execute(select(func.count(Vendor.id)))
        print(f"- Vendors: {vendors.scalar()}")

        products = await session.execute(select(func.count(Product.id)))
        print(f"- Products: {products.scalar()}")

        dataco_pos = await session.execute(select(func.count(PurchaseOrder.id)).filter(PurchaseOrder.source == 'DataCo'))
        print(f"- DataCo Purchase Orders: {dataco_pos.scalar()}")

        deliveries = await session.execute(select(func.count(Delivery.id)))
        print(f"- Deliveries: {deliveries.scalar()}")

        contracts = await session.execute(select(func.count(Contract.id)))
        print(f"- Contracts: {contracts.scalar()}")

        invoices = await session.execute(select(func.count(Invoice.id)))
        print(f"- Invoices: {invoices.scalar()}")

        inspections = await session.execute(select(func.count(QualityInspection.id)))
        print(f"- Quality Inspections: {inspections.scalar()}")

if __name__ == "__main__":
    asyncio.run(verify_db())
