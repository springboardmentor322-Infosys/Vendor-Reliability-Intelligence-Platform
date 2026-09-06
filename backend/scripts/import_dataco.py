import random
from datetime import datetime, timedelta

import pandas as pd
from faker import Faker

from app.database import SessionLocal

from app.models.vendor import Vendor
from app.models.product import Product
from app.models.purchase_order import PurchaseOrder
from app.models.delivery import Delivery
from app.models.contract import Contract
from app.models.invoice import Invoice
from app.models.quality_inspection import QualityInspection
from app.models.communication_history import CommunicationHistory
from app.models.notification import Notification


fake = Faker()

db = SessionLocal()



DATASET_PATH = "../dataset/DataCoSmartSupplyChainDataset.csv"


def read_dataset():

    print("Reading Dataset...")

    df = pd.read_csv(

        DATASET_PATH,

        encoding="latin1"

    )

    print("Rows :", len(df))

    return df

def create_vendors(count=50):

    print("Generating Vendors...")

    if db.query(Vendor).count() > 0:

        print("Vendors already exist.")

        return

    categories = [

        "Electronics",

        "Office",

        "Industrial",

        "IT",

        "Furniture",

        "Medical"

    ]

    for i in range(count):

        vendor = Vendor(

            vendor_name=fake.company(),

            category=random.choice(categories),

            email=fake.unique.company_email(),

            phone=fake.phone_number()[:20],

            address=fake.address(),

            reliability_score=random.randint(60,95),

            compliance_score=random.randint(60,100),

            status="Approved",

            approved_by="System",

            approval_notes="Generated"

        )

        db.add(vendor)

    db.commit()

    print(count,"vendors inserted.")
    
def random_vendor():

    vendors = db.query(Vendor).all()

    return random.choice(vendors)

def create_products(df):

    print("Importing Products...")

    vendors = db.query(Vendor).all()

    if not vendors:
        raise Exception(
            "No vendors found. Create vendors before importing products."
        )

    product_columns = [
        "Product Card Id",
        "Product Name",
        "Product Price",
        "Category Name"
    ]

    products_df = (
        df[product_columns]
        .drop_duplicates(
            subset=["Product Card Id"]
        )
    )

    print(
        "Unique products found:",
        len(products_df)
    )

    existing_products = db.query(Product).all()

    existing_names = {
        product.product_name
        for product in existing_products
    }

    products = []

    for _, row in products_df.iterrows():

        product_name = str(
            row["Product Name"]
        ).strip()

        if not product_name:
            continue

        if product_name in existing_names:
            continue

        price = pd.to_numeric(
            row["Product Price"],
            errors="coerce"
        )

        if pd.isna(price):
            price = 0

        category = str(
            row["Category Name"]
        ).strip()

        if not category or category == "nan":
            category = "Unknown"

        vendor = random.choice(vendors)

        product = Product(

            vendor_id=vendor.id,

            product_name=product_name,

            category=category,

            unit_price=float(price),

            stock_unit=random.randint(
                10,
                500
            ),

            lead_time_days=random.randint(
                2,
                15
            ),

            warranty_months=random.choice(
                [6, 12, 18, 24]
            )
        )

        products.append(product)

        existing_names.add(product_name)

    if not products:

        print("No new products to insert.")

        return

    db.add_all(products)

    db.commit()

    print(
        len(products),
        "new products inserted."
    )
    
    
def create_purchase_orders(df):

    print("Importing Purchase Orders...")

    products = db.query(Product).all()
    vendors = db.query(Vendor).all()

    if not products:
        raise Exception(
            "No products found. Import products first."
        )

    if not vendors:
        raise Exception(
            "No vendors found."
        )

    product_map = {}

    for product in products:
        product_map[
            product.product_name.strip().lower()
        ] = product

    existing_po_numbers = {
        po.po_number
        for po in db.query(PurchaseOrder).all()
    }

    orders_df = df[
        [
            "Order Id",
            "Order Item Id",
            "Product Name",
            "Sales",
            "Order Item Total",
            "order date (DateOrders)",
            "Order Status",
            "Product Description"
        ]
    ].drop_duplicates(
        subset=["Order Id", "Order Item Id"]
    )

    print(
        "Unique order items:",
        len(orders_df)
    )

    purchase_orders = []

    for _, row in orders_df.iterrows():

        order_id = row["Order Id"]
        order_item_id = row["Order Item Id"]

        po_number = (
            f"PO-{order_id}-{order_item_id}"
        )

        if po_number in existing_po_numbers:
            continue

        product_name = str(
            row["Product Name"]
        ).strip()

        product = product_map.get(
            product_name.lower()
        )

        if not product:
            continue

        vendors_for_product = [
            vendor
            for vendor in vendors
            if vendor.id == product.vendor_id
        ]

        if vendors_for_product:

            vendor = vendors_for_product[0]

        else:

            vendor = random.choice(vendors)

        amount = pd.to_numeric(
            row["Order Item Total"],
            errors="coerce"
        )

        if pd.isna(amount):

            amount = pd.to_numeric(
                row["Sales"],
                errors="coerce"
            )

        if pd.isna(amount):

            amount = 0

        order_date = pd.to_datetime(
            row["order date (DateOrders)"],
            errors="coerce"
        )

        if pd.isna(order_date):
            continue

        status = normalize_purchase_order_status(
            row["Order Status"]
        )

        description = str(
            row["Product Description"]
        )

        if description == "nan":
            description = None

        purchase_order = PurchaseOrder(

            po_number=po_number,

            vendor_id=vendor.id,

            product_id=product.id,

            amount=float(amount),

            order_date=order_date.date(),

            delivery_date=None,

            status=status[:30],

            description=description[:500]
            if description
            else None
        )

        purchase_orders.append(
            purchase_order
        )

        existing_po_numbers.add(
            po_number
        )

        if len(purchase_orders) >= 5000:

            db.add_all(
                purchase_orders
            )

            db.commit()

            print(
                "Inserted batch:",
                len(purchase_orders)
            )

            purchase_orders = []

    if purchase_orders:

        db.add_all(
            purchase_orders
        )

        db.commit()

        print(
            "Inserted final batch:",
            len(purchase_orders)
        )

    print(
        "Purchase Order import completed."
    )

def create_deliveries(df):

    print("Importing Deliveries...")

    purchase_orders = db.query(PurchaseOrder).all()

    if not purchase_orders:
        raise Exception(
            "No purchase orders found. "
            "Import purchase orders first."
        )

    po_map = {
        po.po_number: po
        for po in purchase_orders
    }

    existing_delivery_po_ids = {
        delivery.purchase_order_id
        for delivery in db.query(Delivery).all()
    }

    delivery_df = df[
        [
            "Order Id",
            "Order Item Id",
            "Delivery Status",
            "Days for shipping (real)",
            "Days for shipment (scheduled)",
            "shipping date (DateOrders)",
            "Late_delivery_risk",
            "Shipping Mode"
        ]
    ].drop_duplicates(
        subset=["Order Id", "Order Item Id"]
    )

    print(
        "Delivery records found:",
        len(delivery_df)
    )

    deliveries = []

    for _, row in delivery_df.iterrows():

        po_number = (
            f"PO-{row['Order Id']}-"
            f"{row['Order Item Id']}"
        )

        purchase_order = po_map.get(
            po_number
        )

        if not purchase_order:
            continue

        if (
            purchase_order.id
            in existing_delivery_po_ids
        ):
            continue

        shipping_date = pd.to_datetime(
            row["shipping date (DateOrders)"],
            errors="coerce"
        )

        if pd.isna(shipping_date):
            continue

        real_days = pd.to_numeric(
            row["Days for shipping (real)"],
            errors="coerce"
        )

        scheduled_days = pd.to_numeric(
            row["Days for shipment (scheduled)"],
            errors="coerce"
        )

        if pd.isna(real_days):
            real_days = 0

        if pd.isna(scheduled_days):
            scheduled_days = real_days

        real_days = int(real_days)
        scheduled_days = int(scheduled_days)

        delivery_date = (
            purchase_order.order_date
            + timedelta(days=real_days)
        )

        expected_delivery_date = (
            purchase_order.order_date
            + timedelta(days=scheduled_days)
        )

        delay_days = max(
            real_days - scheduled_days,
            0
        )

        delivery_status = str(
            row["Delivery Status"]
        ).strip()

        if (
            not delivery_status
            or delivery_status == "nan"
        ):
            delivery_status = "Pending"

        late_risk = str(
            row["Late_delivery_risk"]
        ).strip()

        shipping_mode = str(
            row["Shipping Mode"]
        ).strip()

        notes = (
            f"Shipping Mode: {shipping_mode}. "
            f"Late Delivery Risk: {late_risk}."
        )

        damaged_goods = 0

        delivery = Delivery(

            purchase_order_id=(
                purchase_order.id
            ),

            vendor_id=(
                purchase_order.vendor_id
            ),

            delivery_date=delivery_date,

            expected_delivery_date=(
                expected_delivery_date
            ),

            delay_days=delay_days,

            delivery_status=(
                delivery_status[:30]
            ),

            damaged_goods=damaged_goods,

            delivery_notes=notes[:500]
        )

        deliveries.append(delivery)

        existing_delivery_po_ids.add(
            purchase_order.id
        )

        if len(deliveries) >= 5000:

            db.add_all(deliveries)

            db.commit()

            print(
                "Inserted delivery batch:",
                len(deliveries)
            )

            deliveries = []

    if deliveries:

        db.add_all(deliveries)

        db.commit()

        print(
            "Inserted final delivery batch:",
            len(deliveries)
        )

    print(
        "Delivery import completed."
    )   
    
def create_contracts(count_per_vendor=1):

    print("Generating Contracts...")

    vendors = db.query(Vendor).all()

    if not vendors:
        raise Exception(
            "No vendors found. Create vendors first."
        )

    existing_contract_numbers = {
        contract.contract_number
        for contract in db.query(Contract).all()
    }

    contracts = []

    contract_statuses = [
        "Active",
        "Active",
        "Active",
        "Expired",
        "Pending"
    ]

    for vendor in vendors:

        for _ in range(count_per_vendor):

            contract_number = (
                f"CON-{vendor.id:04d}-"
                f"{random.randint(1000, 9999)}"
            )

            while (
                contract_number
                in existing_contract_numbers
            ):
                contract_number = (
                    f"CON-{vendor.id:04d}-"
                    f"{random.randint(1000, 9999)}"
                )

            start_date = fake.date_between(
                start_date="-2y",
                end_date="today"
            )

            duration_months = random.choice(
                [6, 12, 18, 24, 36]
            )

            end_date = (
                start_date
                + timedelta(
                    days=duration_months * 30
                )
            )

            contract_value = round(
                random.uniform(
                    100000,
                    5000000
                ),
                2
            )

            status = random.choice(
                contract_statuses
            )

            terms = (
                "Standard vendor agreement. "
                "Supplier must meet delivery schedules, "
                "quality requirements and agreed pricing. "
                "Repeated delivery or quality failures "
                "may result in contract review."
            )

            contract = Contract(

                contract_number=contract_number,

                vendor_id=vendor.id,

                start_date=start_date,

                end_date=end_date,

                contract_value=contract_value,

                contract_status=status,

                terms=terms
            )

            contracts.append(contract)

            existing_contract_numbers.add(
                contract_number
            )

    if contracts:

        db.add_all(contracts)

        db.commit()

        print(
            len(contracts),
            "contracts generated."
        )

    else:

        print(
            "No new contracts generated."
        )
      
def create_invoices():

    print("Generating Invoices...")

    purchase_orders = (
        db.query(PurchaseOrder)
        .all()
    )

    if not purchase_orders:
        raise Exception(
            "No purchase orders found. "
            "Import purchase orders first."
        )

    existing_invoice_po_ids = {
        invoice.purchase_order_id
        for invoice in db.query(Invoice).all()
    }

    invoices = []

    payment_statuses = [
        "Paid",
        "Paid",
        "Paid",
        "Pending",
        "Overdue"
    ]

    for purchase_order in purchase_orders:

        if (
            purchase_order.id
            in existing_invoice_po_ids
        ):
            continue

        invoice_number = (
            f"INV-{purchase_order.id:06d}"
        )

        invoice_date = (
            purchase_order.order_date
            + timedelta(
                days=random.randint(0, 5)
            )
        )

        due_date = (
            invoice_date
            + timedelta(
                days=random.choice(
                    [15, 30, 45, 60]
                )
            )
        )

        payment_status = random.choice(
            payment_statuses
        )

        notes = (
            "Invoice generated from "
            f"Purchase Order "
            f"{purchase_order.po_number}."
        )

        invoice = Invoice(

            invoice_number=invoice_number,

            purchase_order_id=(
                purchase_order.id
            ),

            vendor_id=(
                purchase_order.vendor_id
            ),

            invoice_date=invoice_date,

            due_date=due_date,

            amount=(
                purchase_order.amount
            ),

            payment_status=(
                payment_status
            ),

            notes=notes
        )

        invoices.append(invoice)

        existing_invoice_po_ids.add(
            purchase_order.id
        )

        if len(invoices) >= 5000:

            db.add_all(invoices)

            db.commit()

            print(
                "Inserted invoice batch:",
                len(invoices)
            )

            invoices = []

    if invoices:

        db.add_all(invoices)

        db.commit()

        print(
            "Inserted final invoice batch:",
            len(invoices)
        )

    print(
        "Invoice generation completed."
    )  

def create_quality_inspections():

    print("Generating Quality Inspections...")

    purchase_orders = (
        db.query(PurchaseOrder)
        .all()
    )

    if not purchase_orders:
        raise Exception(
            "No purchase orders found. "
            "Import purchase orders first."
        )

    existing_po_ids = {
        inspection.purchase_order_id
        for inspection in db.query(
            QualityInspection
        ).all()
    }

    inspectors = [
        "Quality Inspector 1",
        "Quality Inspector 2",
        "Quality Inspector 3",
        "Quality Inspector 4",
        "Quality Inspector 5"
    ]

    inspections = []

    for purchase_order in purchase_orders:

        if purchase_order.id in existing_po_ids:
            continue

        inspection_date = (
            purchase_order.order_date
            + timedelta(
                days=random.randint(5, 20)
            )
        )

        quality_score = round(
            random.uniform(70, 100),
            2
        )

        if quality_score >= 90:
            defects_found = random.randint(0, 2)
            status = "Passed"

        elif quality_score >= 80:
            defects_found = random.randint(1, 5)
            status = "Passed"

        elif quality_score >= 70:
            defects_found = random.randint(3, 10)
            status = "Conditional"

        else:
            defects_found = random.randint(8, 15)
            status = "Failed"

        if defects_found == 0:

            remarks = (
                "No significant defects found. "
                "Quality requirements were met."
            )

        elif status == "Passed":

            remarks = (
                f"{defects_found} minor defects found. "
                "Accepted after inspection."
            )

        elif status == "Conditional":

            remarks = (
                f"{defects_found} defects found. "
                "Conditional acceptance recommended."
            )

        else:

            remarks = (
                f"{defects_found} defects found. "
                "Quality requirements were not met."
            )

        inspection = QualityInspection(

            purchase_order_id=(
                purchase_order.id
            ),

            vendor_id=(
                purchase_order.vendor_id
            ),

            inspection_date=inspection_date,

            inspector=random.choice(
                inspectors
            ),

            quality_score=quality_score,

            defects_found=defects_found,

            remarks=remarks,

            status=status
        )

        inspections.append(inspection)

        existing_po_ids.add(
            purchase_order.id
        )

        if len(inspections) >= 5000:

            db.add_all(inspections)

            db.commit()

            print(
                "Inserted inspection batch:",
                len(inspections)
            )

            inspections = []

    if inspections:

        db.add_all(inspections)

        db.commit()

        print(
            "Inserted final inspection batch:",
            len(inspections)
        )

    print(
        "Quality Inspection generation completed."
    )
    
def create_communication_history():

    print("Generating Communication History...")

    vendors = db.query(Vendor).all()

    if not vendors:
        raise Exception(
            "No vendors found. "
            "Import vendors first."
        )

    communication_types = [
        "Email",
        "Phone",
        "Meeting",
        "System",
        "Follow-up"
    ]

    subjects = [
        "Delivery Status Update",
        "Purchase Order Confirmation",
        "Invoice Follow-up",
        "Quality Issue Discussion",
        "Contract Discussion",
        "Delivery Delay Notification",
        "Product Availability",
        "Payment Confirmation"
    ]

    messages = [
        "Vendor contacted regarding the latest order status.",
        "Purchase order details were confirmed with the vendor.",
        "Follow-up communication regarding invoice processing.",
        "Quality issue was discussed with the vendor.",
        "Contract terms and renewal requirements were discussed.",
        "Vendor was contacted regarding a delivery delay.",
        "Product availability and expected delivery were discussed.",
        "Payment status was confirmed with the vendor."
    ]

    senders = [
        "Procurement Team",
        "Vendor Management Team",
        "Finance Team",
        "Quality Team",
        "Operations Team"
    ]

    receivers = [
        "Vendor Representative",
        "Vendor Manager",
        "Vendor Accounts Team",
        "Vendor Operations Team"
    ]

    existing_count = (
        db.query(CommunicationHistory)
        .count()
    )

    if existing_count > 0:

        print(
            "Communication history already exists:",
            existing_count
        )

        return

    communications = []

    records_per_vendor = 5

    for vendor in vendors:

        for _ in range(records_per_vendor):

            communication = CommunicationHistory(

                vendor_id=vendor.id,

                subject=random.choice(
                    subjects
                ),

                communication_type=random.choice(
                    communication_types
                ),

                sender=random.choice(
                    senders
                ),

                receiver=random.choice(
                    receivers
                ),

                message=random.choice(
                    messages
                ),

                communication_date=fake.date_time_between(
                    start_date="-1y",
                    end_date="now"
                )
            )

            communications.append(
                communication
            )

    if communications:

        db.add_all(
            communications
        )

        db.commit()

        print(
            len(communications),
            "communication records generated."
        )

    else:

        print(
            "No communication records generated."
        )
        
def normalize_purchase_order_status(status):

    status = str(status).strip().lower()

    status_map = {
        "pending": "Pending",

        "processing": "Processing",
        "in progress": "Processing",

        "approved": "Approved",

        "complete": "Completed",
        "completed": "Completed",
        "closed": "Completed",

        "cancelled": "Cancelled",
        "canceled": "Cancelled",
    }

    return status_map.get(
        status,
        "Pending"
    )
   
if __name__ == "__main__":

    df = read_dataset()

    create_vendors()

    create_products(df)

    create_purchase_orders(df)
    
    create_deliveries(df)
    
    create_contracts()
    
    create_invoices()
    
    create_quality_inspections()
    
    create_communication_history()