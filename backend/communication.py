from fastapi import APIRouter, Form, Depends, HTTPException
from db import conn
from auth import get_current_user, check_role

router = APIRouter()


# ==================================================
# GET ALL COMMUNICATIONS
# ==================================================
@router.get("/communications")
def get_communications(current_user: dict = Depends(get_current_user)):
    try:
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")

        conn.rollback()
        with conn.cursor() as cursor:
            if user_role == "Vendor":
                if not user_vendor_id:
                    return []
                cursor.execute("""
                    SELECT
                        c.id,
                        c.user_id,
                        c.vendor_id,
                        v.vendor_name,
                        c.purchase_order_id,
                        c.contract_id,
                        c.message,
                        c.created_at
                    FROM communications c
                    LEFT JOIN vendors v
                        ON c.vendor_id = v.id
                    WHERE c.vendor_id = %s
                    ORDER BY c.created_at DESC
                """, (user_vendor_id,))
            else:
                cursor.execute("""
                    SELECT
                        c.id,
                        c.user_id,
                        c.vendor_id,
                        v.vendor_name,
                        c.purchase_order_id,
                        c.contract_id,
                        c.message,
                        c.created_at
                    FROM communications c
                    LEFT JOIN vendors v
                        ON c.vendor_id = v.id
                    ORDER BY c.created_at DESC
                """)
            rows = cursor.fetchall()

        communications = []
        for row in rows:
            communications.append({
                "id": row[0],
                "user_id": row[1],
                "vendor_id": row[2],
                "vendor_name": row[3] or "N/A",
                "purchase_order_id": row[4],
                "contract_id": row[5],
                "message": row[6],
                "created_at": str(row[7])
            })

        return communications

    except Exception as e:
        try:
            conn.rollback()
        except:
            pass
        print("GET COMMUNICATION ERROR:", e)
        return {
            "error": str(e)
        }


# ==================================================
# ADD COMMUNICATION
# ==================================================
@router.post("/communications")
def add_communication(
    vendor_id: int = Form(None),
    purchase_order_id: int = Form(None),
    contract_id: int = Form(None),
    message: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    try:
        user_role = current_user.get("role")
        user_id = current_user.get("id")

        if user_role == "Vendor":
            vendor_id = current_user.get("vendor_id")
            if not vendor_id:
                raise HTTPException(status_code=400, detail="User is not linked to any vendor")

        conn.rollback()
        with conn.cursor() as cursor:
            # Check foreign keys if supplied
            if vendor_id:
                cursor.execute("SELECT id FROM vendors WHERE id = %s", (vendor_id,))
                if not cursor.fetchone():
                    return {"error": f"Vendor with ID {vendor_id} does not exist."}
            if purchase_order_id:
                cursor.execute("SELECT id FROM purchase_orders WHERE id = %s", (purchase_order_id,))
                if not cursor.fetchone():
                    return {"error": f"Purchase Order with ID {purchase_order_id} does not exist."}
            if contract_id:
                cursor.execute("SELECT id FROM contracts WHERE id = %s", (contract_id,))
                if not cursor.fetchone():
                    return {"error": f"Contract with ID {contract_id} does not exist."}

            cursor.execute("""
                INSERT INTO communications
                (
                    user_id,
                    vendor_id,
                    purchase_order_id,
                    contract_id,
                    message
                )
                VALUES
                (%s, %s, %s, %s, %s)
            """, (
                user_id,
                vendor_id,
                purchase_order_id,
                contract_id,
                message
            ))
            conn.commit()

        return {
            "message": "Communication added successfully"
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        conn.rollback()
        print("ADD COMMUNICATION ERROR:", e)
        return {
            "error": str(e)
        }


# ==================================================
# DELETE COMMUNICATION
# ==================================================
@router.delete("/communications/{communication_id}")
def delete_communication(communication_id: int, current_user: dict = Depends(check_role(["Admin"]))):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute("""
                DELETE FROM communications
                WHERE id = %s
            """, (communication_id,))
            conn.commit()

        return {
            "message": "Communication deleted successfully"
        }

    except Exception as e:
        conn.rollback()
        print("DELETE COMMUNICATION ERROR:", e)
        return {
            "error": str(e)
        }