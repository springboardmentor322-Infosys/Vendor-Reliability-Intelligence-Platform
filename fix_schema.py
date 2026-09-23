import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(
    host=os.getenv("DB_HOST", "localhost"),
    database=os.getenv("DB_NAME", "vendor_platform"),
    user=os.getenv("DB_USER", "postgres"),
    password=os.getenv("DB_PASSWORD"),
    port=os.getenv("DB_PORT", "5432")
)
cursor = conn.cursor()

# Check phone column
cursor.execute("SELECT character_maximum_length FROM information_schema.columns WHERE table_name='vendors' AND column_name='phone'")
result = cursor.fetchone()
print(f'Phone column max length: {result[0]}')

# Expand phone and email columns
try:
    cursor.execute("ALTER TABLE vendors ALTER COLUMN phone TYPE VARCHAR(30)")
    conn.commit()
    print("✓ Phone column expanded to 30")
except:
    conn.rollback()
    print("Phone column already sized")

try:
    cursor.execute("ALTER TABLE vendors ALTER COLUMN email TYPE VARCHAR(255)")
    conn.commit()
    print("✓ Email column expanded to 255")
except:
    conn.rollback()
    print("Email column already sized")

cursor.close()
conn.close()
