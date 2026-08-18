#!/usr/bin/env python3
"""
PHASE 6: CREATE DELIVERIES FROM DATACO SHIPPING DATA
Maps DataCo orders to vendors using vendor_products mapping
Extracts shipping, delivery, and late_delivery_risk from DataCo
"""

import psycopg2
from collections import defaultdict

# Database connection
conn = psycopg2.connect(
    host="localhost",
    database="vendor_platform",
    user="postgres",
    password="Amruta@9279",
    port="5432"
)
cursor = conn.cursor()

print("\n" + "="*70)
print("PHASE 6: CREATE DELIVERIES FROM DATACO")
print("="*70)

# ============================================================
# SECTION 1: CREATE DELIVERIES TABLE
# ============================================================
print("\n[SECTION 1] CREATE DELIVERIES TABLE")
print("-" * 70)

cursor.execute("""
    SELECT EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_name='deliveries'
    )
""")

if cursor.fetchone()[0]:
    print("✓ Deliveries table already exists")
    cursor.execute("SELECT COUNT(*) FROM deliveries")
    existing_count = cursor.fetchone()[0]
    print(f"  Current delivery records: {existing_count}")
else:
    print("✗ Deliveries table does not exist - creating...")
    
    create_table_sql = """
    CREATE TABLE deliveries (
        id SERIAL PRIMARY KEY,
        dataco_order_id BIGINT,
        dataco_order_item_id BIGINT,
        vendor_id INTEGER NOT NULL REFERENCES vendors(id),
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity NUMERIC(10,2),
        unit_price NUMERIC(10,2),
        shipping_mode VARCHAR(100),
        shipping_date TIMESTAMP,
        expected_delivery_date TIMESTAMP,
        actual_delivery_date TIMESTAMP,
        scheduled_days INTEGER,
        actual_days INTEGER,
        delivery_status VARCHAR(100),
        late_delivery_risk INTEGER DEFAULT 0,
        is_on_time BOOLEAN,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    )
    """
    
    cursor.execute(create_table_sql)
    conn.commit()
    print("✓ Deliveries table created successfully")

# ============================================================
# SECTION 2: ANALYZE DATACO FOR DELIVERY DATA
# ============================================================
print("\n[SECTION 2] ANALYZE DATACO DELIVERY DATA")
print("-" * 70)

cursor.execute("SELECT COUNT(*) FROM dataco_raw_orders")
total_dataco = cursor.fetchone()[0]
print(f"Total DataCo orders: {total_dataco}")

cursor.execute("""
    SELECT COUNT(DISTINCT 
        CONCAT(order_id, '|', order_item_id))
    FROM dataco_raw_orders
""")
unique_line_items = cursor.fetchone()[0]
print(f"Unique order-item combinations: {unique_line_items}")

# Check for NULL values in critical fields
cursor.execute("""
    SELECT 
        COUNT(CASE WHEN shipping_date IS NULL THEN 1 END) as null_shipping_date,
        COUNT(CASE WHEN delivery_status IS NULL THEN 1 END) as null_delivery_status,
        COUNT(CASE WHEN days_for_shipping_real IS NULL THEN 1 END) as null_actual_days,
        COUNT(CASE WHEN days_for_shipment_scheduled IS NULL THEN 1 END) as null_scheduled_days
    FROM dataco_raw_orders
""")

nulls = cursor.fetchone()
print(f"NULL shipping_date: {nulls[0]}")
print(f"NULL delivery_status: {nulls[1]}")
print(f"NULL actual_days: {nulls[2]}")
print(f"NULL scheduled_days: {nulls[3]}")

# ============================================================
# SECTION 3: BUILD MAPPING OF DATACO -> VENDOR
# ============================================================
print("\n[SECTION 3] BUILD DATACO -> VENDOR MAPPING")
print("-" * 70)

# For each unique DataCo product_card_id, find vendors
cursor.execute("""
    SELECT DISTINCT dro.product_card_id, p.id
    FROM dataco_raw_orders dro
    JOIN products p ON dro.product_card_id = p.product_card_id
""")

dataco_product_map = {}  # dataco product_card_id -> products.id
for dataco_card_id, product_id in cursor.fetchall():
    dataco_product_map[dataco_card_id] = product_id

print(f"DataCo products mapped to products table: {len(dataco_product_map)}")

# Get primary vendor for each product
cursor.execute("""
    SELECT product_id, vendor_id
    FROM vendor_products
    WHERE is_primary_vendor = true
""")

product_vendor_map = {}  # product.id -> primary vendor_id
for product_id, vendor_id in cursor.fetchall():
    product_vendor_map[product_id] = vendor_id

print(f"Products with primary vendors: {len(product_vendor_map)}")

# ============================================================
# SECTION 4: INSERT DELIVERIES FROM DATACO
# ============================================================
print("\n[SECTION 4] INSERT DELIVERIES FROM DATACO")
print("-" * 70)

inserted_count = 0
skipped_count = 0
error_count = 0

# Process DataCo orders in batches for efficiency
batch_size = 10000
cursor.execute("""
    SELECT 
        order_id,
        order_item_id,
        product_card_id,
        order_item_quantity,
        order_item_product_price,
        shipping_mode,
        shipping_date,
        order_date,
        days_for_shipping_real,
        days_for_shipment_scheduled,
        delivery_status,
        late_delivery_risk
    FROM dataco_raw_orders
    ORDER BY order_id, order_item_id
""")

all_dataco_rows = cursor.fetchall()
print(f"Processing {len(all_dataco_rows)} DataCo order items...")

for row_idx, (order_id, order_item_id, product_card_id, quantity, unit_price, 
              shipping_mode, shipping_date, order_date, actual_days, scheduled_days, 
              delivery_status, late_delivery_risk) in enumerate(all_dataco_rows):
    
    try:
        # Map DataCo product to our products table
        if product_card_id not in dataco_product_map:
            skipped_count += 1
            continue
        
        product_id = dataco_product_map[product_card_id]
        
        # Get primary vendor for this product
        if product_id not in product_vendor_map:
            skipped_count += 1
            continue
        
        vendor_id = product_vendor_map[product_id]
        
        # Calculate on-time delivery
        is_on_time = None
        if actual_days is not None and scheduled_days is not None:
            is_on_time = actual_days <= scheduled_days
        
        # Insert delivery record
        cursor.execute("""
            INSERT INTO deliveries 
            (dataco_order_id, dataco_order_item_id, vendor_id, product_id, 
             quantity, unit_price, shipping_mode, shipping_date, 
             expected_delivery_date, actual_delivery_date,
             scheduled_days, actual_days, delivery_status, late_delivery_risk, is_on_time)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (order_id, order_item_id, vendor_id, product_id, quantity, unit_price,
              shipping_mode, shipping_date, order_date, shipping_date, 
              scheduled_days, actual_days, delivery_status, late_delivery_risk, is_on_time))
        
        inserted_count += 1
        
        # Commit every 5000 records
        if (row_idx + 1) % 5000 == 0:
            conn.commit()
            print(f"  Inserted {inserted_count}...")
            
    except Exception as e:
        error_count += 1
        if error_count <= 5:
            print(f"  ERROR at row {row_idx}: {e}")

conn.commit()
print(f"\n✓ Deliveries inserted: {inserted_count}")
print(f"✓ Deliveries skipped: {skipped_count}")
if error_count > 0:
    print(f"✗ Errors: {error_count}")

# ============================================================
# SECTION 5: VALIDATE DELIVERIES
# ============================================================
print("\n[SECTION 5] VALIDATION")
print("-" * 70)

cursor.execute("SELECT COUNT(*) FROM deliveries")
total_deliveries = cursor.fetchone()[0]
print(f"Total delivery records: {total_deliveries}")

# On-time delivery rate
cursor.execute("""
    SELECT 
        COUNT(CASE WHEN is_on_time = true THEN 1 END) as on_time,
        COUNT(CASE WHEN is_on_time = false THEN 1 END) as late,
        COUNT(CASE WHEN is_on_time IS NULL THEN 1 END) as unknown
    FROM deliveries
""")

on_time, late, unknown = cursor.fetchone()
if total_deliveries > 0:
    on_time_rate = (on_time / (on_time + late)) * 100 if (on_time + late) > 0 else 0
    print(f"On-time deliveries: {on_time} ({on_time_rate:.1f}%)")
    print(f"Late deliveries: {late}")
    print(f"Unknown status: {unknown}")

# Delivery status distribution
cursor.execute("""
    SELECT delivery_status, COUNT(*) as cnt
    FROM deliveries
    GROUP BY delivery_status
    ORDER BY cnt DESC
""")

print("\nDelivery Status Distribution:")
for status, count in cursor.fetchall():
    print(f"  {status}: {count}")

# Check for late delivery risk correlation
cursor.execute("""
    SELECT late_delivery_risk, COUNT(*) as cnt
    FROM deliveries
    GROUP BY late_delivery_risk
""")

print("\nLate Delivery Risk Values:")
for risk, count in cursor.fetchall():
    print(f"  Risk {risk}: {count} deliveries")

# Vendor coverage
cursor.execute("""
    SELECT COUNT(DISTINCT vendor_id) FROM deliveries
""")
vendor_count = cursor.fetchone()[0]
print(f"\nVendors with deliveries: {vendor_count}")

# Sample deliveries
print("\n[SAMPLE DELIVERIES] (First 5):")
cursor.execute("""
    SELECT d.id, v.vendor_name, p.product_name, d.quantity, 
           d.delivery_status, d.is_on_time
    FROM deliveries d
    JOIN vendors v ON d.vendor_id = v.id
    JOIN products p ON d.product_id = p.id
    ORDER BY d.id
    LIMIT 5
""")

for did, vname, pname, qty, status, on_time in cursor.fetchall():
    on_time_str = "ON-TIME" if on_time else ("LATE" if on_time == False else "UNKNOWN")
    print(f"  D{did}: {vname[:20]} - {pname[:30]} x{qty} - {status} [{on_time_str}]")

# ============================================================
# SECTION 6: CALCULATE DELIVERY RATES BY VENDOR
# ============================================================
print("\n[SECTION 6] DELIVERY RATE BY VENDOR")
print("-" * 70)

cursor.execute("""
    SELECT 
        v.id, v.vendor_name,
        COUNT(d.id) as total_deliveries,
        COUNT(CASE WHEN d.is_on_time = true THEN 1 END) as on_time_deliveries,
        COUNT(CASE WHEN d.is_on_time = false THEN 1 END) as late_deliveries,
        ROUND(
            CAST(COUNT(CASE WHEN d.is_on_time = true THEN 1 END) AS FLOAT) / 
            COUNT(CASE WHEN d.is_on_time IS NOT NULL THEN 1 END) * 100, 2
        ) as delivery_rate
    FROM vendors v
    LEFT JOIN deliveries d ON v.id = d.vendor_id
    GROUP BY v.id, v.vendor_name
    ORDER BY delivery_rate DESC NULLS LAST
    LIMIT 10
""")

print("Top 10 vendors by delivery rate:")
for vid, vname, total, on_time, late, rate in cursor.fetchall():
    if rate is not None:
        print(f"  {vname[:25]}: {rate}% ({on_time}/{total} on-time)")
    else:
        print(f"  {vname[:25]}: No deliveries")

# ============================================================
# SUMMARY
# ============================================================
print("\n" + "="*70)
print("PHASE 6 SUMMARY")
print("="*70)
print(f"DataCo orders processed:       {len(all_dataco_rows)}")
print(f"Deliveries inserted:           {inserted_count}")
print(f"Deliveries skipped:            {skipped_count}")
print(f"Errors:                        {error_count}")
print(f"On-time deliveries:            {on_time}")
print(f"Late deliveries:               {late}")
print(f"Overall on-time rate:          {on_time_rate:.1f}%")
print(f"Vendors with deliveries:       {vendor_count}")
print("="*70 + "\n")

cursor.close()
conn.close()

print("✓ Phase 6 complete - Deliveries created from DataCo")
