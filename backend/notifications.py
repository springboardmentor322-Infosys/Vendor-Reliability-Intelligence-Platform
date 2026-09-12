from fastapi import APIRouter, Depends, HTTPException, status
from db import conn
from auth import get_current_user
from datetime import date
from typing import Optional, List, Dict, Any

router = APIRouter(prefix="/notifications", tags=["Notifications"])

def generate_notifications_from_real_data(cursor, vendor_id=None):
    today = date.today()
    
    # 1. Contract Expiry Alerts
    if vendor_id:
        cursor.execute("SELECT c.id, c.vendor_id, c.contract_name, c.end_date, c.status FROM contracts c WHERE c.vendor_id = %s ORDER BY c.id DESC LIMIT 50", (vendor_id,))
    else:
        cursor.execute("SELECT c.id, c.vendor_id, c.contract_name, c.end_date, c.status FROM contracts c ORDER BY c.id DESC LIMIT 50")
    contracts = cursor.fetchall()
    for cid, cvid, cname, end_date, status in contracts:
        if not end_date:
            continue
        remaining_days = (end_date - today).days
        if remaining_days <= 30:
            msg = f"Contract '{cname}' (Contract ID: {cid}) has expired or is expiring soon (End Date: {end_date})."
            cursor.execute("SELECT id FROM notifications WHERE notification_type = 'Contract Expiry' AND message LIKE %s", (f"%Contract ID: {cid}%",))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO notifications (vendor_id, notification_type, message, status, created_date)
                    VALUES (%s, 'Contract Expiry', %s, 'Unread', CURRENT_TIMESTAMP)
                """, (cvid, msg))
                
    # 2. Quality Issue Alerts
    if vendor_id:
        cursor.execute("SELECT q.id, q.vendor_id, q.purchase_order_id, q.quantity_failed, q.quality_score FROM quality_inspections q WHERE q.vendor_id = %s ORDER BY q.id DESC LIMIT 50", (vendor_id,))
    else:
        cursor.execute("SELECT q.id, q.vendor_id, q.purchase_order_id, q.quantity_failed, q.quality_score FROM quality_inspections q ORDER BY q.id DESC LIMIT 50")
    inspections = cursor.fetchall()
    for qid, qvid, qpoid, qfailed, qscore in inspections:
        if qfailed > 0:
            msg = f"Quality issue detected on PO #{qpoid} (Inspection ID: {qid}). Quality Score: {qscore}%, Failed quantity: {qfailed}."
            cursor.execute("SELECT id FROM notifications WHERE notification_type = 'Quality Issue' AND message LIKE %s", (f"%Inspection ID: {qid}%",))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO notifications (vendor_id, notification_type, message, status, created_date)
                    VALUES (%s, 'Quality Issue', %s, 'Unread', CURRENT_TIMESTAMP)
                """, (qvid, msg))
                
    # 3. Delivery Delay Alerts (Overdue POs)
    if vendor_id:
        cursor.execute("""
            SELECT po.id, po.vendor_id, po.product_name, po.expected_delivery 
            FROM purchase_orders po 
            LEFT JOIN deliveries d ON po.dataco_order_id = d.dataco_order_id AND po.order_item_id = d.dataco_order_item_id
            WHERE po.vendor_id = %s 
              AND LOWER(po.status) NOT IN ('completed', 'delivered', 'canceled')
              AND (
                  (po.dataco_order_id IS NOT NULL AND (d.actual_days > d.scheduled_days OR d.late_delivery_risk = 1))
                  OR
                  (po.dataco_order_id IS NULL AND po.expected_delivery < CURRENT_DATE)
              )
            ORDER BY po.id DESC
            LIMIT 50
        """, (vendor_id,))
    else:
        cursor.execute("""
            SELECT po.id, po.vendor_id, po.product_name, po.expected_delivery 
            FROM purchase_orders po 
            LEFT JOIN deliveries d ON po.dataco_order_id = d.dataco_order_id AND po.order_item_id = d.dataco_order_item_id
            WHERE LOWER(po.status) NOT IN ('completed', 'delivered', 'canceled')
              AND (
                  (po.dataco_order_id IS NOT NULL AND (d.actual_days > d.scheduled_days OR d.late_delivery_risk = 1))
                  OR
                  (po.dataco_order_id IS NULL AND po.expected_delivery < CURRENT_DATE)
              )
            ORDER BY po.id DESC
            LIMIT 50
        """)
    delayed_pos = cursor.fetchall()
    for poid, povid, pname, exp_del in delayed_pos:
        msg = f"Purchase Order PO-{poid} for '{pname}' (PO ID: {poid}) is delayed. Expected delivery was {exp_del}."
        cursor.execute("SELECT id FROM notifications WHERE notification_type = 'Delivery Delay' AND message LIKE %s", (f"%PO ID: {poid}%",))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO notifications (vendor_id, notification_type, message, status, created_date)
                VALUES (%s, 'Delivery Delay', %s, 'Unread', CURRENT_TIMESTAMP)
            """, (povid, msg))
            
    # 4. Invoice Overdue Alerts
    if vendor_id:
        cursor.execute("""
            SELECT i.id, i.vendor_id, i.invoice_number, i.due_date, i.invoice_amount 
            FROM invoices i 
            WHERE i.vendor_id = %s 
              AND LOWER(i.payment_status) IN ('pending', 'unpaid') 
              AND i.due_date < CURRENT_DATE
            ORDER BY i.id DESC
            LIMIT 50
        """, (vendor_id,))
    else:
        cursor.execute("""
            SELECT i.id, i.vendor_id, i.invoice_number, i.due_date, i.invoice_amount 
            FROM invoices i 
            WHERE LOWER(i.payment_status) IN ('pending', 'unpaid') 
              AND i.due_date < CURRENT_DATE
            ORDER BY i.id DESC
            LIMIT 50
        """)
    overdue_invoices = cursor.fetchall()
    for iid, ivid, inv_num, due, amt in overdue_invoices:
        msg = f"Invoice #{inv_num} (Invoice ID: {iid}) for ${amt} is overdue. Due date was {due}."
        cursor.execute("SELECT id FROM notifications WHERE notification_type = 'Payment/Invoice' AND message LIKE %s", (f"%Invoice ID: {iid}%",))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO notifications (vendor_id, notification_type, message, status, created_date)
                VALUES (%s, 'Payment/Invoice', %s, 'Unread', CURRENT_TIMESTAMP)
            """, (ivid, msg))
            
    # 5. Pending Registration Approvals (For Admin - vendor_id IS NULL)
    if not vendor_id:
        cursor.execute("SELECT u.id, u.name, u.email, u.role FROM users u WHERE LOWER(u.status) = 'pending' ORDER BY u.id DESC LIMIT 50")
        pending_users = cursor.fetchall()
        for uid, uname, uemail, urole in pending_users:
            msg = f"New user registration pending approval: {uname} ({uemail}) as {urole} (User ID: {uid})."
            cursor.execute("SELECT id FROM notifications WHERE notification_type = 'Vendor Approval' AND message LIKE %s", (f"%User ID: {uid}%",))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO notifications (vendor_id, notification_type, message, status, created_date)
                    VALUES (NULL, 'Vendor Approval', %s, 'Unread', CURRENT_TIMESTAMP)
                """, (msg,))

    # 6. High Risk Vendor Alerts (Reliability Score < 60)
    if vendor_id:
        cursor.execute("SELECT v.id, v.vendor_name, v.reliability_score FROM vendors v WHERE v.id = %s AND v.reliability_score > 0 AND v.reliability_score < 60", (vendor_id,))
    else:
        cursor.execute("SELECT v.id, v.vendor_name, v.reliability_score FROM vendors v WHERE v.reliability_score > 0 AND v.reliability_score < 60 ORDER BY v.reliability_score ASC LIMIT 50")
    risk_vendors = cursor.fetchall()
    for rvid, rvname, rscore in risk_vendors:
        msg = f"Vendor '{rvname}' (Vendor ID: {rvid}) has dropped into High Risk status (Reliability Score: {round(float(rscore), 1)}%)."
        cursor.execute("SELECT id FROM notifications WHERE notification_type = 'Vendor Risk' AND message LIKE %s", (f"%Vendor ID: {rvid}%",))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO notifications (vendor_id, notification_type, message, status, created_date)
                VALUES (%s, 'Vendor Risk', %s, 'Unread', CURRENT_TIMESTAMP)
            """, (rvid, msg))

@router.get("/stats")
def get_notification_stats(
    vendor_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get notification summary metrics.
    Enforces strict tenant isolation for Vendor role.
    """
    try:
        conn.rollback()
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")

        if user_role == "Vendor":
            if not user_vendor_id:
                return {
                    "total_count": 0,
                    "unread_count": 0,
                    "read_count": 0,
                    "urgent_count": 0,
                    "last_alert_date": None,
                    "has_data": False
                }
            if vendor_id is not None and vendor_id != user_vendor_id:
                raise HTTPException(
                    status_code=403,
                    detail="Forbidden: Vendors may only access their own notification statistics."
                )
            target_vendor_id = user_vendor_id
        else:
            target_vendor_id = vendor_id

        with conn.cursor() as cursor:
            query = """
                SELECT 
                    COUNT(*),
                    COUNT(CASE WHEN LOWER(status) = 'unread' THEN 1 END),
                    COUNT(CASE WHEN LOWER(status) = 'read' THEN 1 END),
                    COUNT(CASE WHEN LOWER(notification_type) IN ('delivery delay', 'payment/invoice', 'quality issue', 'vendor risk') AND LOWER(status) = 'unread' THEN 1 END),
                    MAX(created_date)
                FROM notifications
                WHERE 1=1
            """
            params = []
            if target_vendor_id is not None:
                query += " AND vendor_id = %s"
                params.append(target_vendor_id)

            cursor.execute(query, params)
            row = cursor.fetchone()

            total_count = row[0] or 0
            unread_count = row[1] or 0
            read_count = row[2] or 0
            urgent_count = row[3] or 0
            last_alert_date = str(row[4]) if row[4] else None

            return {
                "total_count": total_count,
                "unread_count": unread_count,
                "read_count": read_count,
                "urgent_count": urgent_count,
                "last_alert_date": last_alert_date,
                "has_data": (total_count > 0)
            }
    except HTTPException as he:
        raise he
    except Exception as e:
        conn.rollback()
        print("GET NOTIFICATION STATS ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )


@router.get("")
def get_notifications(
    page: Optional[int] = None,
    limit: int = 20,
    status: Optional[str] = None,
    type: Optional[str] = None,
    vendor_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get notifications with strict multi-tenant isolation.
    Rejects unauthorized vendor_id tampering with HTTP 403 Forbidden.
    """
    try:
        conn.rollback()
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")
        
        if user_role == "Vendor":
            if not user_vendor_id:
                if page is not None:
                    return {"notifications": [], "total_unread": 0, "total_count": 0, "page": page, "limit": limit}
                else:
                    return []
            if vendor_id is not None and vendor_id != user_vendor_id:
                raise HTTPException(
                    status_code=403,
                    detail="Forbidden: Vendors may only access their own notifications."
                )
            target_vendor_id = user_vendor_id
        else:
            target_vendor_id = vendor_id

        with conn.cursor() as cursor:
            # Get total unread count for active alerts
            unread_query = "SELECT COUNT(*) FROM notifications WHERE LOWER(status) = 'unread'"
            unread_params = []
            if target_vendor_id is not None:
                unread_query += " AND vendor_id = %s"
                unread_params.append(target_vendor_id)
            cursor.execute(unread_query, unread_params)
            total_unread = cursor.fetchone()[0] or 0
            
            # Construct main filtered query
            query = "SELECT id, vendor_id, notification_type, message, status, created_date FROM notifications WHERE 1=1"
            params = []
            
            if target_vendor_id is not None:
                query += " AND vendor_id = %s"
                params.append(target_vendor_id)
                
            if status and status.lower() != "all":
                query += " AND LOWER(status) = LOWER(%s)"
                params.append(status)
                
            if type and type.lower() != "all":
                query += " AND LOWER(notification_type) = LOWER(%s)"
                params.append(type)
                
            query += " ORDER BY created_date DESC, id DESC"
            
            # Get total count of filtered notifications
            count_query = f"SELECT COUNT(*) FROM ({query}) AS q"
            cursor.execute(count_query, params)
            total_count = cursor.fetchone()[0] or 0
            
            # Apply limit and offset for pagination
            if page is not None:
                offset = (page - 1) * limit
                query += " LIMIT %s OFFSET %s"
                params.extend([limit, offset])
                
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
        notifications = []
        for row in rows:
            notifications.append({
                "id": row[0],
                "vendor_id": row[1],
                "notification_type": row[2],
                "message": row[3],
                "status": row[4],
                "created_date": str(row[5]) if row[5] else ""
            })
            
        if page is not None:
            return {
                "notifications": notifications,
                "total_unread": total_unread,
                "total_count": total_count,
                "page": page,
                "limit": limit
            }
        else:
            return notifications
    except HTTPException as he:
        raise he
    except Exception as e:
        conn.rollback()
        print("GET NOTIFICATIONS ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )


@router.get("/{id}")
def get_notification_by_id(id: int, current_user: dict = Depends(get_current_user)):
    """
    Get a single notification by ID.
    Enforces strict ownership check (403 on cross-vendor access).
    """
    try:
        conn.rollback()
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")

        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, vendor_id, notification_type, message, status, created_date 
                FROM notifications 
                WHERE id = %s
            """, (id,))
            row = cursor.fetchone()

            if not row:
                raise HTTPException(
                    status_code=404,
                    detail=f"Notification #{id} not found."
                )

            if user_role == "Vendor":
                if row[1] != user_vendor_id:
                    raise HTTPException(
                        status_code=403,
                        detail="Forbidden: You do not have permission to access another vendor's notification."
                    )

            return {
                "id": row[0],
                "vendor_id": row[1],
                "notification_type": row[2],
                "message": row[3],
                "status": row[4],
                "created_date": str(row[5]) if row[5] else ""
            }
    except HTTPException as he:
        raise he
    except Exception as e:
        conn.rollback()
        print("GET NOTIFICATION BY ID ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )


@router.post("/read/{id}")
@router.post("/{id}/read")
@router.put("/{id}/read")
def mark_notification_read(id: int, current_user: dict = Depends(get_current_user)):
    """
    Mark a notification as Read.
    Verifies that the caller owns the notification (403 on cross-vendor modification).
    """
    try:
        conn.rollback()
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")
        
        with conn.cursor() as cursor:
            cursor.execute("SELECT vendor_id, status FROM notifications WHERE id = %s", (id,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Notification not found")
            
            # If vendor, verify the notification belongs to them
            if user_role == "Vendor":
                if row[0] != user_vendor_id:
                    raise HTTPException(
                        status_code=403,
                        detail="Forbidden: You cannot modify notifications belonging to another vendor."
                    )
            
            cursor.execute("""
                UPDATE notifications
                SET status = 'Read'
                WHERE id = %s
            """, (id,))
            conn.commit()
            
        return {"message": "Notification marked as read", "id": id, "status": "Read"}
    except HTTPException as he:
        raise he
    except Exception as e:
        conn.rollback()
        print("MARK NOTIFICATION READ ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )


@router.post("/read-all")
def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    """
    Mark all unread notifications as Read for the current vendor or system.
    """
    try:
        conn.rollback()
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")

        with conn.cursor() as cursor:
            if user_role == "Vendor":
                if not user_vendor_id:
                    return {"message": "No vendor linked", "updated": 0}
                cursor.execute("""
                    UPDATE notifications
                    SET status = 'Read'
                    WHERE vendor_id = %s AND LOWER(status) = 'unread'
                """, (user_vendor_id,))
            else:
                cursor.execute("""
                    UPDATE notifications
                    SET status = 'Read'
                    WHERE LOWER(status) = 'unread'
                """)
            
            updated = cursor.rowcount
            conn.commit()

        return {"message": "All notifications marked as read", "updated": updated}
    except Exception as e:
        conn.rollback()
        print("MARK ALL READ ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )


@router.delete("/{id}")
def delete_notification(id: int, current_user: dict = Depends(get_current_user)):
    """
    Delete a notification. Restricted to Administrators.
    Vendors attempting deletion receive HTTP 403 Forbidden.
    """
    try:
        conn.rollback()
        user_role = current_user.get("role")

        if user_role == "Vendor":
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Vendors are not permitted to delete system notification logs."
            )

        if user_role not in ("Admin", "Administrator"):
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Only administrators can delete notifications."
            )

        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM notifications WHERE id = %s", (id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Notification not found.")

            cursor.execute("DELETE FROM notifications WHERE id = %s", (id,))
            conn.commit()

        return {"message": "Notification deleted successfully", "id": id}
    except HTTPException as he:
        raise he
    except Exception as e:
        conn.rollback()
        print("DELETE NOTIFICATION ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )


@router.post("/sync")
def sync_notifications(current_user: dict = Depends(get_current_user)):
    """
    Admin or manual sync utility to detect delayed POs, overdue invoices, and expiring contracts.
    """
    try:
        conn.rollback()
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")

        with conn.cursor() as cursor:
            target_vid = user_vendor_id if user_role == "Vendor" else None
            generate_notifications_from_real_data(cursor, target_vid)
            conn.commit()

        return {"message": "Notifications synchronized successfully"}
    except Exception as e:
        conn.rollback()
        print("SYNC NOTIFICATIONS ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail=f"Sync error: {str(e)}"
        )
