import os
import sys
import csv
import random
from datetime import datetime
import asyncio
import sys
import os
from sqlalchemy.future import select
from faker import Faker

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import AsyncSessionLocal
from app.modules.vendors.models import Vendor
from app.modules.inventory.models import Product
from app.modules.procurement.models import PurchaseOrder, POItem, Delivery, Invoice, QualityInspection
from app.modules.contracts.models import Contract
from app.modules.communications.models import Message

fake = Faker()
DATASET_PATH = os.path.join("data", "DataCoSupplyChainDataset.csv")

def parse_date(date_str):
    if not date_str:
        return None
    try:
        # Expected format: "1/31/2018 22:56" or similar
        return datetime.strptime(date_str, "%m/%d/%Y %H:%M")
    except ValueError:
        return None

async def import_data():
    if not os.path.exists(DATASET_PATH):
        print(f"ERROR: Dataset not found at {DATASET_PATH}.")
        print("Please place DataCoSupplyChainDataset.csv in the backend/data directory.")
        sys.exit(1)
        
    db = AsyncSessionLocal()
    
    print("Parsing DataCo dataset...")
    
    products_imported = 0
    orders_imported = 0
    vendors_generated = 0
    
    # 1. Generate ~50 Vendors
    print("Generating Faker Vendors...")
    vendor_ids = []
    # Check existing vendors
    result = await db.execute(select(Vendor))
    existing_vendors = result.scalars().all()
    if len(existing_vendors) < 50:
        for i in range(50 - len(existing_vendors)):
            v = Vendor(
                name=f"DataCo Supplier {fake.company()}",
                contact_email=fake.company_email(),
                category_id=random.randint(1, 6),
                status="Approved"
            )
            db.add(v)
            vendors_generated += 1
        await db.commit()
    
    result = await db.execute(select(Vendor))
    all_vendors = result.scalars().all()
    vendor_ids = [v.id for v in all_vendors]

    # Read CSV
    with open(DATASET_PATH, mode='r', encoding='latin-1') as f:
        reader = csv.DictReader(f)
        
        # We will track processed IDs to ensure idempotency and avoid duplicates
        result_products = await db.execute(select(Product))
        existing_products = {p.external_product_id for p in result_products.scalars().all()}
        
        result_orders = await db.execute(select(PurchaseOrder).filter(PurchaseOrder.source == "DataCo"))
        existing_orders = {po.external_order_id for po in result_orders.scalars().all()}
        
        # Batch insert list
        products_to_add = []
        orders_dict = {} # external_order_id -> PO object details
        
        row_count = 0
        for row in reader:
            row_count += 1
            if row_count > 5000: # Limit for memory/speed during demo
                break
                
            # PRODUCT
            product_id = row.get('Product Card Id')
            if product_id and product_id not in existing_products:
                p = Product(
                    external_product_id=product_id,
                    name=row.get('Product Name', 'Unknown'),
                    category=row.get('Category Name', ''),
                    price=float(row.get('Product Price', 0.0) or 0.0),
                    status=row.get('Product Status', 'Active')
                )
                db.add(p)
                existing_products.add(product_id)
                products_imported += 1
                
            # ORDER
            order_id = row.get('Order Id')
            if order_id and order_id not in existing_orders:
                if order_id not in orders_dict:
                    orders_dict[order_id] = {
                        "date": parse_date(row.get('order date (DateOrders)')),
                        "status": row.get('Order Status', 'Pending'),
                        "amount": float(row.get('Sales', 0.0) or 0.0),
                        "shipping_date": parse_date(row.get('shipping date (DateOrders)')),
                        "delivery_status": row.get('Delivery Status'),
                        "shipping_mode": row.get('Shipping Mode'),
                        "days_real": float(row.get('Days for shipping (real)', 0.0) or 0.0),
                        "days_scheduled": float(row.get('Days for shipment (scheduled)', 0.0) or 0.0),
                        "late_risk": int(row.get('Late_delivery_risk', 0) or 0),
                        "items": []
                    }
                
                # PO ITEM
                orders_dict[order_id]["items"].append({
                    "external_item_id": row.get('Order Item Id'),
                    "product_id": product_id,
                    "item_name": row.get('Product Name', 'Unknown'),
                    "quantity": int(row.get('Order Item Quantity', 1) or 1),
                    "unit_price": float(row.get('Order Item Product Price', 0.0) or 0.0),
                })
        
        await db.commit() # Commit products first
        
        print("Inserting Orders, Items, Deliveries...")
        
        # We need a lookup for product IDs
        result_prod2 = await db.execute(select(Product))
        product_lookup = {p.external_product_id: p.id for p in result_prod2.scalars().all()}
        
        contracts_generated = 0
        invoices_generated = 0
        inspections_generated = 0
        
        for ext_order_id, data in orders_dict.items():
            vid = random.choice(vendor_ids)
            po = PurchaseOrder(
                po_number=f"PO-DATACO-{ext_order_id}",
                external_order_id=ext_order_id,
                source="DataCo",
                vendor_id=vid,
                amount=data["amount"],
                status=data["status"],
                created_at=data["date"] or datetime.utcnow()
            )
            db.add(po)
            await db.flush() # Get po.id
            
            # Delivery
            deliv = Delivery(
                po_id=po.id,
                shipping_date=data["shipping_date"],
                delivery_status=data["delivery_status"],
                shipping_mode=data["shipping_mode"],
                days_real=data["days_real"],
                days_scheduled=data["days_scheduled"],
                late_risk_flag=data["late_risk"]
            )
            db.add(deliv)
            
            # Items
            for item in data["items"]:
                pi = POItem(
                    po_id=po.id,
                    item_name=item["item_name"],
                    quantity=item["quantity"],
                    unit_price=item["unit_price"],
                    external_item_id=item["external_item_id"],
                    product_id=product_lookup.get(item["product_id"])
                )
                db.add(pi)
            
            # Subset generated records
            if random.random() < 0.2: # 20% of orders get a contract
                c = Contract(
                    contract_number=f"CT-DATACO-{po.id}",
                    title=f"DataCo Contract {po.id}",
                    vendor_id=vid,
                    purchase_order_id=po.id,
                    contract_value=data["amount"],
                    start_date=datetime.utcnow(),
                    end_date=datetime.utcnow(),
                    status="Active",
                    compliance_flags="[]"
                )
                db.add(c)
                contracts_generated += 1
                
            if random.random() < 0.5: # 50% get invoice
                inv = Invoice(
                    po_id=po.id,
                    invoice_number=f"INV-DATACO-{po.id}",
                    amount=data["amount"],
                    status=random.choice(["Paid", "Pending", "Overdue"]),
                    invoice_date=datetime.utcnow()
                )
                db.add(inv)
                invoices_generated += 1
                
            if random.random() < 0.3: # 30% get inspection
                ins = QualityInspection(
                    po_id=po.id,
                    status=random.choice(["Passed", "Failed", "Pending"]),
                    defect_count=random.randint(0, 5),
                    remarks=fake.sentence(),
                    inspection_date=datetime.utcnow()
                )
                db.add(ins)
                inspections_generated += 1
                
            orders_imported += 1

        await db.commit()
        await db.close()
        
    print("--- IMPORT REPORT ---")
    print(f"Vendors Generated: {vendors_generated}")
    print(f"Products Imported: {products_imported}")
    print(f"Purchase Orders Imported: {orders_imported}")
    print(f"Deliveries Created: {orders_imported}")
    print(f"Contracts Generated: {contracts_generated}")
    print(f"Invoices Generated: {invoices_generated}")
    print(f"Quality Inspections Generated: {inspections_generated}")
    print("Done!")

if __name__ == "__main__":
    asyncio.run(import_data())
