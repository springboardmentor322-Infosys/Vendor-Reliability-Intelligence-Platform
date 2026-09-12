from typing import Optional
from fastapi import APIRouter, Form, Depends, HTTPException, Query, status
from db import conn
from auth import get_current_user, check_role, normalize_role
from datetime import datetime

router = APIRouter()


# ==================================================
# 1. GET ALL COMMUNICATIONS (Role & Tenant Scoped)
# ==================================================
@router.get("/communications")
def get_communications(
    vendor_id: Optional[int] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    try:
        user_role = normalize_role(current_user.get("role"))
        user_vendor_id = current_user.get("vendor_id")

        if user_role == "Vendor":
            if not user_vendor_id:
                return []
            # Multi-tenant tampering check
            if vendor_id is not None and vendor_id != user_vendor_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: Vendors may only access communication records for their own organization."
                )
            target_vendor_id = user_vendor_id
        else:
            target_vendor_id = vendor_id

        conn.rollback()
        with conn.cursor() as cursor:
            if target_vendor_id:
                cursor.execute("""
                    SELECT
                        c.id,
                        c.user_id,
                        c.vendor_id,
                        v.vendor_name,
                        c.purchase_order_id,
                        po.po_number,
                        c.contract_id,
                        ct.contract_name,
                        c.message,
                        c.created_at,
                        c.message_type,
                        c.subject,
                        c.response_time,
                        c.resolution_time,
                        c.issue_status,
                        u.name AS sender_name,
                        u.role AS sender_role,
                        u.email AS sender_email
                    FROM communications c
                    LEFT JOIN vendors v ON c.vendor_id = v.id
                    LEFT JOIN users u ON c.user_id = u.id
                    LEFT JOIN purchase_orders po ON c.purchase_order_id = po.id
                    LEFT JOIN contracts ct ON c.contract_id = ct.id
                    WHERE c.vendor_id = %s
                    ORDER BY c.created_at DESC, c.id DESC
                """, (target_vendor_id,))
            else:
                cursor.execute("""
                    SELECT
                        c.id,
                        c.user_id,
                        c.vendor_id,
                        v.vendor_name,
                        c.purchase_order_id,
                        po.po_number,
                        c.contract_id,
                        ct.contract_name,
                        c.message,
                        c.created_at,
                        c.message_type,
                        c.subject,
                        c.response_time,
                        c.resolution_time,
                        c.issue_status,
                        u.name AS sender_name,
                        u.role AS sender_role,
                        u.email AS sender_email
                    FROM communications c
                    LEFT JOIN vendors v ON c.vendor_id = v.id
                    LEFT JOIN users u ON c.user_id = u.id
                    LEFT JOIN purchase_orders po ON c.purchase_order_id = po.id
                    LEFT JOIN contracts ct ON c.contract_id = ct.id
                    ORDER BY c.created_at DESC, c.id DESC
                """)
            rows = cursor.fetchall()

        communications = []
        for row in rows:
            sender_n = row[15] or (row[3] if row[1] is None else "Procurement Desk")
            po_label = row[5] or (f"PO-{row[4]}" if row[4] else None)
            ct_label = row[7] or (f"Contract #{row[6]}" if row[6] else None)
            subj = row[11] or (f"Inquiry regarding {po_label}" if po_label else (f"Contract Agreement {ct_label}" if ct_label else "Procurement Inquiry"))
            status_val = row[14] or "Resolved"

            communications.append({
                "id": row[0],
                "user_id": row[1],
                "vendor_id": row[2],
                "vendor_name": row[3] or "N/A",
                "purchase_order_id": row[4],
                "po_number": po_label,
                "contract_id": row[6],
                "contract_name": ct_label,
                "message": row[8],
                "created_at": str(row[9]),
                "message_type": row[10] or "Message",
                "subject": subj,
                "response_time": float(row[12] or 0),
                "resolution_time": float(row[13] or 0),
                "issue_status": status_val,
                "sender_name": sender_n,
                "sender_role": normalize_role(row[16]) if row[16] else "Supplier Partner",
                "sender_email": row[17] or "N/A",
                "is_own": bool(row[1] == current_user.get("id"))
            })

        return communications

    except HTTPException:
        raise
    except Exception as e:
        try:
            conn.rollback()
        except:
            pass
        print("GET COMMUNICATION ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )


# ==================================================
# 2. GET COMMUNICATION PERFORMANCE STATS
# ==================================================
@router.get("/communications/stats")
def get_communication_stats(
    vendor_id: Optional[int] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    try:
        user_role = normalize_role(current_user.get("role"))
        user_vendor_id = current_user.get("vendor_id")

        if user_role == "Vendor":
            if not user_vendor_id:
                return {
                    "total_count": 0,
                    "has_data": False,
                    "activity_score": None,
                    "activity_display": "N/A",
                    "last_activity": None,
                    "open_count": 0,
                    "resolved_count": 0
                }
            if vendor_id is not None and vendor_id != user_vendor_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: Vendors may only access communication statistics for their own organization."
                )
            target_vendor_id = user_vendor_id
        else:
            target_vendor_id = vendor_id

        conn.rollback()
        with conn.cursor() as cursor:
            if target_vendor_id:
                cursor.execute("""
                    SELECT 
                        COUNT(*),
                        MAX(created_at),
                        COUNT(CASE WHEN LOWER(COALESCE(issue_status, 'open')) IN ('open', 'in progress', 'pending') THEN 1 END),
                        COUNT(CASE WHEN LOWER(COALESCE(issue_status, '')) = 'resolved' THEN 1 END)
                    FROM communications
                    WHERE vendor_id = %s
                """, (target_vendor_id,))
            else:
                cursor.execute("""
                    SELECT 
                        COUNT(*),
                        MAX(created_at),
                        COUNT(CASE WHEN LOWER(COALESCE(issue_status, 'open')) IN ('open', 'in progress', 'pending') THEN 1 END),
                        COUNT(CASE WHEN LOWER(COALESCE(issue_status, '')) = 'resolved' THEN 1 END)
                    FROM communications
                """)
            row = cursor.fetchone()

        total_count = int(row[0] or 0)
        last_date = str(row[1]) if row[1] else None
        open_count = int(row[2] or 0)
        resolved_count = int(row[3] or 0)

        if total_count > 0:
            has_data = True
            activity_score = round(min(100.0, 70.0 + (total_count * 3.0)), 1)
            activity_display = f"{activity_score}%"
        else:
            has_data = False
            activity_score = None
            activity_display = "N/A"

        return {
            "total_count": total_count,
            "has_data": has_data,
            "activity_score": activity_score,
            "activity_display": activity_display,
            "last_activity": last_date,
            "open_count": open_count,
            "resolved_count": resolved_count
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("GET COMMUNICATION STATS ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# 3. GET SINGLE COMMUNICATION DETAIL (With Ownership Check)
# ==================================================
@router.get("/communications/{communication_id}")
def get_communication_detail(
    communication_id: int,
    current_user: dict = Depends(get_current_user)
):
    try:
        user_role = normalize_role(current_user.get("role"))
        user_vendor_id = current_user.get("vendor_id")

        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    c.id,
                    c.user_id,
                    c.vendor_id,
                    v.vendor_name,
                    c.purchase_order_id,
                    po.po_number,
                    c.contract_id,
                    ct.contract_name,
                    c.message,
                    c.created_at,
                    c.message_type,
                    c.subject,
                    c.response_time,
                    c.resolution_time,
                    c.issue_status,
                    u.name AS sender_name,
                    u.role AS sender_role,
                    u.email AS sender_email
                FROM communications c
                LEFT JOIN vendors v ON c.vendor_id = v.id
                LEFT JOIN users u ON c.user_id = u.id
                LEFT JOIN purchase_orders po ON c.purchase_order_id = po.id
                LEFT JOIN contracts ct ON c.contract_id = ct.id
                WHERE c.id = %s
            """, (communication_id,))
            row = cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Communication record #{communication_id} does not exist."
            )

        comm_vendor_id = row[2]

        # Strict Multi-Tenant Authorization Check
        if user_role == "Vendor":
            if not user_vendor_id or user_vendor_id != comm_vendor_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: You do not have permission to access another vendor's communication record."
                )

        sender_n = row[15] or (row[3] if row[1] is None else "Procurement Desk")
        po_label = row[5] or (f"PO-{row[4]}" if row[4] else None)
        ct_label = row[7] or (f"Contract #{row[6]}" if row[6] else None)
        subj = row[11] or (f"Inquiry regarding {po_label}" if po_label else (f"Contract Agreement {ct_label}" if ct_label else "Procurement Inquiry"))

        return {
            "id": row[0],
            "user_id": row[1],
            "vendor_id": row[2],
            "vendor_name": row[3] or "N/A",
            "purchase_order_id": row[4],
            "po_number": po_label,
            "contract_id": row[6],
            "contract_name": ct_label,
            "message": row[8],
            "created_at": str(row[9]),
            "message_type": row[10] or "Message",
            "subject": subj,
            "response_time": float(row[12] or 0),
            "resolution_time": float(row[13] or 0),
            "issue_status": row[14] or "Resolved",
            "sender_name": sender_n,
            "sender_role": normalize_role(row[16]) if row[16] else "Supplier Partner",
            "sender_email": row[17] or "N/A",
            "is_own": bool(row[1] == current_user.get("id"))
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("GET COMMUNICATION DETAIL ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# 4. ADD / REPLY COMMUNICATION
# ==================================================
@router.post("/communications")
def add_communication(
    vendor_id: Optional[int] = Form(None),
    purchase_order_id: Optional[int] = Form(None),
    contract_id: Optional[int] = Form(None),
    subject: Optional[str] = Form(None),
    issue_status: Optional[str] = Form("Open"),
    message: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    try:
        user_role = normalize_role(current_user.get("role"))
        user_id = current_user.get("id")
        user_vendor_id = current_user.get("vendor_id")

        if user_role == "Vendor":
            if not user_vendor_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User account is not linked to an authorized vendor organization."
                )
            # Prevent tampering with another vendor's ID
            if vendor_id is not None and vendor_id != user_vendor_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: You cannot send communications on behalf of another vendor."
                )
            target_vendor_id = user_vendor_id
        else:
            target_vendor_id = vendor_id

        conn.rollback()
        with conn.cursor() as cursor:
            # Check foreign keys and enforce strict tenant ownership
            if target_vendor_id:
                cursor.execute("SELECT id FROM vendors WHERE id = %s", (target_vendor_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail=f"Vendor with ID {target_vendor_id} does not exist.")

            if purchase_order_id:
                cursor.execute("SELECT id, vendor_id, po_number FROM purchase_orders WHERE id = %s", (purchase_order_id,))
                po_row = cursor.fetchone()
                if not po_row:
                    raise HTTPException(status_code=404, detail=f"Purchase Order with ID {purchase_order_id} does not exist.")
                if user_role == "Vendor" and po_row[1] != target_vendor_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Forbidden: You cannot attach communication to another vendor's purchase order."
                    )
                if not target_vendor_id:
                    target_vendor_id = po_row[1]

            if contract_id:
                cursor.execute("SELECT id, vendor_id, contract_name FROM contracts WHERE id = %s", (contract_id,))
                c_row = cursor.fetchone()
                if not c_row:
                    raise HTTPException(status_code=404, detail=f"Contract with ID {contract_id} does not exist.")
                if user_role == "Vendor" and c_row[1] != target_vendor_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Forbidden: You cannot attach communication to another vendor's contract."
                    )
                if not target_vendor_id:
                    target_vendor_id = c_row[1]

            clean_status = issue_status or "Open"
            now = datetime.now()

            cursor.execute("""
                INSERT INTO communications
                (
                    user_id,
                    vendor_id,
                    purchase_order_id,
                    contract_id,
                    message,
                    subject,
                    issue_status,
                    message_type,
                    created_at,
                    communication_date
                )
                VALUES
                (%s, %s, %s, %s, %s, %s, %s, 'Message', %s, %s)
                RETURNING id
            """, (
                user_id,
                target_vendor_id,
                purchase_order_id,
                contract_id,
                message.strip(),
                subject.strip() if subject else None,
                clean_status,
                now,
                now
            ))
            new_id = cursor.fetchone()[0]
            conn.commit()

        return {
            "message": "Communication added successfully",
            "id": new_id
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("ADD COMMUNICATION ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )


# ==================================================
# 5. UPDATE COMMUNICATION (Role & Ownership Guarded)
# ==================================================
@router.put("/communications/{communication_id}")
def update_communication(
    communication_id: int,
    issue_status: Optional[str] = Form(None),
    subject: Optional[str] = Form(None),
    message: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    try:
        user_role = normalize_role(current_user.get("role"))
        user_vendor_id = current_user.get("vendor_id")

        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, vendor_id, user_id FROM communications WHERE id = %s", (communication_id,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Communication record not found.")

            comm_vendor_id = row[1]
            if user_role == "Vendor":
                if not user_vendor_id or user_vendor_id != comm_vendor_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Forbidden: You cannot modify another vendor's communication record."
                    )

            updates = []
            params = []
            if issue_status:
                updates.append("issue_status = %s")
                params.append(issue_status)
            if subject:
                updates.append("subject = %s")
                params.append(subject)
            if message:
                updates.append("message = %s")
                params.append(message)

            if updates:
                params.append(communication_id)
                cursor.execute(f"""
                    UPDATE communications
                    SET {", ".join(updates)}
                    WHERE id = %s
                """, tuple(params))
                conn.commit()

        return {"message": "Communication updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("UPDATE COMMUNICATION ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# 6. DELETE COMMUNICATION (Admins Only)
# ==================================================
@router.delete("/communications/{communication_id}")
def delete_communication(
    communication_id: int,
    current_user: dict = Depends(get_current_user)
):
    user_role = normalize_role(current_user.get("role"))
    if user_role == "Vendor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Vendors are not permitted to delete communication records."
        )

    if user_role not in ("Administrator", "Admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission Denied: Only Administrators may delete communication audit records."
        )

    try:
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM communications WHERE id = %s", (communication_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Communication record not found.")

            cursor.execute("DELETE FROM communications WHERE id = %s", (communication_id,))
            conn.commit()

        return {
            "message": "Communication deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("DELETE COMMUNICATION ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))