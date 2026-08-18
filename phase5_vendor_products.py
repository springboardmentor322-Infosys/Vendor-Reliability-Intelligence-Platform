#!/usr/bin/env python3
"""
PHASE 5: CREATE VENDOR-PRODUCT MAPPING
Maps 118 products to 28 vendors in a deterministic way
Each product gets 1-3 vendors, each primary relationship is stable
"""

import psycopg2
import random
from itertools import cycle

# Database connection
conn = psycopg2.connect(
    host="localhost",
    database="vendor_platform",
    user="postgres",
    password="Amruta@9279",
    port="5432"
)
cursor = conn.cursor()

# Seed for deterministic generation
random.seed(42)

print("\n" + "="*70)
print("PHASE 5: VENDOR-PRODUCT MAPPING")
print("="*70)

# ============================================================
# SECTION 1: CREATE VENDOR_PRODUCTS TABLE
# ============================================================
print("\n[SECTION 1] CREATE VENDOR_PRODUCTS TABLE")
print("-" * 70)

# Check if table exists
cursor.execute("""
    SELECT EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_name='vendor_products'
    )
""")

if cursor.fetchone()[0]:
    print("✓ vendor_products table already exists")
    cursor.execute("SELECT COUNT(*) FROM vendor_products")
    existing_count = cursor.fetchone()[0]
    print(f"  Current mappings: {existing_count}")
    # For now, we'll keep existing data but can clear if needed
else:
    print("✗ vendor_products table does not exist - creating...")
    
    create_table_sql = """
    CREATE TABLE vendor_products (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER NOT NULL REFERENCES vendors(id),
        product_id INTEGER NOT NULL REFERENCES products(id),
        vendor_product_code VARCHAR(100),
        unit_price NUMERIC(10,2),
        lead_time_days INTEGER DEFAULT 7,
        minimum_order_quantity INTEGER DEFAULT 1,
        is_primary_vendor BOOLEAN DEFAULT FALSE,
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (vendor_id, product_id)
    )
    """
    
    cursor.execute(create_table_sql)
    conn.commit()
    print("✓ vendor_products table created successfully")

# ============================================================
# SECTION 2: GET VENDORS AND PRODUCTS
# ============================================================
print("\n[SECTION 2] GET VENDORS AND PRODUCTS")
print("-" * 70)

cursor.execute("SELECT id FROM vendors ORDER BY id")
vendor_ids = [row[0] for row in cursor.fetchall()]
print(f"Vendors: {len(vendor_ids)}")

cursor.execute("SELECT id, product_card_id FROM products ORDER BY id")
product_rows = cursor.fetchall()
product_ids = [row[0] for row in product_rows]
print(f"Products: {len(product_ids)}")

# ============================================================
# SECTION 3: CREATE DETERMINISTIC MAPPINGS
# ============================================================
print("\n[SECTION 3] CREATE DETERMINISTIC VENDOR-PRODUCT MAPPINGS")
print("-" * 70)

# Strategy: Use deterministic cycling to assign vendors to products
# Each product gets 1-3 vendors
# First vendor is primary
# Deterministic so results are reproducible

mappings = []
mapping_count = 0

# For each product, assign 1-3 vendors deterministically
for i, product_id in enumerate(product_ids):
    # Deterministic: use product index to decide number of vendors
    num_vendors = 1 + (i % 3)  # Results in 1, 2, or 3 vendors per product
    
    # Deterministic: use product index to start vendor selection
    start_vendor_idx = (i * 7) % len(vendor_ids)  # Prime multiplier for distribution
    
    assigned_vendors = []
    for j in range(num_vendors):
        vendor_idx = (start_vendor_idx + j) % len(vendor_ids)
        assigned_vendors.append((vendor_ids[vendor_idx], j == 0))  # First is primary
    
    for vendor_id, is_primary in assigned_vendors:
        mappings.append((vendor_id, product_id, is_primary))
        mapping_count += 1

print(f"Total mappings to create: {mapping_count}")

# ============================================================
# SECTION 4: INSERT VENDOR-PRODUCT MAPPINGS
# ============================================================
print("\n[SECTION 4] INSERT VENDOR-PRODUCT MAPPINGS")
print("-" * 70)

inserted_count = 0
duplicate_count = 0
error_count = 0

# Get existing mappings
cursor.execute("SELECT vendor_id, product_id FROM vendor_products")
existing_mappings = set((row[0], row[1]) for row in cursor.fetchall())
print(f"Already in table: {len(existing_mappings)}")

for vendor_id, product_id, is_primary in mappings:
    try:
        if (vendor_id, product_id) not in existing_mappings:
            # Generate realistic pricing
            cursor.execute("SELECT product_price FROM products WHERE id = %s", (product_id,))
            base_price_result = cursor.fetchone()
            base_price = float(base_price_result[0]) if base_price_result and base_price_result[0] else 100
            
            # Vendor markup varies by vendor (deterministic)
            markup = 1.0 + (vendor_id % 5) * 0.05  # 5-25% markup
            vendor_unit_price = round(base_price * markup, 2)
            
            # Lead time varies by vendor
            lead_days = 3 + (vendor_id % 21)  # 3-23 days
            
            # Vendor product code
            vendor_code = f"VP-{vendor_id:03d}-{product_id:04d}"
            
            cursor.execute("""
                INSERT INTO vendor_products 
                (vendor_id, product_id, vendor_product_code, unit_price, 
                 lead_time_days, is_primary_vendor, status)
                VALUES (%s, %s, %s, %s, %s, %s, 'Active')
            """, (vendor_id, product_id, vendor_code, vendor_unit_price, lead_days, is_primary))
            
            inserted_count += 1
            if inserted_count % 100 == 0:
                conn.commit()
                print(f"  Inserted {inserted_count}...")
        else:
            duplicate_count += 1
    except Exception as e:
        error_count += 1
        if error_count <= 5:
            print(f"  ERROR: {e}")

conn.commit()
print(f"\n✓ Mappings inserted: {inserted_count}")
print(f"✓ Duplicates skipped: {duplicate_count}")
if error_count > 0:
    print(f"✗ Errors: {error_count}")

# ============================================================
# SECTION 5: VALIDATE MAPPINGS
# ============================================================
print("\n[SECTION 5] VALIDATION")
print("-" * 70)

cursor.execute("SELECT COUNT(*) FROM vendor_products")
total_mappings = cursor.fetchone()[0]
print(f"Total vendor-product mappings: {total_mappings}")

cursor.execute("SELECT COUNT(DISTINCT product_id) FROM vendor_products")
mapped_products = cursor.fetchone()[0]
print(f"Products with mappings: {mapped_products}")

cursor.execute("SELECT COUNT(*) FROM products")
all_products = cursor.fetchone()[0]
print(f"All products: {all_products}")

products_without_vendors = all_products - mapped_products
if products_without_vendors > 0:
    print(f"✗ WARNING: {products_without_vendors} products without vendors!")
else:
    print(f"✓ All products have at least one vendor")

# Check for duplicate vendor-product combinations
cursor.execute("""
    SELECT vendor_id, product_id, COUNT(*) as cnt
    FROM vendor_products
    GROUP BY vendor_id, product_id
    HAVING COUNT(*) > 1
""")
duplicates = cursor.fetchall()
if duplicates:
    print(f"✗ WARNING: {len(duplicates)} duplicate vendor-product combinations!")
else:
    print(f"✓ No duplicate vendor-product combinations")

# Check primary vendor distribution
cursor.execute("SELECT COUNT(*) FROM vendor_products WHERE is_primary_vendor = true")
primary_count = cursor.fetchone()[0]
print(f"\nPrimary vendor mappings: {primary_count}")

# Sample mappings
print("\n[SAMPLE MAPPINGS] (First 10):")
cursor.execute("""
    SELECT vp.vendor_id, v.vendor_name, vp.product_id, p.product_name, 
           vp.unit_price, vp.is_primary_vendor
    FROM vendor_products vp
    JOIN vendors v ON vp.vendor_id = v.id
    JOIN products p ON vp.product_id = p.id
    ORDER BY vp.id
    LIMIT 10
""")

for vid, vname, pid, pname, price, is_primary in cursor.fetchall():
    primary_str = "PRIMARY" if is_primary else "secondary"
    print(f"  V{vid}:{vname[:25]} <-> P{pid}:{pname[:25]} @ ${price} [{primary_str}]")

# ============================================================
# SECTION 6: CHECK FOREIGN KEYS
# ============================================================
print("\n[SECTION 6] FOREIGN KEY INTEGRITY")
print("-" * 70)

cursor.execute("""
    SELECT COUNT(*) FROM vendor_products
    WHERE vendor_id NOT IN (SELECT id FROM vendors)
""")
orphan_vendors = cursor.fetchone()[0]
if orphan_vendors == 0:
    print("✓ All vendor_products reference valid vendors")
else:
    print(f"✗ WARNING: {orphan_vendors} vendor_products have invalid vendor_id!")

cursor.execute("""
    SELECT COUNT(*) FROM vendor_products
    WHERE product_id NOT IN (SELECT id FROM products)
""")
orphan_products = cursor.fetchone()[0]
if orphan_products == 0:
    print("✓ All vendor_products reference valid products")
else:
    print(f"✗ WARNING: {orphan_products} vendor_products have invalid product_id!")

# ============================================================
# SUMMARY
# ============================================================
print("\n" + "="*70)
print("PHASE 5 SUMMARY")
print("="*70)
print(f"Vendors:                       {len(vendor_ids)}")
print(f"Products:                      {len(product_ids)}")
print(f"Vendor-Product Mappings:       {total_mappings}")
print(f"Products with vendors:         {mapped_products}")
print(f"Products without vendors:      {products_without_vendors}")
print(f"Average vendors per product:   {total_mappings/all_products:.1f}")
print(f"FK Integrity (vendors):        OK" if orphan_vendors == 0 else f"FAILED: {orphan_vendors} orphans")
print(f"FK Integrity (products):       OK" if orphan_products == 0 else f"FAILED: {orphan_products} orphans")
print("="*70 + "\n")

cursor.close()
conn.close()

print("✓ Phase 5 complete - Vendor-product mapping created")
