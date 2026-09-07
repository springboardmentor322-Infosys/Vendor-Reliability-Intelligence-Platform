import asyncio
from datetime import datetime, timedelta
import random
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal
from app.modules.procurement.models import PurchaseOrder, Invoice, Payment

async def populate_payments():
    async with AsyncSessionLocal() as db:
        # Get all Paid invoices that do not have payments
        r1 = await db.execute(select(Invoice).filter(Invoice.status == 'Paid'))
        paid_invs = r1.scalars().all()
        
        print(f"Found {len(paid_invs)} Paid invoices. Generating Payments...")
        
        now = datetime.utcnow()
        current_year = now.year
        
        pay_count = 0
        for inv in paid_invs:
            # We want to randomly distribute the payment date between (invoice_date) and (due_date or invoice_date + 30 days)
            start_date = inv.invoice_date or datetime(current_year, 1, 1)
            # Ensure start_date is in current year since we fixed it
            if start_date.year != current_year: return
            
            end_date = inv.due_date or (start_date + timedelta(days=30))
            if end_date < start_date:
                end_date = start_date + timedelta(days=5)
            
            delta = (end_date - start_date).days
            random_days = random.randint(0, max(1, delta))
            pay_date = start_date + timedelta(days=random_days)
            
            p = Payment(
                invoice_id=inv.id,
                amount=inv.amount,
                payment_date=pay_date,
                payment_method=random.choice(["Bank Transfer", "Credit Card", "Cheque"]),
                payment_reference=f"PAY-{inv.id}-{random.randint(1000, 9999)}"
            )
            db.add(p)
            pay_count += 1
            
        await db.commit()
        print(f"Generated {pay_count} Payment records linked to the existing dataset!")

asyncio.run(populate_payments())
