import csv
import psycopg2
from datetime import datetime


# --------------------------------------------------
# 1. CSV FILE LOCATION
# --------------------------------------------------

CSV_FILE = r"C:\Users\Dell\OneDrive\Desktop\DataCoSupplyChainDataset.csv"


# --------------------------------------------------
# 2. DATABASE CONNECTION
# --------------------------------------------------

conn = psycopg2.connect(
    host="localhost",
    database="vendor_platform",
    user="postgres",
    password="Amruta@9279",
    port="5432"
)

cursor = conn.cursor()

print("Database Connected Successfully")


# --------------------------------------------------
# 3. INSERT QUERY
# --------------------------------------------------

insert_sql = """
INSERT INTO dataco_raw_orders (
    order_id,
    order_item_id,
    order_item_cardprod_id,
    product_card_id,
    product_name,
    category_id,
    category_name,
    order_item_quantity,
    order_item_product_price,
    order_item_total,
    sales,
    order_item_profit_ratio,
    benefit_per_order,
    sales_per_customer,
    order_date,
    shipping_date,
    order_status,
    delivery_status,
    late_delivery_risk,
    days_for_shipping_real,
    days_for_shipment_scheduled,
    shipping_mode,
    order_country,
    order_region,
    order_state
)
VALUES (
    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
    %s, %s, %s, %s, %s
)
"""


# --------------------------------------------------
# 4. CLEAN FUNCTION
# --------------------------------------------------

def clean(value):
    if value is None:
        return None

    value = value.strip()

    if value == "":
        return None

    return value


# --------------------------------------------------
# 5. INTEGER CONVERSION
# --------------------------------------------------

def to_int(value):
    value = clean(value)

    if value is None:
        return None

    return int(value)


# --------------------------------------------------
# 6. FLOAT / NUMERIC CONVERSION
# --------------------------------------------------

def to_float(value):
    value = clean(value)

    if value is None:
        return None

    return float(value)


# --------------------------------------------------
# 7. DATE/TIME CONVERSION
# --------------------------------------------------

def to_datetime(value):
    value = clean(value)

    if value is None:
        return None

    return datetime.strptime(value, "%m/%d/%Y %H:%M")


# --------------------------------------------------
# 8. READ CSV AND IMPORT DATA
# --------------------------------------------------

try:

    with open(
        CSV_FILE,
        "r",
        encoding="latin1",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        count = 0

        for row in reader:

            values = (

                # Order information
                to_int(row["Order Id"]),
                to_int(row["Order Item Id"]),
                to_int(row["Order Item Cardprod Id"]),
                to_int(row["Product Card Id"]),

                # Product information
                clean(row["Product Name"]),
                to_int(row["Category Id"]),
                clean(row["Category Name"]),

                # Sales information
                to_float(row["Order Item Quantity"]),
                to_float(row["Order Item Product Price"]),
                to_float(row["Order Item Total"]),
                to_float(row["Sales"]),

                # Profit information
                to_float(row["Order Item Profit Ratio"]),
                to_float(row["Benefit per order"]),
                to_float(row["Sales per customer"]),

                # Date information
                to_datetime(row["order date (DateOrders)"]),
                to_datetime(row["shipping date (DateOrders)"]),

                # Order status
                clean(row["Order Status"]),
                clean(row["Delivery Status"]),
                to_int(row["Late_delivery_risk"]),

                # Shipping information
                to_float(row["Days for shipping (real)"]),
                to_float(row["Days for shipment (scheduled)"]),

                clean(row["Shipping Mode"]),

                # Location information
                clean(row["Order Country"]),
                clean(row["Order Region"]),
                clean(row["Order State"])
            )

            cursor.execute(insert_sql, values)

            count += 1

            # Commit every 5000 records
            if count % 5000 == 0:

                conn.commit()

                print(
                    f"Imported {count} rows..."
                )


    # --------------------------------------------------
    # 9. FINAL COMMIT
    # --------------------------------------------------

    conn.commit()

    print()
    print("======================================")
    print("Import completed successfully!")
    print(f"Total rows imported: {count}")
    print("======================================")


except Exception as e:

    # Rollback if any error occurs
    conn.rollback()

    print()
    print("======================================")
    print("ERROR OCCURRED")
    print("======================================")
    print(e)


finally:

    cursor.close()
    conn.close()

    print("Database connection closed.")