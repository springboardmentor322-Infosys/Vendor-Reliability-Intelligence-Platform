from fastapi import APIRouter
import psycopg2

router = APIRouter()


import os

def get_connection():
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_NAME = os.getenv("DB_NAME", "vendor_platform")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "Amruta@9279")
    DB_PORT = os.getenv("DB_PORT", "5432")
    return psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        port=DB_PORT
    )


@router.get("/category-risk")
def get_category_risk():

    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT
            id,
            category_name,
            total_orders,
            on_time_percentage,
            late_percentage,
            avg_shipping_days,
            avg_scheduled_days,
            avg_profit_ratio,
            avg_profit,
            risk_level
        FROM category_risk_analysis
        ORDER BY late_percentage DESC;
    """

    cursor.execute(query)

    rows = cursor.fetchall()

    result = []

    for row in rows:
        result.append({
            "id": row[0],
            "category_name": row[1],
            "total_orders": row[2],
            "on_time_percentage": float(row[3]),
            "late_percentage": float(row[4]),
            "avg_shipping_days": float(row[5]),
            "avg_scheduled_days": float(row[6]),
            "avg_profit_ratio": float(row[7]),
            "avg_profit": float(row[8]),
            "risk_level": row[9]
        })

    cursor.close()
    conn.close()

    return result