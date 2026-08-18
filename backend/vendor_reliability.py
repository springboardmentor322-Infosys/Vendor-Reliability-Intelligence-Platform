from fastapi import APIRouter, Depends, HTTPException
from db import conn
from auth import get_current_user

router = APIRouter()


# ==========================================
# GET ALL VENDOR RELIABILITY DATA
# ==========================================

@router.get("/vendor-reliability")
def get_vendor_reliability(current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    user_vendor_id = current_user.get("vendor_id")

    cur = conn.cursor()

    try:
        if user_role == "Vendor":
            if not user_vendor_id:
                return []
            
            cur.execute("""
                SELECT
                    v.vendor_name,
                    vrd.total_orders,
                    vrd.late_orders,
                    vrd.average_shipping_days,
                    vrd.average_scheduled_days,
                    vrd.total_sales,
                    vrd.on_time_rate,
                    vrd.late_delivery_rate,
                    vrd.reliability_score,
                    vrd.reliability_status
                FROM vendors v
                LEFT JOIN vendor_reliability_data vrd ON v.id = vrd.id
                WHERE v.id = %s
                ORDER BY COALESCE(vrd.reliability_score, 0) DESC;
            """, (user_vendor_id,))
        else:
            cur.execute("""
                SELECT
                    v.vendor_name,
                    vrd.total_orders,
                    vrd.late_orders,
                    vrd.average_shipping_days,
                    vrd.average_scheduled_days,
                    vrd.total_sales,
                    vrd.on_time_rate,
                    vrd.late_delivery_rate,
                    vrd.reliability_score,
                    vrd.reliability_status
                FROM vendors v
                LEFT JOIN vendor_reliability_data vrd ON v.id = vrd.id
                ORDER BY COALESCE(vrd.reliability_score, 0) DESC;
            """)

        rows = cur.fetchall()

        vendors = []

        for row in rows:

            reliability_status = row[9] or ""
            status_key = str(reliability_status).strip().lower()

            if status_key == "poor":
                risk_level = "Critical Risk Vendor"
                recommendation = "Vendor performance review required"
            elif status_key == "average":
                risk_level = "High Risk Vendor"
                recommendation = "Review vendor performance"
            elif status_key == "good":
                risk_level = "Medium Risk Vendor"
                recommendation = "Monitor vendor performance"
            elif status_key == "excellent":
                risk_level = "Low Risk Vendor"
                recommendation = "Preferred Vendor"
            else:
                risk_level = "Unknown"
                recommendation = "Review vendor performance"

            vendors.append({
                "vendor_name": row[0],
                "total_orders": int(row[1] or 0),
                "late_orders": int(row[2] or 0),
                "average_shipping_days": float(row[3] or 0),
                "average_scheduled_days": float(row[4] or 0),
                "total_sales": float(row[5] or 0),
                "on_time_rate": float(row[6] or 0),
                "late_delivery_rate": float(row[7] or 0),
                "reliability_score": float(row[8] or 0),
                "reliability_status": reliability_status,
                "risk_level": risk_level,
                "recommendation": recommendation
            })

        return vendors

    except Exception as e:

        print("VENDOR RELIABILITY ERROR:", e)

        try:
            conn.rollback()
        except Exception:
            pass

        return {
            "error": str(e)
        }

    finally:
        cur.close()

# ==========================================
# VENDOR RELIABILITY SUMMARY
# ==========================================

@router.get("/vendor-reliability/summary")
def get_vendor_reliability_summary(current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    user_vendor_id = current_user.get("vendor_id")

    cur = conn.cursor()

    try:
        if user_role == "Vendor":
            if not user_vendor_id:
                return {
                    "total_vendors": 0,
                    "average_reliability": 0.0,
                    "best_vendor": None,
                    "best_score": 0.0,
                    "poor_vendors": 0
                }

            cur.execute("SELECT vendor_name FROM vendors WHERE id = %s", (user_vendor_id,))
            v_row = cur.fetchone()
            if not v_row:
                return {
                    "total_vendors": 0,
                    "average_reliability": 0.0,
                    "best_vendor": None,
                    "best_score": 0.0,
                    "poor_vendors": 0
                }
            vendor_name = v_row[0]

            cur.execute("""
                SELECT reliability_score, reliability_status
                FROM vendor_reliability_data
                WHERE id = %s
            """, (user_vendor_id,))
            r_row = cur.fetchone()

            if not r_row:
                return {
                    "total_vendors": 1,
                    "average_reliability": 0.0,
                    "best_vendor": vendor_name,
                    "best_score": 0.0,
                    "poor_vendors": 0
                }

            score = float(r_row[0] or 0)
            status = r_row[1] or ""
            poor_count = 1 if status.strip().lower() == "poor" else 0

            return {
                "total_vendors": 1,
                "average_reliability": round(score, 2),
                "best_vendor": vendor_name,
                "best_score": round(score, 2),
                "poor_vendors": poor_count
            }
        else:
            cur.execute("""
                SELECT COUNT(*)
                FROM vendors
            """)

            total_vendors = int(cur.fetchone()[0] or 0)

            cur.execute("""
                SELECT COALESCE(AVG(reliability_score), 0)
                FROM vendors
            """)

            average_reliability = float(cur.fetchone()[0] or 0)

            cur.execute("""
                SELECT vendor_name, reliability_score
                FROM vendors
                ORDER BY reliability_score DESC
                LIMIT 1
            """)

            best_vendor = cur.fetchone()

            cur.execute("""
                SELECT COUNT(*)
                FROM vendors v
                JOIN vendor_reliability_data vrd ON v.id = vrd.id
                WHERE vrd.reliability_status = 'Poor'
            """)

            poor_vendors = int(cur.fetchone()[0] or 0)

            return {
                "total_vendors": total_vendors,
                "average_reliability": round(average_reliability, 2),
                "best_vendor": best_vendor[0] if best_vendor else None,
                "best_score": round(float(best_vendor[1]), 2) if best_vendor else 0,
                "poor_vendors": poor_vendors
            }

    except Exception as e:

        print("VENDOR RELIABILITY SUMMARY ERROR:", e)

        try:
            conn.rollback()
        except Exception:
            pass

        return {
            "error": str(e)
        }

    finally:
        cur.close()