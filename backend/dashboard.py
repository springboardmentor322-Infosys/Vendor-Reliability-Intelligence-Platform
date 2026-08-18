from fastapi import APIRouter, Depends, HTTPException
from db import conn
from auth import get_current_user

router = APIRouter()


# ==========================================================
# DASHBOARD SUMMARY
# ==========================================================

@router.get("/dashboard")
def get_dashboard(current_user: dict = Depends(get_current_user)):

    try:
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")

        cur = conn.cursor()

        if user_role == "Vendor":
            if not user_vendor_id:
                return {
                    "total_vendors": 0,
                    "total_orders": 0,
                    "total_contracts": 0,
                    "average_reliability": 0.0,
                    "completed_orders": 0
                }

            # Scoped counts for vendor
            # Vendor Reliability Score
            cur.execute("""
                SELECT COALESCE(reliability_score, 0)
                FROM vendors
                WHERE id = %s
            """, (user_vendor_id,))
            row = cur.fetchone()
            reliability = float(row[0]) if row else 0.0

            # Total orders
            cur.execute("""
                SELECT COUNT(id)
                FROM purchase_orders
                WHERE vendor_id = %s
            """, (user_vendor_id,))
            total_orders = cur.fetchone()[0]

            # Total contracts
            cur.execute("""
                SELECT COUNT(*)
                FROM contracts
                WHERE vendor_id = %s
            """, (user_vendor_id,))
            total_contracts = cur.fetchone()[0]

            # Completed orders
            cur.execute("""
                SELECT COUNT(id)
                FROM purchase_orders
                WHERE LOWER(status) IN ('completed', 'delivered') AND vendor_id = %s
            """, (user_vendor_id,))
            completed_orders = cur.fetchone()[0]

            cur.close()

            return {
                "total_vendors": 1,
                "total_orders": int(total_orders or 0),
                "total_contracts": int(total_contracts or 0),
                "average_reliability": round(reliability, 2),
                "completed_orders": int(completed_orders or 0)
            }
        else:
            # ------------------------------------------
            # TOTAL VENDORS (master vendors dataset)
            # ------------------------------------------
            cur.execute("""
                SELECT COUNT(*)
                FROM vendors
            """)
            total_vendors = cur.fetchone()[0]

            # ------------------------------------------
            # TOTAL PURCHASE ORDERS
            # ------------------------------------------
            cur.execute("""
                SELECT COUNT(id)
                FROM purchase_orders
            """)
            total_orders = cur.fetchone()[0]

            # ------------------------------------------
            # TOTAL CONTRACTS
            # ------------------------------------------
            cur.execute("""
                SELECT COUNT(*)
                FROM contracts
            """)
            total_contracts = cur.fetchone()[0]

            # ------------------------------------------
            # RELIABILITY SUMMARY
            # ------------------------------------------
            cur.execute("""
                SELECT COALESCE(AVG(reliability_score), 0)
                FROM vendors
            """)
            average_reliability = cur.fetchone()[0]

            # ------------------------------------------
            # COMPLETED ORDERS
            # ------------------------------------------
            cur.execute("""
                SELECT COUNT(id)
                FROM purchase_orders
                WHERE LOWER(status) IN ('completed', 'delivered')
            """)
            completed_orders = cur.fetchone()[0]

            cur.close()

            return {
                "total_vendors": int(total_vendors or 0),
                "total_orders": int(total_orders or 0),
                "total_contracts": int(total_contracts or 0),
                "average_reliability": round(float(average_reliability or 0), 2),
                "completed_orders": int(completed_orders or 0)
            }

    except Exception as e:
        print("DASHBOARD ERROR:", e)
        try:
            conn.rollback()
        except:
            pass
        return {
            "error": str(e)
        }


