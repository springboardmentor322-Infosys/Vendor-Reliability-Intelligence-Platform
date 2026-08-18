from fastapi import APIRouter, Form, HTTPException, Depends
from db import conn
from auth import get_current_user, check_role

router = APIRouter()


# ==================================================
# ADD PURCHASE REQUEST
# ==================================================
@router.post("/purchase-requests")
def add_purchase_request(
    vendor_id: int = Form(...),
    product_name: str = Form(...),
    quantity: int = Form(...),
    request_date: str = Form(...),
    requested_by: str = Form(...),
    status: str = Form("Pending"),
    current_user: dict = Depends(check_role(["Admin", "Procurement Manager"]))
):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO purchase_requests
                (
                    vendor_id,
                    product_name,
                    quantity,
                    request_date,
                    requested_by,
                    status
                )
                VALUES
                (%s, %s, %s, %s, %s, %s)
                """,
                (
                    vendor_id,
                    product_name,
                    quantity,
                    request_date,
                    requested_by,
                    status
                )
            )
            conn.commit()

        return {
            "message": "Purchase Request Added Successfully"
        }
    except Exception as e:
        conn.rollback()
        print("ADD PURCHASE REQUEST ERROR:", e)
        return {
            "error": str(e)
        }


# ==================================================
# GET ALL PURCHASE REQUESTS
# ==================================================
@router.get("/purchase-requests")
def get_purchase_requests(current_user: dict = Depends(get_current_user)):
    try:
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")

        conn.rollback()
        with conn.cursor() as cur:
            if user_role == "Vendor":
                if not user_vendor_id:
                    return []
                cur.execute(
                    """
                    SELECT
                        purchase_requests.id,
                        purchase_requests.vendor_id,
                        vendors.vendor_name,
                        purchase_requests.product_name,
                        purchase_requests.quantity,
                        purchase_requests.request_date,
                        purchase_requests.requested_by,
                        purchase_requests.status
                    FROM purchase_requests
                    JOIN vendors
                        ON purchase_requests.vendor_id = vendors.id
                    WHERE purchase_requests.vendor_id = %s
                    ORDER BY purchase_requests.id
                    """,
                    (user_vendor_id,)
                )
            else:
                cur.execute(
                    """
                    SELECT
                        purchase_requests.id,
                        purchase_requests.vendor_id,
                        vendors.vendor_name,
                        purchase_requests.product_name,
                        purchase_requests.quantity,
                        purchase_requests.request_date,
                        purchase_requests.requested_by,
                        purchase_requests.status
                    FROM purchase_requests
                    JOIN vendors
                        ON purchase_requests.vendor_id = vendors.id
                    ORDER BY purchase_requests.id
                    """
                )
            data = cur.fetchall()

        requests = []
        for row in data:
            requests.append({
                "id": row[0],
                "vendor_id": row[1],
                "vendor_name": row[2],
                "product_name": row[3],
                "quantity": row[4],
                "request_date": str(row[5]),
                "requested_by": row[6],
                "status": row[7]
            })

        return requests
    except Exception as e:
        print("GET PURCHASE REQUEST ERROR:", e)
        try:
            conn.rollback()
        except:
            pass
        return {
            "error": str(e)
        }


# ==================================================
# UPDATE PURCHASE REQUEST
# ==================================================
@router.put("/purchase-requests/{id}")
def update_purchase_request(
    id: int,
    vendor_id: int = Form(...),
    product_name: str = Form(...),
    quantity: int = Form(...),
    request_date: str = Form(...),
    requested_by: str = Form(...),
    status: str = Form(...),
    current_user: dict = Depends(check_role(["Admin", "Procurement Manager"]))
):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            # Check request exists
            cursor.execute(
                """
                SELECT id
                FROM purchase_requests
                WHERE id=%s
                """,
                (id,)
            )
            request = cursor.fetchone()

            if request is None:
                return {
                    "message": "Purchase Request Not Found"
                }

            # Update request
            cursor.execute(
                """
                UPDATE purchase_requests
                SET
                    vendor_id=%s,
                    product_name=%s,
                    quantity=%s,
                    request_date=%s,
                    requested_by=%s,
                    status=%s
                WHERE id=%s
                """,
                (
                    vendor_id,
                    product_name,
                    quantity,
                    request_date,
                    requested_by,
                    status,
                    id
                )
            )
            conn.commit()

        return {
            "message": "Purchase Request Updated Successfully"
        }
    except Exception as e:
        conn.rollback()
        print("UPDATE PURCHASE REQUEST ERROR:", e)
        return {
            "error": str(e)
        }


# ==================================================
# DELETE PURCHASE REQUEST
# ==================================================
@router.delete("/purchase-requests/{id}")
def delete_purchase_request(id: int, current_user: dict = Depends(check_role(["Admin"]))):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute(
                """
                DELETE FROM purchase_requests
                WHERE id=%s
                """,
                (id,)
            )
            conn.commit()

        return {
            "message": "Purchase Request Deleted Successfully"
        }
    except Exception as e:
        conn.rollback()
        print("DELETE PURCHASE REQUEST ERROR:", e)
        return {
            "error": str(e)
        }


# ==================================================
# APPROVE PURCHASE REQUEST
# ==================================================
@router.put("/purchase-requests/approve/{id}")
def approve_request(id: int, current_user: dict = Depends(check_role(["Admin", "Procurement Manager"]))):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            # Get request details
            cursor.execute(
                """
                SELECT
                    vendor_id,
                    product_name,
                    quantity,
                    status
                FROM purchase_requests
                WHERE id=%s
                """,
                (id,)
            )
            request = cursor.fetchone()

            if request is None:
                return {
                    "message": "Request Not Found"
                }

            vendor_id = request[0]
            product_name = request[1]
            quantity = request[2]
            current_status = request[3]

            # Prevent duplicate approval
            if current_status == "Approved":
                return {
                    "message": "Request Already Approved"
                }

            # Look up product_id from products table
            cursor.execute("SELECT id, product_price FROM products WHERE LOWER(product_name) = LOWER(%s) LIMIT 1", (product_name.strip(),))
            prod_row = cursor.fetchone()
            product_id = prod_row[0] if prod_row else None
            unit_price = float(prod_row[1]) if prod_row and prod_row[1] else 0.0

            # If product doesn't exist, create catalog entry
            if not product_id:
                cursor.execute("SELECT COALESCE(MAX(product_card_id), 0) + 1 FROM products")
                next_card_id = cursor.fetchone()[0]
                cursor.execute(
                    """
                    INSERT INTO products (product_card_id, product_name, category_name, product_price, created_at)
                    VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
                    RETURNING id
                    """,
                    (next_card_id, product_name, "General Goods", 0.0)
                )
                product_id = cursor.fetchone()[0]
                unit_price = 0.0

            total_amount = quantity * unit_price

            # Update request status
            cursor.execute(
                """
                UPDATE purchase_requests
                SET status='Approved'
                WHERE id=%s
                """,
                (id,)
            )

            # Create Purchase Order automatically
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
                (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    CURRENT_DATE,
                    CURRENT_DATE + INTERVAL '7 day',
                    'Pending',
                    %s,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                """,
                (
                    vendor_id,
                    product_id,
                    product_name,
                    quantity,
                    unit_price,
                    total_amount,
                    current_user.get("id")
                )
            )
            conn.commit()

        return {
            "message": "Request Approved & Purchase Order Created"
        }
    except Exception as e:
        conn.rollback()
        print("APPROVE REQUEST ERROR:", e)
        return {
            "error": str(e)
        }