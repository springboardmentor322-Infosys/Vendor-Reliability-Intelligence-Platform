"""Import the DataCo Smart Supply Chain dataset into VendorIQ.

The DataCo dataset is the primary operational dataset. It contains products,
order line items, shipping/delivery information and customer/order geography,
but it does not contain the vendor, contract, invoice, communication, quality,
or certification entities required by VendorIQ. Those supporting records are
therefore generated deterministically from the imported DataCo orders.

Run from backend/:
    python import_dataco.py
"""

from __future__ import annotations

import csv
import hashlib
import random
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

from sqlalchemy import text

from app.database import Base, SessionLocal, engine
from app.models.certification import Certification
from app.models.communication import Communication
from app.models.contract import Contract
from app.models.contract_document import ContractDocument
from app.models.delivery import Delivery
from app.models.invoice import Invoice
from app.models.notification import Notification
from app.models.order import Order
from app.models.product import Product
from app.models.procurement_request import ProcurementRequest
from app.models.quality_inspection import QualityInspection
from app.models.vendor import Vendor
from app.models.vendor_performance import VendorPerformance

# User accounts are intentionally preserved.


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATASET_PATH = DATA_DIR / "DataCoSupplyChainDataset.csv"

RANDOM_SEED = 20260831
rng = random.Random(RANDOM_SEED)

VENDOR_NAMES = [
    "Apex Logistics",
    "Global Components",
    "Reliable Technologies",
    "Western Solutions",
    "Dynamic Supplies",
    "National Supplies",
    "Vertex Technologies",
    "Apex Systems",
    "Prime Industries",
    "Eastern Enterprises",
    "United Systems",
    "Smart Services",
    "Integrated Components",
    "Advanced Manufacturing",
    "Precision Logistics",
    "NextGen Solutions",
    "Global Technologies",
    "Western Logistics",
    "Apex Components",
    "Reliable Supplies",
]

VENDOR_CATEGORIES = [
    "IT Equipment",
    "Industrial Equipment",
    "Electronics",
    "Raw Materials",
    "Safety Equipment",
    "Logistics",
    "Software",
    "Office Supplies",
]

STATUS_MAP = {
    "COMPLETE": "Completed",
    "CLOSED": "Completed",
    "CANCELED": "Cancelled",
    "SUSPECTED_FRAUD": "Cancelled",
    "PROCESSING": "Ordered",
    "PENDING": "Pending",
    "PENDING_PAYMENT": "Pending",
    "ON_HOLD": "Pending",
    "PAYMENT_REVIEW": "Pending",
}


def parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    for fmt in ("%m/%d/%Y %H:%M", "%m/%d/%Y"):
        try:
            return datetime.strptime(value.strip(), fmt)
        except ValueError:
            pass
    return None


def parse_float(value: str | None, default: float = 0.0) -> float:
    try:
        return float(value) if value not in (None, "") else default
    except ValueError:
        return default


def parse_int(value: str | None, default: int = 0) -> int:
    try:
        return int(float(value)) if value not in (None, "") else default
    except ValueError:
        return default


def vendor_index(product_card_id: int) -> int:
    # Stable assignment so repeated imports produce the same vendor mapping.
    return product_card_id % len(VENDOR_NAMES)


def stable_number(prefix: str, value: str, minimum: int, maximum: int) -> int:
    digest = hashlib.sha256(f"{prefix}:{value}".encode()).hexdigest()
    number = int(digest[:12], 16)
    return minimum + number % (maximum - minimum + 1)


def clear_business_data(db) -> None:
    """Rebuild business tables from scratch while preserving user accounts."""
    print("Clearing existing VendorIQ business data...")

    # The Order model has been extended with DataCo source/logistics fields.
    # Recreating the business tables guarantees the SQLite schema matches the
    # code instead of relying on create_all() to alter an existing table.
    business_models = (
        ContractDocument,
        Notification,
        Communication,
        QualityInspection,
        Certification,
        Delivery,
        Invoice,
        VendorPerformance,
        Contract,
        ProcurementRequest,
        Order,
        Product,
        Vendor,
    )

    db.execute(text("PRAGMA foreign_keys=OFF"))
    for model in business_models:
        model.__table__.drop(bind=engine, checkfirst=True)
    db.commit()
    db.execute(text("PRAGMA foreign_keys=ON"))

    Base.metadata.create_all(bind=engine)


def load_dataco() -> tuple[dict[int, dict], dict[int, dict]]:
    """Return (products, orders) aggregated from DataCo line-item rows."""
    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATASET_PATH}\n"
            "Place DataCoSupplyChainDataset.csv in VendorIQ/data/ and run again."
        )

    products: dict[int, dict] = {}
    orders: dict[int, dict] = {}

    print(f"Reading DataCo dataset: {DATASET_PATH}")

    with DATASET_PATH.open("r", encoding="latin1", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            product_id = parse_int(row.get("Product Card Id"))
            if product_id:
                products.setdefault(
                    product_id,
                    {
                        "product_name": row.get("Product Name") or "Unnamed Product",
                        "category": row.get("Category Name") or "Uncategorized",
                        "description": row.get("Product Description") or "",
                        "unit_price": parse_float(row.get("Product Price")),
                    },
                )

            source_order_id = parse_int(row.get("Order Id"))
            if not source_order_id:
                continue

            order_date = parse_dt(row.get("order date (DateOrders)"))
            shipping_date = parse_dt(row.get("shipping date (DateOrders)"))
            quantity = parse_int(row.get("Order Item Quantity"), 1)
            amount = parse_float(row.get("Order Item Total"), parse_float(row.get("Sales")))
            scheduled_days = parse_int(row.get("Days for shipment (scheduled)"), 0)
            real_days = parse_int(row.get("Days for shipping (real)"), scheduled_days)

            current = orders.get(source_order_id)
            if current is None:
                current = {
                    "source_order_id": source_order_id,
                    "product_card_id": product_id,
                    "product_name": row.get("Product Name") or "Unnamed Product",
                    "quantity": 0,
                    "amount": 0.0,
                    "raw_status": row.get("Order Status") or "PENDING",
                    "delivery_status": row.get("Delivery Status") or "",
                    "late_delivery_risk": parse_int(row.get("Late_delivery_risk")),
                    "order_date": order_date.date() if order_date else None,
                    "shipping_date": shipping_date.date() if shipping_date else None,
                    "scheduled_days": scheduled_days,
                    "real_days": real_days,
                    "shipping_mode": row.get("Shipping Mode") or "",
                    "order_country": row.get("Order Country") or "",
                    "order_region": row.get("Order Region") or "",
                    "order_state": row.get("Order State") or "",
                }
                orders[source_order_id] = current

            current["quantity"] += quantity
            current["amount"] += amount

            # A single order can contain multiple line items. If any line is late,
            # keep the order-level delivery risk as late.
            if row.get("Delivery Status") == "Late delivery":
                current["delivery_status"] = "Late delivery"
                current["late_delivery_risk"] = 1

    return products, orders


def create_vendors(db) -> list[Vendor]:
    vendors: list[Vendor] = []
    for i, name in enumerate(VENDOR_NAMES, start=1):
        vendors.append(
            Vendor(
                id=i,
                vendor_name=name,
                email=f"{name.lower().replace(' ', '')}{i}@vendoriq.demo",
                phone=f"+91 {7000000000 + i * 13731}",
                address=f"{100 + i}, Business Park, {['Bhubaneswar','Cuttack','Kolkata','Hyderabad','Bengaluru'][i % 5]}",
                gst_number=f"21{100000000000 + i:012d}",
                category=VENDOR_CATEGORIES[(i - 1) % len(VENDOR_CATEGORIES)],
                contact_person=["Priya Nair", "Karan Reddy", "Amit Verma", "Kavya Panda", "Rahul Sharma"][(i - 1) % 5],
                approval_status="Approved" if i <= 18 else "Pending",
                status="Active" if i != 19 else "Inactive",
            )
        )
    db.add_all(vendors)
    db.commit()
    return vendors


def create_products(db, product_rows: dict[int, dict]) -> dict[int, Product]:
    result: dict[int, Product] = {}
    for new_id, source_id in enumerate(sorted(product_rows), start=1):
        row = product_rows[source_id]
        product = Product(
            id=new_id,
            product_name=row["product_name"],
            category=row["category"],
            description=row["description"],
            unit_price=round(row["unit_price"], 2),
            stock_quantity=stable_number("stock", str(source_id), 20, 500),
            reorder_level=stable_number("reorder", str(source_id), 5, 50),
            status="Active",
        )
        db.add(product)
        result[source_id] = product
    db.commit()
    return result


def create_orders_and_deliveries(db, order_rows: dict[int, dict], products: dict[int, Product]) -> tuple[list[Order], dict[int, int]]:
    """Bulk-import unique DataCo orders and create one delivery per order."""
    order_mappings = []
    sorted_source_ids = sorted(order_rows)

    for new_id, source_id in enumerate(sorted_source_ids, start=1):
        row = order_rows[source_id]
        vendor_id = vendor_index(row["product_card_id"] or 0) + 1
        status = STATUS_MAP.get(row["raw_status"], "Pending")
        expected = None
        if row["order_date"]:
            expected = row["order_date"] + timedelta(days=max(row["scheduled_days"], 0))

        order_mappings.append({
            "id": new_id,
            "vendor_id": vendor_id,
            "product_name": row["product_name"],
            "quantity": max(row["quantity"], 1),
            "amount": round(row["amount"], 2),
            "status": status,
            "expected_delivery_date": expected,
            "source_order_id": str(source_id),
            "order_date": row["order_date"],
            "shipping_date": row["shipping_date"],
            "shipping_mode": row["shipping_mode"],
            "delivery_status": row["delivery_status"],
            "late_delivery_risk": row["late_delivery_risk"],
            "order_country": row["order_country"],
            "order_region": row["order_region"],
            "order_state": row["order_state"],
        })

    print(f"Bulk importing {len(order_mappings)} orders...")
    db.bulk_insert_mappings(Order, order_mappings)
    db.commit()

    delivery_mappings = []
    for new_id, source_id in enumerate(sorted_source_ids, start=1):
        row = order_rows[source_id]
        status = STATUS_MAP.get(row["raw_status"], "Pending")
        if row["delivery_status"] == "Shipping canceled" or status == "Cancelled":
            delivery_status = "Pending"
            actual = None
        elif row["shipping_date"] and row["real_days"] >= 0 and status == "Completed":
            actual = row["shipping_date"] + timedelta(days=row["real_days"])
            delivery_status = "Delivered"
        elif row["delivery_status"] == "Late delivery":
            actual = None
            delivery_status = "Delayed"
        elif row["delivery_status"] in {"Advance shipping", "Shipping on time"}:
            actual = None
            delivery_status = "In Transit"
        else:
            actual = None
            delivery_status = "Pending"

        expected = row["order_date"] + timedelta(days=max(row["scheduled_days"], 0)) if row["order_date"] else date.today() + timedelta(days=30)
        vendor_id = vendor_index(row["product_card_id"] or 0) + 1
        delivery_mappings.append({
            "order_id": new_id,
            "vendor_id": vendor_id,
            "expected_delivery_date": expected,
            "actual_delivery_date": actual,
            "status": delivery_status,
            "tracking_number": f"TRK{stable_number('trk', str(source_id), 10000000, 99999999)}",
            "notes": "Imported from DataCo Smart Supply Chain dataset.",
        })

    print(f"Bulk importing {len(delivery_mappings)} deliveries...")
    db.bulk_insert_mappings(Delivery, delivery_mappings)
    db.commit()

    orders = db.query(Order).order_by(Order.id).all()
    source_to_new = {source_id: new_id for new_id, source_id in enumerate(sorted_source_ids, start=1)}
    return orders, source_to_new

def status_is_cancelled(status: str) -> bool:
    return status == "Cancelled"


def create_supplemental_data(db, orders: list[Order], order_rows: dict[int, dict]) -> None:
    """Create business entities absent from DataCo using imported order metrics."""
    today = date.today()

    # Procurement requests: representative records tied to real imported orders.
    for i, order in enumerate(orders[:30], start=1):
        db.add(
            ProcurementRequest(
                id=i,
                vendor_id=order.vendor_id,
                product_name=order.product_name,
                quantity=max(order.quantity // 2, 1),
                estimated_amount=round(order.amount * 0.5, 2),
                status=["Pending", "Approved", "Converted", "Rejected"][i % 4],
            )
        )
    db.commit()

    # Contracts: generated business information; DataCo has no contract table.
    vendors = db.query(Vendor).order_by(Vendor.id).all()
    for i, vendor in enumerate(vendors, start=1):
        start = today - timedelta(days=120 + i * 20)
        expiry = today + timedelta(days=(i - 5) * 25)
        if expiry < today:
            contract_status = "Expired"
        elif expiry <= today + timedelta(days=60):
            contract_status = "Active"
        else:
            contract_status = "Active"
        renewal = "Pending" if expiry <= today + timedelta(days=60) else "Renewed"
        contract = Contract(
            id=i,
            vendor_id=vendor.id,
            contract_name=f"{vendor.vendor_name} Service Agreement",
            contract_number=f"CNT-2026-{i:04d}",
            contract_value=round(250000 + i * 75000, 2),
            start_date=start,
            expiry_date=expiry,
            status=contract_status,
            renewal_status=renewal,
            renewal_date=expiry + timedelta(days=30) if renewal == "Pending" else None,
            compliance_status=["Compliant", "Pending", "Compliant", "Non-Compliant"][i % 4],
            description="Supplemental contract record generated for VendorIQ modules; not present in DataCo.",
        )
        db.add(contract)
    db.commit()

    # Invoices: tied to real imported orders.
    for i, order in enumerate(orders[:100], start=1):
        invoice_date = order.order_date or (today - timedelta(days=i))
        db.add(
            Invoice(
                id=i,
                invoice_number=f"INV-2026-{i:05d}",
                order_id=order.id,
                vendor_id=order.vendor_id,
                amount=order.amount,
                status=["Paid", "Paid", "Pending", "Overdue"][i % 4],
                invoice_date=invoice_date,
                due_date=invoice_date + timedelta(days=30),
            )
        )
    db.commit()

    # Performance: one aggregate record per vendor, calculated from imported orders.
    grouped: dict[int, list[Order]] = defaultdict(list)
    for order in orders:
        grouped[order.vendor_id].append(order)

    for vendor_id in sorted(grouped):
        vendor_orders = grouped[vendor_id]
        total = len(vendor_orders)
        late = sum(1 for o in vendor_orders if o.late_delivery_risk == 1)
        on_time = max(total - late, 0)
        completed = sum(1 for o in vendor_orders if o.status == "Completed")
        on_time_pct = (on_time / total * 100) if total else 0
        quality = min(5.0, max(3.0, 3.0 + on_time_pct / 50))
        completion = completed / total * 100 if total else 0
        db.add(
            VendorPerformance(
                vendor_id=vendor_id,
                on_time_deliveries=on_time,
                delayed_deliveries=late,
                quality_rating=round(quality, 2),
                response_time=round(3 + (vendor_id % 8) * 0.75, 2),
                issue_resolution_time=round(5 + (vendor_id % 10) * 1.2, 2),
                order_completion_rate=round(completion, 2),
                service_rating=round(min(5.0, quality - 0.1), 2),
                performance_date=today,
            )
        )
    db.commit()

    # Quality inspections: deterministic sample of imported orders.
    for i, order in enumerate(orders[:100], start=1):
        late_penalty = 8 if order.late_delivery_risk else 0
        score = max(60.0, min(100.0, 94.0 - late_penalty + (i % 7) - 3))
        result = "Passed" if score >= 85 else "Passed with Issues" if score >= 70 else "Failed"
        db.add(
            QualityInspection(
                id=i,
                order_id=order.id,
                vendor_id=order.vendor_id,
                inspection_date=order.order_date or today,
                inspector_name=["Priya Nair", "Amit Verma", "Kavya Panda", "Rahul Sharma"][i % 4],
                quality_score=round(score, 2),
                result=result,
                defect_count=max(0, int((100 - score) // 8)),
                notes="Supplemental inspection record generated from imported order data.",
            )
        )
    db.commit()

    # Certifications: generated supporting vendor information.
    for i, vendor in enumerate(vendors, start=1):
        issue = today - timedelta(days=180 + i * 10)
        expiry = today + timedelta(days=(i - 10) * 30)
        db.add(
            Certification(
                id=i,
                vendor_id=vendor.id,
                certification_name=["ISO 9001", "ISO 27001", "ISO 14001", "SOC 2"][i % 4],
                certificate_number=f"CERT-2026-{i:04d}",
                issuing_authority="VendorIQ Compliance Registry",
                issue_date=issue,
                expiry_date=expiry,
                status="Expired" if expiry < today else "Active",
                notes="Supplemental certification record; DataCo does not contain certification data.",
            )
        )
    db.commit()

    # Communications.
    subjects = [
        "Order Status Update",
        "Delivery Discussion",
        "Invoice Query",
        "Contract Discussion",
        "Procurement Update",
        "Quality Review",
    ]
    messages = [
        "Please provide the latest order status.",
        "The delivery schedule has been confirmed.",
        "Please share the updated invoice.",
        "We would like to discuss the contract renewal.",
        "The procurement request has been reviewed.",
        "Please provide the quality inspection report.",
    ]
    for i in range(1, 101):
        vendor_id = ((i - 1) % len(vendors)) + 1
        db.add(
            Communication(
                id=i,
                vendor_id=vendor_id,
                sender_email=f"procurement{i}@vendoriq.demo",
                communication_type=["Vendor Message", "Procurement Discussion", "Activity Log"][i % 3],
                subject=subjects[i % len(subjects)],
                message=messages[i % len(messages)],
                status="Sent",
                created_at=datetime.utcnow() - timedelta(days=i % 60),
            )
        )
    db.commit()

    # Notifications: real DataCo delivery-risk signals plus contract alerts.
    delayed_orders = [o for o in orders if o.late_delivery_risk == 1]
    contracts = db.query(Contract).order_by(Contract.id).all()
    notification_id = 1
    for order in delayed_orders[:70]:
        db.add(
            Notification(
                id=notification_id,
                title="Delivery Delay",
                message=f"Imported DataCo order #{order.source_order_id} has a late-delivery risk.",
                notification_type="Delivery Delay",
                vendor_id=order.vendor_id,
                is_read=False,
                created_at=datetime.utcnow(),
            )
        )
        notification_id += 1
    for contract in contracts[:30]:
        db.add(
            Notification(
                id=notification_id,
                title="Contract Expiry",
                message=f"{contract.contract_name} requires review before {contract.expiry_date}.",
                notification_type="Contract Expiry",
                vendor_id=contract.vendor_id,
                contract_id=contract.id,
                is_read=False,
                created_at=datetime.utcnow(),
            )
        )
        notification_id += 1
    db.commit()


def main() -> None:
    print("=" * 72)
    print("VendorIQ — DataCo Supply Chain Dataset Import")
    print("=" * 72)

    Base.metadata.create_all(bind=engine)
    products, order_rows = load_dataco()
    print(f"DataCo products discovered: {len(products)}")
    print(f"DataCo unique orders discovered: {len(order_rows)}")

    db = SessionLocal()
    try:
        clear_business_data(db)
        vendors = create_vendors(db)
        print(f"Created {len(vendors)} vendors (supplemental business data).")

        product_map = create_products(db, products)
        print(f"Imported {len(product_map)} unique DataCo products.")

        orders, _ = create_orders_and_deliveries(db, order_rows, product_map)
        print(f"Imported {len(orders)} unique DataCo orders and deliveries.")

        create_supplemental_data(db, orders, order_rows)

        print("Supplemental contracts, procurement requests, invoices, performance,")
        print("quality inspections, certifications, communications and notifications created.")
        print("Existing user accounts were preserved.")
        print("Import completed successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
