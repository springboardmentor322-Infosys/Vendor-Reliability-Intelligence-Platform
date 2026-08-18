from fastapi import APIRouter, Form, HTTPException, Depends
from db import conn
from auth import get_current_user, check_role

router = APIRouter()


# ==================================================
# ADD VENDOR
# ==================================================

@router.post("/vendors")
def add_vendor(
    vendor_name: str = Form(...),
    company: str = Form(None),
    email: str = Form(None),
    phone: str = Form(None),
    address: str = Form(None),
    category: str = Form(...),
    current_user: dict = Depends(check_role(["Admin", "Procurement Manager"]))
):

    try:
        conn.rollback()

        # Every new vendor starts as Pending
        status = "Pending"

        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO vendors
                (
                    vendor_name,
                    company,
                    email,
                    phone,
                    address,
                    category,
                    status
                )
                VALUES (%s,%s,%s,%s,%s,%s,%s)
                RETURNING id
                """,
                (
                    vendor_name,
                    company,
                    email,
                    phone,
                    address,
                    category,
                    status
                )
            )
            new_vendor_id = cursor.fetchone()[0]

        conn.commit()

        # Log Vendor Creation
        from audit_logs import log_action
        log_action(user_id=current_user.get('id'), user_name=current_user.get('name'), user_email=current_user.get('email'), action="CREATE", entity_type="VENDOR", entity_id=str(new_vendor_id), details=f"Added vendor: {vendor_name}")

        return {
            "message": "Vendor Added Successfully"
        }

    except Exception as e:

        conn.rollback()

        print("ADD VENDOR ERROR:", e)

        return {
            "error": str(e)
        }


# ==================================================
# GET ALL VENDORS
# ==================================================

@router.get("/vendors")
def get_vendors(current_user: dict = Depends(get_current_user)):

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
                        id,
                        vendor_name,
                        company,
                        email,
                        phone,
                        address,
                        reliability_score,
                        quality_score,
                        delivery_rate,
                        total_orders,
                        completed_orders,
                        category,
                        status
                    FROM vendors
                    WHERE id = %s
                    """,
                    (user_vendor_id,)
                )
            else:
                cursor.execute(
                    """
                    SELECT
                        id,
                        vendor_name,
                        company,
                        email,
                        phone,
                        address,
                        reliability_score,
                        quality_score,
                        delivery_rate,
                        total_orders,
                        completed_orders,
                        category,
                        status
                    FROM vendors
                    ORDER BY id
                    """
                )

            data = cursor.fetchall()

        vendors = []

        for row in data:

            vendors.append({
                "id": row[0],
                "vendor_name": row[1],
                "company": row[2],
                "email": row[3],
                "phone": row[4],
                "address": row[5],
                "reliability_score": float(row[6] or 0),
                "quality_score": float(row[7] or 0),
                "delivery_rate": float(row[8] or 0),
                "total_orders": int(row[9] or 0),
                "completed_orders": int(row[10] or 0),
                "category": row[11],
                "status": row[12]
            })

        return vendors

    except Exception as e:

        conn.rollback()

        print("GET VENDORS ERROR:", e)

        return {
            "error": str(e)
        }


# ==================================================
# GET VENDOR BY ID
# ==================================================

@router.get("/vendors/{id}")
def get_vendor(id: int, current_user: dict = Depends(get_current_user)):

    try:
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")

        if user_role == "Vendor" and id != user_vendor_id:
            raise HTTPException(status_code=403, detail="Permission Denied: Cannot access another vendor's profile")

        conn.rollback()

        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    vendor_name,
                    company,
                    email,
                    phone,
                    address,
                    reliability_score,
                    quality_score,
                    delivery_rate,
                    total_orders,
                    completed_orders,
                    category,
                    status,
                    contact_person,
                    city
                FROM vendors
                WHERE id = %s
                """,
                (id,)
            )

            row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Vendor not found")

        return {
            "id": row[0],
            "vendor_name": row[1],
            "name": row[1],
            "company": row[2],
            "email": row[3],
            "phone": row[4],
            "address": row[5],
            "reliability_score": float(row[6] or 0),
            "quality_score": float(row[7] or 0),
            "delivery_rate": float(row[8] or 0),
            "total_orders": int(row[9] or 0),
            "completed_orders": int(row[10] or 0),
            "category": row[11],
            "status": row[12],
            "contact_name": row[13],
            "contact_person": row[13],
            "city": row[14]
        }

    except HTTPException as he:
        raise he

    except Exception as e:

        conn.rollback()

        print(f"GET VENDOR {id} ERROR:", e)

        return {
            "error": str(e)
        }


# ==================================================
# UPDATE VENDOR
# ==================================================

@router.put("/vendors/{id}")
def update_vendor(
    id: int,
    vendor_name: str = Form(...),
    company: str = Form(None),
    email: str = Form(None),
    phone: str = Form(None),
    address: str = Form(None),
    category: str = Form(...),
    status: str = Form(...),
    current_user: dict = Depends(get_current_user)
):

    try:
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")

        if user_role == "Vendor":
            if id != user_vendor_id:
                raise HTTPException(status_code=403, detail="Permission Denied: Cannot modify another vendor")
            with conn.cursor() as cursor:
                cursor.execute("SELECT status FROM vendors WHERE id = %s", (id,))
                current_status_row = cursor.fetchone()
                status = current_status_row[0] if current_status_row else "Pending"
        elif user_role not in ["Admin", "Procurement Manager"]:
            raise HTTPException(status_code=403, detail="Permission Denied: Unauthorized role")

        conn.rollback()

        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE vendors
                SET
                    vendor_name=%s,
                    company=%s,
                    email=%s,
                    phone=%s,
                    address=%s,
                    category=%s,
                    status=%s
                WHERE id=%s
                """,
                (
                    vendor_name,
                    company,
                    email,
                    phone,
                    address,
                    category,
                    status,
                    id
                )
            )

        conn.commit()

        # Log Vendor Update
        from audit_logs import log_action
        log_action(user_id=current_user.get('id'), user_name=current_user.get('name'), user_email=current_user.get('email'), action="UPDATE", entity_type="VENDOR", entity_id=str(id), details=f"Updated vendor details for: {vendor_name}")

        return {
            "message": "Vendor Updated Successfully"
        }

    except Exception as e:

        conn.rollback()

        print("UPDATE VENDOR ERROR:", e)

        return {
            "error": str(e)
        }


# ==================================================
# DELETE VENDOR
# ==================================================

@router.delete("/vendors/{id}")
def delete_vendor(id: int, current_user: dict = Depends(check_role(["Admin"]))):

    try:
        conn.rollback()

        with conn.cursor() as cursor:
            cursor.execute("SELECT vendor_name FROM vendors WHERE id = %s", (id,))
            row = cursor.fetchone()
            vendor_name = row[0] if row else "Unknown"

            cursor.execute(
                """
                DELETE FROM vendors
                WHERE id=%s
                """,
                (id,)
            )

        conn.commit()

        # Log Vendor Deletion
        from audit_logs import log_action
        log_action(user_id=current_user.get('id'), user_name=current_user.get('name'), user_email=current_user.get('email'), action="DELETE", entity_type="VENDOR", entity_id=str(id), details=f"Deleted vendor: {vendor_name} (ID: {id})")

        return {
            "message": "Vendor Deleted Successfully"
        }

    except Exception as e:

        conn.rollback()

        print("DELETE VENDOR ERROR:", e)

        return {
            "error": str(e)
        }


# ==================================================
# CALCULATE RELIABILITY SCORE
# ==================================================

@router.put("/vendors/calculate-score/{id}")
def calculate_score(id: int, current_user: dict = Depends(check_role(["Admin", "Procurement Manager", "Supply Chain Manager"]))):
    try:
        from vendor_performance import calculate_vendor_reliability
        final_score = calculate_vendor_reliability(id)
        if final_score is None:
            return {
                "message": "Vendor Not Found"
            }

        return {
            "message": "Reliability Score Calculated",
            "score": final_score
        }
    except Exception as e:
        print("CALCULATE SCORE ERROR:", e)
        return {
            "error": str(e)
        }




