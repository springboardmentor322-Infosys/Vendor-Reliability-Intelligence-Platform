import psycopg2
from db import conn

def migrate():
    try:
        conn.rollback()
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS budgets (
                    id SERIAL PRIMARY KEY,
                    department VARCHAR(100) NOT NULL,
                    allocated_amount NUMERIC(15, 2) NOT NULL,
                    used_amount NUMERIC(15, 2) DEFAULT 0.0,
                    financial_year VARCHAR(20) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            cur.execute("SELECT COUNT(*) FROM budgets WHERE LOWER(department) = 'procurement'")
            if cur.fetchone()[0] == 0:
                cur.execute("""
                    INSERT INTO budgets (department, allocated_amount, used_amount, financial_year)
                    VALUES ('Procurement', 5000000.00, 292000.00, '2026-2027')
                """)
                print("Created Procurement budget record (Rs 50,00,000 allocated)")
            else:
                print("Procurement budget already exists")
            
            cur.execute("SELECT COUNT(*) FROM purchase_orders WHERE (created_by IS NOT NULL OR dataco_order_id IS NULL) AND po_number LIKE 'PO-2026-%'")
            if cur.fetchone()[0] == 0:
                cur.execute("""
                    INSERT INTO purchase_orders 
                    (vendor_id, product_name, quantity, unit_price, total_amount, order_date, expected_delivery, status, po_number, created_by, created_at)
                    VALUES 
                    (24, 'Enterprise Server Rack Systems', 4, 25000.00, 100000.00, '2026-08-20', '2026-09-10', 'Approved', 'PO-2026-00101', 4, CURRENT_TIMESTAMP),
                    (208, 'Industrial Precision Tooling Kits', 10, 8500.00, 85000.00, '2026-08-25', '2026-09-12', 'Ordered', 'PO-2026-00102', 4, CURRENT_TIMESTAMP),
                    (715, 'Heavy Duty Logistics Pallet Units', 25, 4200.00, 105000.00, '2026-08-28', '2026-09-08', 'In-Transit', 'PO-2026-00103', 4, CURRENT_TIMESTAMP),
                    (666, 'Automated Conveyor Sensors', 50, 1500.00, 75000.00, '2026-09-02', '2026-09-20', 'Pending Approval', 'PO-2026-00104', 4, CURRENT_TIMESTAMP)
                """)
                print("Inserted 4 application workflow POs")
            else:
                print("Application workflow POs already exist")
            
            conn.commit()
            print("Migration completed successfully!")
    except Exception as e:
        conn.rollback()
        print("MIGRATION ERROR:", e)

if __name__ == "__main__":
    migrate()
