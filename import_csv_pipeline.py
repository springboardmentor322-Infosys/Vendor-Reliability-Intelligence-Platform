import pandas as pd
import numpy as np
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime, timedelta
import sys

CSV_PATH = "data/DataCoSupplyChainDataset.csv"
DB_CONFIG = {
    "host": "localhost",
    "database": "vendor_platform",
    "user": "postgres",
    "password": "Amruta@9279",
    "port": "5432"
}

def parse_date(value):
    if pd.isna(value) or not str(value).strip():
        return None
    val_str = str(value).strip()
    for fmt in ["%m/%d/%Y %H:%M", "%m/%d/%Y %H:%M:%S", "%Y-%m-%d %H:%M:%S"]:
        try:
            return datetime.strptime(val_str, fmt)
        except ValueError:
            continue
    return None

def main():
    print("Connecting to PostgreSQL...")
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    print("Database connected.")

    # 1. Reset old business/demo data (Preserve users/auth)
    print("Resetting old business/demo tables...")
    cur.execute("""
        TRUNCATE TABLE 
            communications,
            contracts,
            purchase_requests,
            vendor_performance_history,
            vendor_reliability_data,
            deliveries,
            quality_inspections,
            vendor_products,
            purchase_orders,
            products,
            vendors,
            category_risk_analysis
        RESTART IDENTITY CASCADE;
    """)
    cur.execute("""
        ALTER TABLE category_risk_analysis 
        DROP CONSTRAINT IF EXISTS unique_category_name;
    """)
    cur.execute("""
        ALTER TABLE category_risk_analysis 
        ADD CONSTRAINT unique_category_name UNIQUE (category_name);
    """)
    conn.commit()
    print("Database reset complete.")

    # 2. Read and verify CSV
    print(f"Reading CSV from {CSV_PATH}...")
    df = pd.read_csv(CSV_PATH, encoding="latin1")
    total_rows = len(df)
    print(f"Verified CSV Rows: {total_rows}")
    
    # Verify Order Item Id uniqueness
    unique_items = df["Order Item Id"].nunique()
    print(f"Verified Unique Order Item Ids: {unique_items}")
    if unique_items != total_rows:
        print("CRITICAL: Order Item Id is NOT unique!")
        sys.exit(1)

    # Convert date columns to pandas datetime objects
    df["order_datetime"] = df["order date (DateOrders)"].apply(parse_date)
    df["shipping_datetime"] = df["shipping date (DateOrders)"].apply(parse_date)

    # 3. Import Products
    print("Extracting unique products...")
    # Group by Product Card Id to get unique products
    prod_groups = df.groupby("Product Card Id").agg({
        "Product Name": "first",
        "Category Id": "first",
        "Category Name": "first",
        "Product Price": "max" # Using max price in case of small variations
    }).reset_index()

    print(f"Found {len(prod_groups)} unique products. Inserting into database...")
    product_insert_query = """
        INSERT INTO products (product_card_id, product_name, category_id, category_name, product_price, source)
        VALUES %s
    """
    product_data = [
        (
            int(row["Product Card Id"]),
            str(row["Product Name"]).strip(),
            int(row["Category Id"]),
            str(row["Category Name"]).strip(),
            float(row["Product Price"]),
            "DataCo"
        )
        for _, row in prod_groups.iterrows()
    ]
    execute_values(cur, product_insert_query, product_data)
    conn.commit()

    # Load products map (product_card_id -> id)
    cur.execute("SELECT id, product_card_id FROM products")
    products_map = {row[1]: row[0] for row in cur.fetchall()}
    print(f"Products loaded into memory: {len(products_map)}")

    # 4. Calculate deterministic metrics for Vendors (Product Card Id is Vendor Proxy)
    print("Calculating derived vendor metrics per Product Card Id...")
    vendor_data = []
    vendor_reliability_rows = []
    
    grouped_vendors = df.groupby("Product Card Id")
    for prod_card_id, group in grouped_vendors:
        total_items = len(group)
        total_orders = len(group)
        
        # Completed Orders (transaction item rows) where order status is COMPLETE or CLOSED
        completed_orders = len(group[group["Order Status"].isin(["COMPLETE", "CLOSED"])])
        completion_rate = (completed_orders / total_orders * 100) if total_orders > 0 else 0
        
        # Delivery Rate: percentage of items where Late_delivery_risk is 0
        on_time_items = len(group[group["Late_delivery_risk"] == 0])
        delivery_rate = (on_time_items / total_items * 100) if total_items > 0 else 0
        
        # Derived Quality Score: percentage of items that are not Canceled and not Shipping canceled
        good_quality_items = len(group[
            (group["Order Status"] != "CANCELED") & 
            (group["Delivery Status"] != "Shipping canceled")
        ])
        derived_quality_score = (good_quality_items / total_items * 100) if total_items > 0 else 0
        
        # Reliability = Quality*0.5 + DeliveryRate*0.3 + CompletionRate*0.2
        reliability_score = derived_quality_score * 0.5 + delivery_rate * 0.3 + completion_rate * 0.2
        
        # Category of product for this vendor proxy
        category_name = str(group["Category Name"].iloc[0]).strip()
        
        # Risk level logic
        if reliability_score >= 90 and delivery_rate >= 90:
            risk_level = "Low Risk"
        elif reliability_score >= 75 and delivery_rate >= 75:
            risk_level = "Medium Risk"
        else:
            risk_level = "High Risk"
            
        reliability_status = "Excellent" if reliability_score >= 90 else "Good" if reliability_score >= 75 else "Average" if reliability_score >= 60 else "Poor"
        
        vendor_data.append((
            int(prod_card_id), # Set vendor ID to product_card_id directly
            f"Derived Vendor Proxy {prod_card_id}",
            reliability_score,
            derived_quality_score,
            delivery_rate,
            total_orders,
            completed_orders,
            category_name,
            "Active",
            risk_level
        ))
        
        # For vendor_reliability_data table
        late_items = len(group[group["Late_delivery_risk"] == 1])
        avg_shipping_days = float(group["Days for shipping (real)"].mean())
        avg_scheduled_days = float(group["Days for shipment (scheduled)"].mean())
        total_sales = float(group["Order Item Total"].sum())
        late_delivery_rate = 100.0 - delivery_rate
        
        vendor_reliability_rows.append((
            int(prod_card_id),
            f"Derived Vendor Proxy {prod_card_id}",
            total_orders,
            late_items,
            avg_shipping_days,
            avg_scheduled_days,
            total_sales,
            delivery_rate,
            late_delivery_rate,
            reliability_score,
            reliability_status
        ))

    print(f"Inserting {len(vendor_data)} derived vendors into database...")
    # Insert vendors
    vendor_insert_query = """
        INSERT INTO vendors (
            id, vendor_name, reliability_score, quality_score, delivery_rate,
            total_orders, completed_orders, category, status, risk_level
        )
        VALUES %s
    """
    execute_values(cur, vendor_insert_query, vendor_data)
    conn.commit()
    
    # Insert vendor_reliability_data
    print("Inserting vendor reliability data...")
    reliability_insert_query = """
        INSERT INTO vendor_reliability_data (
            id, vendor_name, total_orders, late_orders, average_shipping_days,
            average_scheduled_days, total_sales, on_time_rate, late_delivery_rate,
            reliability_score, reliability_status
        )
        VALUES %s
    """
    execute_values(cur, reliability_insert_query, vendor_reliability_rows)
    conn.commit()

    # 5. Insert Vendor Product mappings (1-to-1 mapping)
    print("Creating vendor product mappings...")
    vendor_products_data = []
    for prod_card_id, prod_id in products_map.items():
        # Get base product price
        prod_row = prod_groups[prod_groups["Product Card Id"] == prod_card_id].iloc[0]
        base_price = float(prod_row["Product Price"])
        vendor_products_data.append((
            int(prod_card_id), # vendor_id
            int(prod_id),      # product_id
            f"VP-{prod_card_id}",
            base_price,
            7, # lead time
            True # is primary vendor
        ))
    
    vp_insert_query = """
        INSERT INTO vendor_products (vendor_id, product_id, vendor_product_code, unit_price, lead_time_days, is_primary_vendor)
        VALUES %s
    """
    execute_values(cur, vp_insert_query, vendor_products_data)
    conn.commit()

    # 6. Calculate category risk metrics
    print("Calculating category risk metrics...")
    category_groups = df.groupby("Category Name")
    category_risk_data = []
    for cat_name, group in category_groups:
        total_items = len(group)
        total_orders = len(group)
        on_time_items = len(group[group["Late_delivery_risk"] == 0])
        late_items = len(group[group["Late_delivery_risk"] == 1])
        on_time_pct = (on_time_items / total_items * 100) if total_items > 0 else 0
        late_pct = (late_items / total_items * 100) if total_items > 0 else 0
        avg_shipping = float(group["Days for shipping (real)"].mean())
        avg_scheduled = float(group["Days for shipment (scheduled)"].mean())
        avg_profit_ratio = float(group["Order Item Profit Ratio"].mean())
        avg_profit = float(group["Benefit per order"].mean())
        
        # Risk level based on late percentage
        if late_pct > 60:
            risk = "High Risk"
        elif late_pct > 40:
            risk = "Medium Risk"
        else:
            risk = "Low Risk"
            
        category_risk_data.append((
            str(cat_name).strip(),
            total_orders,
            on_time_pct,
            late_pct,
            avg_shipping,
            avg_scheduled,
            avg_profit_ratio,
            avg_profit,
            risk
        ))
        
    cat_risk_insert_query = """
        INSERT INTO category_risk_analysis (
            category_name, total_orders, on_time_percentage, late_percentage,
            avg_shipping_days, avg_scheduled_days, avg_profit_ratio, avg_profit, risk_level
        )
        VALUES %s
    """
    execute_values(cur, cat_risk_insert_query, category_risk_data)
    conn.commit()

    # 7. Bulk Import Order Items into purchase_orders and deliveries
    print("Preparing bulk purchase order items...")
    po_records = []
    delivery_records = []
    
    for idx, row in df.iterrows():
        prod_card_id = int(row["Product Card Id"])
        prod_id = products_map[prod_card_id]
        
        order_date_dt = row["order_datetime"]
        order_date_str = order_date_dt.strftime("%Y-%m-%d") if order_date_dt else None
        
        scheduled_days = int(row["Days for shipment (scheduled)"])
        expected_delivery_dt = order_date_dt + timedelta(days=scheduled_days) if order_date_dt else None
        expected_delivery_str = expected_delivery_dt.strftime("%Y-%m-%d") if expected_delivery_dt else None
        
        # Status normalization mapping
        os = row["Order Status"]
        if os == "COMPLETE":
            status = "Completed"
        elif os == "CLOSED":
            status = "Delivered"
        elif os in ["PENDING", "PENDING_PAYMENT", "PAYMENT_REVIEW", "PROCESSING", "ON_HOLD"]:
            status = "Pending"
        elif os == "CANCELED":
            status = "Canceled"
        elif os == "SUSPECTED_FRAUD":
            status = "Fraud"
        else:
            status = "Pending"
            
        qty = int(row["Order Item Quantity"])
        price = float(row["Order Item Product Price"])
        total_amt = float(row["Order Item Total"])
        order_id = int(row["Order Id"])
        item_id = int(row["Order Item Id"])
        
        po_records.append((
            prod_card_id, # vendor_id (Derived Vendor Proxy)
            str(row["Product Name"]).strip(),
            qty,
            price,
            total_amt,
            order_date_str,
            expected_delivery_str,
            status,
            prod_id,
            order_id,
            item_id,
            f"PO-{order_id}-{item_id}",
            expected_delivery_dt,
            row["shipping_datetime"],
            os
        ))
        
        # Delivery record
        delivery_records.append((
            order_id,
            item_id,
            prod_card_id,
            prod_id,
            qty,
            price,
            str(row["Shipping Mode"]),
            row["shipping_datetime"],
            expected_delivery_dt,
            row["shipping_datetime"],
            scheduled_days,
            float(row["Days for shipping (real)"]),
            str(row["Delivery Status"]),
            int(row["Late_delivery_risk"]),
            bool(row["Late_delivery_risk"] == 0)
        ))

    print(f"Bulk inserting {len(po_records)} records into purchase_orders...")
    po_insert_query = """
        INSERT INTO purchase_orders (
            vendor_id, product_name, quantity, unit_price, total_amount,
            order_date, expected_delivery, status, product_id, dataco_order_id,
            order_item_id, po_number, expected_delivery_date, actual_delivery_date, order_status
        )
        VALUES %s
    """
    # Inserting in chunks of 10000 for safety/speed
    chunk_size = 10000
    for i in range(0, len(po_records), chunk_size):
        chunk = po_records[i:i+chunk_size]
        execute_values(cur, po_insert_query, chunk)
        conn.commit()
        print(f"  Inserted purchase orders {i} to {i+len(chunk)}")
        
    print(f"Bulk inserting {len(delivery_records)} records into deliveries...")
    delivery_insert_query = """
        INSERT INTO deliveries (
            dataco_order_id, dataco_order_item_id, vendor_id, product_id,
            quantity, unit_price, shipping_mode, shipping_date,
            expected_delivery_date, actual_delivery_date, scheduled_days,
            actual_days, delivery_status, late_delivery_risk, is_on_time
        )
        VALUES %s
    """
    for i in range(0, len(delivery_records), chunk_size):
        chunk = delivery_records[i:i+chunk_size]
        execute_values(cur, delivery_insert_query, chunk)
        conn.commit()
        print(f"  Inserted deliveries {i} to {i+len(chunk)}")

    # Verify counts in DB
    print("\nVerifying database counts...")
    cur.execute("SELECT COUNT(*) FROM vendors")
    db_vendors = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM products")
    db_products = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM purchase_orders")
    db_pos = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM deliveries")
    db_deliveries = cur.fetchone()[0]
    cur.execute("SELECT COUNT(DISTINCT dataco_order_id) FROM purchase_orders")
    db_orders = cur.fetchone()[0]
    
    print("========== PIPELINE VERIFICATION ==========")
    print(f"Database Vendors: {db_vendors}")
    print(f"Database Products: {db_products}")
    print(f"Database Order Items (PO): {db_pos}")
    print(f"Database Deliveries: {db_deliveries}")
    print(f"Database Unique Orders: {db_orders}")
    print("===========================================")
    
    # Run quality inspections generation
    print("\nGenerating quality inspections...")
    try:
        import os
        sys.path.insert(0, os.path.abspath("backend"))
        import generate_quality_inspections
        generate_quality_inspections.main()
    except Exception as e:
        print("Error generating quality inspections:", e)

    cur.close()
    conn.close()
    print("Database connection closed.")

if __name__ == "__main__":
    main()
