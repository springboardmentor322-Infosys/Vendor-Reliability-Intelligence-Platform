import os
import pandas as pd
from sqlalchemy import create_engine, inspect

# ==========================================================
# DATABASE CONFIGURATION
# ==========================================================

DATABASE_URL = "postgresql+psycopg2://postgres:Su26pr04aja@localhost:5432/Vendor-Reliability"

OUTPUT_FOLDER = "database_csv_export"

# ==========================================================
# CONNECT TO DATABASE
# ==========================================================

engine = create_engine(DATABASE_URL)

os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# ==========================================================
# GET ALL TABLES
# ==========================================================

inspector = inspect(engine)

tables = inspector.get_table_names()

print("=" * 70)
print("DATABASE CSV EXPORT")
print("=" * 70)

print(f"Tables found: {len(tables)}")

# ==========================================================
# EXPORT EACH TABLE
# ==========================================================

for table_name in tables:

    print(f"\nExporting: {table_name}")

    try:

        query = f'SELECT * FROM "{table_name}"'

        df = pd.read_sql(query, engine)

        file_path = os.path.join(
            OUTPUT_FOLDER,
            f"{table_name}.csv"
        )

        df.to_csv(
            file_path,
            index=False,
            encoding="utf-8-sig"
        )

        print(
            f"  ✓ {len(df)} rows exported"
        )

        print(
            f"  → {file_path}"
        )

    except Exception as e:

        print(
            f"  ✗ Failed: {e}"
        )

# ==========================================================
# COMPLETE
# ==========================================================

print("\n" + "=" * 70)
print("EXPORT COMPLETED")
print("=" * 70)

print(f"CSV files saved in: {OUTPUT_FOLDER}")