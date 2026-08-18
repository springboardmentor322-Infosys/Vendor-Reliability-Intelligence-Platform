import csv
from collections import defaultdict
from datetime import datetime, timedelta

import psycopg2

DB_CONFIG = {
    "host": "localhost",
    "database": "vendor_platform",
    "user": "postgres",
    "password": "Amruta@9279",
    "port": "5432",
}

CSV_PATH = r".\data\DataCoSupplyChainDataset.csv"


def parse_date(value):
    if not value:
        return None

    formats = [
        "%m/%d/%Y %H:%M",
        "%m/%d/%Y %H:%M:%S",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(value.strip(), fmt)
        except ValueError:
            continue

    return None


def normalize_status(status):
    status = (status or "").strip().upper()

    mapping = {
        "COMPLETE": "Completed",
        "CLOSED": "Completed",
        "PENDING": "Pending",
        "PENDING_PAYMENT": "Pending",
        "PROCESSING": "Processing",
        "ON_HOLD": "On Hold",
        "PAYMENT_REVIEW": "Payment Review",
        "CANCELED": "Canceled",
        "SUSPECTED_FRAUD": "Fraud",
    }

    return mapping.get(status, status.title() if status else "Unknown")


def safe_float(value):
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0.0


def safe_int(value):
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return 0


def main():
    print("Connecting to PostgreSQL...")

    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    print("Database connected successfully.")

    print("Loading product IDs...")

    cursor.execute("""
        SELECT
            id,
            product_card_id
        FROM products
    """)

    product_map = {
        int(product_card_id): int(product_id)
        for product_id, product_card_id in cursor.fetchall()
    }

    print(f"Products loaded: {len(product_map)}")

    print("Loading primary vendor mappings...")

    cursor.execute("""
        SELECT
            product_id,
            vendor_id
        FROM vendor_products
        WHERE is_primary_vendor = TRUE
    """)

    primary_vendor_map = {
        int(product_id): int(vendor_id)
        for product_id, vendor_id in cursor.fetchall()
    }

    print(
        f"Primary vendor mappings loaded: "
        f"{len(primary_vendor_map)}"
    )

    print("Reading DataCo CSV...")

    grouped = {}

    with open(
        CSV_PATH,
        "r",
        encoding="latin1",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        for row in reader:
            order_id = safe_int(row.get("Order Id"))
            product_card_id = safe_int(
                row.get("Product Card Id")
            )

            if not order_id or not product_card_id:
                continue

            key = (
                order_id,
                product_card_id
            )

            quantity = safe_int(
                row.get("Order Item Quantity")
            )

            item_total = safe_float(
                row.get("Order Item Total")
            )

            product_price = safe_float(
                row.get("Order Item Product Price")
            )

            order_date = parse_date(
                row.get("order date (DateOrders)")
            )

            scheduled_days = safe_int(
                row.get("Days for shipment (scheduled)")
            )

            status = normalize_status(
                row.get("Order Status")
            )

            if key not in grouped:

                grouped[key] = {
                    "order_id": order_id,
                    "product_card_id": product_card_id,
                    "product_name": (
                        row.get("Product Name") or ""
                    ).strip(),
                    "quantity": quantity,
                    "unit_price": product_price,
                    "total_amount": item_total,
                    "order_date": (
                        order_date.date()
                        if order_date
                        else None
                    ),
                    "expected_delivery": (
                        (
                            order_date
                            + timedelta(days=scheduled_days)
                        ).date()
                        if order_date
                        else None
                    ),
                    "status": status,
                }

            else:
                grouped[key]["quantity"] += quantity
                grouped[key]["total_amount"] += item_total

    print(
        f"Unique Order + Product combinations: "
        f"{len(grouped)}"
    )

    inserted = 0
    skipped = 0
    missing_product = 0
    missing_vendor = 0

    insert_sql = """
        INSERT INTO purchase_orders (
            vendor_id,
            product_name,
            quantity,
            unit_price,
            total_amount,
            order_date,
            expected_delivery,
            status,
            product_id,
            dataco_order_id
        )
        VALUES (
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s
        )
    """

    for item in grouped.values():

        product_card_id = item["product_card_id"]

        product_id = product_map.get(
            product_card_id
        )

        if product_id is None:
            missing_product += 1
            continue

        vendor_id = primary_vendor_map.get(
            product_id
        )

        if vendor_id is None:
            missing_vendor += 1
            continue

        cursor.execute(
            """
            SELECT 1
            FROM purchase_orders
            WHERE dataco_order_id = %s
              AND product_id = %s
            LIMIT 1
            """,
            (
                item["order_id"],
                product_id,
            ),
        )

        if cursor.fetchone():
            skipped += 1
            continue

        cursor.execute(
            insert_sql,
            (
                vendor_id,
                item["product_name"],
                item["quantity"],
                item["unit_price"],
                item["total_amount"],
                item["order_date"],
                item["expected_delivery"],
                item["status"],
                product_id,
                item["order_id"],
            ),
        )

        inserted += 1

        if inserted % 5000 == 0:
            conn.commit()
            print(
                f"Inserted {inserted} purchase-order records..."
            )

    conn.commit()

    print("\n========== IMPORT SUMMARY ==========")
    print(
        f"Existing backup records: 10"
    )
    print(
        f"DataCo order-product combinations: {len(grouped)}"
    )
    print(
        f"Inserted new records: {inserted}"
    )
    print(
        f"Skipped duplicates: {skipped}"
    )
    print(
        f"Missing products: {missing_product}"
    )
    print(
        f"Missing vendors: {missing_vendor}"
    )

    cursor.execute(
        "SELECT COUNT(*) FROM purchase_orders"
    )

    total_purchase_orders = cursor.fetchone()[0]

    print(
        f"Total purchase_orders now: "
        f"{total_purchase_orders}"
    )

    cursor.execute(
        """
        SELECT COUNT(*)
        FROM purchase_orders
        WHERE dataco_order_id IS NOT NULL
        """
    )

    dataco_purchase_orders = cursor.fetchone()[0]

    print(
        f"DataCo purchase-order records: "
        f"{dataco_purchase_orders}"
    )

    cursor.close()
    conn.close()

    print("\nDatabase connection closed.")


if __name__ == "__main__":
    main()