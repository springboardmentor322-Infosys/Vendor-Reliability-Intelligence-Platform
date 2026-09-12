import psycopg2
import sys
import os

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT_DIR, "backend"))
from db import DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT

conn = psycopg2.connect(host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASSWORD, port=DB_PORT)
cur = conn.cursor()

# 1. Total vendors
cur.execute("SELECT COUNT(*) FROM vendors")
total_vendors = cur.fetchone()[0]
print(f"TOTAL VENDORS IN DB: {total_vendors}")

# 2. Total users
cur.execute("SELECT COUNT(*) FROM users")
total_users = cur.fetchone()[0]
print(f"TOTAL USERS IN DB: {total_users}")

# 3. Vendor users count
cur.execute("SELECT COUNT(*) FROM users WHERE role = 'Vendor'")
vendor_users = cur.fetchone()[0]
print(f"TOTAL VENDOR USERS IN DB: {vendor_users}")

# 4. Check existing accounts preservation (Users 1, 7, 9)
cur.execute("""
    SELECT id, name, email, password, role, status, vendor_id
    FROM users
    WHERE id IN (1, 7, 9)
    ORDER BY id
""")
print("\nEXISTING ACCOUNTS VERIFICATION (Users 1, 7, 9):")
for u in cur.fetchall():
    print(f"  ID: {u[0]}, Name: {u[1]}, Email: {u[2]}, PW_Hash: {u[3][:15]}..., Role: {u[4]}, Status: {u[5]}, Vendor ID: {u[6]}")

# 5. Check missing links or unmapped vendor_id
cur.execute("SELECT COUNT(*) FROM users WHERE role = 'Vendor' AND vendor_id IS NULL")
unmapped_vendors = cur.fetchone()[0]
print(f"\nUNMAPPED VENDOR USERS: {unmapped_vendors}")

# 6. Check vendors without user account
cur.execute("""
    SELECT v.id, v.vendor_name 
    FROM vendors v 
    LEFT JOIN users u ON u.vendor_id = v.id AND u.role = 'Vendor'
    WHERE u.id IS NULL
""")
missing_vendors = cur.fetchall()
print(f"VENDORS WITHOUT USER ACCOUNT: {len(missing_vendors)}")

# 7. Check duplicate emails in users
cur.execute("SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1")
dup_emails = cur.fetchall()
print(f"DUPLICATE EMAILS: {dup_emails}")

# 8. Check password hash format on all users
cur.execute("SELECT COUNT(*) FROM users WHERE NOT (password LIKE '$2b$%')")
non_bcrypt = cur.fetchone()[0]
print(f"NON-BCRYPT PASSWORDS: {non_bcrypt}")

# 9. Sample of newly created vendor accounts
cur.execute("""
    SELECT id, name, email, role, status, vendor_id
    FROM users
    WHERE role = 'Vendor' AND id NOT IN (1, 7, 9)
    ORDER BY id ASC
    LIMIT 5
""")
print("\nSAMPLE NEWLY CREATED VENDOR ACCOUNTS:")
for u in cur.fetchall():
    print(f"  User ID: {u[0]}, Name: {u[1]}, Email: {u[2]}, Role: {u[3]}, Status: {u[4]}, Vendor ID: {u[5]}")

cur.close()
conn.close()
