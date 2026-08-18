from datetime import date
from fastapi import APIRouter, HTTPException, Depends
from db import conn
from auth import get_current_user

router = APIRouter()



def calculate_vendor_reliability(vendor_id):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            # Check vendor exists
            cursor.execute("SELECT id FROM vendors WHERE id = %s", (vendor_id,))
            if not cursor.fetchone():
                return None

            cursor.execute(
                """
                SELECT
                    COUNT(po.id) AS total_orders,
                    COUNT(CASE WHEN LOWER(po.status) IN ('canceled', 'cancelled') THEN 1 END) AS canceled_orders,
                    COUNT(CASE WHEN LOWER(po.status) = 'fraud' THEN 1 END) AS fraud_orders,
                    COUNT(CASE WHEN d.late_delivery_risk = 0 THEN 1 END) AS on_time_orders,
                    COUNT(CASE WHEN LOWER(po.status) IN ('completed', 'delivered') THEN 1 END) AS completed_orders
                FROM purchase_orders po
                LEFT JOIN deliveries d ON po.order_item_id = d.dataco_order_item_id
                WHERE po.vendor_id = %s
                """,
                (vendor_id,),
            )

            row = cursor.fetchone() or (0, 0, 0, 0, 0)
            total = int(row[0] or 0)
            canceled = int(row[1] or 0)
            fraud = int(row[2] or 0)
            on_time = int(row[3] or 0)
            completed = int(row[4] or 0)

            if total == 0:
                quality_score = 0.0
                delivery_rate = 0.0
                completion_rate = 0.0
                reliability_score = 0.0
                risk_level = "Critical Risk"
                reliability_status = "Poor"
            else:
                quality_score = ((total - canceled - fraud) / total) * 100.0
                delivery_rate = (on_time / total) * 100.0
                completion_rate = (completed / total) * 100.0
                reliability_score = (quality_score * 0.5) + (delivery_rate * 0.3) + (completion_rate * 0.2)
                
                # Centralized Thresholds
                if reliability_score >= 80:
                    risk_level = "Low Risk"
                    reliability_status = "Excellent"
                elif reliability_score >= 70:
                    risk_level = "Medium Risk"
                    reliability_status = "Good"
                elif reliability_score >= 60:
                    risk_level = "High Risk"
                    reliability_status = "Average"
                else:
                    risk_level = "Critical Risk"
                    reliability_status = "Poor"

            final_score = round(reliability_score, 2)

            cursor.execute(
                """
                UPDATE vendors
                SET 
                    quality_score = %s,
                    delivery_rate = %s,
                    total_orders = %s,
                    completed_orders = %s,
                    reliability_score = %s,
                    risk_level = %s
                WHERE id = %s
                """,
                (
                    round(quality_score, 2),
                    round(delivery_rate, 2),
                    total,
                    completed,
                    final_score,
                    risk_level,
                    vendor_id
                ),
            )
            
            cursor.execute(
                """
                UPDATE vendor_reliability_data
                SET
                    total_orders = %s,
                    on_time_rate = %s,
                    reliability_score = %s,
                    reliability_status = %s
                WHERE id = %s
                """,
                (
                    total,
                    round(delivery_rate, 2),
                    final_score,
                    reliability_status,
                    vendor_id
                ),
            )
            conn.commit()

        return final_score

    except Exception as exc:
        conn.rollback()
        print("RELIABILITY CALCULATION ERROR:", exc)
        return None


def _performance_level(reliability_score):
    if reliability_score >= 80:
        return "Excellent"
    if reliability_score >= 70:
        return "Good"
    if reliability_score >= 60:
        return "Average"
    return "Poor"


def _risk_level(reliability_score, delivery_rate=None):
    if reliability_score >= 80:
        return "Low Risk"
    if reliability_score >= 70:
        return "Medium Risk"
    if reliability_score >= 60:
        return "High Risk"
    return "Critical Risk"


def _recommendation(risk):
    if risk == "Low Risk":
        return "Preferred Vendor"
    if risk == "Medium Risk":
        return "Monitor Vendor"
    return "Review Vendor"


def save_vendor_performance_history(vendor_id):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    quality_score,
                    delivery_rate,
                    reliability_score
                FROM vendors
                WHERE id = %s
                """,
                (vendor_id,),
            )

            vendor = cursor.fetchone()
            if not vendor:
                return

            quality_score = float(vendor[0] or 0)
            delivery_rate = float(vendor[1] or 0)
            reliability_score = float(vendor[2] or 0)

            cursor.execute(
                """
                SELECT 1
                FROM vendor_performance_history
                WHERE vendor_id = %s
                  AND recorded_date = %s
                """,
                (vendor_id, date.today()),
            )

            if cursor.fetchone():
                return

            cursor.execute(
                """
                INSERT INTO vendor_performance_history
                    (vendor_id, quality_score, delivery_rate, reliability_score, recorded_date)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    vendor_id,
                    quality_score,
                    delivery_rate,
                    reliability_score,
                    date.today(),
                ),
            )
            conn.commit()

    except Exception as exc:
        conn.rollback()
        print("HISTORY SAVE ERROR:", exc)


@router.get("/vendor-performance")
def get_vendor_performance(current_user: dict = Depends(get_current_user)):
    try:
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")

        conn.rollback()
        with conn.cursor() as cursor:
            if user_role == "Vendor":
                if not user_vendor_id:
                    return []
                cursor.execute(
                    """
                    SELECT
                        v.id AS vendor_id,
                        v.vendor_name,

                        COUNT(po.id) AS total_orders,

                        COUNT(po.id) FILTER (
                            WHERE LOWER(po.status) IN ('completed', 'delivered')
                        ) AS completed_orders,

                        COUNT(po.id) FILTER (
                            WHERE LOWER(po.status) = 'pending'
                        ) AS pending_orders,

                        COUNT(po.id) FILTER (
                            WHERE LOWER(po.status) = 'ordered'
                        ) AS ordered_orders,

                        COUNT(po.id) FILTER (
                            WHERE LOWER(po.status) = 'delivered'
                        ) AS delivered_orders,

                        COALESCE(v.quality_score, 0) AS quality_score,
                        COALESCE(v.delivery_rate, 0) AS delivery_rate,
                        COALESCE(v.reliability_score, 0) AS reliability_score

                    FROM vendors v

                    LEFT JOIN purchase_orders po
                        ON v.id = po.vendor_id

                    WHERE v.id = %s

                    GROUP BY
                        v.id,
                        v.vendor_name,
                        v.quality_score,
                        v.delivery_rate,
                        v.reliability_score
                    """,
                    (user_vendor_id,)
                )
            else:
                cursor.execute(
                    """
                    SELECT
                        v.id AS vendor_id,
                        v.vendor_name,

                        COUNT(po.id) AS total_orders,

                        COUNT(po.id) FILTER (
                            WHERE LOWER(po.status) IN ('completed', 'delivered')
                        ) AS completed_orders,

                        COUNT(po.id) FILTER (
                            WHERE LOWER(po.status) = 'pending'
                        ) AS pending_orders,

                        COUNT(po.id) FILTER (
                            WHERE LOWER(po.status) = 'ordered'
                        ) AS ordered_orders,

                        COUNT(po.id) FILTER (
                            WHERE LOWER(po.status) = 'delivered'
                        ) AS delivered_orders,

                        COALESCE(v.quality_score, 0) AS quality_score,
                        COALESCE(v.delivery_rate, 0) AS delivery_rate,
                        COALESCE(v.reliability_score, 0) AS reliability_score

                    FROM vendors v

                    LEFT JOIN purchase_orders po
                        ON v.id = po.vendor_id

                    GROUP BY
                        v.id,
                        v.vendor_name,
                        v.quality_score,
                        v.delivery_rate,
                        v.reliability_score

                    ORDER BY
                        CASE
                            WHEN COUNT(po.id) > 0 THEN 0
                            ELSE 1
                        END,
                        v.reliability_score DESC
                    """
                )
            rows = cursor.fetchall()

        result = []
        for row in rows:
            (
                vendor_id,
                vendor_name,
                total_orders,
                completed_orders,
                pending_orders,
                ordered_orders,
                delivered_orders,
                quality_score,
                delivery_rate,
                reliability_score,
            ) = row

            total_orders = int(total_orders or 0)
            completed_orders = int(completed_orders or 0)
            pending_orders = int(pending_orders or 0)
            ordered_orders = int(ordered_orders or 0)
            delivered_orders = int(delivered_orders or 0)

            quality_score = float(quality_score or 0)
            delivery_rate = float(delivery_rate or 0)
            reliability_score = float(reliability_score or 0)

            if total_orders == 0:
                performance = "No Data"
                risk = "No Data"
                recommendation = "Awaiting Orders"
            else:
                performance = _performance_level(reliability_score)
                risk = _risk_level(reliability_score)
                recommendation = _recommendation(risk)

            result.append(
                {
                    "vendor_id": vendor_id,
                    "vendor_name": vendor_name,
                    "total_orders": total_orders,
                    "completed_orders": completed_orders,
                    "pending_orders": pending_orders,
                    "ordered_orders": ordered_orders,
                    "delivered_orders": delivered_orders,
                    "quality_score": round(quality_score, 2),
                    "delivery_rate": round(delivery_rate, 2),
                    "reliability_score": round(reliability_score, 2),
                    "performance": performance,
                    "risk": risk,
                    "recommendation": recommendation,
                }
            )

        return result

    except Exception as exc:
        try:
            conn.rollback()
        except:
            pass
        print("VENDOR PERFORMANCE ERROR:", exc)
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch vendor performance data.",
        )


@router.get("/vendor-performance-history/{vendor_id}")
def get_vendor_performance_history(vendor_id: int, current_user: dict = Depends(get_current_user)):
    try:
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")

        if user_role == "Vendor" and vendor_id != user_vendor_id:
            raise HTTPException(status_code=403, detail="Permission Denied: Cannot access another vendor's performance history")

        conn.rollback()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT recorded_date, quality_score, delivery_rate, reliability_score
                FROM vendor_performance_history
                WHERE vendor_id = %s
                ORDER BY recorded_date ASC
                """,
                (vendor_id,)
            )
            rows = cur.fetchall()

        result = []
        for row in rows:
            result.append({
                "recorded_date": str(row[0]),
                "quality_score": float(row[1] or 0),
                "delivery_rate": float(row[2] or 0),
                "reliability_score": float(row[3] or 0)
            })
        return result

    except HTTPException as he:
        raise he
    except Exception as exc:
        try:
            conn.rollback()
        except:
            pass
        print("HISTORY FETCH ERROR:", exc)
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch vendor performance history.",
        )