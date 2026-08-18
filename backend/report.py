from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from db import conn
from auth import get_current_user, check_role
import io
from openpyxl import Workbook

router = APIRouter()


# ==================================================
# PURCHASE ORDER REPORT
# ==================================================

@router.get("/reports/purchase-orders")
def purchase_order_report(
    page: int = 1,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    user_role = current_user.get("role")
    user_vendor_id = current_user.get("vendor_id")
    cursor = None

    try:
        conn.rollback()
        cursor = conn.cursor()
        offset = (page - 1) * limit

        if user_role == "Vendor":
            if not user_vendor_id:
                return []
            cursor.execute("""
                SELECT
                    p.id,
                    p.vendor_id,
                    v.vendor_name,
                    p.product_name,
                    p.quantity,
                    p.unit_price,
                    p.total_amount,
                    p.order_date,
                    p.expected_delivery,
                    p.status
                FROM purchase_orders p
                LEFT JOIN vendors v
                    ON p.vendor_id = v.id
                WHERE p.vendor_id = %s
                ORDER BY
                    p.order_date DESC,
                    p.id DESC
                LIMIT %s OFFSET %s
            """, (user_vendor_id, limit, offset))
        else:
            cursor.execute("""
                SELECT
                    p.id,
                    p.vendor_id,
                    v.vendor_name,
                    p.product_name,
                    p.quantity,
                    p.unit_price,
                    p.total_amount,
                    p.order_date,
                    p.expected_delivery,
                    p.status
                FROM purchase_orders p
                LEFT JOIN vendors v
                    ON p.vendor_id = v.id
                ORDER BY
                    p.order_date DESC,
                    p.id DESC
                LIMIT %s OFFSET %s
            """, (limit, offset))

        rows = cursor.fetchall()

        reports = []

        for row in rows:
            reports.append({
                "id": row[0],
                "vendor_id": row[1],
                "vendor_name": row[2] or "Unknown Vendor",
                "product_name": row[3] or "N/A",
                "quantity": int(row[4] or 0),
                "unit_price": float(row[5] or 0),
                "total_amount": float(row[6] or 0),
                "order_date": str(row[7]) if row[7] else "N/A",
                "expected_delivery": str(row[8]) if row[8] else "N/A",
                "status": row[9] or "Unknown"
            })

        return reports

    except Exception as e:
        conn.rollback()
        print("PURCHASE ORDER REPORT ERROR:", repr(e))
        return {
            "error": str(e)
        }
    finally:
        if cursor:
            cursor.close()


# ==================================================
# PURCHASE ORDER REPORT EXCEL EXPORT
# ==================================================

@router.get("/reports/purchase-orders/excel")
def purchase_order_report_excel(current_user: dict = Depends(get_current_user)):
    data = purchase_order_report(page=1, limit=1000000, current_user=current_user)
    if isinstance(data, dict) and "error" in data:
        raise HTTPException(status_code=500, detail=data["error"])

    wb = Workbook()
    ws = wb.active
    ws.title = "Purchase Orders"

    # Header columns
    ws.append([
        "Purchase Order ID", "Vendor ID", "Vendor Name", "Product Name", 
        "Quantity", "Unit Price", "Total Amount", "Order Date", 
        "Expected Delivery", "Status"
    ])

    for item in data:
        ws.append([
            item["id"],
            item["vendor_id"],
            item["vendor_name"],
            item["product_name"],
            item["quantity"],
            item["unit_price"],
            item["total_amount"],
            item["order_date"],
            item["expected_delivery"],
            item["status"]
        ])

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)

    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=purchase_order_report.xlsx"}
    )


# ==================================================
# VENDOR RELIABILITY REPORT
# ==================================================

@router.get("/reports/vendor-reliability")
def vendor_reliability_report(current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    user_vendor_id = current_user.get("vendor_id")
    cursor = None

    try:
        conn.rollback()
        cursor = conn.cursor()

        if user_role == "Vendor":
            if not user_vendor_id:
                return []
            cursor.execute("""
                SELECT
                    v.id,
                    v.vendor_name,
                    v.quality_score,
                    v.delivery_rate,
                    v.reliability_score,
                    COUNT(po.id) AS total_orders,
                    COUNT(CASE WHEN LOWER(po.status) IN ('completed', 'delivered') THEN po.id END) AS completed_orders,
                    COUNT(CASE WHEN LOWER(po.status) = 'pending' THEN po.id END) AS pending_orders,
                    COUNT(CASE WHEN LOWER(po.status) = 'delivered' THEN po.id END) AS delivered_orders
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
            """, (user_vendor_id,))
        else:
            cursor.execute("""
                SELECT
                    v.id,
                    v.vendor_name,
                    v.quality_score,
                    v.delivery_rate,
                    v.reliability_score,
                    COUNT(po.id) AS total_orders,
                    COUNT(CASE WHEN LOWER(po.status) IN ('completed', 'delivered') THEN po.id END) AS completed_orders,
                    COUNT(CASE WHEN LOWER(po.status) = 'pending' THEN po.id END) AS pending_orders,
                    COUNT(CASE WHEN LOWER(po.status) = 'delivered' THEN po.id END) AS delivered_orders
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
                    v.reliability_score DESC
            """)

        rows = cursor.fetchall()

        reports = []

        for row in rows:
            reliability_score = float(row[4] or 0)

            if reliability_score >= 80:
                performance = "Excellent"
                risk = "Low Risk"
                recommendation = "Preferred Vendor"
            elif reliability_score >= 70:
                performance = "Good"
                risk = "Medium Risk"
                recommendation = "Monitor Vendor"
            elif reliability_score >= 60:
                performance = "Average"
                risk = "High Risk"
                recommendation = "Review Vendor"
            else:
                performance = "Poor"
                risk = "Critical Risk"
                recommendation = "Review Vendor"

            reports.append({
                "vendor_id": row[0],
                "vendor_name": row[1],
                "total_orders": int(row[5] or 0),
                "completed_orders": int(row[6] or 0),
                "pending_orders": int(row[7] or 0),
                "delivered_orders": int(row[8] or 0),
                "quality_score": float(row[2] or 0),
                "delivery_rate": float(row[3] or 0),
                "reliability_score": reliability_score,
                "performance": performance,
                "risk": risk,
                "recommendation": recommendation
            })

        return reports

    except Exception as e:
        conn.rollback()
        print("VENDOR RELIABILITY REPORT ERROR:", repr(e))
        return {
            "error": str(e)
        }
    finally:
        if cursor:
            cursor.close()


# ==================================================
# VENDOR RELIABILITY REPORT EXCEL EXPORT
# ==================================================

@router.get("/reports/vendor-reliability/excel")
def vendor_reliability_report_excel(current_user: dict = Depends(get_current_user)):
    data = vendor_reliability_report(current_user)
    if isinstance(data, dict) and "error" in data:
        raise HTTPException(status_code=500, detail=data["error"])

    wb = Workbook()
    ws = wb.active
    ws.title = "Vendor Reliability"

    # Header columns
    ws.append([
        "Vendor ID", "Vendor Name", "Total Orders", "Completed Orders", 
        "Pending Orders", "Delivered Orders", "Quality Score", 
        "Delivery Rate", "Reliability Score", "Performance", 
        "Risk", "Recommendation"
    ])

    for item in data:
        ws.append([
            item["vendor_id"],
            item["vendor_name"],
            item["total_orders"],
            item["completed_orders"],
            item["pending_orders"],
            item["delivered_orders"],
            item["quality_score"],
            item["delivery_rate"],
            item["reliability_score"],
            item["performance"],
            item["risk"],
            item["recommendation"]
        ])

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)

    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=vendor_reliability_report.xlsx"}
    )