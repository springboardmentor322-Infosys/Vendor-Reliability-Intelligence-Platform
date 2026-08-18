from fastapi import APIRouter, Form, Depends, HTTPException
from db import conn
from vendor_performance import calculate_vendor_reliability, save_vendor_performance_history
from auth import get_current_user, check_role

router = APIRouter()


# ==================================================
# ADD PURCHASE ORDER
# ==================================================
@router.post("/purchase-orders")
def add_purchase_order(
    vendor_id: int = Form(...),
    product_name: str = Form(...),
    quantity: int = Form(...),
    unit_price: float = Form(...),
    total_amount: float = Form(...),
    order_date: str = Form(...),
    expected_delivery: str = Form(...),
    status: str = Form(...),
    current_user: dict = Depends(check_role(["Admin", "Procurement Manager"]))
):
    try:
        conn.rollback()

        calculated_amount = quantity * unit_price

        # Allow small floating-point difference
        if abs(total_amount - calculated_amount) > 0.01:
            return {
                "error": "Total amount must be Quantity × Unit Price"
            }

        with conn.cursor() as cursor:
            # Look up product_id from products table
            cursor.execute("SELECT id FROM products WHERE LOWER(product_name) = LOWER(%s) LIMIT 1", (product_name.strip(),))
            prod_row = cursor.fetchone()
            product_id = prod_row[0] if prod_row else None
            
            # If product doesn't exist, create a new catalog entry
            if not product_id:
                cursor.execute("SELECT COALESCE(MAX(product_card_id), 0) + 1 FROM products")
                new_card_id = cursor.fetchone()[0]
                cursor.execute(
                    """
                    INSERT INTO products (product_card_id, product_name, category_name, product_price, created_at)
                    VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
                    RETURNING id
                    """,
                    (new_card_id, product_name, "General Goods", unit_price)
                )
                product_id = cursor.fetchone()[0]

            cursor.execute(
                """
                INSERT INTO purchase_orders
                (
                    vendor_id,
                    product_id,
                    product_name,
                    quantity,
                    unit_price,
                    total_amount,
                    order_date,
                    expected_delivery,
                    status,
                    created_by,
                    created_at,
                    updated_at
                )
                VALUES
                (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                """,
                (
                    vendor_id,
                    product_id,
                    product_name,
                    quantity,
                    unit_price,
                    total_amount,
                    order_date,
                    expected_delivery,
                    status,
                    current_user.get("id")
                )
            )
            conn.commit()

        return {
            "message": "Purchase Order Added Successfully"
        }

    except Exception as e:
        conn.rollback()
        print("ADD PURCHASE ERROR:", e)
        return {
            "error": str(e)
        }



# ==================================================
# VIEW PURCHASE ORDERS
# ==================================================
@router.get("/purchase-orders")
def get_purchase_orders(
    page: int = None,
    limit: int = 20,
    search: str = None,
    status: str = None,
    current_user: dict = Depends(get_current_user)
):
    try:
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")

        conn.rollback()

        with conn.cursor() as cur:
            # 1. Scoped base condition
            base_where = "WHERE 1=1"
            where_params = []
            if user_role == "Vendor":
                if not user_vendor_id:
                    if page is not None:
                        return {
                            "purchase_orders": [],
                            "total_count": 0,
                            "kpi_total": 0,
                            "kpi_pending": 0,
                            "kpi_completed": 0,
                            "kpi_delivered": 0,
                            "status_counts": {}
                        }
                    else:
                        return []
                base_where += " AND p.vendor_id = %s"
                where_params.append(user_vendor_id)

            # 2. Apply filters (for main filtered list and filtered count)
            filter_where = base_where
            filter_params = list(where_params)
            
            if search:
                filter_where += " AND LOWER(p.product_name) LIKE %s"
                filter_params.append(f"%{search.strip().lower()}%")
                
            if status:
                filter_where += " AND LOWER(p.status) = %s"
                filter_params.append(status.strip().lower())

            # 3. Retrieve filtered records
            query = f"""
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
                {filter_where}
                ORDER BY p.order_date DESC, p.id DESC
            """
            
            if page is not None:
                offset = (page - 1) * limit
                query += " LIMIT %s OFFSET %s"
                query_params = filter_params + [limit, offset]
            else:
                # Legacy behavior: Limit to 2000
                query += " LIMIT 2000"
                query_params = filter_params

            cur.execute(query, query_params)
            rows = cur.fetchall()

            orders = []
            for row in rows:
                orders.append({
                    "id": row[0],
                    "vendor_id": row[1],
                    "vendor_name": row[2] or "Unknown Vendor",
                    "product_name": row[3] or "N/A",
                    "quantity": row[4] or 0,
                    "unit_price": float(row[5] or 0),
                    "total_amount": float(row[6] or 0),
                    "order_date": str(row[7]) if row[7] else "N/A",
                    "expected_delivery": str(row[8]) if row[8] else "N/A",
                    "status": row[9] or "Pending"
                })

            if page is not None:
                # 4. Count total filtered records for pagination info
                count_query = f"SELECT COUNT(*) FROM purchase_orders p {filter_where}"
                cur.execute(count_query, filter_params)
                total_count = cur.fetchone()[0]

                # 5. Retrieve unfiltered KPI stats (scoped to vendor if Vendor)
                kpi_query = f"""
                    SELECT 
                        COUNT(*),
                        COUNT(CASE WHEN LOWER(status) = 'pending' THEN 1 END),
                        COUNT(CASE WHEN LOWER(status) = 'completed' THEN 1 END),
                        COUNT(CASE WHEN LOWER(status) = 'delivered' THEN 1 END)
                    FROM purchase_orders p
                    {base_where}
                """
                cur.execute(kpi_query, where_params)
                kpi_total, kpi_pending, kpi_completed, kpi_delivered = cur.fetchone()

                # 6. Retrieve unfiltered status counts for chart distribution
                chart_query = f"""
                    SELECT status, COUNT(*)
                    FROM purchase_orders p
                    {base_where}
                    GROUP BY status
                """
                cur.execute(chart_query, where_params)
                chart_rows = cur.fetchall()
                status_counts = {crow[0] or "Unknown": crow[1] for crow in chart_rows}

                return {
                    "purchase_orders": orders,
                    "total_count": total_count,
                    "kpi_total": kpi_total,
                    "kpi_pending": kpi_pending,
                    "kpi_completed": kpi_completed,
                    "kpi_delivered": kpi_delivered,
                    "status_counts": status_counts
                }
            else:
                return orders

    except Exception as e:
        print("GET PURCHASE ERROR:", e)
        try:
            conn.rollback()
        except:
            pass
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )



# ==================================================
# PURCHASE ORDER SUMMARY
# ==================================================
@router.get("/purchase-order-summary")
def purchase_order_summary(current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    user_vendor_id = current_user.get("vendor_id")
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            if user_role == "Vendor":
                if not user_vendor_id:
                    return {
                        "total_orders": 0,
                        "completed_orders": 0,
                        "pending_orders": 0,
                        "approved_orders": 0,
                        "ordered_orders": 0,
                        "delivered_orders": 0,
                        "total_amount": 0.0
                    }
                # Total orders
                cursor.execute("SELECT COUNT(DISTINCT COALESCE(dataco_order_id, id)) FROM purchase_orders WHERE vendor_id = %s", (user_vendor_id,))
                total_orders = cursor.fetchone()[0]

                # Completed
                cursor.execute("SELECT COUNT(DISTINCT COALESCE(dataco_order_id, id)) FROM purchase_orders WHERE LOWER(status) IN ('completed', 'delivered') AND vendor_id = %s", (user_vendor_id,))
                completed_orders = cursor.fetchone()[0]

                # Pending
                cursor.execute("SELECT COUNT(DISTINCT COALESCE(dataco_order_id, id)) FROM purchase_orders WHERE LOWER(status) = 'pending' AND vendor_id = %s", (user_vendor_id,))
                pending_orders = cursor.fetchone()[0]

                # Approved
                cursor.execute("SELECT COUNT(DISTINCT COALESCE(dataco_order_id, id)) FROM purchase_orders WHERE LOWER(status) = 'approved' AND vendor_id = %s", (user_vendor_id,))
                approved_orders = cursor.fetchone()[0]

                # Ordered
                cursor.execute("SELECT COUNT(DISTINCT COALESCE(dataco_order_id, id)) FROM purchase_orders WHERE LOWER(status) = 'ordered' AND vendor_id = %s", (user_vendor_id,))
                ordered_orders = cursor.fetchone()[0]

                # Delivered
                cursor.execute("SELECT COUNT(DISTINCT COALESCE(dataco_order_id, id)) FROM purchase_orders WHERE LOWER(status) = 'delivered' AND vendor_id = %s", (user_vendor_id,))
                delivered_orders = cursor.fetchone()[0]

                # Total amount
                cursor.execute("SELECT COALESCE(SUM(total_amount), 0) FROM purchase_orders WHERE vendor_id = %s", (user_vendor_id,))
                total_amount = cursor.fetchone()[0]
            else:
                # Total orders
                cursor.execute("SELECT COUNT(DISTINCT COALESCE(dataco_order_id, id)) FROM purchase_orders")
                total_orders = cursor.fetchone()[0]

                # Completed
                cursor.execute("SELECT COUNT(DISTINCT COALESCE(dataco_order_id, id)) FROM purchase_orders WHERE LOWER(status) IN ('completed', 'delivered')")
                completed_orders = cursor.fetchone()[0]

                # Pending
                cursor.execute("SELECT COUNT(DISTINCT COALESCE(dataco_order_id, id)) FROM purchase_orders WHERE LOWER(status) = 'pending'")
                pending_orders = cursor.fetchone()[0]

                # Approved
                cursor.execute("SELECT COUNT(DISTINCT COALESCE(dataco_order_id, id)) FROM purchase_orders WHERE LOWER(status) = 'approved'")
                approved_orders = cursor.fetchone()[0]

                # Ordered
                cursor.execute("SELECT COUNT(DISTINCT COALESCE(dataco_order_id, id)) FROM purchase_orders WHERE LOWER(status) = 'ordered'")
                ordered_orders = cursor.fetchone()[0]

                # Delivered
                cursor.execute("SELECT COUNT(DISTINCT COALESCE(dataco_order_id, id)) FROM purchase_orders WHERE LOWER(status) = 'delivered'")
                delivered_orders = cursor.fetchone()[0]

                # Total amount
                cursor.execute("SELECT COALESCE(SUM(total_amount), 0) FROM purchase_orders")
                total_amount = cursor.fetchone()[0]

        return {
            "total_orders": total_orders,
            "completed_orders": completed_orders,
            "pending_orders": pending_orders,
            "approved_orders": approved_orders,
            "ordered_orders": ordered_orders,
            "delivered_orders": delivered_orders,
            "total_amount": float(total_amount or 0)
        }

    except Exception as e:
        conn.rollback()
        print("PURCHASE SUMMARY ERROR:", e)
        return {
            "error": str(e)
        }


# ==================================================
# UPDATE PURCHASE ORDER
# ==================================================
@router.put("/purchase-orders/{id}")
def update_purchase_order(
    id: int,
    vendor_id: int = Form(...),
    product_name: str = Form(...),
    quantity: int = Form(...),
    unit_price: float = Form(...),
    total_amount: float = Form(...),
    order_date: str = Form(...),
    expected_delivery: str = Form(...),
    status: str = Form(...),
    current_user: dict = Depends(check_role(["Admin", "Procurement Manager"]))
):
    try:
        conn.rollback()
        
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")
        
        if user_role == "Vendor":
            vendor_id = user_vendor_id
            with conn.cursor() as cursor:
                cursor.execute("SELECT vendor_id FROM purchase_orders WHERE id = %s", (id,))
                row = cursor.fetchone()
                if not row:
                    return {"error": "Purchase Order Not Found"}
                if row[0] != user_vendor_id:
                    raise HTTPException(status_code=403, detail="Permission Denied: You can only edit your own purchase orders")

        calculated_amount = quantity * unit_price

        if abs(total_amount - calculated_amount) > 0.01:
            return {
                "error": "Total amount must be Quantity × Unit Price"
            }

        with conn.cursor() as cursor:
            # Look up product_id from products table
            cursor.execute("SELECT id FROM products WHERE LOWER(product_name) = LOWER(%s) LIMIT 1", (product_name.strip(),))
            prod_row = cursor.fetchone()
            product_id = prod_row[0] if prod_row else None
            
            # If product doesn't exist, create catalog entry
            if not product_id:
                cursor.execute("SELECT COALESCE(MAX(product_card_id), 0) + 1 FROM products")
                new_card_id = cursor.fetchone()[0]
                cursor.execute(
                    """
                    INSERT INTO products (product_card_id, product_name, category_name, product_price, created_at)
                    VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
                    RETURNING id
                    """,
                    (new_card_id, product_name, "General Goods", unit_price)
                )
                product_id = cursor.fetchone()[0]

            cursor.execute(
                """
                UPDATE purchase_orders
                SET
                    vendor_id=%s,
                    product_id=%s,
                    product_name=%s,
                    quantity=%s,
                    unit_price=%s,
                    total_amount=%s,
                    order_date=%s,
                    expected_delivery=%s,
                    status=%s
                WHERE id=%s
                """,
                (
                    vendor_id,
                    product_id,
                    product_name,
                    quantity,
                    unit_price,
                    total_amount,
                    order_date,
                    expected_delivery,
                    status,
                    id
                )
            )
            rowcount = cursor.rowcount

            if rowcount == 0:
                conn.rollback()
                return {
                    "message": "Purchase Order Not Found"
                }

            conn.commit()

        return {
            "message": "Purchase Order Updated Successfully"
        }

    except HTTPException as he:
        conn.rollback()
        raise he
    except Exception as e:
        conn.rollback()
        print("UPDATE PURCHASE ERROR:", e)
        return {
            "error": str(e)
        }


# ==================================================
# DELETE PURCHASE ORDER
# ==================================================
@router.delete("/purchase-orders/{id}")
def delete_purchase_order(id: int, current_user: dict = Depends(check_role(["Admin"]))):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute(
                """
                DELETE FROM purchase_orders
                WHERE id=%s
                """,
                (id,)
            )
            rowcount = cursor.rowcount

            if rowcount == 0:
                conn.rollback()
                return {
                    "message": "Purchase Order Not Found"
                }

            conn.commit()

        return {
            "message": "Purchase Order Deleted Successfully"
        }

    except Exception as e:
        conn.rollback()
        print("DELETE PURCHASE ERROR:", e)
        return {
            "error": str(e)
        }


# ==================================================
# UPDATE STATUS WORKFLOW
# ==================================================
@router.put("/purchase-orders/status/{id}")
def update_purchase_status(id: int, current_user: dict = Depends(check_role(["Admin", "Procurement Manager", "Supply Chain Manager"]))):
    try:
        conn.rollback()
        
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")
        
        if user_role == "Vendor":
            with conn.cursor() as cursor:
                cursor.execute("SELECT vendor_id FROM purchase_orders WHERE id = %s", (id,))
                row = cursor.fetchone()
                if not row:
                    return {"message": "Purchase Order Not Found"}
                if row[0] != user_vendor_id:
                    raise HTTPException(status_code=403, detail="Permission Denied: You can only update status of your own purchase orders")

        with conn.cursor() as cursor:
            # Get current order
            cursor.execute(
                """
                SELECT
                    vendor_id,
                    status
                FROM purchase_orders
                WHERE id=%s
                """,
                (id,)
            )
            order = cursor.fetchone()

            if not order:
                return {
                    "message": "Purchase Order Not Found"
                }

            vendor_id = order[0]
            current_status = order[1]

            # Status Workflow
            status_flow = {
                "Pending": "Approved",
                "Approved": "Ordered",
                "Ordered": "Delivered",
                "Delivered": "Completed"
            }

            # Already Completed
            if current_status == "Completed":
                return {
                    "message": "Order Already Completed",
                    "old_status": current_status,
                    "new_status": current_status
                }

            # Invalid Status
            if current_status not in status_flow:
                return {
                    "message": "Invalid Order Status",
                    "old_status": current_status
                }

            # Get Next Status
            new_status = status_flow[current_status]

            # Update Status
            cursor.execute(
                """
                UPDATE purchase_orders
                SET status=%s
                WHERE id=%s
                """,
                (
                    new_status,
                    id
                )
            )
            conn.commit()

        # If Order Completed, trigger reliability and history updates
        if new_status == "Completed":
            # Calculate latest reliability score
            reliability_score = calculate_vendor_reliability(vendor_id)
            # Save performance history
            save_vendor_performance_history(vendor_id)

            return {
                "message": "Order Completed & Vendor Performance Updated",
                "old_status": current_status,
                "new_status": new_status,
                "vendor_id": vendor_id,
                "reliability_score": reliability_score
            }

        return {
            "message": "Status Updated Successfully",
            "old_status": current_status,
            "new_status": new_status
        }

    except HTTPException as he:
        conn.rollback()
        raise he
    except Exception as e:
        conn.rollback()
        print("STATUS UPDATE ERROR:", e)
        return {
            "error": str(e)
        }