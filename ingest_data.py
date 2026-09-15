# ============================================================
# VENDORIQ - DATACO SUPPLY CHAIN DATA IMPORTER
# ============================================================
# Safe/re-runnable importer for DataCoSupplyChainDataset.csv
#
# IMPORTANT:
# 1. PostgreSQL primary keys are NEVER populated with DataCo IDs.
# 2. Existing DataCo-imported rows are removed first when
#    RESET_DATACO_IMPORT=True. Non-DataCo application data is kept.
# 3. DataCo customer passwords are NOT imported into VendorIQ users.
# 4. VND0000004 is treated as the logistics partner, not a product vendor.
# 5. The DataCo vendor assignment is synthetic and follows the
#    CATEGORY_VENDOR_MAP below.
# ============================================================

import os
import re
import math
from collections import defaultdict
from datetime import datetime, timedelta

import pandas as pd
from sqlalchemy import text

from Tables import (
    SessionLocal,
    Vendor,
    Customer,
    CustomerOrder,
    CustomerOrderItem,
    InventoryItem,
    InventoryMovement,
    InventorySnapshot,
    Warehouse,
    Carrier,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseOrderDetails,
    Shipment,
    ShipmentItem,
    ShipmentDetails,
    VendorPerformanceHistory,
)

# ============================================================
# CONFIGURATION
# ============================================================

CSV_FILE = "DataCoSupplyChainDataset.csv"
BATCH_SIZE = 2000

# TRUE = remove only rows previously imported by this script,
# then rebuild the DataCo dataset cleanly.
# FALSE = skip existing DataCo parent records and reuse them.
RESET_DATACO_IMPORT = True

# ============================================================
# VENDORS
# ============================================================

IT_VENDOR = "VND0000001"
EQUIPMENT_VENDOR_1 = "VND0000002"
SERVICE_VENDOR = "VND0000003"
LOGISTICS_VENDOR = "VND0000004"
EQUIPMENT_VENDOR_2 = "VND0000005"
MAINTENANCE_VENDOR = "VND0000006"

VALID_VENDOR_IDS = {
    IT_VENDOR,
    EQUIPMENT_VENDOR_1,
    SERVICE_VENDOR,
    LOGISTICS_VENDOR,
    EQUIPMENT_VENDOR_2,
    MAINTENANCE_VENDOR,
}

CATEGORY_VENDOR_MAP = {
    # VND0000001 - IT
    "CDs": IT_VENDOR,
    "Cameras": IT_VENDOR,
    "Computers": IT_VENDOR,
    "Consumer Electronics": IT_VENDOR,
    "DVDs": IT_VENDOR,
    "Electronics": IT_VENDOR,
    "Music": IT_VENDOR,
    "Video Games": IT_VENDOR,

    # VND0000002 - Equipment
    "Accessories": EQUIPMENT_VENDOR_1,
    "Baseball & Softball": EQUIPMENT_VENDOR_1,
    "Basketball": EQUIPMENT_VENDOR_1,
    "Boxing & MMA": EQUIPMENT_VENDOR_1,
    "Cleats": EQUIPMENT_VENDOR_1,
    "Golf Balls": EQUIPMENT_VENDOR_1,
    "Golf Gloves": EQUIPMENT_VENDOR_1,
    "Hockey": EQUIPMENT_VENDOR_1,
    "Lacrosse": EQUIPMENT_VENDOR_1,
    "Shop By Sport": EQUIPMENT_VENDOR_1,
    "Soccer": EQUIPMENT_VENDOR_1,
    "Sporting Goods": EQUIPMENT_VENDOR_1,
    "Tennis & Racquet": EQUIPMENT_VENDOR_1,

    # VND0000003 - Service
    "As Seen on TV!": SERVICE_VENDOR,
    "Baby": SERVICE_VENDOR,
    "Books": SERVICE_VENDOR,
    "Children's Clothing": SERVICE_VENDOR,
    "Crafts": SERVICE_VENDOR,
    "Girls' Apparel": SERVICE_VENDOR,
    "Golf Apparel": SERVICE_VENDOR,
    "Golf Shoes": SERVICE_VENDOR,
    "Health and Beauty": SERVICE_VENDOR,
    "Men's Clothing": SERVICE_VENDOR,
    "Men's Footwear": SERVICE_VENDOR,
    "Toys": SERVICE_VENDOR,
    "Trade-In": SERVICE_VENDOR,
    "Women's Apparel": SERVICE_VENDOR,
    "Women's Clothing": SERVICE_VENDOR,

    # VND0000005 - Equipment
    "Camping & Hiking": EQUIPMENT_VENDOR_2,
    "Cardio Equipment": EQUIPMENT_VENDOR_2,
    "Fishing": EQUIPMENT_VENDOR_2,
    "Fitness Accessories": EQUIPMENT_VENDOR_2,
    "Golf Bags & Carts": EQUIPMENT_VENDOR_2,
    "Hunting & Shooting": EQUIPMENT_VENDOR_2,
    "Indoor/Outdoor Games": EQUIPMENT_VENDOR_2,
    "Kids' Golf Clubs": EQUIPMENT_VENDOR_2,
    "Men's Golf Clubs": EQUIPMENT_VENDOR_2,
    "Strength Training": EQUIPMENT_VENDOR_2,
    "Water Sports": EQUIPMENT_VENDOR_2,
    "Women's Golf Clubs": EQUIPMENT_VENDOR_2,

    # VND0000006 - Maintenance
    "Garden": MAINTENANCE_VENDOR,
    "Pet Supplies": MAINTENANCE_VENDOR,
}

EXPECTED_CATEGORIES = set(CATEGORY_VENDOR_MAP.keys())

# ============================================================
# BASIC HELPERS
# ============================================================

def clean_string(value, default=None):
    if value is None:
        return default
    try:
        if pd.isna(value):
            return default
    except Exception:
        pass
    value = str(value).strip()
    return value if value else default


def normalize_whitespace(value):
    value = clean_string(value)
    if value is None:
        return None
    return re.sub(r"\s+", " ", value)


def clean_category(value):
    return normalize_whitespace(value)


def clean_date(value):
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except Exception:
        pass
    try:
        return pd.to_datetime(value).to_pydatetime()
    except Exception:
        return None


def safe_int(value, default=0):
    if value is None:
        return default
    try:
        if pd.isna(value):
            return default
    except Exception:
        pass
    try:
        return int(float(value))
    except Exception:
        return default


def safe_float(value, default=0.0):
    if value is None:
        return default
    try:
        if pd.isna(value):
            return default
    except Exception:
        pass
    try:
        number = float(value)
        if math.isnan(number) or math.isinf(number):
            return default
        return number
    except Exception:
        return default


def native_value(value):
    """Convert pandas/numpy scalars into PostgreSQL-safe Python values."""
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except Exception:
        pass
    if hasattr(value, "item") and not isinstance(value, (str, bytes)):
        try:
            value = value.item()
        except Exception:
            pass
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    return value


def valid_email(value):
    value = clean_string(value)
    if not value or "@" not in value:
        return None
    return value


def map_priority(value):
    return "High" if safe_int(value) == 1 else "Normal"


def map_order_status(value):
    return clean_string(value, "Pending")[:50]


def map_shipment_status(value):
    status = normalize_whitespace(value)
    if not status:
        return "Pending"
    low = status.lower()
    if "deliver" in low:
        return "Delivered"
    if "cancel" in low:
        return "Cancelled"
    if "shipping" in low or "transit" in low:
        return "In Transit"
    if "late" in low:
        return "Delayed"
    return status[:50]


def shipping_mode(value):
    return normalize_whitespace(value) or "Unknown"


def add_in_batches(session, model, rows, label):
    if not rows:
        return 0
    total = 0
    for start in range(0, len(rows), BATCH_SIZE):
        batch = rows[start:start + BATCH_SIZE]
        session.bulk_insert_mappings(model, batch)
        session.commit()
        total += len(batch)
        print(f"  {label}: {total:,}/{len(rows):,}")
    return total

# ============================================================
# DATASET
# ============================================================

def load_dataset():
    if not os.path.exists(CSV_FILE):
        raise FileNotFoundError(
            f"CSV file not found: {os.path.abspath(CSV_FILE)}"
        )

    print(f"Loading: {os.path.abspath(CSV_FILE)}")
    df = pd.read_csv(CSV_FILE, encoding="latin1", low_memory=False)
    print(f"Rows: {len(df):,}")
    print(f"Columns: {len(df.columns):,}")
    return df


def validate_dataset(df):
    required = {
        "Category Name", "Customer Id", "Customer Fname", "Customer Lname",
        "Customer Email", "Customer Street", "Customer Zipcode",
        "Customer City", "Customer State", "Customer Country",
        "Order Id", "Order Customer Id", "Order Status",
        "order date (DateOrders)", "Order Item Id", "Product Card Id",
        "Product Name", "Product Description", "Product Price",
        "Order Item Product Price", "Order Item Quantity", "Order Item Total",
        "Days for shipping (real)", "Days for shipment (scheduled)",
        "Late_delivery_risk", "Delivery Status", "Shipping Mode",
        "shipping date (DateOrders)", "Order Region", "Order City",
        "Order Country", "Department Name", "Product Status",
    }
    missing = sorted(required - set(df.columns))
    if missing:
        raise ValueError("Missing DataCo columns: " + ", ".join(missing))

    categories = {
        clean_category(x)
        for x in df["Category Name"].dropna().unique()
    }
    missing_categories = sorted(categories - EXPECTED_CATEGORIES)
    if missing_categories:
        raise ValueError(
            "Categories missing from CATEGORY_VENDOR_MAP: "
            + ", ".join(missing_categories)
        )

    print(f"Categories validated: {len(categories)}")

# ============================================================
# VENDOR CHECK
# ============================================================

def validate_existing_vendors(session):
    missing = []
    for vendor_id in sorted(VALID_VENDOR_IDS):
        vendor = (
            session.query(Vendor)
            .filter(Vendor.vendor_id == vendor_id)
            .first()
        )
        if vendor is None:
            missing.append(vendor_id)
    if missing:
        raise ValueError(
            "These required VendorIQ vendors do not exist: "
            + ", ".join(missing)
        )
    print("All six VendorIQ vendors exist.")

# ============================================================
# REMOVE ONLY PREVIOUS DATACO IMPORT
# ============================================================

def reset_dataco_import(session):
    print("\n" + "=" * 70)
    print("RESETTING PREVIOUS DATACO IMPORT")
    print("=" * 70)
    print("Only DataCo-prefixed/imported records are removed.")

    # Parent IDs first, then children.
    customer_order_ids = [
        x[0] for x in session.query(CustomerOrder.id)
        .filter(CustomerOrder.order_number.like("DC-ORD-%"))
        .all()
    ]
    purchase_order_ids = [
        x[0] for x in session.query(PurchaseOrder.id)
        .filter(PurchaseOrder.po_number.like("DC-PO-%"))
        .all()
    ]
    shipment_ids = [
        x[0] for x in session.query(Shipment.id)
        .filter(Shipment.shipment_number.like("DC-SHP-%"))
        .all()
    ]
    warehouse_ids = [
        x[0] for x in session.query(Warehouse.id)
        .filter(Warehouse.warehouse_code.like("DC-WH-%"))
        .all()
    ]
    inventory_ids = [
        x[0] for x in session.query(InventoryItem.id)
        .filter(InventoryItem.item_code.like("DC-PROD-%"))
        .all()
    ]

    deleted = defaultdict(int)

    if shipment_ids:
        deleted["shipment_details"] = session.query(ShipmentDetails).filter(
            ShipmentDetails.shipment_id.in_(shipment_ids)
        ).delete(synchronize_session=False)
        deleted["shipment_items"] = session.query(ShipmentItem).filter(
            ShipmentItem.shipment_id.in_(shipment_ids)
        ).delete(synchronize_session=False)
        deleted["shipments"] = session.query(Shipment).filter(
            Shipment.id.in_(shipment_ids)
        ).delete(synchronize_session=False)

    if purchase_order_ids:
        deleted["purchase_order_details"] = session.query(PurchaseOrderDetails).filter(
            PurchaseOrderDetails.purchase_order_id.in_(purchase_order_ids)
        ).delete(synchronize_session=False)
        deleted["purchase_order_items"] = session.query(PurchaseOrderItem).filter(
            PurchaseOrderItem.purchase_order_id.in_(purchase_order_ids)
        ).delete(synchronize_session=False)
        deleted["purchase_orders"] = session.query(PurchaseOrder).filter(
            PurchaseOrder.id.in_(purchase_order_ids)
        ).delete(synchronize_session=False)

    if customer_order_ids:
        deleted["customer_order_items"] = session.query(CustomerOrderItem).filter(
            CustomerOrderItem.order_id.in_(customer_order_ids)
        ).delete(synchronize_session=False)
        deleted["customer_orders"] = session.query(CustomerOrder).filter(
            CustomerOrder.id.in_(customer_order_ids)
        ).delete(synchronize_session=False)

    deleted["inventory_movements"] = session.query(InventoryMovement).filter(
        InventoryMovement.reference_number.like("DC-ORD-%")
    ).delete(synchronize_session=False)

    if inventory_ids:
        deleted["inventory_snapshots"] = session.query(InventorySnapshot).filter(
            InventorySnapshot.warehouse_id.in_(warehouse_ids or [-1])
        ).delete(synchronize_session=False)
        deleted["inventory_items"] = session.query(InventoryItem).filter(
            InventoryItem.id.in_(inventory_ids)
        ).delete(synchronize_session=False)
    elif warehouse_ids:
        deleted["inventory_snapshots"] = session.query(InventorySnapshot).filter(
            InventorySnapshot.warehouse_id.in_(warehouse_ids)
        ).delete(synchronize_session=False)

    if warehouse_ids:
        deleted["warehouses"] = session.query(Warehouse).filter(
            Warehouse.id.in_(warehouse_ids)
        ).delete(synchronize_session=False)

    deleted["carriers"] = session.query(Carrier).filter(
        Carrier.carrier_code.like("DC-CARRIER-%")
    ).delete(synchronize_session=False)

    deleted["customers"] = session.query(Customer).filter(
        Customer.customer_code.like("DC-CUST-%")
    ).delete(synchronize_session=False)

    # Performance history has a natural unique key. Delete only the
    # importer-managed vendor/date range, not unrelated vendors.
    deleted["vendor_performance_history"] = session.query(
        VendorPerformanceHistory
    ).filter(
        VendorPerformanceHistory.vendor_id.in_(list(VALID_VENDOR_IDS)),
        VendorPerformanceHistory.year.between(2015, 2017),
    ).delete(synchronize_session=False)

    session.commit()

    for table, count in deleted.items():
        if count:
            print(f"  Deleted {table}: {count:,}")

# ============================================================
# WAREHOUSES
# ============================================================

def create_warehouses(df, session):
    regions = sorted({
        normalize_whitespace(x)
        for x in df["Order Region"].dropna().unique()
        if normalize_whitespace(x)
    })

    existing = {
        w.warehouse_code: w.id
        for w in session.query(Warehouse)
        .filter(Warehouse.warehouse_code.like("DC-WH-%"))
        .all()
    }

    rows = []
    warehouse_map = {}
    for index, region in enumerate(regions, start=1):
        code = f"DC-WH-{index:03d}"
        if code not in existing:
            rows.append({
                "warehouse_code": code,
                "warehouse_name": f"DataCo {region} Warehouse"[:200],
                "location": region[:255],
                "manager_name": "DataCo Import",
                "status": "Active",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "capacity_sq_ft": 100000,
                "latitude": None,
                "longitude": None,
            })

    add_in_batches(session, Warehouse, rows, "Warehouses")

    db_rows = session.query(Warehouse).filter(
        Warehouse.warehouse_code.like("DC-WH-%")
    ).all()
    for w in db_rows:
        try:
            index = int(w.warehouse_code.replace("DC-WH-", "")) - 1
            if 0 <= index < len(regions):
                warehouse_map[regions[index]] = w.id
        except Exception:
            pass

    print(f"Warehouses available: {len(warehouse_map):,}")
    return warehouse_map

# ============================================================
# CARRIERS
# ============================================================

def create_carriers(df, session):
    modes = sorted({shipping_mode(x) for x in df["Shipping Mode"].dropna()})
    existing = {
        c.carrier_code: c.id
        for c in session.query(Carrier)
        .filter(Carrier.carrier_code.like("DC-CARRIER-%"))
        .all()
    }

    rows = []
    for index, mode in enumerate(modes, start=1):
        code = f"DC-CARRIER-{index:03d}"
        if code not in existing:
            rows.append({
                "carrier_code": code,
                "carrier_name": mode[:200],
                "transport_modes": mode[:255],
                "rating": 4.0,
                "damage_rate": 1.0,
                "status": "Active",
                "created_at": datetime.utcnow(),
            })

    add_in_batches(session, Carrier, rows, "Carriers")

    db_rows = session.query(Carrier).filter(
        Carrier.carrier_code.like("DC-CARRIER-%")
    ).all()
    carrier_map = {}
    for c in db_rows:
        try:
            index = int(c.carrier_code.replace("DC-CARRIER-", "")) - 1
            if 0 <= index < len(modes):
                carrier_map[modes[index]] = c.id
        except Exception:
            pass

    print(f"Carriers available: {len(carrier_map):,}")
    return carrier_map

# ============================================================
# CUSTOMERS
# ============================================================

def create_customers(df, session):
    customers = df[[
        "Customer Id", "Customer Fname", "Customer Lname", "Customer Email",
        "Customer Street", "Customer Zipcode", "Customer City",
        "Customer State", "Customer Country"
    ]].drop_duplicates("Customer Id")

    existing = {
        c.customer_code: c.id
        for c in session.query(Customer)
        .filter(Customer.customer_code.like("DC-CUST-%"))
        .all()
    }

    rows = []
    for _, row in customers.iterrows():
        source_id = safe_int(row["Customer Id"])
        code = f"DC-CUST-{source_id}"
        if code in existing:
            continue

        first = clean_string(row["Customer Fname"], "")
        last = clean_string(row["Customer Lname"], "")
        name = f"{first} {last}".strip() or f"DataCo Customer {source_id}"

        street = clean_string(row["Customer Street"], "")
        zipcode = clean_string(row["Customer Zipcode"], "")
        address = ", ".join(x for x in [street, zipcode] if x) or None

        rows.append({
            "customer_code": code,
            "customer_name": name[:255],
            "email": valid_email(row["Customer Email"]),
            "phone": None,
            "address": address,
            "city": clean_string(row["Customer City"]),
            "state": clean_string(row["Customer State"]),
            "country": clean_string(row["Customer Country"]),
            "created_at": datetime.utcnow(),
        })

    add_in_batches(session, Customer, rows, "Customers")

    db_rows = session.query(Customer).filter(
        Customer.customer_code.like("DC-CUST-%")
    ).all()
    customer_map = {}
    for c in db_rows:
        try:
            customer_map[int(c.customer_code.replace("DC-CUST-", ""))] = c.id
        except Exception:
            pass

    print(f"Customers available: {len(customer_map):,}")
    return customer_map

# ============================================================
# INVENTORY PRODUCTS
# ============================================================

def create_inventory_items(df, session, warehouse_map):
    products = df[[
        "Product Card Id", "Product Name", "Category Name", "Product Price",
        "Product Status", "Order Region"
    ]].drop_duplicates("Product Card Id")

    # Calculate historical demand once instead of filtering 180k rows per product.
    demand = (
        df.groupby("Product Card Id")["Order Item Quantity"]
        .sum()
        .to_dict()
    )

    existing = {
        x.item_code: x.id
        for x in session.query(InventoryItem)
        .filter(InventoryItem.item_code.like("DC-PROD-%"))
        .all()
    }

    rows = []
    for _, row in products.iterrows():
        product_id = safe_int(row["Product Card Id"])
        code = f"DC-PROD-{product_id}"
        if code in existing:
            continue

        quantity_sold = max(0, safe_int(demand.get(product_id, 0)))
        minimum_stock = max(1, int(quantity_sold * 0.05))
        maximum_stock = max(minimum_stock + 1, int(quantity_sold * 0.20))
        status_value = safe_int(row["Product Status"], 1)
        status = "Active" if status_value == 1 else "Inactive"
        region = normalize_whitespace(row["Order Region"])

        rows.append({
            "item_code": code,
            "item_name": clean_string(row["Product Name"], f"Product {product_id}")[:200],
            "category": clean_category(row["Category Name"]),
            "quantity": quantity_sold,
            "minimum_stock": minimum_stock,
            "maximum_stock": maximum_stock,
            "unit_price": round(safe_float(row["Product Price"]), 2),
            "status": status,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "reorder_point": minimum_stock,
            "warehouse_id": warehouse_map.get(region),
        })

    add_in_batches(session, InventoryItem, rows, "Inventory products")

    db_rows = session.query(InventoryItem).filter(
        InventoryItem.item_code.like("DC-PROD-%")
    ).all()
    inventory_map = {}
    for item in db_rows:
        try:
            inventory_map[int(item.item_code.replace("DC-PROD-", ""))] = item.id
        except Exception:
            pass

    if len(inventory_map) < len(products):
        raise RuntimeError(
            f"Only {len(inventory_map):,} of {len(products):,} DataCo products are available."
        )

    print(f"Inventory products available: {len(inventory_map):,}")
    return inventory_map

# ============================================================
# CUSTOMER ORDERS
# ============================================================

def create_customer_orders(df, session, customer_map):
    orders = df[[
        "Order Id", "Order Customer Id", "Order Status",
        "order date (DateOrders)", "Days for shipment (scheduled)",
        "Days for shipping (real)", "Late_delivery_risk"
    ]].drop_duplicates("Order Id")

    totals = (
        df.groupby("Order Id")["Order Item Total"]
        .sum()
        .to_dict()
    )

    existing = {
        x.order_number: x.id
        for x in session.query(CustomerOrder)
        .filter(CustomerOrder.order_number.like("DC-ORD-%"))
        .all()
    }

    rows = []
    for _, row in orders.iterrows():
        source_order_id = safe_int(row["Order Id"])
        order_number = f"DC-ORD-{source_order_id}"
        if order_number in existing:
            continue

        customer_source_id = safe_int(row["Order Customer Id"])
        customer_db_id = customer_map.get(customer_source_id)
        if customer_db_id is None:
            raise ValueError(
                f"Customer mapping missing for DataCo Customer Id {customer_source_id}"
            )

        order_dt = clean_date(row["order date (DateOrders)"]) or datetime(2015, 1, 1)
        scheduled = max(0, safe_int(row["Days for shipment (scheduled)"]))
        real = max(0, safe_int(row["Days for shipping (real)"]))

        expected = (order_dt + timedelta(days=scheduled)).date()
        actual = (order_dt + timedelta(days=real)).date()

        rows.append({
            "order_number": order_number,
            "customer_id": customer_db_id,
            "order_date": order_dt.date(),
            "status": map_order_status(row["Order Status"]),
            "amount": round(safe_float(totals.get(source_order_id)), 2),
            "expected_delivery": expected,
            "actual_delivery": actual,
            "priority": map_priority(row["Late_delivery_risk"]),
            "created_at": order_dt,
            "updated_at": order_dt,
        })

    add_in_batches(session, CustomerOrder, rows, "Customer orders")

    db_rows = session.query(CustomerOrder).filter(
        CustomerOrder.order_number.like("DC-ORD-%")
    ).all()
    order_map = {}
    for order in db_rows:
        try:
            source_id = int(order.order_number.replace("DC-ORD-", ""))
            order_map[source_id] = order.id
        except Exception:
            pass

    print(f"Customer orders available: {len(order_map):,}")
    return order_map

# ============================================================
# CUSTOMER ORDER ITEMS
# ============================================================

def create_customer_order_items(df, session, inventory_map, order_map):
    existing_keys = set()
    if order_map:
        existing_rows = session.query(
            CustomerOrderItem.order_id,
            CustomerOrderItem.item_code,
            CustomerOrderItem.quantity,
            CustomerOrderItem.unit_price,
            CustomerOrderItem.total_price,
        ).filter(CustomerOrderItem.order_id.in_(list(order_map.values()))).all()
        for x in existing_rows:
            existing_keys.add((x.order_id, x.item_code, x.quantity, float(x.unit_price or 0), float(x.total_price or 0)))

    rows = []
    imported = 0
    for _, row in df.iterrows():
        source_order = safe_int(row["Order Id"])
        source_product = safe_int(row["Product Card Id"])
        order_db_id = order_map.get(source_order)
        inventory_db_id = inventory_map.get(source_product)
        if order_db_id is None or inventory_db_id is None:
            continue

        quantity = max(1, safe_int(row["Order Item Quantity"]))
        unit_price = round(safe_float(row["Order Item Product Price"]), 2)
        total_price = round(safe_float(row["Order Item Total"]), 2)
        key = (order_db_id, f"DC-PROD-{source_product}", quantity, unit_price, total_price)
        if key in existing_keys:
            continue

        rows.append({
            "order_id": order_db_id,
            "item_code": f"DC-PROD-{source_product}",
            "item_name": clean_string(row["Product Name"], f"Product {source_product}")[:200],
            "quantity": quantity,
            "unit_price": unit_price,
            "total_price": total_price,
        })
        existing_keys.add(key)
        imported += 1

        if len(rows) >= BATCH_SIZE:
            add_in_batches(session, CustomerOrderItem, rows, "Customer order items")
            rows.clear()

    if rows:
        add_in_batches(session, CustomerOrderItem, rows, "Customer order items")
    print(f"Customer order items processed: {imported:,}")

# ============================================================
# PURCHASE ORDERS
# ============================================================

def determine_primary_vendors(df):
    working = df.copy()
    working["_category"] = working["Category Name"].map(clean_category)
    working["_vendor"] = working["_category"].map(CATEGORY_VENDOR_MAP)
    working["_value"] = pd.to_numeric(
        working["Order Item Total"], errors="coerce"
    ).fillna(0)

    totals = (
        working.groupby(["Order Id", "_vendor"])["_value"]
        .sum()
        .reset_index()
        .sort_values(["Order Id", "_value"], ascending=[True, False])
    )
    return (
        totals.drop_duplicates("Order Id")
        .set_index("Order Id")["_vendor"]
        .to_dict()
    )


def create_purchase_orders(df, session, warehouse_map):
    primary_vendor = determine_primary_vendors(df)
    totals = df.groupby("Order Id")["Order Item Total"].sum().to_dict()

    orders = df[[
        "Order Id", "order date (DateOrders)", "Days for shipment (scheduled)",
        "Days for shipping (real)", "Department Name", "Category Name",
        "Order Region"
    ]].drop_duplicates("Order Id")

    existing = {
        x.po_number: x.id
        for x in session.query(PurchaseOrder)
        .filter(PurchaseOrder.po_number.like("DC-PO-%"))
        .all()
    }

    rows = []
    for _, row in orders.iterrows():
        source_order = safe_int(row["Order Id"])
        po_number = f"DC-PO-{source_order}"
        if po_number in existing:
            continue

        vendor_id = primary_vendor.get(source_order)
        if vendor_id not in VALID_VENDOR_IDS - {LOGISTICS_VENDOR}:
            raise ValueError(f"Invalid product vendor for order {source_order}: {vendor_id}")

        order_dt = clean_date(row["order date (DateOrders)"]) or datetime(2015, 1, 1)
        scheduled = max(0, safe_int(row["Days for shipment (scheduled)"]))
        real = max(0, safe_int(row["Days for shipping (real)"]))
        expected = (order_dt + timedelta(days=scheduled)).date()
        actual = (order_dt + timedelta(days=real)).date()
        region = normalize_whitespace(row["Order Region"])

        rows.append({
            "po_number": po_number,
            "vendor_id": vendor_id,
            "amount": round(safe_float(totals.get(source_order)), 2),
            "status": "Received",
            "order_date": order_dt.date(),
            "expected_delivery": expected,
            "actual_delivery": actual,
            "category": clean_category(row["Category Name"]),
            "pr_id": None,
            "pr_number": None,
            "created_at": order_dt,
            "approved_at": order_dt,
            "received_at": datetime.combine(actual, datetime.min.time()),
            "created_by": None,
            "department": clean_string(row["Department Name"], "Procurement")[:100],
        })

    add_in_batches(session, PurchaseOrder, rows, "Purchase orders")

    db_rows = session.query(PurchaseOrder).filter(
        PurchaseOrder.po_number.like("DC-PO-%")
    ).all()
    po_map = {}
    for po in db_rows:
        try:
            po_map[int(po.po_number.replace("DC-PO-", ""))] = po.id
        except Exception:
            pass

    print(f"Purchase orders available: {len(po_map):,}")
    return po_map

# ============================================================
# PURCHASE ORDER ITEMS
# ============================================================

def create_purchase_order_items(df, session, inventory_map, po_map):
    existing_keys = set()
    if po_map:
        existing_rows = session.query(
            PurchaseOrderItem.purchase_order_id,
            PurchaseOrderItem.item_code,
            PurchaseOrderItem.quantity,
            PurchaseOrderItem.unit_price,
            PurchaseOrderItem.amount,
        ).filter(PurchaseOrderItem.purchase_order_id.in_(list(po_map.values()))).all()
        for x in existing_rows:
            existing_keys.add((x.purchase_order_id, x.item_code, x.quantity, float(x.unit_price or 0), float(x.amount or 0)))

    rows = []
    processed = 0
    for _, row in df.iterrows():
        source_order = safe_int(row["Order Id"])
        source_product = safe_int(row["Product Card Id"])
        po_id = po_map.get(source_order)
        inventory_id = inventory_map.get(source_product)
        if po_id is None or inventory_id is None:
            continue

        quantity = max(1, safe_int(row["Order Item Quantity"]))
        unit_price = round(safe_float(row["Order Item Product Price"]), 2)
        amount = round(safe_float(row["Order Item Total"]), 2)
        item_code = f"DC-PROD-{source_product}"
        key = (po_id, item_code, quantity, unit_price, amount)
        if key in existing_keys:
            continue

        description = clean_string(
            row["Product Description"],
            clean_string(row["Product Name"], f"Product {source_product}")
        )
        rows.append({
            "purchase_order_id": po_id,
            "inventory_item_id": inventory_id,
            "item_code": item_code,
            "item_description": description[:500],
            "uom": "PCS",
            "quantity": quantity,
            "unit_price": unit_price,
            "tax_rate": 0,
            "tax_amount": 0,
            "amount": amount,
            "received_quantity": quantity,
        })
        existing_keys.add(key)
        processed += 1

        if len(rows) >= BATCH_SIZE:
            add_in_batches(session, PurchaseOrderItem, rows, "PO items")
            rows.clear()

    if rows:
        add_in_batches(session, PurchaseOrderItem, rows, "PO items")
    print(f"PO items processed: {processed:,}")

# ============================================================
# PURCHASE ORDER DETAILS
# ============================================================

def create_purchase_order_details(df, session, warehouse_map, po_map):
    orders = df[[
        "Order Id", "Order Region", "Order City", "Order Country"
    ]].drop_duplicates("Order Id")
    totals = df.groupby("Order Id")["Order Item Total"].sum().to_dict()

    existing = {
        x.purchase_order_id
        for x in session.query(PurchaseOrderDetails).filter(
            PurchaseOrderDetails.purchase_order_id.in_(list(po_map.values()))
        ).all()
    } if po_map else set()

    rows = []
    for _, row in orders.iterrows():
        source_order = safe_int(row["Order Id"])
        po_id = po_map.get(source_order)
        if po_id is None or po_id in existing:
            continue

        region = normalize_whitespace(row["Order Region"])
        amount = round(safe_float(totals.get(source_order)), 2)
        city = clean_string(row["Order City"], "")
        country = clean_string(row["Order Country"], "")

        rows.append({
            "purchase_order_id": po_id,
            "po_type": "DataCo Purchase Order",
            "supplier_reference": f"DATACO-{source_order}",
            "contact_person": None,
            "contact_phone": None,
            "contact_email": None,
            "payment_method": "Standard",
            "payment_terms": "Net 30",
            "incoterms": "DAP",
            "currency": "USD",
            "exchange_rate": 1,
            "delivery_warehouse_id": warehouse_map.get(region),
            "notes": f"Imported from DataCo. Destination: {city}, {country}"[:1000],
            "subtotal": amount,
            "tax_amount": 0,
            "shipping_amount": 0,
            "total_amount": amount,
        })
        existing.add(po_id)

    add_in_batches(session, PurchaseOrderDetails, rows, "PO details")
    print(f"PO details available: {len(existing):,}")

# ============================================================
# SHIPMENTS
# ============================================================

def create_shipments(df, session, carrier_map, order_map, po_map):
    orders = df[[
        "Order Id", "Delivery Status", "Shipping Mode",
        "shipping date (DateOrders)", "order date (DateOrders)",
        "Days for shipping (real)", "Days for shipment (scheduled)",
        "Order City", "Order Country", "Customer City", "Customer Country",
        "Latitude", "Longitude"
    ]].drop_duplicates("Order Id")

    existing = {
        x.shipment_number: x.id
        for x in session.query(Shipment)
        .filter(Shipment.shipment_number.like("DC-SHP-%"))
        .all()
    }

    rows = []
    for _, row in orders.iterrows():
        source_order = safe_int(row["Order Id"])
        number = f"DC-SHP-{source_order}"
        if number in existing:
            continue

        order_db_id = order_map.get(source_order)
        po_db_id = po_map.get(source_order)
        if order_db_id is None or po_db_id is None:
            continue

        order_dt = clean_date(row["order date (DateOrders)"]) or datetime(2015, 1, 1)
        shipped_dt = clean_date(row["shipping date (DateOrders)"])
        if shipped_dt is None:
            shipped_dt = order_dt + timedelta(days=max(0, safe_int(row["Days for shipping (real)"])))

        scheduled = max(0, safe_int(row["Days for shipment (scheduled)"]))
        real = max(0, safe_int(row["Days for shipping (real)"]))
        expected = (order_dt + timedelta(days=scheduled)).date()
        actual = (order_dt + timedelta(days=real)).date()

        mode = shipping_mode(row["Shipping Mode"])
        carrier_id = carrier_map.get(mode)
        origin = f"{clean_string(row['Customer City'], 'Unknown')}, {clean_string(row['Customer Country'], 'Unknown')}"
        destination = f"{clean_string(row['Order City'], 'Unknown')}, {clean_string(row['Order Country'], 'Unknown')}"
        lat = safe_float(row["Latitude"], None)
        lon = safe_float(row["Longitude"], None)

        rows.append({
            "shipment_number": number,
            "po_id": po_db_id,
            "status": map_shipment_status(row["Delivery Status"]),
            "carrier_name": mode,
            "tracking_number": f"DC-TRK-{source_order}",
            "shipped_date": shipped_dt.date(),
            "expected_delivery": expected,
            "actual_delivery": actual,
            "origin": origin[:500],
            "destination": destination[:500],
            "created_at": order_dt,
            "order_id": order_db_id,
            "current_location": destination[:500],
            "current_latitude": lat,
            "current_longitude": lon,
            "origin_latitude": None,
            "origin_longitude": None,
            "destination_latitude": lat,
            "destination_longitude": lon,
            "tracking_updated_at": shipped_dt,
            "transport_mode": mode,
            "distance_km": None,
            "transportation_cost": 0,
            "fuel_cost": 0,
            "toll_charges": 0,
            "handling_charges": 0,
            "other_charges": 0,
            "fuel_consumed_liters": None,
            "delivered_quantity": 0,
            "carrier_id": carrier_id,
        })

    add_in_batches(session, Shipment, rows, "Shipments")

    db_rows = session.query(Shipment).filter(
        Shipment.shipment_number.like("DC-SHP-%")
    ).all()
    shipment_map = {}
    for s in db_rows:
        try:
            shipment_map[int(s.shipment_number.replace("DC-SHP-", ""))] = s.id
        except Exception:
            pass

    print(f"Shipments available: {len(shipment_map):,}")
    return shipment_map

# ============================================================
# SHIPMENT ITEMS
# ============================================================

def create_shipment_items(df, session, inventory_map, shipment_map, po_map):
    # Build PO-item lookup using the stable combination available in the DB.
    po_item_map = {}
    if po_map:
        for item in session.query(PurchaseOrderItem).filter(
            PurchaseOrderItem.purchase_order_id.in_(list(po_map.values()))
        ).all():
            po_item_map.setdefault(
                (item.purchase_order_id, item.item_code, item.quantity, float(item.unit_price or 0), float(item.amount or 0)),
                item.id,
            )

    existing = set()
    if shipment_map:
        for x in session.query(ShipmentItem).filter(
            ShipmentItem.shipment_id.in_(list(shipment_map.values()))
        ).all():
            existing.add((x.shipment_id, x.item_code, x.quantity))

    rows = []
    processed = 0
    for _, row in df.iterrows():
        source_order = safe_int(row["Order Id"])
        source_product = safe_int(row["Product Card Id"])
        shipment_id = shipment_map.get(source_order)
        po_id = po_map.get(source_order)
        inventory_id = inventory_map.get(source_product)
        if shipment_id is None or po_id is None or inventory_id is None:
            continue

        quantity = max(1, safe_int(row["Order Item Quantity"]))
        unit_price = round(safe_float(row["Order Item Product Price"]), 2)
        amount = round(safe_float(row["Order Item Total"]), 2)
        item_code = f"DC-PROD-{source_product}"
        key = (shipment_id, item_code, quantity)
        if key in existing:
            continue

        po_item_id = po_item_map.get((po_id, item_code, quantity, unit_price, amount))
        rows.append({
            "shipment_id": shipment_id,
            "inventory_item_id": inventory_id,
            "purchase_order_item_id": po_item_id,
            "item_code": item_code,
            "item_description": clean_string(row["Product Name"], f"Product {source_product}")[:500],
            "quantity": quantity,
            "uom": "PCS",
            "total_weight": 0,
            "weight_unit": "KG",
            "total_volume": 0,
            "volume_unit": "M3",
            "created_at": datetime.utcnow(),
        })
        existing.add(key)
        processed += 1

        if len(rows) >= BATCH_SIZE:
            add_in_batches(session, ShipmentItem, rows, "Shipment items")
            rows.clear()

    if rows:
        add_in_batches(session, ShipmentItem, rows, "Shipment items")
    print(f"Shipment items processed: {processed:,}")

# ============================================================
# SHIPMENT DETAILS
# ============================================================

def create_shipment_details(df, session, shipment_map):
    orders = df[[
        "Order Id", "Order City", "Order Country",
        "Customer City", "Customer Country"
    ]].drop_duplicates("Order Id")

    existing = {
        x.shipment_id
        for x in session.query(ShipmentDetails).filter(
            ShipmentDetails.shipment_id.in_(list(shipment_map.values()))
        ).all()
    } if shipment_map else set()

    rows = []
    for _, row in orders.iterrows():
        source_order = safe_int(row["Order Id"])
        shipment_id = shipment_map.get(source_order)
        if shipment_id is None or shipment_id in existing:
            continue

        origin = f"{clean_string(row['Customer City'], '')}, {clean_string(row['Customer Country'], '')}"
        destination = f"{clean_string(row['Order City'], '')}, {clean_string(row['Order Country'], '')}"
        rows.append({
            "shipment_id": shipment_id,
            "requested_delivery": None,
            "promised_delivery": None,
            "earliest_pickup": None,
            "latest_delivery": None,
            "pickup_time_window": None,
            "delivery_time_window": None,
            "timezone": None,
            "origin_contact_person": None,
            "origin_phone": None,
            "origin_address": origin[:1000],
            "destination_contact_person": None,
            "destination_phone": None,
            "destination_address": destination[:1000],
            "special_instructions": None,
            "internal_notes": "Imported from DataCo Supply Chain Dataset",
        })
        existing.add(shipment_id)

    add_in_batches(session, ShipmentDetails, rows, "Shipment details")

# ============================================================
# INVENTORY MOVEMENTS
# ============================================================

def create_inventory_movements(df, session, inventory_map, warehouse_map):
    existing = {
        (x.item_id, x.reference_number)
        for x in session.query(InventoryMovement).filter(
            InventoryMovement.reference_number.like("DC-ORD-%")
        ).all()
    }

    rows = []
    for _, row in df.iterrows():
        product_id = safe_int(row["Product Card Id"])
        order_id = safe_int(row["Order Id"])
        item_id = inventory_map.get(product_id)
        if item_id is None:
            continue

        reference = f"DC-ORD-{order_id}"
        key = (item_id, reference)
        # One movement per order/product combination.
        if key in existing:
            continue

        region = normalize_whitespace(row["Order Region"])
        movement_date = clean_date(row["shipping date (DateOrders)"]) or clean_date(row["order date (DateOrders)"]) or datetime.utcnow()
        quantity = max(1, safe_int(row["Order Item Quantity"]))

        rows.append({
            "item_id": item_id,
            "warehouse_id": warehouse_map.get(region),
            "movement_type": "Issue",
            "quantity": quantity,
            "movement_date": movement_date,
            "reference_number": reference,
            "notes": "DataCo customer order shipment",
            "created_at": datetime.utcnow(),
        })
        existing.add(key)

        if len(rows) >= BATCH_SIZE:
            add_in_batches(session, InventoryMovement, rows, "Inventory movements")
            rows.clear()

    if rows:
        add_in_batches(session, InventoryMovement, rows, "Inventory movements")

# ============================================================
# INVENTORY SNAPSHOTS
# ============================================================

def create_inventory_snapshots(df, session, warehouse_map):
    working = df.copy()
    working["_region"] = working["Order Region"].map(normalize_whitespace)
    working["_category"] = working["Category Name"].map(clean_category)
    working["_quantity"] = pd.to_numeric(working["Order Item Quantity"], errors="coerce").fillna(0)
    working["_price"] = pd.to_numeric(working["Product Price"], errors="coerce").fillna(0)
    working["_value"] = working["_quantity"] * working["_price"]

    grouped = (
        working.groupby(["_region", "_category"], dropna=False)
        .agg(
            total_quantity=("_quantity", "sum"),
            total_items=("Product Card Id", "nunique"),
            inventory_value=("_value", "sum"),
        )
        .reset_index()
    )

    snapshot_date = clean_date(df["shipping date (DateOrders)"].max())
    snapshot_date = snapshot_date.date() if snapshot_date else datetime.utcnow().date()

    rows = []
    for _, row in grouped.iterrows():
        warehouse_id = warehouse_map.get(row["_region"])
        if warehouse_id is None:
            continue
        rows.append({
            "snapshot_date": snapshot_date,
            "warehouse_id": warehouse_id,
            "category": clean_category(row["_category"]),
            "total_items": safe_int(row["total_items"]),
            "total_quantity": safe_int(row["total_quantity"]),
            "inventory_value": round(safe_float(row["inventory_value"]), 2),
            "created_at": datetime.utcnow(),
        })

    # The reset step already removed DataCo snapshots for these warehouses.
    add_in_batches(session, InventorySnapshot, rows, "Inventory snapshots")
    print(f"Inventory snapshots created: {len(rows):,}")

# ============================================================
# VENDOR PERFORMANCE
# ============================================================

def create_vendor_performance_history(df, session):
    working = df.copy()
    working["category"] = working["Category Name"].map(clean_category)
    working["vendor_id"] = working["category"].map(CATEGORY_VENDOR_MAP)
    working["order_date"] = pd.to_datetime(working["order date (DateOrders)"], errors="coerce")
    working = working[working["order_date"].notna()].copy()
    working["month"] = working["order_date"].dt.strftime("%B")
    working["year"] = working["order_date"].dt.year
    working["real_days"] = pd.to_numeric(working["Days for shipping (real)"], errors="coerce").fillna(0)
    working["scheduled_days"] = pd.to_numeric(working["Days for shipment (scheduled)"], errors="coerce").fillna(0)
    working["delayed"] = working["real_days"] > working["scheduled_days"]
    working["on_time"] = ~working["delayed"]
    working["profit_ratio"] = pd.to_numeric(working["Order Item Profit Ratio"], errors="coerce").fillna(0)

    grouped = working.groupby(["vendor_id", "month", "year"], dropna=False)
    month_order = {m: i for i, m in enumerate([
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ], start=1)}

    records = []
    for (vendor_id, month, year), group in grouped:
        if vendor_id not in VALID_VENDOR_IDS - {LOGISTICS_VENDOR}:
            continue
        total = len(group)
        on_time = int(group["on_time"].sum())
        delayed = int(group["delayed"].sum())
        completion = (on_time / total * 100) if total else 0
        avg_profit = float(group["profit_ratio"].mean()) if total else 0
        quality = max(1.0, min(5.0, 3.0 + avg_profit * 2.0))
        overall = (
            completion * 0.60
            + (quality * 20.0) * 0.20
            + completion * 0.20
        )

        records.append({
            "vendor_id": str(vendor_id),
            "month": str(month),
            "year": int(year),
            "on_time_deliveries": on_time,
            "delayed_deliveries": delayed,
            "quality_rating": round(quality, 2),
            "response_time": 0,
            "issue_resolution_time": 0,
            "order_completion_rate": round(max(0, min(100, completion)), 2),
            "overall_score": round(max(0, min(100, overall)), 2),
            "compliance_score": round(max(0, min(100, completion)), 2),
        })

    # Upsert by the table's natural unique key vendor/month/year.
    for record in sorted(records, key=lambda r: (r["vendor_id"], r["year"], month_order.get(r["month"], 99))):
        existing = session.query(VendorPerformanceHistory).filter(
            VendorPerformanceHistory.vendor_id == record["vendor_id"],
            VendorPerformanceHistory.month == record["month"],
            VendorPerformanceHistory.year == record["year"],
        ).first()
        if existing:
            for key, value in record.items():
                if key not in {"vendor_id", "month", "year"}:
                    setattr(existing, key, value)
        else:
            session.add(VendorPerformanceHistory(**record))
    session.commit()
    print(f"Vendor performance records processed: {len(records):,}")

# ============================================================
# UPDATE VENDOR SCORES
# ============================================================

def update_vendor_scores(session):
    for vendor_id in sorted(VALID_VENDOR_IDS - {LOGISTICS_VENDOR}):
        records = session.query(VendorPerformanceHistory).filter(
            VendorPerformanceHistory.vendor_id == vendor_id
        ).all()
        if not records:
            continue

        reliability = sum(float(r.overall_score or 0) for r in records) / len(records)
        quality = sum(float(r.quality_rating or 0) for r in records) / len(records)
        delivery_values = []
        for r in records:
            total = int(r.on_time_deliveries or 0) + int(r.delayed_deliveries or 0)
            delivery_values.append((int(r.on_time_deliveries or 0) / total * 100) if total else 0)
        delivery = sum(delivery_values) / len(delivery_values)

        vendor = session.query(Vendor).filter(Vendor.vendor_id == vendor_id).first()
        if vendor:
            vendor.reliability_score = round(reliability, 2)
            vendor.quality_score = round(quality * 20, 2)
            vendor.delivery_score = round(delivery, 2)
            vendor.service_score = round(reliability, 2)

    session.commit()
    print("Vendor summary scores updated.")

# ============================================================
# SEQUENCE RESET
# ============================================================

def reset_sequences(session):
    tables = [
        "customers", "customer_orders", "customer_order_items",
        "inventory_items", "inventory_movements", "inventory_snapshots",
        "warehouses", "carriers", "purchase_orders", "purchase_order_items",
        "purchase_order_details", "shipments", "shipment_items",
        "shipment_details", "vendor_performance_history",
    ]
    print("\nResetting PostgreSQL sequences...")
    for table in tables:
        try:
            session.execute(text(f"""
                SELECT setval(
                    pg_get_serial_sequence('{table}', 'id'),
                    COALESCE((SELECT MAX(id) FROM {table}), 1),
                    (SELECT COUNT(*) FROM {table}) > 0
                )
            """))
        except Exception as exc:
            print(f"  Sequence warning for {table}: {exc}")
    session.commit()
    print("Sequences reset.")

# ============================================================
# VERIFICATION
# ============================================================

def verify_import(session, df):
    print("\n" + "=" * 70)
    print("IMPORT VERIFICATION")
    print("=" * 70)

    models = [
        Customer, CustomerOrder, CustomerOrderItem,
        InventoryItem, InventoryMovement, InventorySnapshot,
        Warehouse, Carrier,
        PurchaseOrder, PurchaseOrderItem, PurchaseOrderDetails,
        Shipment, ShipmentItem, ShipmentDetails,
        VendorPerformanceHistory,
    ]
    total = 0
    for model in models:
        count = session.query(model).count()
        total += count
        print(f"{model.__tablename__:<35}{count:>12,}")

    expected = {
        "customers": df["Customer Id"].nunique(),
        "customer_orders": df["Order Id"].nunique(),
        "customer_order_items": len(df),
        "inventory_items": df["Product Card Id"].nunique(),
        "shipments": df["Order Id"].nunique(),
    }
    print("\nDataCo expected counts:")
    for table, count in expected.items():
        print(f"  {table:<30} {count:>12,}")

    print("-" * 55)
    print(f"{'TOTAL DATABASE RECORDS':<35}{total:>12,}")

# ============================================================
# MAIN
# ============================================================

def main():
    start = datetime.now()
    print("\n" + "=" * 70)
    print("VENDORIQ DATACO IMPORT - SAFE VERSION")
    print("=" * 70)
    print(f"Started: {start}")
    print(f"CSV: {os.path.abspath(CSV_FILE)}")
    print(f"RESET_DATACO_IMPORT = {RESET_DATACO_IMPORT}")

    df = load_dataset()
    validate_dataset(df)

    session = SessionLocal()
    try:
        validate_existing_vendors(session)

        if RESET_DATACO_IMPORT:
            reset_dataco_import(session)

        warehouse_map = create_warehouses(df, session)
        carrier_map = create_carriers(df, session)
        customer_map = create_customers(df, session)
        inventory_map = create_inventory_items(df, session, warehouse_map)
        order_map = create_customer_orders(df, session, customer_map)

        create_customer_order_items(
            df, session, inventory_map, order_map
        )

        po_map = create_purchase_orders(df, session, warehouse_map)
        create_purchase_order_items(df, session, inventory_map, po_map)
        create_purchase_order_details(df, session, warehouse_map, po_map)

        shipment_map = create_shipments(
            df, session, carrier_map, order_map, po_map
        )
        create_shipment_items(
            df, session, inventory_map, shipment_map, po_map
        )
        create_shipment_details(df, session, shipment_map)

        create_inventory_movements(
            df, session, inventory_map, warehouse_map
        )
        create_inventory_snapshots(
            df, session, warehouse_map
        )

        create_vendor_performance_history(df, session)
        update_vendor_scores(session)
        reset_sequences(session)
        verify_import(session, df)

        elapsed = datetime.now() - start
        print("\n" + "=" * 70)
        print("DATACO IMPORT COMPLETED SUCCESSFULLY")
        print("=" * 70)
        print(f"Rows processed: {len(df):,}")
        print(f"Duration: {elapsed}")
        print("\nVendor mapping used:")
        for category_vendor, vendor_id in sorted(CATEGORY_VENDOR_MAP.items()):
            print(f"  {category_vendor:<30} -> {vendor_id}")
        print(f"\nLogistics partner: {LOGISTICS_VENDOR}")

    except Exception as exc:
        session.rollback()
        print("\n" + "=" * 70)
        print("DATACO IMPORT FAILED")
        print("=" * 70)
        print(f"{type(exc).__name__}: {exc}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()