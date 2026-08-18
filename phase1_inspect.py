#!/usr/bin/env python3
"""
PHASE 1 - COMPREHENSIVE PROJECT INSPECTION
Analyzes existing database schema, tables, APIs, and data
"""

import psycopg2
import os
import json
from pathlib import Path

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
print("PHASE 1 - PROJECT INSPECTION REPORT")
print("="*70)

# ============================================================
# SECTION 1: EXISTING TABLES
# ============================================================
print("\n[SECTION 1] EXISTING DATABASE TABLES")
print("-" * 70)

cursor.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema='public'
    ORDER BY table_name
""")

all_tables = [row[0] for row in cursor.fetchall()]
print(f"Total tables: {len(all_tables)}")
for table in all_tables:
    print(f"  ✓ {table}")

# ============================================================
# SECTION 2: TABLE STRUCTURE & ROW COUNTS
# ============================================================
print("\n[SECTION 2] TABLE DETAILS")
print("-" * 70)

important_tables = ['vendors', 'products', 'purchase_orders', 'dataco_raw_orders', 
                   'vendor_products', 'deliveries', 'quality_inspections', 'contracts',
                   'invoices', 'communications', 'notifications', 'vendor_performance_history']

for table in important_tables:
    if table in all_tables:
        # Get row count
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        row_count = cursor.fetchone()[0]
        
        # Get columns
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = %s
            ORDER BY ordinal_position
        """, (table,))
        
        columns = cursor.fetchall()
        print(f"\n✓ {table.upper()} ({row_count} rows, {len(columns)} columns)")
        for col_name, col_type in columns:
            print(f"    {col_name}: {col_type}")
    else:
        print(f"\n✗ {table.upper()} - DOES NOT EXIST")

# ============================================================
# SECTION 3: SAMPLE DATA
# ============================================================
print("\n[SECTION 3] SAMPLE DATA FROM KEY TABLES")
print("-" * 70)

if 'vendors' in all_tables:
    print("\nVENDORS (first 5):")
    cursor.execute("SELECT id, vendor_name, company, category, status FROM vendors LIMIT 5")
    for row in cursor.fetchall():
        print(f"  ID:{row[0]}, Name:{row[1]}, Company:{row[2]}, Category:{row[3]}, Status:{row[4]}")

if 'products' in all_tables:
    print("\nPRODUCTS (first 5):")
    cursor.execute("SELECT id, product_card_id, product_name, product_price FROM products LIMIT 5")
    for row in cursor.fetchall():
        print(f"  ID:{row[0]}, CardID:{row[1]}, Name:{row[2]}, Price:{row[3]}")
else:
    print("\nPRODUCTS - TABLE DOES NOT EXIST")

if 'purchase_orders' in all_tables:
    print("\nPURCHASE_ORDERS (first 5):")
    cursor.execute("SELECT id, vendor_id, product_name, quantity, status FROM purchase_orders LIMIT 5")
    for row in cursor.fetchall():
        print(f"  ID:{row[0]}, VendorID:{row[1]}, Product:{row[2]}, Qty:{row[3]}, Status:{row[4]}")

if 'dataco_raw_orders' in all_tables:
    print("\nDATACO_RAW_ORDERS:")
    cursor.execute("SELECT COUNT(*) FROM dataco_raw_orders")
    count = cursor.fetchone()[0]
    print(f"  Total rows: {count}")
    cursor.execute("SELECT COUNT(DISTINCT product_card_id) FROM dataco_raw_orders")
    unique_products = cursor.fetchone()[0]
    print(f"  Unique products: {unique_products}")

if 'vendor_products' in all_tables:
    print("\nVENDOR_PRODUCTS (first 5):")
    cursor.execute("SELECT id, vendor_id, product_id, is_primary_vendor FROM vendor_products LIMIT 5")
    for row in cursor.fetchall():
        print(f"  ID:{row[0]}, VendorID:{row[1]}, ProductID:{row[2]}, Primary:{row[3]}")
else:
    print("\nVENDOR_PRODUCTS - TABLE DOES NOT EXIST")

# ============================================================
# SECTION 4: FOREIGN KEYS
# ============================================================
print("\n[SECTION 4] FOREIGN KEYS & RELATIONSHIPS")
print("-" * 70)

cursor.execute("""
    SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    ORDER BY tc.table_name
""")

fks = cursor.fetchall()
if fks:
    for table, column, fk_table, fk_column in fks:
        print(f"  {table}.{column} -> {fk_table}.{fk_column}")
else:
    print("  No foreign keys found!")

# ============================================================
# SECTION 5: BACKEND API ROUTES
# ============================================================
print("\n[SECTION 5] EXISTING BACKEND API STRUCTURE")
print("-" * 70)

backend_dir = Path(r"C:\Users\Dell\OneDrive\Desktop\Vendor-Reliability-Intelligence-Platform\backend")
backend_files = []
for py_file in backend_dir.glob("*.py"):
    if py_file.name not in ['__pycache__', 'db.py', 'main.py']:
        backend_files.append(py_file.name)

print(f"\nBackend Router Files ({len(backend_files)}):")
for f in sorted(backend_files):
    print(f"  ✓ {f}")

# ============================================================
# SECTION 6: FRONTEND PAGES
# ============================================================
print("\n[SECTION 6] EXISTING FRONTEND PAGES")
print("-" * 70)

frontend_dir = Path(r"C:\Users\Dell\OneDrive\Desktop\Vendor-Reliability-Intelligence-Platform\frontend")
html_files = list(frontend_dir.glob("*.html"))

print(f"\nHTML Pages ({len(html_files)}):")
for html_file in sorted(html_files):
    print(f"  ✓ {html_file.name}")

# ============================================================
# SECTION 7: DATA CONSISTENCY CHECK
# ============================================================
print("\n[SECTION 7] DATA CONSISTENCY CHECK")
print("-" * 70)

# Check vendor counts
cursor.execute("SELECT COUNT(*) FROM vendors")
vendor_count = cursor.fetchone()[0]
print(f"Vendors: {vendor_count}")

# Check for demo vs real data
cursor.execute("SELECT vendor_name FROM vendors LIMIT 8")
print("Vendor names (first 8):")
for row in cursor.fetchall():
    print(f"  - {row[0]}")

# Check purchase orders
cursor.execute("SELECT COUNT(*) FROM purchase_orders")
po_count = cursor.fetchone()[0]
print(f"\nPurchase Orders: {po_count}")

# Check if POs reference valid vendors
cursor.execute("""
    SELECT COUNT(*) 
    FROM purchase_orders po 
    WHERE po.vendor_id NOT IN (SELECT id FROM vendors)
""")
orphan_pos = cursor.fetchone()[0]
if orphan_pos > 0:
    print(f"  WARNING: {orphan_pos} purchase orders reference non-existent vendors!")
else:
    print(f"  ✓ All purchase orders reference valid vendors")

# ============================================================
# SECTION 8: MISSING TABLES SUMMARY
# ============================================================
print("\n[SECTION 8] MISSING TABLES")
print("-" * 70)

required_tables = {
    'products': 'Product master data',
    'vendor_products': 'Vendor-Product mapping',
    'deliveries': 'Delivery tracking',
    'quality_inspections': 'Quality data',
    'contracts': 'Vendor contracts',
    'invoices': 'Invoice records',
    'communications': 'Communication history',
    'notifications': 'System notifications'
}

missing = []
existing = []
for table_name, description in required_tables.items():
    if table_name in all_tables:
        existing.append(f"✓ {table_name}: {description}")
    else:
        missing.append(f"✗ {table_name}: {description}")

print("MISSING (need to create):")
for item in missing:
    print(f"  {item}")

print("\nEXISTING (can be reused):")
for item in existing:
    print(f"  {item}")

print("\n" + "="*70)
print("END OF INSPECTION REPORT")
print("="*70 + "\n")

cursor.close()
conn.close()
