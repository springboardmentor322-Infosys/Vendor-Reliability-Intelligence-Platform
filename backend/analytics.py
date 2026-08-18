from fastapi import APIRouter, Depends, HTTPException
import psycopg2
import os
from auth import get_current_user, check_role

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# =========================================================
# DATABASE CONNECTION
# =========================================================

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


# =========================================================
# 1. ANALYTICS SUMMARY
# =========================================================

@router.get("/summary")
def get_analytics_summary(current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    user_vendor_id = current_user.get("vendor_id")

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Database source fields map:
        # - total_orders: COUNT(id)
        # - completed_orders: COUNT(order_status IN ('COMPLETE', 'CLOSED'))
        # - pending_orders: COUNT(order_status IN ('PENDING', 'PENDING_PAYMENT', 'PROCESSING', 'ON_HOLD', 'PAYMENT_REVIEW'))
        # - delivered_orders: COUNT(delivery_status IN ('Late delivery', 'Advance shipping', 'Shipping on time'))
        # - ordered_orders: COUNT(order_status = 'PROCESSING')
        # - total_spend: SUM(order_item_total)
        # - total_profit: SUM(benefit_per_order)
        # - avg_shipping_days: AVG(days_for_shipping_real)
        # - avg_scheduled_days: AVG(days_for_shipment_scheduled)
        # - late_delivery_count: COUNT(late_delivery_risk = 1)
        if user_role == "Vendor":
            if not user_vendor_id:
                return {
                    "total_vendors": 0,
                    "total_orders": 0,
                    "completed_orders": 0,
                    "pending_orders": 0,
                    "delivered_orders": 0,
                    "ordered_orders": 0,
                    "total_spend": 0.0,
                    "average_reliability": 0.0,
                    "total_profit": 0.0,
                    "avg_shipping_days": 0.0,
                    "on_time_delivery_percentage": 0.0,
                    "late_delivery_count": 0,
                    "late_delivery_risk_pct": 0.0,
                    "avg_scheduled_days": 0.0
                }
            query = """
                SELECT
                    1 AS total_vendors,
                    COUNT(id) AS total_orders,
                    COUNT(CASE WHEN LOWER(order_status) IN ('complete', 'closed') THEN 1 END) AS completed_orders,
                    COUNT(CASE WHEN LOWER(order_status) IN ('pending', 'pending_payment', 'processing', 'on_hold', 'payment_review') THEN 1 END) AS pending_orders,
                    COUNT(CASE WHEN LOWER(delivery_status) IN ('late delivery', 'advance shipping', 'shipping on time') THEN 1 END) AS delivered_orders,
                    COUNT(CASE WHEN LOWER(order_status) = 'processing' THEN 1 END) AS ordered_orders,
                    COALESCE(SUM(order_item_total), 0) AS total_spend,
                    COALESCE(SUM(benefit_per_order), 0) AS total_profit,
                    COALESCE(AVG(days_for_shipping_real), 0) AS avg_shipping_days,
                    COALESCE((COUNT(CASE WHEN late_delivery_risk = 0 THEN 1 END) * 100.0) / NULLIF(COUNT(*), 0), 0) AS on_time_delivery_percentage,
                    COUNT(CASE WHEN late_delivery_risk = 1 THEN 1 END) AS late_delivery_count,
                    COALESCE((COUNT(CASE WHEN late_delivery_risk = 1 THEN 1 END) * 100.0) / NULLIF(COUNT(*), 0), 0) AS late_risk_pct,
                    COALESCE(AVG(days_for_shipment_scheduled), 0) AS avg_scheduled_days
                FROM dataco_raw_orders
                WHERE product_card_id = %s;
            """
            cursor.execute(query, (user_vendor_id,))
            row = cursor.fetchone()
            
            cursor.execute("SELECT COALESCE(reliability_score, 0) FROM vendors WHERE id = %s", (user_vendor_id,))
            v_row = cursor.fetchone()
            avg_reliability = float(v_row[0]) if v_row else 0.0
        else:
            query = """
                SELECT
                    (SELECT COUNT(DISTINCT product_card_id) FROM dataco_raw_orders) AS total_vendors,
                    COUNT(id) AS total_orders,
                    COUNT(CASE WHEN LOWER(order_status) IN ('complete', 'closed') THEN 1 END) AS completed_orders,
                    COUNT(CASE WHEN LOWER(order_status) IN ('pending', 'pending_payment', 'processing', 'on_hold', 'payment_review') THEN 1 END) AS pending_orders,
                    COUNT(CASE WHEN LOWER(delivery_status) IN ('late delivery', 'advance shipping', 'shipping on time') THEN 1 END) AS delivered_orders,
                    COUNT(CASE WHEN LOWER(order_status) = 'processing' THEN 1 END) AS ordered_orders,
                    COALESCE(SUM(order_item_total), 0) AS total_spend,
                    COALESCE(SUM(benefit_per_order), 0) AS total_profit,
                    COALESCE(AVG(days_for_shipping_real), 0) AS avg_shipping_days,
                    COALESCE((COUNT(CASE WHEN late_delivery_risk = 0 THEN 1 END) * 100.0) / NULLIF(COUNT(*), 0), 0) AS on_time_delivery_percentage,
                    COUNT(CASE WHEN late_delivery_risk = 1 THEN 1 END) AS late_delivery_count,
                    COALESCE((COUNT(CASE WHEN late_delivery_risk = 1 THEN 1 END) * 100.0) / NULLIF(COUNT(*), 0), 0) AS late_risk_pct,
                    COALESCE(AVG(days_for_shipment_scheduled), 0) AS avg_scheduled_days
                FROM dataco_raw_orders;
            """
            cursor.execute(query)
            row = cursor.fetchone()
            
            cursor.execute("SELECT COALESCE(AVG(reliability_score), 0) FROM vendors")
            avg_reliability = float(cursor.fetchone()[0] or 0)

        if not row:
            return {
                "total_vendors": 0,
                "total_orders": 0,
                "completed_orders": 0,
                "pending_orders": 0,
                "delivered_orders": 0,
                "ordered_orders": 0,
                "total_spend": 0.0,
                "average_reliability": 0.0,
                "total_profit": 0.0,
                "avg_shipping_days": 0.0,
                "on_time_delivery_percentage": 0.0,
                "late_delivery_count": 0,
                "late_delivery_risk_pct": 0.0,
                "avg_scheduled_days": 0.0
            }

        return {
            "total_vendors": row[0] or 0,
            "total_orders": row[1] or 0,
            "completed_orders": row[2] or 0,
            "pending_orders": row[3] or 0,
            "delivered_orders": row[4] or 0,
            "ordered_orders": row[5] or 0,
            "total_spend": float(row[6] or 0),
            "average_reliability": avg_reliability,
            "total_profit": float(row[7] or 0),
            "avg_shipping_days": float(row[8] or 0),
            "on_time_delivery_percentage": float(row[9] or 0),
            "late_delivery_count": int(row[10] or 0),
            "late_delivery_risk_pct": float(row[11] or 0),
            "avg_scheduled_days": float(row[12] or 0)
        }

    except Exception as e:
        return {
            "error": str(e)
        }

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()



# =========================================================
# 2. CATEGORY RISK ANALYSIS
# =========================================================

@router.get("/category-risk")
def get_category_risk(current_user: dict = Depends(check_role(["Admin", "Procurement Manager", "Supply Chain Manager", "Finance Officer", "Auditor"]))):

    conn = None
    cursor = None

    try:
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
                risk_level,
                created_at
            FROM category_risk_analysis
            ORDER BY
                CASE risk_level
                    WHEN 'High Risk' THEN 1
                    WHEN 'Medium Risk' THEN 2
                    WHEN 'Low Risk' THEN 3
                    ELSE 4
                END,
                late_percentage DESC;
        """

        cursor.execute(query)

        rows = cursor.fetchall()

        result = []

        for row in rows:
            result.append({
                "id": row[0],
                "category_name": row[1],
                "total_orders": row[2],
                "on_time_percentage": float(row[3]) if row[3] is not None else 0,
                "late_percentage": float(row[4]) if row[4] is not None else 0,
                "avg_shipping_days": float(row[5]) if row[5] is not None else 0,
                "avg_scheduled_days": float(row[6]) if row[6] is not None else 0,
                "avg_profit_ratio": float(row[7]) if row[7] is not None else 0,
                "avg_profit": float(row[8]) if row[8] is not None else 0,
                "risk_level": row[9],
                "created_at": row[10].isoformat() if row[10] else None
            })

        return {
            "total_categories": len(result),
            "data": result
        }

    except Exception as e:
        return {
            "error": str(e)
        }

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@router.get("/vendor-risk")
def get_vendor_risk(current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    user_vendor_id = current_user.get("vendor_id")

    conn = get_connection()
    cursor = conn.cursor()

    try:
        if user_role == "Vendor":
            if not user_vendor_id:
                return {"total_vendors": 0, "data": []}
            
            query = """
                SELECT
                    v.id,
                    v.vendor_name,
                    COALESCE(vrd.total_orders, v.total_orders, 0) AS total_orders,
                    COALESCE(vrd.late_orders, 0) AS late_orders,
                    COALESCE(vrd.average_shipping_days, 0) AS average_shipping_days,
                    COALESCE(vrd.average_scheduled_days, 0) AS average_scheduled_days,
                    COALESCE(vrd.total_sales, 0) AS total_sales,
                    COALESCE(vrd.on_time_rate, v.delivery_rate, 0) AS on_time_rate,
                    COALESCE(vrd.late_delivery_rate, 100 - v.delivery_rate, 0) AS late_delivery_rate,
                    v.reliability_score,
                    COALESCE(vrd.reliability_status, 'Poor') AS reliability_status
                FROM vendors v
                LEFT JOIN vendor_reliability_data vrd ON v.id = vrd.id
                WHERE v.id = %s
                ORDER BY v.reliability_score ASC;
            """
            cursor.execute(query, (user_vendor_id,))
        else:
            query = """
                SELECT
                    v.id,
                    v.vendor_name,
                    COALESCE(vrd.total_orders, v.total_orders, 0) AS total_orders,
                    COALESCE(vrd.late_orders, 0) AS late_orders,
                    COALESCE(vrd.average_shipping_days, 0) AS average_shipping_days,
                    COALESCE(vrd.average_scheduled_days, 0) AS average_scheduled_days,
                    COALESCE(vrd.total_sales, 0) AS total_sales,
                    COALESCE(vrd.on_time_rate, v.delivery_rate, 0) AS on_time_rate,
                    COALESCE(vrd.late_delivery_rate, 100 - v.delivery_rate, 0) AS late_delivery_rate,
                    v.reliability_score,
                    COALESCE(vrd.reliability_status, 'Poor') AS reliability_status
                FROM vendors v
                LEFT JOIN vendor_reliability_data vrd ON v.id = vrd.id
                ORDER BY v.reliability_score ASC;
            """
            cursor.execute(query)

        rows = cursor.fetchall()

        result = []

        for row in rows:
            result.append({
                "id": row[0],
                "vendor_name": row[1],
                "total_orders": row[2],
                "late_orders": row[3],
                "average_shipping_days": float(row[4]) if row[4] is not None else 0,
                "average_scheduled_days": float(row[5]) if row[5] is not None else 0,
                "total_sales": float(row[6]) if row[6] is not None else 0,
                "on_time_rate": float(row[7]) if row[7] is not None else 0,
                "late_delivery_rate": float(row[8]) if row[8] is not None else 0,
                "reliability_score": float(row[9]) if row[9] is not None else 0,
                "reliability_status": row[10]
            })

        return {
            "total_vendors": len(result),
            "data": result
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        cursor.close()
        conn.close()


# =========================================================
# 4. EXTRA DISTRIBUTION APIS
# =========================================================

@router.get("/order-status-distribution")
def get_order_status_distribution(current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    user_vendor_id = current_user.get("vendor_id")
    conn = get_connection()
    cursor = conn.cursor()
    try:
        if user_role == "Vendor":
            if not user_vendor_id:
                return []
            cursor.execute("""
                SELECT order_status, COUNT(*) 
                FROM dataco_raw_orders 
                WHERE product_card_id = %s
                GROUP BY order_status 
                ORDER BY COUNT(*) DESC;
            """, (user_vendor_id,))
        else:
            cursor.execute("""
                SELECT order_status, COUNT(*) 
                FROM dataco_raw_orders 
                GROUP BY order_status 
                ORDER BY COUNT(*) DESC;
            """)
        rows = cursor.fetchall()
        return [{"status": row[0], "count": row[1]} for row in rows]
    except Exception as e:
        return {"error": str(e)}
    finally:
        cursor.close()
        conn.close()


@router.get("/delivery-status-distribution")
def get_delivery_status_distribution(current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    user_vendor_id = current_user.get("vendor_id")
    conn = get_connection()
    cursor = conn.cursor()
    try:
        if user_role == "Vendor":
            if not user_vendor_id:
                return []
            cursor.execute("""
                SELECT delivery_status, COUNT(*) 
                FROM dataco_raw_orders 
                WHERE product_card_id = %s
                GROUP BY delivery_status 
                ORDER BY COUNT(*) DESC;
            """, (user_vendor_id,))
        else:
            cursor.execute("""
                SELECT delivery_status, COUNT(*) 
                FROM dataco_raw_orders 
                GROUP BY delivery_status 
                ORDER BY COUNT(*) DESC;
            """)
        rows = cursor.fetchall()
        return [{"delivery_status": row[0], "count": row[1]} for row in rows]
    except Exception as e:
        return {"error": str(e)}
    finally:
        cursor.close()
        conn.close()


@router.get("/category-orders-distribution")
def get_category_orders_distribution(current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    user_vendor_id = current_user.get("vendor_id")
    conn = get_connection()
    cursor = conn.cursor()
    try:
        if user_role == "Vendor":
            if not user_vendor_id:
                return []
            cursor.execute("""
                SELECT category_name, COUNT(*) 
                FROM dataco_raw_orders 
                WHERE product_card_id = %s
                GROUP BY category_name 
                ORDER BY COUNT(*) DESC;
            """, (user_vendor_id,))
        else:
            cursor.execute("""
                SELECT category_name, COUNT(*) 
                FROM dataco_raw_orders 
                GROUP BY category_name 
                ORDER BY COUNT(*) DESC;
            """)
        rows = cursor.fetchall()
        return [{"category": row[0], "count": row[1]} for row in rows]
    except Exception as e:
        return {"error": str(e)}
    finally:
        cursor.close()
        conn.close()


@router.get("/category-sales-distribution")
def get_category_sales_distribution(current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    user_vendor_id = current_user.get("vendor_id")
    conn = get_connection()
    cursor = conn.cursor()
    try:
        if user_role == "Vendor":
            if not user_vendor_id:
                return []
            cursor.execute("""
                SELECT category_name, SUM(sales) 
                FROM dataco_raw_orders 
                WHERE product_card_id = %s
                GROUP BY category_name 
                ORDER BY SUM(sales) DESC;
            """, (user_vendor_id,))
        else:
            cursor.execute("""
                SELECT category_name, SUM(sales) 
                FROM dataco_raw_orders 
                GROUP BY category_name 
                ORDER BY SUM(sales) DESC;
            """)
        rows = cursor.fetchall()
        return [{"category": row[0], "sales": float(row[1] or 0)} for row in rows]
    except Exception as e:
        return {"error": str(e)}
    finally:
        cursor.close()
        conn.close()
