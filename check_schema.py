import psycopg2

conn = psycopg2.connect(
    host="localhost",
    database="vendor_platform",
    user="postgres",
    password="Amruta@9279",
    port="5432"
)

cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
print("TABLES IN DATABASE:")
for row in cursor.fetchall():
    print(f"  - {row[0]}")

print("\n" + "="*60)

# Check vendors table
print("\nVENDORS TABLE COLUMNS:")
cursor.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='vendors'")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]}")

# Check vendors count
cursor.execute("SELECT COUNT(*) FROM vendors")
print(f"\nVendors in database: {cursor.fetchone()[0]}")

print("\n" + "="*60)

# Check purchase_orders table
print("\nPURCHASE_ORDERS TABLE COLUMNS:")
cursor.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='purchase_orders'")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]}")

# Check purchase_orders count
cursor.execute("SELECT COUNT(*) FROM purchase_orders")
print(f"\nPurchase orders in database: {cursor.fetchone()[0]}")

print("\n" + "="*60)

# Check if dataco_raw_orders table exists
cursor.execute("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='dataco_raw_orders')")
if cursor.fetchone()[0]:
    print("\nDATACO_RAW_ORDERS TABLE EXISTS")
    cursor.execute("SELECT COUNT(*) FROM dataco_raw_orders")
    print(f"Rows in dataco_raw_orders: {cursor.fetchone()[0]}")
    cursor.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='dataco_raw_orders'")
    print("\nDATACO_RAW_ORDERS COLUMNS:")
    for row in cursor.fetchall():
        print(f"  {row[0]}: {row[1]}")
else:
    print("\nDATACO_RAW_ORDERS TABLE DOES NOT EXIST")

print("\n" + "="*60)

# Check for vendor_product or product mapping tables
cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%product%'")
product_tables = cursor.fetchall()
if product_tables:
    print("\nPRODUCT-RELATED TABLES FOUND:")
    for row in product_tables:
        print(f"  - {row[0]}")
else:
    print("\nNO PRODUCT-RELATED TABLES FOUND")

cursor.close()
conn.close()
