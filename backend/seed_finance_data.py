import asyncio
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal
from app.modules.vendors.models import Vendor, VendorCategory
from app.modules.procurement.models import PurchaseOrder, Invoice, Payment, POItem
import random

async def seed_finance():
    async with AsyncSessionLocal() as db:
        print("Fetching categories...")
        cat_res = await db.execute(select(VendorCategory))
        categories = cat_res.scalars().all()
        if not categories:
            print("No categories!")
            return
        
        print("Checking for existing vendors...")
        v_res = await db.execute(select(Vendor))
        if v_res.scalars().first():
            print("Clearing old finance data...")
            await db.execute(Payment.__table__.delete())
            await db.execute(Invoice.__table__.delete())
            await db.execute(POItem.__table__.delete())
            await db.execute(PurchaseOrder.__table__.delete())
            await db.execute(Vendor.__table__.delete())
        
        print("Seeding vendors...")
        vendors_data = [
            ("ABC Industries", "Raw Material Suppliers"),
            ("Global Components", "Equipment Vendors"),
            ("Prime Suppliers", "Service Providers"),
            ("Techno Solutions", "IT Vendors"),
            ("Speed Logistics", "Logistics Partners")
        ]
        
        vendor_objs = {}
        for idx, (name, cat_name) in enumerate(vendors_data, 1):
            cat = next((c for c in categories if c.name == cat_name), categories[0])
            v = Vendor(name=name, category_id=cat.id, status="Approved", contact_email=f"contact{idx}@example.com")
            db.add(v)
            vendor_objs[name] = v
        await db.commit()
        
        print("Seeding POs, Invoices, Payments...")
        now = datetime.utcnow()
        # Create POs to sum up to ~24.8M
        # We will create 1 PO per vendor, and 1 Invoice per PO
        po_amounts = [
            ("ABC Industries", 9850000, 39.7),
            ("Global Components", 6200000, 25.0),
            ("Prime Suppliers", 4100000, 16.5),
            ("Techno Solutions", 2750000, 11.1),
            ("Speed Logistics", 1905000, 7.7)
        ]
        
        po_idx = 1000
        inv_idx = 500
        for name, amount, _ in po_amounts:
            v = vendor_objs[name]
            
            po = PurchaseOrder(
                vendor_id=v.id,
                po_number=f"PO-2025-{po_idx}",
                status="Delivered",
                amount=amount,
                created_at=now - timedelta(days=60)
            )
            po_idx += 1
            db.add(po)
            await db.flush()
            
            # Create Invoice
            is_pending = (name == "Prime Suppliers")
            inv_status = "Pending" if is_pending else "Paid"
            inv = Invoice(
                purchase_order_id=po.id,
                invoice_number=f"INV-2025-{inv_idx}",
                amount=amount,
                tax_amount=amount * 0.18,
                status=inv_status,
                invoice_date=now - timedelta(days=50),
                due_date=now + timedelta(days=20 if is_pending else -10)
            )
            inv_idx += 1
            db.add(inv)
            await db.flush()
            
            if not is_pending:
                # Add payment
                pay = Payment(
                    invoice_id=inv.id,
                    amount=amount,
                    payment_date=now - timedelta(days=15),
                    payment_method="Bank Transfer",
                    payment_reference=f"TXN-{inv.id}"
                )
                db.add(pay)
        
        await db.commit()
        print("Finance DB Seeded!")

if __name__ == '__main__':
    asyncio.run(seed_finance())
