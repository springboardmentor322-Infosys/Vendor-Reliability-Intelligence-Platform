from fastapi import APIRouter, Depends, HTTPException, status
from db import conn
from auth import get_current_user, check_role

router = APIRouter(prefix="/deliveries", tags=["Deliveries"])

@router.get("/summary")
def get_deliveries_summary(current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    user_vendor_id = current_user.get("vendor_id")

    if user_role not in ["Admin", "Supply Chain Manager", "Vendor", "Auditor"]:
        raise HTTPException(status_code=403, detail="Permission Denied")

    try:
        conn.rollback()
        with conn.cursor() as cursor:
            if user_role == "Vendor":
                if not user_vendor_id:
                    return {
                        "total_deliveries": 0,
                        "on_time_deliveries": 0,
                        "delayed_deliveries": 0,
                        "average_delay": 0.0,
                        "delivery_performance_rate": 0.0,
                        "average_reliability_score": 0.0,
                        "at_risk_vendors": 0
                    }
                # Scoped summary
                cursor.execute("""
                    SELECT 
                        COUNT(*),
                        COUNT(CASE WHEN late_delivery_risk = 0 THEN 1 END),
                        COUNT(CASE WHEN late_delivery_risk = 1 THEN 1 END),
                        COALESCE(AVG(CASE WHEN late_delivery_risk = 1 THEN (actual_days - scheduled_days) END), 0)
                    FROM deliveries
                    WHERE vendor_id = %s
                """, (user_vendor_id,))
                total, on_time, delayed, avg_delay = cursor.fetchone()
                
                total = int(total or 0)
                on_time = int(on_time or 0)
                delayed = int(delayed or 0)
                avg_delay = round(float(avg_delay or 0), 2)
                performance_rate = round((on_time / total) * 100, 2) if total > 0 else 0.0

                cursor.execute("""
                    SELECT 
                        COALESCE(reliability_score, 0),
                        CASE WHEN reliability_score < 70 THEN 1 ELSE 0 END
                    FROM vendors
                    WHERE id = %s
                """, (user_vendor_id,))
                v_row = cursor.fetchone()
                avg_reliability = float(v_row[0]) if v_row else 0.0
                at_risk_vendors = v_row[1] if v_row else 0
            else:
                # Global summary
                cursor.execute("""
                    SELECT 
                        COUNT(*),
                        COUNT(CASE WHEN late_delivery_risk = 0 THEN 1 END),
                        COUNT(CASE WHEN late_delivery_risk = 1 THEN 1 END),
                        COALESCE(AVG(CASE WHEN late_delivery_risk = 1 THEN (actual_days - scheduled_days) END), 0)
                    FROM deliveries
                """)
                total, on_time, delayed, avg_delay = cursor.fetchone()
                
                total = int(total or 0)
                on_time = int(on_time or 0)
                delayed = int(delayed or 0)
                avg_delay = round(float(avg_delay or 0), 2)
                performance_rate = round((on_time / total) * 100, 2) if total > 0 else 0.0
                
                cursor.execute("""
                    SELECT 
                        COALESCE(AVG(reliability_score), 0),
                        COUNT(CASE WHEN reliability_score < 70 THEN 1 END)
                    FROM vendors
                """)
                avg_reliability, at_risk_vendors = cursor.fetchone()
                
                avg_reliability = round(float(avg_reliability or 0), 2)
                at_risk_vendors = int(at_risk_vendors or 0)
            
        return {
            "total_deliveries": total,
            "on_time_deliveries": on_time,
            "delayed_deliveries": delayed,
            "average_delay": avg_delay,
            "delivery_performance_rate": performance_rate,
            "average_reliability_score": avg_reliability,
            "at_risk_vendors": at_risk_vendors
        }
    except Exception as e:
        conn.rollback()
        print("DELIVERIES SUMMARY ERROR:", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.get("/recent")
def get_recent_deliveries(current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    user_vendor_id = current_user.get("vendor_id")

    if user_role not in ["Admin", "Supply Chain Manager", "Vendor", "Auditor"]:
        raise HTTPException(status_code=403, detail="Permission Denied")

    try:
        conn.rollback()
        with conn.cursor() as cursor:
            if user_role == "Vendor":
                if not user_vendor_id:
                    return []
                cursor.execute("""
                    SELECT 
                        d.id,
                        v.vendor_name,
                        p.product_name,
                        d.expected_delivery_date,
                        d.actual_delivery_date,
                        d.delivery_status,
                        COALESCE(d.actual_days - d.scheduled_days, 0)
                    FROM deliveries d
                    JOIN vendors v ON d.vendor_id = v.id
                    JOIN products p ON d.product_id = p.id
                    WHERE d.vendor_id = %s
                    ORDER BY d.actual_delivery_date DESC, d.id DESC
                    LIMIT 10
                """, (user_vendor_id,))
            else:
                cursor.execute("""
                    SELECT 
                        d.id,
                        v.vendor_name,
                        p.product_name,
                        d.expected_delivery_date,
                        d.actual_delivery_date,
                        d.delivery_status,
                        COALESCE(d.actual_days - d.scheduled_days, 0)
                    FROM deliveries d
                    JOIN vendors v ON d.vendor_id = v.id
                    JOIN products p ON d.product_id = p.id
                    ORDER BY d.actual_delivery_date DESC, d.id DESC
                    LIMIT 10
                """)
            rows = cursor.fetchall()
            
        recent = []
        for row in rows:
            expected_date = str(row[3]) if row[3] else "N/A"
            actual_date = str(row[4]) if row[4] else "N/A"
            delay = int(row[6]) if int(row[6]) > 0 else 0
            
            recent.append({
                "delivery_id": row[0],
                "vendor_name": row[1] or "Unknown",
                "product_name": row[2] or "N/A",
                "expected_date": expected_date,
                "actual_date": actual_date,
                "status": row[5] or "Unknown",
                "delay_days": delay
            })
        return recent
    except Exception as e:
        conn.rollback()
        print("RECENT DELIVERIES ERROR:", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.get("/alerts")
def get_delivery_alerts(current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    user_vendor_id = current_user.get("vendor_id")

    if user_role not in ["Admin", "Supply Chain Manager", "Vendor", "Auditor"]:
        raise HTTPException(status_code=403, detail="Permission Denied")

    try:
        conn.rollback()
        with conn.cursor() as cursor:
            if user_role == "Vendor":
                if not user_vendor_id:
                    return []
                cursor.execute("""
                    SELECT 
                        d.id,
                        v.vendor_name,
                        p.product_name,
                        d.delivery_status,
                        COALESCE(d.actual_days - d.scheduled_days, 0),
                        d.actual_delivery_date
                    FROM deliveries d
                    JOIN vendors v ON d.vendor_id = v.id
                    JOIN products p ON d.product_id = p.id
                    WHERE d.late_delivery_risk = 1 AND d.vendor_id = %s
                    ORDER BY d.actual_delivery_date DESC, d.id DESC
                    LIMIT 10
                """, (user_vendor_id,))
            else:
                cursor.execute("""
                    SELECT 
                        d.id,
                        v.vendor_name,
                        p.product_name,
                        d.delivery_status,
                        COALESCE(d.actual_days - d.scheduled_days, 0),
                        d.actual_delivery_date
                    FROM deliveries d
                    JOIN vendors v ON d.vendor_id = v.id
                    JOIN products p ON d.product_id = p.id
                    WHERE d.late_delivery_risk = 1
                    ORDER BY d.actual_delivery_date DESC, d.id DESC
                    LIMIT 10
                """)
            rows = cursor.fetchall()
            
        alerts = []
        for row in rows:
            delay = int(row[4]) if int(row[4]) > 0 else 0
            alerts.append({
                "delivery_id": row[0],
                "vendor_name": row[1] or "Unknown",
                "product_name": row[2] or "N/A",
                "status": row[3] or "Late delivery",
                "delay_days": delay,
                "date": str(row[5]) if row[5] else "N/A"
            })
        return alerts
    except Exception as e:
        conn.rollback()
        print("DELIVERY ALERTS ERROR:", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.get("/trend")
def get_delivery_trend(current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    user_vendor_id = current_user.get("vendor_id")

    if user_role not in ["Admin", "Supply Chain Manager", "Vendor", "Auditor"]:
        raise HTTPException(status_code=403, detail="Permission Denied")

    try:
        conn.rollback()
        with conn.cursor() as cursor:
            if user_role == "Vendor":
                if not user_vendor_id:
                    return []
                cursor.execute("""
                    SELECT 
                        TO_CHAR(actual_delivery_date, 'YYYY-MM') AS month,
                        COUNT(*),
                        COUNT(CASE WHEN late_delivery_risk = 0 THEN 1 END),
                        COUNT(CASE WHEN late_delivery_risk = 1 THEN 1 END)
                    FROM deliveries
                    WHERE actual_delivery_date IS NOT NULL AND vendor_id = %s
                    GROUP BY month
                    ORDER BY month ASC
                """, (user_vendor_id,))
            else:
                cursor.execute("""
                    SELECT 
                        TO_CHAR(actual_delivery_date, 'YYYY-MM') AS month,
                        COUNT(*),
                        COUNT(CASE WHEN late_delivery_risk = 0 THEN 1 END),
                        COUNT(CASE WHEN late_delivery_risk = 1 THEN 1 END)
                    FROM deliveries
                    WHERE actual_delivery_date IS NOT NULL
                    GROUP BY month
                    ORDER BY month ASC
                """)
            rows = cursor.fetchall()
            
        trend = []
        for row in rows:
            month = row[0]
            total = int(row[1] or 0)
            on_time = int(row[2] or 0)
            delayed = int(row[3] or 0)
            rate = round((on_time / total) * 100, 2) if total > 0 else 0.0
            
            trend.append({
                "month": month,
                "total_deliveries": total,
                "on_time_deliveries": on_time,
                "delayed_deliveries": delayed,
                "performance_rate": rate
            })
        return trend
    except Exception as e:
        conn.rollback()
        print("DELIVERY TREND ERROR:", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

