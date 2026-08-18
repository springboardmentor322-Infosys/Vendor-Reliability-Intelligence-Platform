from fastapi import APIRouter, Depends, HTTPException, status
from db import conn
from auth import get_current_user
from datetime import date

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
              AND LOWER(i.payment_status) = 'unpaid' 
              AND i.due_date < CURRENT_DATE
            ORDER BY i.id DESC
            LIMIT 50
        """, (vendor_id,))
    else:
        cursor.execute("""
            SELECT i.id, i.vendor_id, i.invoice_number, i.due_date, i.invoice_amount 
            FROM invoices i 
            WHERE LOWER(i.payment_status) = 'unpaid' 
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

@router.get("")
def get_notifications(
    page: int = None,
    limit: int = 20,
    status: str = None,
    type: str = None,
    current_user: dict = Depends(get_current_user)
):
    try:
        conn.rollback()
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")
        
        with conn.cursor() as cursor:
            generate_notifications_from_real_data(cursor, user_vendor_id)
            conn.commit()
            
            # Get total unread count for active alerts
            unread_query = "SELECT COUNT(*) FROM notifications WHERE status = 'Unread'"
            unread_params = []
            if user_role == "Vendor":
                unread_query += " AND vendor_id = %s"
                unread_params.append(user_vendor_id)
            cursor.execute(unread_query, unread_params)
            total_unread = cursor.fetchone()[0]
            
            # Construct main filtered query
            query = "SELECT id, vendor_id, notification_type, message, status, created_date FROM notifications WHERE 1=1"
            params = []
            
            if user_role == "Vendor":
                if not user_vendor_id:
                    if page is not None:
                        return {"notifications": [], "total_unread": 0, "total_count": 0, "page": page, "limit": limit}
                    else:
                        return []
                query += " AND vendor_id = %s"
                params.append(user_vendor_id)
                
            if status and status != "all":
                query += " AND status = %s"
                params.append(status)
                
            if type and type != "all":
                query += " AND notification_type = %s"
                params.append(type)
                
            query += " ORDER BY created_date DESC, id DESC"
            
            # Get total count of filtered notifications
            count_query = f"SELECT COUNT(*) FROM ({query}) AS q"
            cursor.execute(count_query, params)
            total_count = cursor.fetchone()[0]
            
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
    except Exception as e:
        conn.rollback()
        print("GET NOTIFICATIONS ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )

@router.post("/read/{id}")
def mark_notification_read(id: int, current_user: dict = Depends(get_current_user)):
    try:
        conn.rollback()
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")
        
        with conn.cursor() as cursor:
            # If vendor, verify the notification belongs to them
            if user_role == "Vendor":
                cursor.execute("SELECT vendor_id FROM notifications WHERE id = %s", (id,))
                row = cursor.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Notification not found")
                if row[0] != user_vendor_id:
                    raise HTTPException(status_code=403, detail="Permission Denied")
            
            cursor.execute("""
                UPDATE notifications
                SET status = 'Read'
                WHERE id = %s
            """, (id,))
            conn.commit()
            
        return {"message": "Notification marked as read"}
    except HTTPException as he:
        raise he
    except Exception as e:
        conn.rollback()
        print("MARK NOTIFICATION READ ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )
