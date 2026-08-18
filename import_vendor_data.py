import pandas as pd
import psycopg2

# Read analyzed CSV
df = pd.read_csv(
    "data/vendor_reliability_analysis.csv"
)

print("CSV loaded successfully")
print("Total vendors:", len(df))

# PostgreSQL connection
conn = psycopg2.connect(
    host="localhost",
    database="vendor_platform",
    user="postgres",
    password="Amruta@9279",
    port="5432"
)

cursor = conn.cursor()

print("PostgreSQL connected successfully")

# Insert records
for _, row in df.iterrows():

    cursor.execute("""
        INSERT INTO vendor_reliability_data (
            vendor_name,
            total_orders,
            late_orders,
            average_shipping_days,
            average_scheduled_days,
            total_sales,
            on_time_rate,
            late_delivery_rate,
            reliability_score,
            reliability_status
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """, (
        row["Vendor"],
        int(row["total_orders"]),
        int(row["late_orders"]),
        float(row["average_shipping_days"]),
        float(row["average_scheduled_days"]),
        float(row["total_sales"]),
        float(row["on_time_rate"]),
        float(row["late_delivery_rate"]),
        float(row["reliability_score"]),
        row["reliability_status"]
    ))

conn.commit()

print("Vendor reliability data inserted successfully!")

cursor.close()
conn.close()

print("Database connection closed.")