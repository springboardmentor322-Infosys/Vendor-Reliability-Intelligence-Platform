#!/usr/bin/env python3
"""
PHASE 4: GENERATE/UPDATE VENDORS WITH FAKER
Preserve existing vendor IDs to maintain foreign key relationships
Generate realistic vendor business data
"""

import psycopg2
from faker import Faker
import random

# Database connection
conn = psycopg2.connect(
    host="localhost",
    database="vendor_platform",
    user="postgres",
    password="Amruta@9279",
    port="5432"
)
cursor = conn.cursor()

# Faker setup with seed for deterministic generation
fake = Faker()
Faker.seed(42)  # Deterministic seed so results are reproducible
random.seed(42)

print("\n" + "="*70)
print("PHASE 4: VENDOR GENERATION WITH FAKER")
print("="*70)

# ============================================================
# SECTION 1: INSPECT EXISTING VENDORS
# ============================================================
print("\n[SECTION 1] INSPECT EXISTING VENDORS")
print("-" * 70)

cursor.execute("SELECT COUNT(*) FROM vendors")
existing_vendor_count = cursor.fetchone()[0]
print(f"Existing vendors: {existing_vendor_count}")

cursor.execute("SELECT id, vendor_name, company, category FROM vendors ORDER BY id")
existing_vendors = cursor.fetchall()
print("Current vendors:")
for vid, vname, company, category in existing_vendors:
    print(f"  ID:{vid}, Name:{vname}, Company:{company}, Category:{category}")

# Check foreign key references
cursor.execute("SELECT COUNT(DISTINCT vendor_id) FROM purchase_orders")
po_vendor_refs = cursor.fetchone()[0]
print(f"\nPurchase orders referencing vendors: {po_vendor_refs}")

cursor.execute("SELECT COUNT(DISTINCT vendor_id) FROM contracts")
contract_vendor_refs = cursor.fetchone()[0]
print(f"Contracts referencing vendors: {contract_vendor_refs}")

cursor.execute("SELECT COUNT(DISTINCT vendor_id) FROM vendor_performance_history")
history_vendor_refs = cursor.fetchone()[0]
print(f"Vendor performance history records: {history_vendor_refs}")

# ============================================================
# SECTION 2: VENDOR CATEGORIES
# ============================================================
print("\n[SECTION 2] VENDOR CATEGORIES")
print("-" * 70)

vendor_categories = [
    "Raw Material Supplier",
    "Component Manufacturer",
    "Electronics Supplier",
    "Logistics Partner",
    "IT Vendor",
    "Equipment Supplier",
    "Quality Inspection",
    "Packaging Supplier",
    "Maintenance Services",
    "Chemicals & Additives",
    "Metals & Alloys",
    "Textiles & Fabrics",
    "Machinery & Tools",
    "Consulting Services",
    "Logistics & Distribution"
]

print(f"Available categories: {len(vendor_categories)}")

# ============================================================
# SECTION 3: GENERATE REALISTIC VENDOR NAMES
# ============================================================
print("\n[SECTION 3] GENERATE VENDOR BUSINESS DATA")
print("-" * 70)

# Vendor name patterns for realistic generation
vendor_name_templates = [
    lambda: f"{fake.word().title()} {fake.word().title()} Supplies",
    lambda: f"{fake.word().title()} Industrial {fake.word().title()}",
    lambda: f"{fake.company_name().split(' Inc')[0]} Pvt Ltd",
    lambda: f"{fake.word().title()} {fake.word().title()} Solutions",
    lambda: f"Global {fake.word().title()} Industries",
    lambda: f"Premier {fake.word().title()} Enterprises",
    lambda: f"{fake.word().title()} {fake.word().title()} Manufacturing",
]

def generate_vendor_name():
    """Generate a realistic vendor name"""
    words = [fake.word() for _ in range(2)]
    suffixes = ['Supplies', 'Industries', 'Solutions', 'Pvt Ltd', 'Manufacturing', 'Services']
    return f"{words[0].title()} {words[1].title()} {random.choice(suffixes)}"

# ============================================================
# SECTION 4: UPDATE EXISTING VENDORS (Preserve IDs)
# ============================================================
print("\n[SECTION 4] UPDATE EXISTING VENDORS WITH FAKER DATA")
print("-" * 70)

updated_count = 0

for vid, old_name, old_company, old_category in existing_vendors:
    try:
        # Generate new realistic data
        new_vendor_name = generate_vendor_name()
        new_company = f"{fake.word().title()} {fake.word().title()} Corp"
        new_email = f"contact@{fake.word()}.com"
        new_phone = fake.phone_number()[:20]  # Limit phone length
        new_address = f"{fake.street_address()}, {fake.city()}, {fake.postcode()}"
        new_category = random.choice(vendor_categories)
        new_status = random.choice(['Active', 'Pending', 'Inactive'])
        
        # Update vendor
        cursor.execute("""
            UPDATE vendors
            SET vendor_name = %s,
                company = %s,
                email = %s,
                phone = %s,
                address = %s,
                category = %s,
                status = %s
            WHERE id = %s
        """, (new_vendor_name, new_company, new_email, new_phone, new_address, 
              new_category, new_status, vid))
        
        updated_count += 1
        print(f"✓ Vendor ID {vid}: {new_vendor_name}")
        
    except Exception as e:
        print(f"✗ Error updating vendor {vid}: {e}")

conn.commit()
print(f"\n✓ Vendors updated: {updated_count}")

# ============================================================
# SECTION 5: GENERATE ADDITIONAL VENDORS (Optional)
# ============================================================
print("\n[SECTION 5] GENERATE ADDITIONAL VENDORS")
print("-" * 70)

# Generate 20-30 additional vendors for realistic supply chain
target_vendor_count = random.randint(20, 30)
additional_vendors_needed = target_vendor_count - existing_vendor_count

print(f"Current vendors: {existing_vendor_count}")
print(f"Target vendor count: {target_vendor_count}")
print(f"Additional vendors to create: {additional_vendors_needed}")

new_vendor_ids = []

for i in range(additional_vendors_needed):
    try:
        new_vendor_name = generate_vendor_name()
        new_company = f"{fake.word().title()} {fake.word().title()} Corp"
        new_email = f"contact@{fake.word()}.com"
        new_phone = fake.phone_number()[:20]
        new_address = f"{fake.street_address()}, {fake.city()}, {fake.postcode()}"
        new_category = random.choice(vendor_categories)
        new_status = random.choice(['Active', 'Pending'])
        
        cursor.execute("""
            INSERT INTO vendors 
            (vendor_name, company, email, phone, address, category, status,
             reliability_score, quality_score, delivery_rate, total_orders, completed_orders)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 0, 0, 0, 0, 0)
        """, (new_vendor_name, new_company, new_email, new_phone, new_address,
              new_category, new_status))
        
        new_vendor_ids.append(new_vendor_name)
        print(f"✓ Created: {new_vendor_name}")
        
    except Exception as e:
        print(f"✗ Error creating vendor: {e}")

conn.commit()
print(f"\n✓ Additional vendors created: {len(new_vendor_ids)}")

# ============================================================
# SECTION 6: VALIDATION
# ============================================================
print("\n[SECTION 6] VALIDATION")
print("-" * 70)

cursor.execute("SELECT COUNT(*) FROM vendors")
total_vendors = cursor.fetchone()[0]
print(f"Total vendors in database: {total_vendors}")

cursor.execute("""
    SELECT id, vendor_name, company, category, status
    FROM vendors
    ORDER BY id
    LIMIT 10
""")

print("\nFirst 10 vendors:")
for vid, vname, company, category, status in cursor.fetchall():
    print(f"  ID:{vid}, Name:{vname}, Company:{company}")
    print(f"           Category:{category}, Status:{status}")

# Check that all existing FK references still work
cursor.execute("""
    SELECT COUNT(*) FROM purchase_orders
    WHERE vendor_id NOT IN (SELECT id FROM vendors)
""")
orphan_pos = cursor.fetchone()[0]
if orphan_pos == 0:
    print("\n✓ All purchase orders reference valid vendors")
else:
    print(f"\n✗ WARNING: {orphan_pos} purchase orders have invalid vendor references!")

cursor.execute("""
    SELECT COUNT(*) FROM contracts
    WHERE vendor_id NOT IN (SELECT id FROM vendors)
""")
orphan_contracts = cursor.fetchone()[0]
if orphan_contracts == 0:
    print("✓ All contracts reference valid vendors")
else:
    print(f"✗ WARNING: {orphan_contracts} contracts have invalid vendor references!")

# ============================================================
# SUMMARY
# ============================================================
print("\n" + "="*70)
print("PHASE 4 SUMMARY")
print("="*70)
print(f"Existing vendors updated:      {updated_count}")
print(f"New vendors created:           {len(new_vendor_ids)}")
print(f"Total vendors:                 {total_vendors}")
print(f"FK integrity (purchase orders): OK" if orphan_pos == 0 else f"FK ISSUE: {orphan_pos} orphans")
print(f"FK integrity (contracts):      OK" if orphan_contracts == 0 else f"FK ISSUE: {orphan_contracts} orphans")
print("="*70 + "\n")

print("✓ IMPORTANT: Vendor information generated by Faker is supporting business data.")
print("✓ This is realistic data because DataCo dataset does not contain vendor identifiers.\n")

cursor.close()
conn.close()

print("✓ Phase 4 complete - Vendors generated")
