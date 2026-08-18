import random
from datetime import date, timedelta

import psycopg2


DB_CONFIG = {
    "host": "localhost",
    "database": "vendor_platform",
    "user": "postgres",
    "password": "Amruta@9279",
    "port": "5432",
}

RANDOM_SEED = 42
random.seed(RANDOM_SEED)


def main():
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    print("Database connected successfully.")

    # One stable record per vendor-product combination.
    cursor.execute("""
        SELECT
            vp.vendor_id,
            vp.product_id,
            MIN(po.id) AS purchase_order_id,
            MIN(po.order_date) AS order_date,
            SUM(po.quantity) AS total_quantity
        FROM vendor_products vp
        JOIN purchase_orders po
            ON po.vendor_id = vp.vendor_id
           AND po.product_id = vp.product_id
        WHERE po.dataco_order_id IS NOT NULL
        GROUP BY
            vp.vendor_id,
            vp.product_id
        ORDER BY
            vp.vendor_id,
            vp.product_id
    """)

    combinations = cursor.fetchall()

    print(
        f"Vendor-product combinations found: {len(combinations)}"
    )

    inserted = 0
    skipped = 0

    for (
        vendor_id,
        product_id,
        purchase_order_id,
        order_date,
        total_quantity,
    ) in combinations:

        # Do not create duplicates.
        cursor.execute("""
            SELECT 1
            FROM quality_inspections
            WHERE vendor_id = %s
              AND product_id = %s
              AND purchase_order_id = %s
            LIMIT 1
        """, (
            vendor_id,
            product_id,
            purchase_order_id,
        ))

        if cursor.fetchone():
            skipped += 1
            continue

        inspected = max(
            10,
            min(int(total_quantity or 100), 100)
        )

        # Deterministic realistic defect rate: 1% to 12%.
        defect_rate = random.uniform(1.0, 12.0)

        failed = round(
            inspected * defect_rate / 100
        )

        # Keep at least one passed unit.
        failed = min(
            failed,
            inspected - 1
        )

        passed = inspected - failed

        actual_defect_rate = round(
            (failed / inspected) * 100,
            2
        )

        quality_score = round(
            (passed / inspected) * 100,
            2
        )

        if quality_score >= 95:
            inspection_status = "Passed"
            remarks = "Quality within acceptable limits."
        elif quality_score >= 85:
            inspection_status = "Accepted with Minor Issues"
            remarks = "Minor defects detected."
        else:
            inspection_status = "Review Required"
            remarks = "Quality inspection requires review."

        inspection_date = (
            order_date or date.today()
        )

        cursor.execute("""
            INSERT INTO quality_inspections (
                vendor_id,
                product_id,
                purchase_order_id,
                inspection_date,
                quantity_inspected,
                quantity_passed,
                quantity_failed,
                defect_rate,
                quality_score,
                inspection_status,
                remarks
            )
            VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s
            )
        """, (
            vendor_id,
            product_id,
            purchase_order_id,
            inspection_date,
            inspected,
            passed,
            failed,
            actual_defect_rate,
            quality_score,
            inspection_status,
            remarks,
        ))

        inserted += 1

    conn.commit()

    print("\n========== QUALITY IMPORT SUMMARY ==========")
    print(
        f"Found combinations: {len(combinations)}"
    )
    print(
        f"Inserted inspections: {inserted}"
    )
    print(
        f"Skipped duplicates: {skipped}"
    )

    cursor.execute("""
        SELECT COUNT(*)
        FROM quality_inspections
    """)

    print(
        "Total quality inspections:",
        cursor.fetchone()[0]
    )

    cursor.close()
    conn.close()

    print("Database connection closed.")


if __name__ == "__main__":
    main()