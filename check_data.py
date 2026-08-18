import psycopg2
import csv

# Check existing vendors
conn = psycopg2.connect(
    host="localhost",
    database="vendor_platform",
    user="postgres",
    password="Amruta@9279",
    port="5432"
)

cursor = conn.cursor()

print("="*60)
print("EXISTING VENDORS IN DATABASE")
print("="*60)
cursor.execute("SELECT id, vendor_name, category FROM vendors ORDER BY id")
vendors = cursor.fetchall()
for vendor in vendors:
    print(f"ID: {vendor[0]}, Name: {vendor[1]}, Category: {vendor[2]}")

print("\n" + "="*60)
print("EXISTING PURCHASE ORDERS")
print("="*60)
cursor.execute("SELECT id, vendor_id, product_name, status FROM purchase_orders LIMIT 5")
orders = cursor.fetchall()
for order in orders:
    print(f"Order ID: {order[0]}, Vendor ID: {order[1]}, Product: {order[2]}, Status: {order[3]}")

cursor.close()
conn.close()

print("\n" + "="*60)
print("CSV FILE ANALYSIS")
print("="*60)

CSV_FILE = r"C:\Users\Dell\OneDrive\Desktop\Vendor-Reliability-Intelligence-Platform\data\DataCoSupplyChainDataset.csv"

with open(CSV_FILE, 'r', encoding='latin1') as f:
    reader = csv.DictReader(f)
    headers = reader.fieldnames
    print(f"\nTotal columns in CSV: {len(headers)}")
    print("\nColumn names:")
    for i, col in enumerate(headers, 1):
        print(f"  {i}. {col}")
    
    print("\n" + "="*60)
    print("SAMPLE RECORDS FROM CSV")
    print("="*60)
    
    for i, row in enumerate(reader):
        if i < 3:
            print(f"\nRecord {i+1}:")
            print(f"  Order ID: {row.get('Order Id', 'N/A')}")
            print(f"  Product Card Id: {row.get('Product Card Id', 'N/A')}")
            print(f"  Product Name: {row.get('Product Name', 'N/A')}")
            print(f"  Category Name: {row.get('Category Name', 'N/A')}")
            print(f"  Order Status: {row.get('Order Status', 'N/A')}")
            print(f"  Delivery Status: {row.get('Delivery Status', 'N/A')}")
            print(f"  Days for shipping (real): {row.get('Days for shipping (real)', 'N/A')}")
            print(f"  Days for shipment (scheduled): {row.get('Days for shipment (scheduled)', 'N/A')}")
            print(f"  Order Country: {row.get('Order Country', 'N/A')}")
        else:
            break

print("\n" + "="*60)
print("CSV UNIQUE VALUE COUNTS")
print("="*60)

with open(CSV_FILE, 'r', encoding='latin1') as f:
    reader = csv.DictReader(f)
    
    unique_products = set()
    unique_categories = set()
    unique_statuses = set()
    unique_delivery_statuses = set()
    total_rows = 0
    
    for row in reader:
        total_rows += 1
        product = row.get('Product Name', '').strip()
        if product:
            unique_products.add(product)
        
        category = row.get('Category Name', '').strip()
        if category:
            unique_categories.add(category)
        
        status = row.get('Order Status', '').strip()
        if status:
            unique_statuses.add(status)
        
        delivery_status = row.get('Delivery Status', '').strip()
        if delivery_status:
            unique_delivery_statuses.add(delivery_status)

print(f"\nTotal rows in CSV: {total_rows}")
print(f"Unique products: {len(unique_products)}")
print(f"Unique categories: {len(unique_categories)}")
print(f"Unique order statuses: {len(unique_statuses)}")
print(f"Unique delivery statuses: {len(unique_delivery_statuses)}")

print(f"\nOrder statuses: {unique_statuses}")
print(f"Delivery statuses: {unique_delivery_statuses}")
print(f"Categories: {sorted(unique_categories)}")
