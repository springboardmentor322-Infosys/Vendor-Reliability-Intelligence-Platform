from fastapi import APIRouter
from db import conn, cursor

router = APIRouter()


@router.get("/vendor-reliability")
def get_vendor_reliability():

    try:
        conn.rollback()

        cursor.execute("""
            SELECT
                id,
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
            FROM vendor_reliability_data
            ORDER BY reliability_score DESC
        """)

        rows = cursor.fetchall()

        data = []

        for row in rows:
            data.append({
                "id": row[0],
                "vendor_name": row[1],
                "total_orders": row[2],
                "late_orders": row[3],
                "average_shipping_days": float(row[4]),
                "average_scheduled_days": float(row[5]),
                "total_sales": float(row[6]),
                "on_time_rate": float(row[7]),
                "late_delivery_rate": float(row[8]),
                "reliability_score": float(row[9]),
                "reliability_status": row[10]
            })

        return data

    except Exception as e:

        conn.rollback()

        print("VENDOR RELIABILITY ERROR:", e)

        return {
            "error": str(e)
        }