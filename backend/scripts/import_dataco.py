"""Import a sample of DataCo Smart Supply Chain CSV rows into core tables."""

from __future__ import annotations

import argparse
import csv
import random
import re
import sys
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.db.session import SessionLocal
from app.models.supply_chain import Delivery, Product
from app.models.user import Role, User
from app.models.vendor import Vendor, VendorCategory, VendorStatus
from app.models.vendoriq import PurchaseOrder, PurchaseOrderStatus

DEFAULT_CSV = BACKEND_ROOT / "data" / "dataco_supply_chain.csv"
DEFAULT_LIMIT = 750
CSV_ENCODINGS = ("utf-8-sig", "cp1252", "latin-1")

DEPARTMENT_TO_CATEGORY = {
    "clothing": "Raw Material Suppliers",
    "sports": "Equipment",
    "electronic": "IT",
    "electronics": "IT",
    "home": "Services",
    "grocery": "Raw Material Suppliers",
    "furniture": "Equipment",
}

ORDER_STATUS_MAP = {
    "complete": PurchaseOrderStatus.COMPLETED,
    "completed": PurchaseOrderStatus.COMPLETED,
    "delivered": PurchaseOrderStatus.DELIVERED,
    "shipped": PurchaseOrderStatus.SHIPPED,
    "processing": PurchaseOrderStatus.IN_PROGRESS,
    "pending": PurchaseOrderStatus.PENDING,
    "cancelled": PurchaseOrderStatus.CANCELLED,
    "canceled": PurchaseOrderStatus.CANCELLED,
}


def normalize_key(key: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", key.strip().lower()).strip("_")


def normalize_row(row: dict[str, str]) -> dict[str, str]:
    return {normalize_key(key): (value or "").strip() for key, value in row.items()}


def parse_int(value: str | None) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def parse_decimal(value: str | None, default: Decimal = Decimal("0.00")) -> Decimal:
    if value is None or value == "":
        return default
    try:
        return Decimal(str(value).replace(",", ""))
    except (InvalidOperation, ValueError):
        return default


def parse_bool_risk(value: str | None) -> bool:
    if value is None or value == "":
        return False
    normalized = value.strip().lower()
    return normalized in {"1", "true", "yes", "y"}


def parse_order_date(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    for fmt in (
        "%m/%d/%Y %H:%M",
        "%m/%d/%Y",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ):
        try:
            parsed = datetime.strptime(value.strip(), fmt)
            return parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return datetime.now(timezone.utc)


def map_order_status(value: str | None) -> PurchaseOrderStatus:
    if not value:
        return PurchaseOrderStatus.ORDERED
    mapped = ORDER_STATUS_MAP.get(value.strip().lower())
    return mapped or PurchaseOrderStatus.ORDERED


def slug_email(name: str, suffix: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "vendor"
    return f"{slug}-{suffix}@dataco-import.local"


def read_csv_rows(csv_path: Path) -> tuple[list[dict[str, str]], str]:
    """Read all CSV rows, trying common encodings used by the DataCo export."""
    last_error: UnicodeDecodeError | None = None

    for encoding in CSV_ENCODINGS:
        try:
            with csv_path.open(newline="", encoding=encoding) as handle:
                reader = csv.DictReader(handle)
                rows = [normalize_row(row) for row in reader if any(row.values())]
            return rows, encoding
        except UnicodeDecodeError as exc:
            last_error = exc

    if last_error is not None:
        raise UnicodeDecodeError(
            last_error.encoding,
            last_error.object,
            last_error.start,
            last_error.end,
            f"Could not decode {csv_path} with {', '.join(CSV_ENCODINGS)}",
        ) from last_error

    return [], CSV_ENCODINGS[0]


def load_rows(csv_path: Path, limit: int, seed: int) -> list[dict[str, str]]:
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV file not found: {csv_path}")

    rows, encoding = read_csv_rows(csv_path)
    print(f"Loaded {len(rows)} rows from CSV using {encoding} encoding")

    if not rows:
        return []

    if len(rows) <= limit:
        return rows

    rng = random.Random(seed)
    return rng.sample(rows, limit)


def resolve_category_id(db, department_name: str, cache: dict[str, int]) -> int:
    key = department_name.strip().lower() or "default"
    if key in cache:
        return cache[key]

    mapped_name = DEPARTMENT_TO_CATEGORY.get(key)
    if mapped_name:
        category = db.scalar(select(VendorCategory).where(VendorCategory.name == mapped_name))
        if category:
            cache[key] = category.id
            return category.id

    fallback = db.scalar(select(VendorCategory).order_by(VendorCategory.id))
    if fallback is None:
        raise RuntimeError("No vendor categories found. Start the app once to seed categories.")
    cache[key] = fallback.id
    return fallback.id


def get_or_create_vendor(
    db,
    market_name: str,
    department_name: str,
    vendor_cache: dict[str, Vendor],
    category_cache: dict[str, int],
    counters: dict[str, int],
) -> Vendor | None:
    name = market_name.strip() or department_name.strip()
    if not name:
        return None

    cache_key = name.lower()
    if cache_key in vendor_cache:
        return vendor_cache[cache_key]

    existing = db.scalar(select(Vendor).where(func.lower(Vendor.name) == cache_key))
    if existing:
        vendor_cache[cache_key] = existing
        return existing

    category_id = resolve_category_id(db, department_name, category_cache)
    suffix = re.sub(r"[^a-z0-9]+", "", cache_key)[:12] or "vendor"
    vendor = Vendor(
        name=name,
        category_id=category_id,
        contact_email=slug_email(name, suffix),
        contact_phone="000-000-0000",
        address=f"Imported from DataCo market: {name}",
        status=VendorStatus.APPROVED,
    )
    db.add(vendor)
    try:
        db.flush()
        vendor_cache[cache_key] = vendor
        counters["vendors"] += 1
        return vendor
    except IntegrityError:
        db.rollback()
        existing = db.scalar(select(Vendor).where(func.lower(Vendor.name) == cache_key))
        if existing:
            vendor_cache[cache_key] = existing
            return existing
        return None


def get_or_create_product(
    db,
    row: dict[str, str],
    vendor: Vendor,
    product_cache: dict[tuple[str, int], Product],
    counters: dict[str, int],
) -> Product | None:
    name = row.get("product_name", "").strip()
    if not name:
        return None

    category = row.get("category_name", "").strip() or row.get("department_name", "").strip() or "General"
    cache_key = (name.lower(), vendor.id)
    if cache_key in product_cache:
        return product_cache[cache_key]

    existing = db.scalar(
        select(Product).where(
            func.lower(Product.name) == name.lower(),
            Product.vendor_id == vendor.id,
        )
    )
    if existing:
        product_cache[cache_key] = existing
        return existing

    price = parse_decimal(row.get("product_price") or row.get("order_item_product_price"))
    product = Product(
        name=name,
        category=category,
        price=price,
        vendor_id=vendor.id,
    )
    db.add(product)
    try:
        db.flush()
        product_cache[cache_key] = product
        counters["products"] += 1
        return product
    except IntegrityError:
        db.rollback()
        return db.scalar(
            select(Product).where(
                func.lower(Product.name) == name.lower(),
                Product.vendor_id == vendor.id,
            )
        )


def get_or_create_purchase_order(
    db,
    row: dict[str, str],
    vendor: Vendor,
    admin_id: int,
    po_cache: dict[str, PurchaseOrder],
    counters: dict[str, int],
) -> PurchaseOrder | None:
    order_id = row.get("order_id", "").strip()
    if not order_id:
        return None

    po_number = f"PO-DATACO-{order_id}"
    if po_number in po_cache:
        return po_cache[po_number]

    existing = db.scalar(select(PurchaseOrder).where(PurchaseOrder.po_number == po_number))
    if existing:
        po_cache[po_number] = existing
        return existing

    order_date = parse_order_date(row.get("order_date_dateorders"))
    shipping_date = parse_order_date(row.get("shipping_date_dateorders"))
    expected_delivery = shipping_date if shipping_date else None
    total_amount = parse_decimal(row.get("sales") or row.get("order_item_total"))

    purchase_order = PurchaseOrder(
        po_number=po_number,
        vendor_id=vendor.id,
        order_date=order_date,
        expected_delivery_date=expected_delivery,
        total_amount=total_amount,
        currency="USD",
        status=map_order_status(row.get("order_status")),
        notes=f"Imported from DataCo order {order_id}",
        created_by=admin_id,
    )
    db.add(purchase_order)
    try:
        db.flush()
        po_cache[po_number] = purchase_order
        counters["purchase_orders"] += 1
        return purchase_order
    except IntegrityError:
        db.rollback()
        existing = db.scalar(select(PurchaseOrder).where(PurchaseOrder.po_number == po_number))
        if existing:
            po_cache[po_number] = existing
        return existing


def create_delivery_if_missing(
    db,
    purchase_order: PurchaseOrder,
    row: dict[str, str],
    delivery_cache: set[int],
    counters: dict[str, int],
) -> None:
    if purchase_order.id in delivery_cache:
        return

    existing = db.scalar(
        select(Delivery).where(Delivery.purchase_order_id == purchase_order.id)
    )
    if existing:
        delivery_cache.add(purchase_order.id)
        return

    delivery_status = row.get("delivery_status", "").strip() or "Unknown"
    delivery = Delivery(
        purchase_order_id=purchase_order.id,
        scheduled_shipping_days=parse_int(row.get("days_for_shipment_scheduled")),
        actual_shipping_days=parse_int(row.get("days_for_shipping_real")),
        shipping_mode=row.get("shipping_mode") or None,
        late_delivery_risk=parse_bool_risk(row.get("late_delivery_risk")),
        delivery_status=delivery_status,
    )
    db.add(delivery)
    try:
        db.flush()
        delivery_cache.add(purchase_order.id)
        counters["deliveries"] += 1
    except IntegrityError:
        db.rollback()


def import_dataco(
    csv_path: Path,
    limit: int,
    seed: int,
) -> dict[str, int]:
    rows = load_rows(csv_path, limit, seed)
    counters = {
        "rows_processed": 0,
        "rows_skipped": 0,
        "vendors": 0,
        "products": 0,
        "purchase_orders": 0,
        "deliveries": 0,
    }

    db = SessionLocal()
    try:
        admin = db.scalar(
            select(User).where(User.role == Role.ADMINISTRATOR).order_by(User.id)
        )
        if admin is None:
            raise RuntimeError("No administrator user found. Run the app once to seed admin account.")

        vendor_cache: dict[str, Vendor] = {}
        product_cache: dict[tuple[str, int], Product] = {}
        po_cache: dict[str, PurchaseOrder] = {}
        delivery_cache: set[int] = set()
        category_cache: dict[str, int] = {}

        for row in rows:
            counters["rows_processed"] += 1
            market_name = row.get("market") or row.get("order_region") or row.get("order_country") or ""
            department_name = row.get("department_name") or row.get("category_name") or ""

            vendor = get_or_create_vendor(
                db,
                market_name,
                department_name,
                vendor_cache,
                category_cache,
                counters,
            )
            if vendor is None:
                counters["rows_skipped"] += 1
                continue

            get_or_create_product(db, row, vendor, product_cache, counters)
            purchase_order = get_or_create_purchase_order(
                db,
                row,
                vendor,
                admin.id,
                po_cache,
                counters,
            )
            if purchase_order is None:
                counters["rows_skipped"] += 1
                continue

            create_delivery_if_missing(db, purchase_order, row, delivery_cache, counters)

        db.commit()
        return counters
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_table_totals() -> dict[str, int]:
    db = SessionLocal()
    try:
        return {
            "vendors": db.scalar(select(func.count()).select_from(Vendor)) or 0,
            "products": db.scalar(select(func.count()).select_from(Product)) or 0,
            "purchase_orders": db.scalar(select(func.count()).select_from(PurchaseOrder)) or 0,
            "deliveries": db.scalar(select(func.count()).select_from(Delivery)) or 0,
        }
    finally:
        db.close()


def print_summary(counters: dict[str, int]) -> None:
    totals = get_table_totals()
    inserted_total = (
        counters["vendors"]
        + counters["products"]
        + counters["purchase_orders"]
        + counters["deliveries"]
    )

    print("DataCo import summary")
    print("---------------------")
    print(f"Rows processed:      {counters['rows_processed']}")
    print(f"Rows skipped:        {counters['rows_skipped']}")
    print(f"Vendors inserted:    {counters['vendors']}")
    print(f"Products inserted:   {counters['products']}")
    print(f"POs inserted:        {counters['purchase_orders']}")
    print(f"Deliveries inserted: {counters['deliveries']}")
    print()
    print("Current table totals")
    print("--------------------")
    print(f"Vendors total:       {totals['vendors']}")
    print(f"Products total:      {totals['products']}")
    print(f"POs total:           {totals['purchase_orders']}")
    print(f"Deliveries total:    {totals['deliveries']}")

    if inserted_total == 0 and counters["rows_processed"] > 0:
        print()
        print("No new rows inserted — matching records already exist in the database.")
        print("This is expected when re-running with the same --seed and --limit.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Import DataCo supply chain CSV sample")
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV, help="Path to CSV file")
    parser.add_argument(
        "--limit",
        type=int,
        default=DEFAULT_LIMIT,
        help="Number of rows to sample (500-1000 recommended)",
    )
    parser.add_argument("--seed", type=int, default=42, help="Random seed for sampling")
    args = parser.parse_args()

    if args.limit < 1:
        print("Error: --limit must be at least 1", file=sys.stderr)
        return 1

    try:
        counters = import_dataco(args.csv, args.limit, args.seed)
    except FileNotFoundError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    except RuntimeError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    print_summary(counters)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
