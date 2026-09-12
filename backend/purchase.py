import io
from typing import Optional
from fastapi import APIRouter, Form, Depends, HTTPException
from fastapi.responses import StreamingResponse
from db import conn
from vendor_performance import calculate_vendor_reliability, save_vendor_performance_history
from auth import get_current_user, check_role, normalize_role
from order_slip import build_order_slip_pdf

router = APIRouter()


def ensure_purchase_order_payment_columns():
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute("""
                ALTER TABLE purchase_orders
                    ADD COLUMN IF NOT EXISTS advance_percentage numeric(5, 2) DEFAULT 0.00,
                    ADD COLUMN IF NOT EXISTS advance_amount numeric(15, 2) DEFAULT 0.00,
                    ADD COLUMN IF NOT EXISTS paid_amount numeric(15, 2) DEFAULT 0.00,
                    ADD COLUMN IF NOT EXISTS remaining_amount numeric(15, 2) DEFAULT 0.00,
                    ADD COLUMN IF NOT EXISTS payment_status character varying(50) DEFAULT 'Unpaid',
                    ADD COLUMN IF NOT EXISTS final_payment_amount numeric(15, 2) DEFAULT 0.00,
                    ADD COLUMN IF NOT EXISTS advance_payment_date timestamp without time zone,
                    ADD COLUMN IF NOT EXISTS final_payment_date timestamp without time zone;

                ALTER TABLE payments ALTER COLUMN invoice_id DROP NOT NULL;
                ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type character varying(50) DEFAULT 'Standard';
            """)
            conn.commit()
    except Exception as e:
        conn.rollback()
        print("ENSURE PO PAYMENT COLUMNS ERROR:", e)


# Auto-verify schema on load
ensure_purchase_order_payment_columns()



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

        if quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be greater than zero.")
        if unit_price <= 0:
            raise HTTPException(status_code=400, detail="Unit price must be greater than zero.")

        # Authoritative backend calculation
        total_amount = round(float(quantity) * float(unit_price), 2)

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

            cursor.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM purchase_orders")
            next_po_id = cursor.fetchone()[0]
            po_num = f"PO-2026-{next_po_id:05d}"

            cursor.execute(
                """
                INSERT INTO purchase_orders
                (
                    id,
                    vendor_id,
                    product_id,
                    product_name,
                    quantity,
                    unit_price,
                    total_amount,
                    order_date,
                    expected_delivery,
                    status,
                    po_number,
                    created_by,
                    advance_percentage,
                    advance_amount,
                    paid_amount,
                    remaining_amount,
                    payment_status,
                    final_payment_amount,
                    created_at,
                    updated_at
                )
                VALUES
                (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s, 0.00, 0.00, 0.00, %s, 'Unpaid', 0.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                (
                    next_po_id,
                    vendor_id,
                    product_id,
                    product_name,
                    quantity,
                    unit_price,
                    total_amount,
                    order_date,
                    expected_delivery,
                    status or "Pending Approval",
                    po_num,
                    current_user.get("id"),
                    total_amount
                )
            )
            conn.commit()

            # Log Audit Action
            try:
                from audit_logs import log_action
                log_action(
                    user_id=current_user.get("id"),
                    user_name=current_user.get("name"),
                    user_email=current_user.get("email"),
                    action="PURCHASE_ORDER_CREATED",
                    entity_type="PURCHASE_ORDER",
                    entity_id=str(next_po_id),
                    details=f"Created PO {po_num} for '{product_name}' (Qty: {quantity}, Total: ₹{total_amount})"
                )
            except Exception as le:
                print("Audit logging error:", le)

        return {
            "message": "Purchase Order Added Successfully",
            "id": next_po_id,
            "po_number": po_num
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
                st_lower = status.strip().lower()
                if st_lower in ("delayed", "overdue", "late"):
                    filter_where += " AND p.expected_delivery < CURRENT_DATE AND LOWER(p.status) NOT IN ('completed', 'delivered', 'canceled', 'cancelled', 'fraud')"
                else:
                    filter_where += " AND LOWER(p.status) = %s"
                    filter_params.append(st_lower)

            # 3. Retrieve filtered records (prioritize application POs at top)
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
                    p.status,
                    p.po_number,
                    (SELECT invoice_number FROM invoices WHERE po_id = p.id LIMIT 1) AS invoice_number,
                    (SELECT status FROM invoices WHERE po_id = p.id LIMIT 1) AS invoice_status,
                    (SELECT invoice_amount FROM invoices WHERE po_id = p.id LIMIT 1) AS invoice_amount,
                    (SELECT payment_status FROM invoices WHERE po_id = p.id LIMIT 1) AS invoice_payment_status,
                    CASE WHEN (p.created_by IS NOT NULL OR p.dataco_order_id IS NULL) THEN 1 ELSE 0 END AS is_app_po,
                    COALESCE(p.advance_percentage, 0.00) AS advance_percentage,
                    COALESCE(p.advance_amount, 0.00) AS advance_amount,
                    COALESCE(p.paid_amount, 0.00) AS paid_amount,
                    COALESCE(p.remaining_amount, p.total_amount, 0.00) AS remaining_amount,
                    COALESCE(p.payment_status, 'Unpaid') AS po_payment_status,
                    COALESCE(p.final_payment_amount, 0.00) AS final_payment_amount,
                    p.advance_payment_date,
                    p.final_payment_date
                FROM purchase_orders p
                LEFT JOIN vendors v
                    ON p.vendor_id = v.id
                {filter_where}
                ORDER BY is_app_po DESC, p.id DESC
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
                v_name = row[2] or "Unknown Vendor"
                if row[1] and str(v_name).lower().startswith("derived vendor proxy"):
                    v_name = f"Vendor-{row[1]}"

                tot_amt = float(row[6] or 0)
                paid_amt = float(row[18] or 0)
                rem_amt = float(row[19] if row[19] is not None else (tot_amt - paid_amt))
                po_pay_status = row[20] or "Unpaid"
                # Fallback to invoice payment status if PO payment status is Unpaid but invoice is Paid
                if po_pay_status == "Unpaid" and row[14] and str(row[14]).lower() == "paid":
                    po_pay_status = "Fully Paid"

                orders.append({
                    "id": row[0],
                    "vendor_id": row[1],
                    "vendor_name": v_name,
                    "product_name": row[3] or "N/A",
                    "quantity": row[4] or 0,
                    "unit_price": float(row[5] or 0),
                    "total_amount": tot_amt,
                    "order_date": str(row[7]) if row[7] else "N/A",
                    "expected_delivery": str(row[8]) if row[8] else "N/A",
                    "status": row[9] or "Pending",
                    "po_number": row[10] or f"PO-{row[0]}",
                    "invoice_number": row[11],
                    "invoice_status": row[12],
                    "invoice_amount": float(row[13]) if row[13] is not None else None,
                    "invoice_payment_status": row[14],
                    "payment_status": po_pay_status,
                    "is_app_po": bool(row[15]),
                    "advance_percentage": float(row[16] or 0),
                    "advance_amount": float(row[17] or 0),
                    "paid_amount": paid_amt,
                    "remaining_amount": rem_amt,
                    "po_payment_status": po_pay_status,
                    "final_payment_amount": float(row[21] or 0),
                    "advance_payment_date": str(row[22]) if row[22] else None,
                    "final_payment_date": str(row[23]) if row[23] else None
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
                        COUNT(CASE WHEN LOWER(status) = 'delivered' THEN 1 END),
                        COUNT(DISTINCT COALESCE(dataco_order_id, id))
                    FROM purchase_orders p
                    {base_where}
                """
                cur.execute(kpi_query, where_params)
                kpi_total, kpi_pending, kpi_completed, kpi_delivered, kpi_unique_orders = cur.fetchone()

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
                    "kpi_unique_orders": kpi_unique_orders,
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
# GET SINGLE PURCHASE ORDER DETAIL (RBAC + Cross-Tenant Scoped)
# ==================================================
@router.get("/purchase-orders/{id}")
def get_purchase_order_detail(id: int, current_user: dict = Depends(get_current_user)):
    user_role = normalize_role(current_user.get("role"))
    user_vendor_id = current_user.get("vendor_id")
    
    allowed_roles = {"Administrator", "Procurement Manager", "Supply Chain Manager", "Finance Officer", "Auditor", "Vendor"}
    if user_role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Permission Denied")

    try:
        conn.rollback()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    p.id,
                    p.po_number,
                    p.product_name,
                    p.quantity,
                    p.unit_price,
                    p.total_amount,
                    p.order_date,
                    p.expected_delivery,
                    p.status,
                    p.created_by,
                    p.dataco_order_id,
                    p.vendor_id,
                    v.vendor_name,
                    v.reliability_score,
                    v.delivery_rate,
                    v.quality_score,
                    v.risk_level,
                    v.category AS vendor_category,
                    v.email AS vendor_email,
                    v.phone AS vendor_phone,
                    COALESCE(p.advance_percentage, 0.00),
                    COALESCE(p.advance_amount, 0.00),
                    COALESCE(p.paid_amount, 0.00),
                    COALESCE(p.remaining_amount, p.total_amount, 0.00),
                    COALESCE(p.payment_status, 'Unpaid'),
                    COALESCE(p.final_payment_amount, 0.00),
                    p.advance_payment_date,
                    p.final_payment_date
                FROM purchase_orders p
                LEFT JOIN vendors v ON p.vendor_id = v.id
                WHERE p.id = %s
            """, (id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Purchase Order Not Found")

            (
                po_id, po_number, product_name, quantity, unit_price, total_amount,
                order_date, expected_delivery, status, created_by, dataco_order_id,
                vendor_id, vendor_name, v_rel, v_deliv, v_qual, v_risk, v_cat, v_email, v_phone,
                adv_pct, adv_amt, paid_amt, rem_amt, pay_stat, fin_amt, adv_date, fin_date
            ) = row

            # Cross-tenant check for Vendor role
            if user_role == "Vendor":
                if not user_vendor_id or user_vendor_id != vendor_id:
                    raise HTTPException(
                        status_code=403,
                        detail="Access Denied: Vendors may only inspect purchase orders issued to their own organization."
                    )

            is_app_po = bool(created_by is not None or dataco_order_id is None)
            v_display = vendor_name or "Registered Supplier"
            if vendor_id and str(v_display).lower().startswith("derived vendor proxy"):
                v_display = f"Vendor-{vendor_id}"

            # Query Associated Delivery Information (if any)
            cur.execute("""
                SELECT 
                    id, shipping_mode, delivery_status, late_delivery_risk, is_on_time,
                    scheduled_days, actual_days, COALESCE(actual_days - scheduled_days, 0) AS delay_days,
                    expected_delivery_date, actual_delivery_date, damaged_goods
                FROM deliveries
                WHERE po_id = %s OR (dataco_order_id IS NOT NULL AND dataco_order_id = %s)
                ORDER BY id DESC
                LIMIT 1
            """, (id, dataco_order_id))
            deliv_row = cur.fetchone()
            delivery_info = None
            if deliv_row:
                delivery_info = {
                    "delivery_id": deliv_row[0],
                    "shipping_mode": deliv_row[1] or "Standard Class",
                    "delivery_status": deliv_row[2] or "Pending Dispatch",
                    "late_delivery_risk": int(deliv_row[3] or 0),
                    "is_on_time": bool(deliv_row[4]) if deliv_row[4] is not None else None,
                    "scheduled_days": int(deliv_row[5] or 0),
                    "actual_days": int(deliv_row[6] or 0),
                    "delay_days": int(deliv_row[7] or 0),
                    "expected_delivery_date": str(deliv_row[8]) if deliv_row[8] else None,
                    "actual_delivery_date": str(deliv_row[9]) if deliv_row[9] else None,
                    "damaged_goods": int(deliv_row[10] or 0)
                }

            # Query Associated Invoice Information (if any)
            cur.execute("""
                SELECT id, invoice_number, invoice_date, due_date, invoice_amount, payment_status, status
                FROM invoices
                WHERE po_id = %s
                ORDER BY id DESC
                LIMIT 1
            """, (id,))
            inv_row = cur.fetchone()
            invoice_info = None
            if inv_row:
                invoice_info = {
                    "invoice_id": inv_row[0],
                    "invoice_number": inv_row[1] or f"INV-{inv_row[0]}",
                    "invoice_date": str(inv_row[2]) if inv_row[2] else None,
                    "due_date": str(inv_row[3]) if inv_row[3] else None,
                    "invoice_amount": float(inv_row[4] or 0),
                    "payment_status": inv_row[5] or "Unpaid",
                    "status": inv_row[6] or "Active"
                }

            # Workflow transitions for application POs
            st_lower = (status or "Pending").strip().lower()
            valid_next_states = {
                "pending approval": ["Approved", "Cancelled"],
                "pending": ["Approved", "Cancelled"],
                "approved": ["Ordered", "Cancelled"],
                "ordered": ["In-Transit", "Cancelled"],
                "in-transit": ["Delivered", "Cancelled"],
                "in transit": ["Delivered", "Cancelled"],
                "delivered": ["Completed"],
                "processing": ["In-Transit", "Delivered", "Cancelled"],
                "completed": [],
                "cancelled": [],
                "canceled": []
            }
            allowed_next = valid_next_states.get(st_lower, []) if is_app_po else []

            return {
                "id": po_id,
                "po_number": po_number or f"PO-{po_id:06d}",
                "product_name": product_name or "Catalog Item",
                "quantity": int(quantity or 1),
                "unit_price": float(unit_price or 0),
                "total_amount": float(total_amount or 0),
                "order_date": str(order_date) if order_date else "N/A",
                "expected_delivery": str(expected_delivery) if expected_delivery else "N/A",
                "status": status or "Pending",
                "is_app_po": is_app_po,
                "is_application_order": is_app_po,
                "requires_pricing_completion": bool(is_app_po and (float(unit_price or 0) <= 0 or float(total_amount or 0) <= 0)),
                "data_source": "Application Workflow Order" if is_app_po else "Historical DataCo Dataset",
                "source_type": "Application Workflow Order" if is_app_po else "Historical DataCo Dataset",
                "vendor": {
                    "id": vendor_id,
                    "name": v_display,
                    "reliability_score": float(v_rel or 0),
                    "on_time_delivery_rate": float(v_deliv or 0),
                    "quality_score": float(v_qual or 0),
                    "risk_tier": v_risk or "Low Risk",
                    "category": v_cat or "Supplier",
                    "email": v_email or "N/A",
                    "phone": v_phone or "N/A"
                },
                "delivery": delivery_info,
                "invoice": invoice_info,
                "allowed_next_statuses": allowed_next,
                "advance_percentage": float(adv_pct or 0),
                "advance_amount": float(adv_amt or 0),
                "paid_amount": float(paid_amt or 0),
                "remaining_amount": float(rem_amt if rem_amt is not None else (float(total_amount or 0) - float(paid_amt or 0))),
                "payment_status": pay_stat or "Unpaid",
                "final_payment_amount": float(fin_amt or 0),
                "advance_payment_date": str(adv_date) if adv_date else None,
                "final_payment_date": str(fin_date) if fin_date else None
            }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("GET PO DETAIL ERROR:", e)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        pass


# ==================================================
# GENERATE & DOWNLOAD PURCHASE ORDER SLIP (RBAC + Cross-Tenant Scoped)
# ==================================================
@router.get("/purchase-orders/{id}/slip")
def download_purchase_order_slip(
    id: int,
    current_user: dict = Depends(get_current_user)
):
    user_role = normalize_role(current_user.get("role"))
    user_vendor_id = current_user.get("vendor_id")

    allowed_roles = {
        "Administrator",
        "Admin",
        "Procurement Manager",
        "Finance Officer",
        "Supply Chain Manager",
        "Vendor",
        "Auditor"
    }
    if user_role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail="Permission Denied: Unauthorized role access"
        )

    cursor = None
    try:
        conn.rollback()
        cursor = conn.cursor()

        # 1. Fetch real purchase order with linked vendor, creator, and delivery details
        cursor.execute("""
            SELECT
                p.id,
                p.po_number,
                p.product_name,
                p.quantity,
                p.unit_price,
                p.total_amount,
                p.order_date,
                p.expected_delivery,
                p.status,
                p.product_id,
                p.dataco_order_id,
                p.created_by,
                p.created_at,
                p.updated_at,
                -- Vendor Details
                v.id AS vendor_id,
                v.vendor_name,
                v.company,
                v.email,
                v.phone,
                v.address,
                v.city,
                v.country,
                v.gst_number,
                -- Requisition Creator Details
                u.name AS creator_name,
                u.role AS creator_role,
                u.email AS creator_email,
                -- Delivery Details
                d.shipping_mode,
                d.delivery_status,
                d.scheduled_days,
                d.actual_days,
                COALESCE(d.actual_days - d.scheduled_days, 0) AS delay_days,
                d.expected_delivery_date,
                d.actual_delivery_date,
                -- Payment Details
                COALESCE(p.advance_percentage, 0.00),
                COALESCE(p.advance_amount, 0.00),
                COALESCE(p.paid_amount, 0.00),
                COALESCE(p.remaining_amount, p.total_amount, 0.00),
                COALESCE(p.payment_status, 'Unpaid'),
                COALESCE(p.final_payment_amount, 0.00),
                p.advance_payment_date,
                p.final_payment_date
            FROM purchase_orders p
            LEFT JOIN vendors v ON p.vendor_id = v.id
            LEFT JOIN users u ON p.created_by = u.id
            LEFT JOIN deliveries d ON (d.po_id = p.id OR (p.dataco_order_id IS NOT NULL AND d.dataco_order_id = p.dataco_order_id))
            WHERE p.id = %s
            ORDER BY d.id DESC NULLS LAST
            LIMIT 1
        """, (id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=404,
                detail=f"Purchase order #{id} not found."
            )

        order_vendor_id = row[14]

        # 2. Strict Cross-Tenant Check for Vendor Role
        if user_role == "Vendor":
            if not user_vendor_id:
                raise HTTPException(
                    status_code=403,
                    detail="Access Denied: Vendor user account is not linked to any registered vendor organization."
                )
            if order_vendor_id != user_vendor_id:
                raise HTTPException(
                    status_code=403,
                    detail="Access Denied: Vendors may only view and download order slips issued to their own organization."
                )

        # 3. Fetch Audit Trail / Approval History for this PO
        cursor.execute("""
            SELECT action, user_name, details, created_at
            FROM audit_logs
            WHERE (entity_type = 'PURCHASE_ORDER' AND entity_id = %s)
               OR (details ILIKE %s)
            ORDER BY id ASC
            LIMIT 10
        """, (str(id), f"%{row[1] or id}%"))
        audit_rows = cursor.fetchall()
        audit_trail = []
        for a_row in audit_rows:
            audit_trail.append({
                "action": a_row[0],
                "user_name": a_row[1],
                "user_role": "Authorized Personnel",
                "details": a_row[2],
                "created_at": str(a_row[3]) if a_row[3] else None
            })

        # Assemble order data
        v_name = row[15] or "Registered Supplier"
        if order_vendor_id and str(v_name).lower().startswith("derived vendor proxy"):
            v_name = f"Vendor-{order_vendor_id}"

        po_num = row[1] or f"PO-2026-{row[0]:05d}"

        order_data = {
            "id": row[0],
            "po_number": po_num,
            "product_name": row[2] or "N/A",
            "quantity": int(row[3] or 1),
            "unit_price": float(row[4] or 0),
            "total_amount": float(row[5] or 0),
            "order_date": str(row[6]) if row[6] else "N/A",
            "expected_delivery": str(row[7]) if row[7] else "N/A",
            "status": row[8] or "Pending",
            "product_id": row[9],
            "dataco_order_id": row[10],
            "created_by": row[11],
            "created_at": str(row[12]) if row[12] else None,
            "updated_at": str(row[13]) if row[13] else None,
            "vendor_id": order_vendor_id,
            "vendor_name": v_name,
            "vendor_company": row[16] or v_name,
            "vendor_email": row[17],
            "vendor_phone": row[18],
            "vendor_address": row[19],
            "vendor_city": row[20],
            "vendor_country": row[21],
            "vendor_gst_number": row[22],
            "created_by_name": row[23] or "Procurement Authority",
            "created_by_role": row[24] or "Procurement Manager",
            "created_by_email": row[25] or "procurement@vendoriq.com",
            "shipping_mode": row[26] or "Standard Class",
            "delivery_status": row[27] or ("Delivered" if str(row[8]).lower() == "delivered" else "Pending Dispatch"),
            "scheduled_days": int(row[28]) if row[28] is not None else None,
            "actual_days": int(row[29]) if row[29] is not None else None,
            "delay_days": int(row[30]) if row[30] is not None else None,
            "expected_delivery_date": str(row[31]) if row[31] else None,
            "actual_delivery_date": str(row[32]) if row[32] else None,
            "advance_percentage": float(row[33] or 0),
            "advance_amount": float(row[34] or 0),
            "paid_amount": float(row[35] or 0),
            "remaining_amount": float(row[36] if row[36] is not None else (float(row[5] or 0) - float(row[35] or 0))),
            "payment_status": row[37] or "Unpaid",
            "final_payment_amount": float(row[38] or 0),
            "advance_payment_date": str(row[39]) if row[39] else None,
            "final_payment_date": str(row[40]) if row[40] else None,
            "audit_trail": audit_trail
        }

        # 4. Generate PDF bytes using ReportLab
        pdf_bytes = build_order_slip_pdf(order_data)

        # 5. Record Audit Action
        try:
            from audit_logs import log_action
            log_action(
                user_id=current_user.get("id"),
                user_name=current_user.get("name"),
                user_email=current_user.get("email"),
                action="ORDER_SLIP_GENERATED",
                entity_type="PURCHASE_ORDER",
                entity_id=str(id),
                details=f"Generated and downloaded order slip for PO #{id} ({po_num})"
            )
        except Exception as le:
            print("Audit log order slip error:", le)

        # 6. Return StreamingResponse
        filename = f"Order_Slip_{po_num.replace('/', '_')}.pdf"
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        print("GENERATE ORDER SLIP ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail=f"Error generating order slip: {str(e)}"
        )
    finally:
        if cursor:
            cursor.close()


# ==================================================
# RECORD ADVANCE PAYMENT (Finance Officer / Admin Only)
# ==================================================
@router.post("/purchase-orders/{po_id}/advance-payment")
def record_advance_payment(
    po_id: int,
    advance_percentage: float = Form(25.0),
    payment_method: Optional[str] = Form("Electronic Funds Transfer"),
    current_user: dict = Depends(check_role(["Finance Officer", "Admin", "Administrator"]))
):
    try:
        conn.rollback()
        if advance_percentage <= 0 or advance_percentage > 100:
            raise HTTPException(
                status_code=400,
                detail="Advance percentage must be greater than 0% and at most 100%."
            )

        with conn.cursor() as cursor:
            # 1. Fetch current order with lock
            cursor.execute("""
                SELECT id, po_number, total_amount, status, payment_status, vendor_id, paid_amount, remaining_amount
                FROM purchase_orders
                WHERE id = %s
                FOR UPDATE
            """, (po_id,))
            order = cursor.fetchone()
            if not order:
                raise HTTPException(status_code=404, detail="Purchase Order Not Found")

            p_id, po_num, total_amt, po_status, current_pay_status, vendor_id, current_paid, cur_remaining = order
            total_amt = float(total_amt or 0)
            if total_amt <= 0:
                raise HTTPException(status_code=400, detail="Cannot record payment for a purchase order with zero or invalid total amount.")

            po_status_clean = (po_status or "Pending").strip().lower()
            if po_status_clean in ("cancelled", "canceled", "fraud"):
                raise HTTPException(status_code=400, detail=f"Cannot record payment for an order in '{po_status}' status.")

            current_pay_clean = (current_pay_status or "Unpaid").strip().lower()
            if current_pay_clean in ("partially paid", "fully paid", "paid") or float(current_paid or 0) > 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Advance payment blocked: Purchase order has already received payments (Current Status: '{current_pay_status}')."
                )

            # 2. Authoritative backend calculation
            adv_percentage_round = round(float(advance_percentage), 2)
            advance_amount = round(total_amt * (adv_percentage_round / 100.0), 2)
            remaining_amount = round(total_amt - advance_amount, 2)
            new_pay_status = "Paid" if adv_percentage_round >= 100.0 else "Partially Paid"

            # 3. Update purchase_orders
            cursor.execute("""
                UPDATE purchase_orders
                SET
                    advance_percentage = %s,
                    advance_amount = %s,
                    paid_amount = %s,
                    remaining_amount = %s,
                    payment_status = %s,
                    advance_payment_date = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (adv_percentage_round, advance_amount, advance_amount, remaining_amount, new_pay_status, po_id))

            # 4. Generate unique payment reference and check if invoice exists for 2-way sync
            cursor.execute("SELECT id FROM invoices WHERE po_id = %s", (po_id,))
            inv_row = cursor.fetchone()
            linked_inv_id = inv_row[0] if inv_row else None

            cursor.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM payments")
            next_pay_id = cursor.fetchone()[0]
            pay_ref = f"PAY-ADV-2026-{next_pay_id:05d}"

            cursor.execute("""
                INSERT INTO payments (
                    id, po_id, invoice_id, vendor_id, amount,
                    payment_status, payment_method, payment_reference,
                    payment_date, created_by, payment_type,
                    created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, 'Paid', %s, %s, CURRENT_DATE, %s, 'Advance', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (
                next_pay_id,
                po_id,
                linked_inv_id,
                vendor_id,
                advance_amount,
                payment_method or "Electronic Funds Transfer",
                pay_ref,
                current_user.get("id")
            ))

            # If invoice already exists for this PO, keep it in sync
            if linked_inv_id:
                cursor.execute("""
                    UPDATE invoices
                    SET
                        advance_percentage = %s,
                        advance_amount = %s,
                        paid_amount = %s,
                        remaining_amount = %s,
                        payment_status = %s,
                        advance_payment_date = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (adv_percentage_round, advance_amount, advance_amount, remaining_amount, new_pay_status, linked_inv_id))

            # 5. Log audit trail
            try:
                from audit_logs import log_action
                log_action(
                    user_id=current_user.get("id"),
                    user_name=current_user.get("name"),
                    user_email=current_user.get("email"),
                    action="ADVANCE_PAYMENT_RECORDED",
                    entity_type="PURCHASE_ORDER",
                    entity_id=str(po_id),
                    details=f"Finance Officer recorded advance payment of ₹{advance_amount:,.2f} ({adv_percentage_round}%) for PO #{po_id} ({po_num}). Remaining balance: ₹{remaining_amount:,.2f}. Reference: {pay_ref}."
                )
            except Exception as le:
                print("Audit log error:", le)

            conn.commit()

        return {
            "message": f"Advance payment of ₹{advance_amount:,.2f} recorded successfully.",
            "po_id": po_id,
            "po_number": po_num,
            "advance_percentage": adv_percentage_round,
            "advance_amount": advance_amount,
            "paid_amount": advance_amount,
            "remaining_amount": remaining_amount,
            "payment_status": new_pay_status,
            "payment_reference": pay_ref
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        print("RECORD ADVANCE PAYMENT ERROR:", e)
        raise HTTPException(status_code=500, detail=f"Database error recording advance payment: {str(e)}")


# ==================================================
# RECORD FINAL PAYMENT (Finance Officer / Admin Only - Only Allowed When PO Status == Completed)
# ==================================================
@router.post("/purchase-orders/{po_id}/final-payment")
def record_final_payment(
    po_id: int,
    payment_method: Optional[str] = Form("Electronic Funds Transfer"),
    current_user: dict = Depends(check_role(["Finance Officer", "Admin", "Administrator"]))
):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            # 1. Fetch current order with lock
            cursor.execute("""
                SELECT id, po_number, total_amount, status, payment_status, vendor_id, paid_amount, remaining_amount, advance_amount
                FROM purchase_orders
                WHERE id = %s
                FOR UPDATE
            """, (po_id,))
            order = cursor.fetchone()
            if not order:
                raise HTTPException(status_code=404, detail="Purchase Order Not Found")

            p_id, po_num, total_amt, po_status, current_pay_status, vendor_id, current_paid, cur_remaining, adv_amount = order
            total_amt = float(total_amt or 0)
            current_paid = float(current_paid or 0)
            cur_remaining = float(cur_remaining if cur_remaining is not None else (total_amt - current_paid))

            # 2. Status Validation: MUST be Completed
            po_status_clean = (po_status or "").strip().lower()
            if po_status_clean != "completed":
                raise HTTPException(
                    status_code=400,
                    detail=f"Final payment blocked: Purchase order status must be 'Completed' before releasing final disbursement. Current status: '{po_status}'."
                )

            # 3. Payment Status Validation: Cannot be already Fully Paid
            current_pay_clean = (current_pay_status or "Unpaid").strip().lower()
            if current_pay_clean in ("fully paid", "paid") or cur_remaining <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="Final payment blocked: Purchase order is already fully settled (Remaining balance: ₹0.00)."
                )

            # 4. Authoritative calculation
            final_payment_amount = round(cur_remaining, 2)
            total_paid_after = round(total_amt, 2)
            new_remaining = 0.00
            new_pay_status = "Paid"

            # 5. Update purchase_orders
            cursor.execute("""
                UPDATE purchase_orders
                SET
                    final_payment_amount = %s,
                    paid_amount = %s,
                    remaining_amount = %s,
                    payment_status = %s,
                    final_payment_date = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (final_payment_amount, total_paid_after, new_remaining, new_pay_status, po_id))

            # 6. Record in payments table and sync linked invoice
            cursor.execute("SELECT id FROM invoices WHERE po_id = %s", (po_id,))
            inv_row = cursor.fetchone()
            linked_inv_id = inv_row[0] if inv_row else None

            cursor.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM payments")
            next_pay_id = cursor.fetchone()[0]
            pay_ref = f"PAY-FIN-2026-{next_pay_id:05d}"

            cursor.execute("""
                INSERT INTO payments (
                    id, po_id, invoice_id, vendor_id, amount,
                    payment_status, payment_method, payment_reference,
                    payment_date, created_by, payment_type,
                    created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, 'Paid', %s, %s, CURRENT_DATE, %s, 'Final', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (
                next_pay_id,
                po_id,
                linked_inv_id,
                vendor_id,
                final_payment_amount,
                payment_method or "Electronic Funds Transfer",
                pay_ref,
                current_user.get("id")
            ))

            # If invoice already exists for this PO, keep it in sync
            if linked_inv_id:
                cursor.execute("""
                    UPDATE invoices
                    SET
                        final_payment_amount = %s,
                        paid_amount = %s,
                        remaining_amount = %s,
                        payment_status = 'Paid',
                        status = 'Paid',
                        payment_date = CURRENT_DATE,
                        final_payment_date = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (final_payment_amount, total_paid_after, new_remaining, linked_inv_id))

            # 7. Log audit trail
            try:
                from audit_logs import log_action
                log_action(
                    user_id=current_user.get("id"),
                    user_name=current_user.get("name"),
                    user_email=current_user.get("email"),
                    action="FINAL_PAYMENT_RECORDED",
                    entity_type="PURCHASE_ORDER",
                    entity_id=str(po_id),
                    details=f"Finance Officer recorded final disbursement of ₹{final_payment_amount:,.2f} for PO #{po_id} ({po_num}). Total paid: ₹{total_paid_after:,.2f}. Order is fully settled. Reference: {pay_ref}."
                )
            except Exception as le:
                print("Audit log error:", le)

            conn.commit()

        return {
            "message": f"Final payment of ₹{final_payment_amount:,.2f} recorded successfully. Purchase order is now fully settled.",
            "po_id": po_id,
            "po_number": po_num,
            "final_payment_amount": final_payment_amount,
            "paid_amount": total_paid_after,
            "remaining_amount": new_remaining,
            "payment_status": new_pay_status,
            "payment_reference": pay_ref
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        print("RECORD FINAL PAYMENT ERROR:", e)
        raise HTTPException(status_code=500, detail=f"Database error recording final payment: {str(e)}")


# ==================================================
# GET PURCHASE ORDER PAYMENT HISTORY (RBAC + Vendor Cross-Tenant Scoped)
# ==================================================
@router.get("/purchase-orders/{po_id}/payment-history")
def get_purchase_order_payment_history(
    po_id: int,
    current_user: dict = Depends(get_current_user)
):
    user_role = normalize_role(current_user.get("role"))
    user_vendor_id = current_user.get("vendor_id")

    try:
        conn.rollback()
        with conn.cursor() as cur:
            # 1. Fetch PO details
            cur.execute("""
                SELECT 
                    p.id, p.po_number, p.product_name, p.quantity, p.unit_price, p.total_amount,
                    p.status, p.vendor_id, v.vendor_name,
                    COALESCE(p.advance_percentage, 0.00),
                    COALESCE(p.advance_amount, 0.00),
                    COALESCE(p.paid_amount, 0.00),
                    COALESCE(p.remaining_amount, p.total_amount, 0.00),
                    COALESCE(p.payment_status, 'Unpaid'),
                    COALESCE(p.final_payment_amount, 0.00),
                    p.advance_payment_date,
                    p.final_payment_date
                FROM purchase_orders p
                LEFT JOIN vendors v ON p.vendor_id = v.id
                WHERE p.id = %s
            """, (po_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Purchase Order Not Found")

            (
                p_id, po_num, prod_name, qty, u_price, tot_amt, po_stat, vid, vname,
                adv_pct, adv_amt, paid_amt, rem_amt, pay_stat, fin_amt, adv_date, fin_date
            ) = row

            # Vendor Scoping Check
            if user_role == "Vendor":
                if not user_vendor_id or user_vendor_id != vid:
                    raise HTTPException(
                        status_code=403,
                        detail="Access Denied: Vendors may only view payment records for purchase orders issued to their own organization."
                    )

            # 2. Fetch payments from payments table
            cur.execute("""
                SELECT 
                    p.id, p.payment_reference, p.amount, p.payment_status, p.payment_method,
                    p.payment_date, p.payment_type, p.created_at, u.name as recorded_by_name, u.role as recorded_by_role
                FROM payments p
                LEFT JOIN users u ON p.created_by = u.id
                WHERE p.po_id = %s OR p.invoice_id IN (SELECT id FROM invoices WHERE po_id = %s)
                ORDER BY p.id ASC
            """, (po_id, po_id))
            payments_list = []
            for pr in cur.fetchall():
                payments_list.append({
                    "id": pr[0],
                    "payment_reference": pr[1] or f"PAY-{pr[0]}",
                    "amount": float(pr[2] or 0),
                    "payment_status": pr[3] or "Paid",
                    "payment_method": pr[4] or "Electronic Funds Transfer",
                    "payment_date": str(pr[5]) if pr[5] else None,
                    "payment_type": pr[6] or "Standard",
                    "created_at": str(pr[7]) if pr[7] else None,
                    "recorded_by": f"{pr[8]} ({pr[9]})" if pr[8] else "Finance Officer"
                })

            # 3. Fetch payment audit logs
            cur.execute("""
                SELECT al.id, al.user_name, al.user_email, al.action, al.details, al.created_at
                FROM audit_logs al
                WHERE al.entity_type = 'PURCHASE_ORDER' AND al.entity_id = %s
                  AND al.action IN ('ADVANCE_PAYMENT_RECORDED', 'FINAL_PAYMENT_RECORDED', 'PAYMENT_PROCESSED')
                ORDER BY al.created_at ASC
            """, (str(po_id),))
            audit_records = []
            for ar in cur.fetchall():
                audit_records.append({
                    "id": ar[0],
                    "user_name": ar[1] or "System",
                    "user_email": ar[2] or "system@vendoriq.com",
                    "action": ar[3],
                    "details": ar[4],
                    "timestamp": str(ar[5])
                })

            return {
                "po_id": p_id,
                "po_number": po_num or f"PO-{p_id}",
                "product_name": prod_name,
                "vendor_id": vid,
                "vendor_name": vname,
                "total_amount": float(tot_amt or 0),
                "order_status": po_stat,
                "advance_percentage": float(adv_pct or 0),
                "advance_amount": float(adv_amt or 0),
                "paid_amount": float(paid_amt or 0),
                "remaining_amount": float(rem_amt or 0),
                "payment_status": pay_stat,
                "final_payment_amount": float(fin_amt or 0),
                "advance_payment_date": str(adv_date) if adv_date else None,
                "final_payment_date": str(fin_date) if fin_date else None,
                "transactions": payments_list,
                "audit_trail": audit_records
            }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("GET PAYMENT HISTORY ERROR:", e)
        raise HTTPException(status_code=500, detail=f"Database error loading payment history: {str(e)}")


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

        if quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be greater than zero.")
        if unit_price <= 0:
            raise HTTPException(status_code=400, detail="Unit price must be greater than zero.")

        # Authoritative backend calculation
        calculated_amount = round(float(quantity) * float(unit_price), 2)

        with conn.cursor() as cursor:
            # Check existing order and enforce historical DataCo boundary
            cursor.execute("SELECT id, created_by, dataco_order_id, vendor_id FROM purchase_orders WHERE id = %s", (id,))
            po_existing = cursor.fetchone()
            if not po_existing:
                raise HTTPException(status_code=404, detail="Purchase Order Not Found")

            if po_existing[1] is None and po_existing[2] is not None:
                raise HTTPException(
                    status_code=400,
                    detail="Historical CSV dataset records cannot be modified via application workflow."
                )

            if user_role == "Vendor" and po_existing[3] != user_vendor_id:
                raise HTTPException(status_code=403, detail="Permission Denied: You can only edit your own purchase orders")

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
            elif unit_price > 0:
                cursor.execute(
                    "UPDATE products SET product_price = %s WHERE id = %s",
                    (unit_price, product_id)
                )

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
                    status=%s,
                    updated_at=CURRENT_TIMESTAMP
                WHERE id=%s
                """,
                (
                    vendor_id,
                    product_id,
                    product_name,
                    quantity,
                    unit_price,
                    calculated_amount,
                    order_date,
                    expected_delivery,
                    status,
                    id
                )
            )

            # Synchronize linked requisition if this was generated from a purchase request
            cursor.execute(
                """
                UPDATE purchase_requests
                SET unit_price = %s, total_amount = %s
                WHERE purchase_order_id = %s
                """,
                (unit_price, calculated_amount, id)
            )

            conn.commit()

        return {
            "message": "Purchase Order Updated Successfully",
            "unit_price": float(unit_price),
            "total_amount": calculated_amount
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
def delete_purchase_order(id: int, current_user: dict = Depends(check_role(["Admin", "Procurement Manager"]))):
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
# UPDATE STATUS WORKFLOW (Role-based & Application Scoped)
# ==================================================
@router.put("/purchase-orders/status/{id}")
def update_purchase_status(
    id: int,
    status: Optional[str] = Form(None),
    current_user: dict = Depends(check_role(["Admin", "Procurement Manager", "Supply Chain Manager"]))
):
    try:
        conn.rollback()
        
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")
        
        with conn.cursor() as cursor:
            # 1. Fetch current order and verify real application vs historical CSV
            cursor.execute(
                """
                SELECT
                    id,
                    vendor_id,
                    status,
                    created_by,
                    dataco_order_id,
                    po_number
                FROM purchase_orders
                WHERE id = %s
                """,
                (id,)
            )
            order = cursor.fetchone()

            if not order:
                raise HTTPException(status_code=404, detail="Purchase Order Not Found")

            po_id, vendor_id, current_status, created_by, dataco_order_id, po_num = order

            # 2. Strict Data Boundary: Prevent modifying historical CSV orders
            if created_by is None and dataco_order_id is not None:
                raise HTTPException(
                    status_code=400,
                    detail="Historical CSV dataset records cannot be modified via application workflow."
                )

            # 3. Vendor Scoping check
            if user_role == "Vendor" and vendor_id != user_vendor_id:
                raise HTTPException(
                    status_code=403,
                    detail="Permission Denied: You can only update your own purchase orders."
                )

            current_status_clean = (current_status or "Pending").strip()
            current_status_lower = current_status_clean.lower()

            # 4. Valid workflow transitions
            # Pending Approval / Pending -> Approved -> Ordered -> In-Transit -> Delivered -> Completed
            # Terminal states: Completed, Cancelled
            valid_next_states = {
                "pending approval": ["approved", "cancelled", "canceled"],
                "pending": ["approved", "cancelled", "canceled"],
                "approved": ["ordered", "cancelled", "canceled"],
                "ordered": ["in-transit", "in transit", "cancelled", "canceled"],
                "in-transit": ["delivered", "cancelled", "canceled"],
                "in transit": ["delivered", "cancelled", "canceled"],
                "delivered": ["completed"],
                "processing": ["in-transit", "delivered", "cancelled", "canceled"],
                "completed": [],
                "cancelled": [],
                "canceled": []
            }

            canonical_status_map = {
                "pending approval": "Approved",
                "pending": "Approved",
                "approved": "Ordered",
                "ordered": "In-Transit",
                "in-transit": "Delivered",
                "in transit": "Delivered",
                "delivered": "Completed",
                "processing": "In-Transit"
            }

            if current_status_lower in ("completed", "cancelled", "canceled"):
                return {
                    "message": f"Purchase Order is already in terminal state ({current_status_clean}).",
                    "old_status": current_status_clean,
                    "new_status": current_status_clean
                }

            # 5. Determine target status
            if status and str(status).strip():
                target_status = str(status).strip()
                allowed_targets = valid_next_states.get(current_status_lower, [])
                if target_status.lower() not in [s.lower() for s in allowed_targets]:
                    allowed_display = [s.title() for s in allowed_targets]
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid status jump: Cannot transition directly from '{current_status_clean}' to '{target_status}'. Next allowed status: {allowed_display}"
                    )
                new_status = target_status
            else:
                new_status = canonical_status_map.get(current_status_lower)
                if not new_status:
                    raise HTTPException(
                        status_code=400,
                        detail=f"No valid next status mapped from current status '{current_status_clean}'."
                    )

            # 6. Update Status
            cursor.execute(
                """
                UPDATE purchase_orders
                SET status = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (new_status, id)
            )
            conn.commit()

            # Log Audit Action
            try:
                from audit_logs import log_action
                n_lower = new_status.lower()
                if n_lower == "approved":
                    action_type = "PURCHASE_ORDER_APPROVED"
                elif n_lower in ("in-transit", "in transit", "delivered"):
                    action_type = "SHIPMENT_STATUS_CHANGED"
                elif n_lower == "completed":
                    action_type = "PURCHASE_ORDER_COMPLETED"
                elif n_lower in ("cancelled", "canceled"):
                    action_type = "PURCHASE_ORDER_CANCELLED"
                else:
                    action_type = "PURCHASE_ORDER_STATUS_CHANGED"

                log_action(
                    user_id=current_user.get("id"),
                    user_name=current_user.get("name"),
                    user_email=current_user.get("email"),
                    action=action_type,
                    entity_type="PURCHASE_ORDER",
                    entity_id=str(id),
                    details=f"PO {po_num} transitioned from '{current_status_clean}' to '{new_status}'"
                )
            except Exception as le:
                print("Audit logging error:", le)

        # 7. If Order Completed, update vendor reliability score
        reliability_score = None
        if new_status.lower() == "completed":
            reliability_score = calculate_vendor_reliability(vendor_id)
            save_vendor_performance_history(vendor_id)

        return {
            "message": f"Purchase Order status updated to '{new_status}' successfully.",
            "po_id": id,
            "po_number": po_num,
            "old_status": current_status_clean,
            "new_status": new_status,
            "vendor_id": vendor_id,
            "reliability_score": reliability_score
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("STATUS UPDATE ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))