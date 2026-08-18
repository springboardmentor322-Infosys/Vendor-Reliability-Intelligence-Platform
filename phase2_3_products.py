#!/usr/bin/env python3
"""
PHASE 2-3: CREATE PRODUCTS TABLE AND IMPORT 118 UNIQUE PRODUCTS FROM DATACO
"""

import psycopg2
import csv
from collections import OrderedDict

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
print("PHASE 2-3: PRODUCTS TABLE & IMPORT")
print("="*70)

# ============================================================
# SECTION 1: CREATE PRODUCTS TABLE
# ============================================================
print("\n[SECTION 1] CREATE PRODUCTS TABLE")
print("-" * 70)

# Check if products table already exists
cursor.execute("""
    SELECT EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_name='products'
    )
""")

if cursor.fetchone()[0]:
    print("✓ Products table already exists")
    cursor.execute("SELECT COUNT(*) FROM products")
    existing_count = cursor.fetchone()[0]
    print(f"  Current product count: {existing_count}")
else:
    print("✗ Products table does not exist - creating...")
    
    create_products_sql = """
    CREATE TABLE products (
        id SERIAL PRIMARY KEY,
        product_card_id BIGINT UNIQUE NOT NULL,
        product_name TEXT NOT NULL,
        category_id BIGINT,
        category_name VARCHAR(255),
        product_price NUMERIC(10,2),
        product_status TEXT,
        product_description TEXT,
        product_image VARCHAR(500),
        source VARCHAR(50) DEFAULT 'DataCo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """
    
    cursor.execute(create_products_sql)
    conn.commit()
    print("✓ Products table created successfully")

# ============================================================
# SECTION 2: EXTRACT UNIQUE PRODUCTS FROM DATACO
# ============================================================
print("\n[SECTION 2] EXTRACT UNIQUE PRODUCTS FROM DATACO")
print("-" * 70)

cursor.execute("SELECT COUNT(*) FROM dataco_raw_orders")
total_rows = cursor.fetchone()[0]
print(f"Total DataCo rows: {total_rows}")

cursor.execute("SELECT COUNT(DISTINCT product_card_id) FROM dataco_raw_orders")
unique_products = cursor.fetchone()[0]
print(f"Unique product_card_id in DataCo: {unique_products}")

# Get unique products from dataco_raw_orders
cursor.execute("""
    SELECT DISTINCT
        product_card_id,
        product_name,
        category_id,
        category_name,
        MAX(CAST(order_item_product_price AS NUMERIC)) as product_price
    FROM dataco_raw_orders
    GROUP BY product_card_id, product_name, category_id, category_name
    ORDER BY product_card_id
""")

unique_product_rows = cursor.fetchall()
print(f"Products to import: {len(unique_product_rows)}")

# ============================================================
# SECTION 3: INSERT PRODUCTS INTO TABLE
# ============================================================
print("\n[SECTION 3] INSERT PRODUCTS")
print("-" * 70)

inserted_count = 0
duplicate_count = 0
error_count = 0

# Get existing product_card_ids
cursor.execute("SELECT product_card_id FROM products")
existing_card_ids = set(row[0] for row in cursor.fetchall())
print(f"Already in products table: {len(existing_card_ids)}")

for card_id, name, cat_id, cat_name, price in unique_product_rows:
    try:
        if card_id not in existing_card_ids:
            cursor.execute("""
                INSERT INTO products 
                (product_card_id, product_name, category_id, category_name, product_price, source)
                VALUES (%s, %s, %s, %s, %s, 'DataCo')
            """, (card_id, name, cat_id, cat_name, price))
            inserted_count += 1
        else:
            duplicate_count += 1
    except Exception as e:
        error_count += 1
        print(f"  ERROR inserting product {card_id}: {e}")

conn.commit()

print(f"\n✓ Products inserted: {inserted_count}")
print(f"✓ Duplicates skipped: {duplicate_count}")
if error_count > 0:
    print(f"✗ Errors: {error_count}")

# ============================================================
# SECTION 4: VALIDATE PRODUCTS
# ============================================================
print("\n[SECTION 4] VALIDATION")
print("-" * 70)

cursor.execute("SELECT COUNT(*) FROM products")
total_products = cursor.fetchone()[0]
print(f"Total products in table: {total_products}")

cursor.execute("SELECT COUNT(DISTINCT product_card_id) FROM products")
unique_product_ids = cursor.fetchone()[0]
print(f"Unique product_card_id: {unique_product_ids}")

# Check for NULL values
cursor.execute("""
    SELECT 
        COUNT(CASE WHEN product_card_id IS NULL THEN 1 END) as null_card_id,
        COUNT(CASE WHEN product_name IS NULL THEN 1 END) as null_name,
        COUNT(CASE WHEN category_name IS NULL THEN 1 END) as null_category
    FROM products
""")

null_counts = cursor.fetchone()
print(f"NULL product_card_id: {null_counts[0]}")
print(f"NULL product_name: {null_counts[1]}")
print(f"NULL category_name: {null_counts[2]}")

# Sample products
print("\n[SAMPLE PRODUCTS] (First 5):")
cursor.execute("""
    SELECT id, product_card_id, product_name, category_name, product_price
    FROM products
    ORDER BY product_card_id
    LIMIT 5
""")

for row in cursor.fetchall():
    print(f"  ID:{row[0]}, CardID:{row[1]}, Name:{row[2]}, Category:{row[3]}, Price:{row[4]}")

# ============================================================
# SUMMARY
# ============================================================
print("\n" + "="*70)
print("PHASE 2-3 SUMMARY")
print("="*70)
print(f"DataCo rows:           {total_rows}")
print(f"Unique products:       {unique_products}")
print(f"Products imported:     {inserted_count}")
print(f"Products total:        {total_products}")
print(f"Duplicates skipped:    {duplicate_count}")
print(f"Errors:                {error_count}")
print("="*70 + "\n")

cursor.close()
conn.close()

print("✓ Phase 2-3 complete - Products table ready")
