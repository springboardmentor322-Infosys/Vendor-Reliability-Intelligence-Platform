from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Form, status, Request, Body, Query
from db import conn
from auth import get_current_user, check_role, normalize_role
from vendor_performance import calculate_vendor_reliability, save_vendor_performance_history

router = APIRouter(prefix="/invoices", tags=["Invoices"])


def ensure_invoices_exist():
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id)")
            cursor.execute("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0.00")
            cursor.execute("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC DEFAULT 0.00")
            cursor.execute("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS advance_amount NUMERIC DEFAULT 0.00")
            cursor.execute("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS advance_percentage NUMERIC DEFAULT 0.00")
            cursor.execute("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS final_payment_amount NUMERIC DEFAULT 0.00")
            cursor.execute("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS advance_payment_date TIMESTAMP")
            cursor.execute("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS final_payment_date TIMESTAMP")
            conn.commit()

            cursor.execute("SELECT COUNT(*) FROM invoices")
            count = cursor.fetchone()[0]
            if count == 0:
                print("Seeding invoices from purchase orders...")
                cursor.execute("""
                    INSERT INTO invoices (
                        po_id, vendor_id, invoice_number, invoice_date, due_date,
                        invoice_amount, paid_amount, remaining_amount, advance_amount, advance_percentage,
                        status, payment_status, payment_date, created_at, updated_at
                    )
                    SELECT 
                        id,
                        vendor_id,
                        'INV-' || LPAD(id::text, 6, '0'),
                        order_date,
                        (order_date + INTERVAL '30 days')::date,
                        total_amount,
                        COALESCE(paid_amount, CASE WHEN LOWER(status) IN ('completed', 'delivered') THEN total_amount ELSE 0.00 END),
                        COALESCE(remaining_amount, CASE WHEN LOWER(status) IN ('completed', 'delivered') THEN 0.00 ELSE total_amount END),
                        COALESCE(advance_amount, 0.00),
                        COALESCE(advance_percentage, 0.00),
                        CASE WHEN LOWER(status) = 'completed' OR LOWER(status) = 'delivered' THEN 'Paid' ELSE 'Approved' END,
                        CASE 
                            WHEN LOWER(status) = 'completed' OR LOWER(status) = 'delivered' THEN 'Paid'
                            WHEN COALESCE(paid_amount, 0) > 0 THEN 'Partially Paid'
                            ELSE 'Pending'
                        END,
                        CASE WHEN LOWER(status) = 'completed' OR LOWER(status) = 'delivered' THEN (order_date + INTERVAL '5 days')::date ELSE NULL END,
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    FROM purchase_orders
                    ON CONFLICT DO NOTHING
                """)
                conn.commit()
                print("Invoices seeded successfully.")
            else:
                conn.commit()
    except Exception as e:
        conn.rollback()
        print("SEED INVOICES FAILURE:", e)


# Auto-seed invoices if empty
ensure_invoices_exist()


# ==================================================
# GET ALL INVOICES (With Application PO Prioritization)
# ==================================================
@router.get("")
def get_invoices(
    page: int = None,
    limit: int = 2000,
    search: str = None,
    status: str = None,
    paginate: bool = False,
    current_user: dict = Depends(get_current_user)
):
    try:
        conn.rollback()
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")
        
        if user_role not in ["Admin", "Administrator", "Finance Officer", "Vendor", "Auditor", "Procurement Manager"]:
            raise HTTPException(status_code=403, detail="Permission Denied")
            
        with conn.cursor() as cursor:
            # 1. Base conditions
            base_where = "WHERE 1=1"
            where_params = []
            if user_role == "Vendor":
                if not user_vendor_id:
                    if paginate:
                        return {
                            "invoices": [],
                            "total_count": 0,
                            "page": page,
                            "limit": limit,
                            "kpi_total": 0,
                            "kpi_paid": 0,
                            "kpi_pending": 0,
                            "kpi_sum": 0.0
                        }
                    else:
                        return []
                base_where += " AND i.vendor_id = %s"
                where_params.append(user_vendor_id)

            # 2. Filtering conditions (search vendor name, status)
            filter_where = base_where
            filter_params = list(where_params)
            
            if search:
                filter_where += " AND (LOWER(v.vendor_name) LIKE %s OR LOWER(i.invoice_number) LIKE %s OR LOWER(po.po_number) LIKE %s)"
                term = f"%{search.strip().lower()}%"
                filter_params.extend([term, term, term])
                
            if status and status != "all":
                s_clean = status.strip()
                if s_clean.lower() == "overdue":
                    filter_where += " AND i.payment_status IN ('Pending', 'Partially Paid') AND i.due_date < CURRENT_DATE"
                elif s_clean.lower() in ("partially paid", "partial"):
                    filter_where += " AND (LOWER(i.payment_status) IN ('partially paid', 'partial') OR (COALESCE(i.paid_amount, 0) > 0 AND COALESCE(i.remaining_amount, 1) > 0))"
                else:
                    filter_where += " AND (i.payment_status = %s OR i.status = %s)"
                    filter_params.extend([s_clean, s_clean])

            # 3. Main select query: prioritize real application workflow invoices first
            query = f"""
                SELECT
                    i.id,
                    i.po_id,
                    i.vendor_id,
                    v.vendor_name,
                    COALESCE(po.product_name, 'Procurement Line Item') AS product_name,
                    i.invoice_number,
                    i.invoice_date,
                    i.due_date,
                    i.invoice_amount,
                    i.payment_date,
                    i.payment_status,
                    CASE WHEN i.payment_status = 'Paid' THEN 'Paid' ELSE COALESCE(i.status, 'Pending Review') END AS review_status,
                    po.po_number,
                    po.quantity,
                    po.unit_price,
                    po.total_amount,
                    CASE WHEN (po.created_by IS NOT NULL OR po.dataco_order_id IS NULL) THEN 1 ELSE 0 END AS is_app_po,
                    COALESCE(i.paid_amount, po.paid_amount, 0.00) AS paid_amount,
                    COALESCE(i.remaining_amount, po.remaining_amount, (i.invoice_amount - COALESCE(i.paid_amount, po.paid_amount, 0.00))) AS remaining_amount,
                    COALESCE(i.advance_amount, po.advance_amount, 0.00) AS advance_amount,
                    COALESCE(i.advance_percentage, po.advance_percentage, 0.00) AS advance_percentage,
                    COALESCE(i.final_payment_amount, po.final_payment_amount, 0.00) AS final_payment_amount
                FROM invoices i
                JOIN vendors v ON i.vendor_id = v.id
                LEFT JOIN purchase_orders po ON i.po_id = po.id
                {filter_where}
                ORDER BY is_app_po DESC, i.id DESC
            """
            
            if page is not None:
                offset = (page - 1) * limit
                query += " LIMIT %s OFFSET %s"
                query_params = filter_params + [limit, offset]
            else:
                query += " LIMIT %s"
                query_params = filter_params + [limit]
                
            cursor.execute(query, query_params)
            rows = cursor.fetchall()
            conn.commit()
            
        invoices = []
        for row in rows:
            v_name = row[3]
            if row[2] and str(v_name).lower().startswith("derived vendor proxy"):
                v_name = f"Vendor-{row[2]}"

            inv_amt = float(row[8] or 0)
            p_amt = float(row[17] or 0)
            r_amt = float(row[18] if row[18] is not None else max(0.0, inv_amt - p_amt))

            invoices.append({
                "id": row[0],
                "po_id": row[1],
                "vendor_id": row[2],
                "vendor_name": v_name,
                "product_name": row[4],
                "invoice_number": row[5],
                "invoice_date": str(row[6]) if row[6] else "",
                "due_date": str(row[7]) if row[7] else "",
                "invoice_amount": inv_amt,
                "payment_date": str(row[9]) if row[9] else "",
                "payment_status": row[10] or "Pending",
                "status": "Paid" if row[10] == "Paid" else (row[11] or "Pending Review"),
                "po_number": row[12] or (f"PO-{row[1]}" if row[1] else "N/A"),
                "quantity": int(row[13] or 1),
                "unit_price": float(row[14] or 0),
                "po_total_amount": float(row[15] or 0),
                "is_app_po": bool(row[16]),
                "paid_amount": p_amt,
                "remaining_amount": r_amt,
                "advance_amount": float(row[19] or 0),
                "advance_percentage": float(row[20] or 0),
                "final_payment_amount": float(row[21] or 0)
            })
            
        if paginate:
            with conn.cursor() as cursor:
                # Count total filtered records for pagination info
                count_query = f"""
                    SELECT COUNT(*) 
                    FROM invoices i 
                    JOIN vendors v ON i.vendor_id = v.id
                    LEFT JOIN purchase_orders po ON i.po_id = po.id
                    {filter_where}
                """
                cursor.execute(count_query, filter_params)
                total_count = cursor.fetchone()[0]
                
                # Fetch unfiltered KPIs
                kpi_query = f"""
                    SELECT 
                        COUNT(*),
                        COUNT(CASE WHEN payment_status='Paid' THEN 1 END),
                        COUNT(CASE WHEN payment_status IN ('Pending', 'Partially Paid') AND LOWER(COALESCE(status, '')) != 'rejected' THEN 1 END),
                        COALESCE(SUM(invoice_amount), 0)
                    FROM invoices i
                    {base_where}
                """
                cursor.execute(kpi_query, where_params)
                kpi_total, kpi_paid, kpi_pending, kpi_sum = cursor.fetchone()
                conn.commit()
                
            return {
                "invoices": invoices,
                "total_count": total_count,
                "page": page,
                "limit": limit,
                "kpi_total": kpi_total,
                "kpi_paid": kpi_paid,
                "kpi_pending": kpi_pending,
                "kpi_sum": float(kpi_sum)
            }
        else:
            return invoices
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("GET INVOICES ERROR:", e)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# ==================================================
# CREATE INVOICE FROM APPLICATION PURCHASE ORDER
# ==================================================
# ==================================================
# GET PURCHASE ORDERS ELIGIBLE FOR INVOICE CREATION
# ==================================================
@router.get("/eligible-pos")
def get_eligible_purchase_orders(
    current_user: dict = Depends(check_role(["Admin", "Finance Officer"]))
):
    try:
        conn.rollback()
        user_role = normalize_role(current_user.get("role"))
        if user_role not in ["Finance Officer", "Administrator"]:
            raise HTTPException(
                status_code=403,
                detail="Permission Denied: Only Finance Officers are authorized to view eligible POs for invoice creation."
            )
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    po.id,
                    po.po_number,
                    po.vendor_id,
                    COALESCE(v.vendor_name, 'Unknown Vendor') as vendor_name,
                    po.product_name,
                    po.quantity,
                    po.unit_price,
                    po.total_amount,
                    po.order_date,
                    po.expected_delivery,
                    po.status,
                    po.created_at,
                    po.created_by
                FROM purchase_orders po
                JOIN vendors v ON po.vendor_id = v.id
                WHERE (po.created_by IS NOT NULL OR po.dataco_order_id IS NULL)
                  AND LOWER(po.status) IN ('delivered', 'completed')
                  AND po.unit_price > 0 
                  AND po.total_amount > 0
                  AND po.id NOT IN (SELECT po_id FROM invoices WHERE po_id IS NOT NULL)
                ORDER BY po.id DESC
            """)
            rows = cursor.fetchall()
            eligible = []
            for r in rows:
                v_name = r[3]
                if str(v_name).lower().startswith("derived vendor proxy"):
                    v_name = f"Vendor-{r[2]}"
                eligible.append({
                    "id": r[0],
                    "po_number": r[1] or f"PO-{r[0]}",
                    "vendor_id": r[2],
                    "vendor_name": v_name,
                    "product_name": r[4] or "Catalog Item",
                    "quantity": int(r[5] or 1),
                    "unit_price": float(r[6] or 0),
                    "total_amount": float(r[7] or 0),
                    "order_date": str(r[8]) if r[8] else "N/A",
                    "expected_delivery": str(r[9]) if r[9] else "N/A",
                    "status": r[10] or "Delivered",
                    "created_at": str(r[11]) if r[11] else ""
                })
            return eligible
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("GET ELIGIBLE POS ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# CREATE INVOICE FROM APPLICATION PURCHASE ORDER (STRICTLY FINANCE OFFICER)
# ==================================================
@router.post("/create-from-po/{po_id}")
@router.post("/create")
def create_invoice_from_po(
    po_id: int,
    current_user: dict = Depends(check_role(["Admin", "Finance Officer"]))
):
    try:
        conn.rollback()
        user_role = normalize_role(current_user.get("role"))
        if user_role not in ["Finance Officer", "Administrator"]:
            raise HTTPException(
                status_code=403,
                detail="Permission Denied: Only Finance Officers are authorized to create invoices. Procurement Managers cannot create invoices."
            )

        with conn.cursor() as cursor:
            # 1. Fetch Purchase Order and verify real application vs historical CSV
            cursor.execute(
                """
                SELECT
                    po.id,
                    po.vendor_id,
                    po.product_name,
                    po.quantity,
                    po.total_amount,
                    po.status,
                    po.po_number,
                    po.created_by,
                    po.dataco_order_id,
                    v.vendor_name,
                    po.unit_price,
                    COALESCE(po.paid_amount, 0.00),
                    COALESCE(po.remaining_amount, po.total_amount - COALESCE(po.paid_amount, 0.00)),
                    COALESCE(po.advance_amount, 0.00),
                    COALESCE(po.advance_percentage, 0.00),
                    po.payment_status,
                    po.advance_payment_date
                FROM purchase_orders po
                JOIN vendors v ON po.vendor_id = v.id
                WHERE po.id = %s
                """,
                (po_id,)
            )
            order = cursor.fetchone()

            if not order:
                raise HTTPException(status_code=404, detail="Purchase Order Not Found")

            (
                p_id, vendor_id, product_name, quantity, total_amount,
                po_status, po_num, created_by, dataco_order_id, vendor_name, unit_price,
                po_paid_amount, po_remaining_amount, po_advance_amount, po_advance_pct,
                po_pay_status, po_adv_date
            ) = order

            # 2. Strict Data Boundary: Do not generate invoices for historical CSV records
            if created_by is None and dataco_order_id is not None:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot generate application invoice for historical CSV dataset orders."
                )

            # 2b. Financial Integrity Check: Application PO must have valid, non-zero pricing completed
            is_app = bool(created_by is not None or dataco_order_id is None)
            if is_app and (unit_price is None or float(unit_price) <= 0 or total_amount is None or float(total_amount) <= 0):
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot generate invoice: Purchase Order {po_num} requires pricing completion (Unit Price: ₹{float(unit_price or 0):.2f}). Please complete pricing on the purchase order first."
                )

            # 3. Delivery Verification: PO must be Delivered or Completed
            clean_status = (po_status or "").strip().lower()
            if clean_status not in ("delivered", "completed"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Purchase Order must reach 'Delivered' or 'Completed' status before an invoice can be generated (Current Status: '{po_status}')."
                )

            # 4. Duplicate Invoice Protection: One invoice per PO
            cursor.execute(
                "SELECT id, invoice_number FROM invoices WHERE po_id = %s",
                (po_id,)
            )
            existing_inv = cursor.fetchone()
            if existing_inv:
                raise HTTPException(
                    status_code=400,
                    detail=f"Duplicate Invoice Blocked: Invoice #{existing_inv[1]} (ID #{existing_inv[0]}) has already been issued for this Purchase Order."
                )

            # 5. Generate unique invoice number format: INV-2026-00001
            cursor.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM invoices")
            next_id = cursor.fetchone()[0]
            invoice_number = f"INV-2026-{next_id:05d}"
            finance_user_id = current_user.get("id")
            finance_user_name = current_user.get("name") or "Finance Officer"

            # 5b. Authoritative payment status resolution:
            # 25% payment -> 'Partially Paid', NEVER -> 'Paid'
            # 'Paid' status is allowed ONLY when paid amount >= total invoice amount
            po_paid = float(po_paid_amount or 0)
            po_total = float(total_amount or 0)
            po_rem = float(po_remaining_amount if po_remaining_amount is not None else max(0.0, po_total - po_paid))
            po_adv = float(po_advance_amount or 0)
            po_adv_percentage = float(po_advance_pct or 0)

            if po_paid >= po_total and po_total > 0:
                inv_pay_status = "Paid"
                inv_status = "Paid"
            elif po_paid > 0:
                inv_pay_status = "Partially Paid"
                inv_status = "Pending Review"
            else:
                inv_pay_status = "Pending"
                inv_status = "Pending Review"

            # 6. Insert new Invoice record tracking paid, remaining, and advance details
            cursor.execute(
                """
                INSERT INTO invoices
                (
                    id,
                    po_id,
                    vendor_id,
                    invoice_number,
                    invoice_date,
                    due_date,
                    invoice_amount,
                    paid_amount,
                    remaining_amount,
                    advance_amount,
                    advance_percentage,
                    status,
                    payment_status,
                    advance_payment_date,
                    created_by,
                    created_at,
                    updated_at
                )
                VALUES
                (
                    %s, %s, %s, %s, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """,
                (
                    next_id,
                    po_id,
                    vendor_id,
                    invoice_number,
                    total_amount,
                    po_paid,
                    po_rem,
                    po_adv,
                    po_adv_percentage,
                    inv_status,
                    inv_pay_status,
                    po_adv_date,
                    finance_user_id
                )
            )

            # Link existing payment transactions for this PO to the new invoice
            cursor.execute(
                "UPDATE payments SET invoice_id = %s WHERE po_id = %s AND invoice_id IS NULL",
                (next_id, po_id)
            )
            conn.commit()

            # Log Audit Action explicitly identifying Finance Officer
            try:
                from audit_logs import log_action
                log_action(
                    user_id=finance_user_id,
                    user_name=finance_user_name,
                    user_email=current_user.get("email"),
                    action="INVOICE_CREATED",
                    entity_type="INVOICE",
                    entity_id=str(next_id),
                    details=f"Finance Officer {finance_user_name} created invoice {invoice_number} for PO #{po_id} ({po_num or f'PO-{po_id}'}) (Total: ₹{float(total_amount):,.2f}, Paid: ₹{po_paid:,.2f}, Remaining: ₹{po_rem:,.2f}, Status: {inv_pay_status})"
                )
            except Exception as le:
                print("Audit log invoice create error:", le)

        v_display = f"Vendor-{vendor_id}" if str(vendor_name).lower().startswith("derived vendor proxy") else vendor_name

        return {
            "message": f"Invoice {invoice_number} created successfully by Finance Officer {finance_user_name} and submitted for review.",
            "invoice_id": next_id,
            "invoice_number": invoice_number,
            "po_id": po_id,
            "po_number": po_num or f"PO-{po_id}",
            "vendor_name": v_display,
            "invoice_amount": float(total_amount),
            "paid_amount": po_paid,
            "remaining_amount": po_rem,
            "advance_amount": po_adv,
            "advance_percentage": po_adv_percentage,
            "status": inv_status,
            "payment_status": inv_pay_status,
            "created_by": finance_user_id,
            "created_by_name": finance_user_name
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("CREATE INVOICE ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# PO ↔ INVOICE VERIFICATION & RECONCILIATION
# ==================================================
@router.post("/{id}/verify")
def verify_po_invoice(
    id: int,
    current_user: dict = Depends(check_role(["Admin", "Finance Officer"]))
):
    try:
        conn.rollback()
        user_role = normalize_role(current_user.get("role"))
        if user_role not in ["Finance Officer", "Administrator"]:
            raise HTTPException(
                status_code=403,
                detail="Permission Denied: Only Finance Officers are authorized to verify PO-Invoice reconciliation."
            )

        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    i.id, i.invoice_number, i.invoice_amount, i.status, i.payment_status, i.po_id, i.vendor_id,
                    po.po_number, po.quantity, po.unit_price, po.total_amount, po.status as po_status,
                    v.vendor_name
                FROM invoices i
                LEFT JOIN purchase_orders po ON i.po_id = po.id
                LEFT JOIN vendors v ON i.vendor_id = v.id
                WHERE i.id = %s
            """, (id,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Invoice Not Found")

            (
                inv_id, inv_num, inv_amt, inv_status, pay_status, po_id, vendor_id,
                po_num, po_qty, po_unit_price, po_total, po_status, vendor_name
            ) = row

            inv_amount = float(inv_amt or 0)
            po_total_amt = float(po_total or 0)
            qty = int(po_qty or 1)
            unit_price = float(po_unit_price or 0)
            calc_po = round(qty * unit_price, 2)

            pricing_match = abs(inv_amount - po_total_amt) < 0.05
            qty_match = abs(calc_po - po_total_amt) < 0.05
            is_valid = pricing_match and qty_match

            # Log audit trail for PO-Invoice verification
            try:
                from audit_logs import log_action
                finance_user_name = current_user.get("name") or "Finance Officer"
                log_action(
                    user_id=current_user.get("id"),
                    user_name=finance_user_name,
                    user_email=current_user.get("email"),
                    action="PO_INVOICE_VERIFIED",
                    entity_type="INVOICE",
                    entity_id=str(id),
                    details=f"Finance Officer {finance_user_name} verified PO ↔ Invoice reconciliation for Invoice {inv_num} and PO #{po_id} ({po_num or f'PO-{po_id}'}) [PO Total: ₹{po_total_amt:,.2f}, Invoice Amount: ₹{inv_amount:,.2f}, 3-Way Match: {'VERIFIED' if is_valid else 'FLAGGED'}]"
                )
            except Exception as le:
                print("Audit log PO-invoice verify error:", le)

            return {
                "message": f"PO ↔ Invoice verification completed for {inv_num}.",
                "invoice_id": id,
                "invoice_number": inv_num,
                "po_id": po_id,
                "po_number": po_num or (f"PO-{po_id}" if po_id else "N/A"),
                "invoice_amount": inv_amount,
                "po_total_amount": po_total_amt,
                "calculated_po_total": calc_po,
                "pricing_match": pricing_match,
                "is_verified": is_valid,
                "vendor_name": vendor_name,
                "verified_by": current_user.get("name"),
                "verified_by_role": current_user.get("role")
            }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("VERIFY INVOICE ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# FINANCE REVIEW: APPROVE INVOICE
# ==================================================
@router.put("/{id}/approve")
def approve_invoice(
    id: int,
    current_user: dict = Depends(check_role(["Admin", "Finance Officer"]))
):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id, invoice_number, status, payment_status, invoice_amount FROM invoices WHERE id = %s",
                (id,)
            )
            inv = cursor.fetchone()
            if not inv:
                raise HTTPException(status_code=404, detail="Invoice Not Found")

            inv_id, inv_num, current_status, pay_status, amount = inv

            if current_status == "Approved":
                return {
                    "message": f"Invoice {inv_num} is already approved for payment.",
                    "status": "Approved"
                }

            if pay_status == "Paid":
                raise HTTPException(
                    status_code=400,
                    detail=f"Invoice {inv_num} is already fully paid."
                )

            # Preserve existing payment status (e.g. 'Partially Paid') unless it was Rejected
            clean_pay = (pay_status or "").strip().lower()
            new_payment_status = "Pending" if clean_pay in ("rejected", "", "none") else pay_status

            cursor.execute(
                """
                UPDATE invoices
                SET status = 'Approved', payment_status = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (new_payment_status, id)
            )
            conn.commit()

            try:
                from audit_logs import log_action
                log_action(
                    user_id=current_user.get("id"),
                    user_name=current_user.get("name"),
                    user_email=current_user.get("email"),
                    action="INVOICE_APPROVED",
                    entity_type="INVOICE",
                    entity_id=str(id),
                    details=f"Approved invoice {inv_num} for payment processing (Amount: ₹{amount})"
                )
            except Exception as le:
                print("Audit log invoice approve error:", le)

        return {
            "message": f"Invoice {inv_num} approved by Finance. Cleared for payment processing.",
            "status": "Approved",
            "payment_status": "Pending"
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("APPROVE INVOICE ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# FINANCE REVIEW: REJECT INVOICE
# ==================================================
@router.put("/{id}/reject")
def reject_invoice(
    id: int,
    current_user: dict = Depends(check_role(["Admin", "Finance Officer"]))
):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id, invoice_number, status, payment_status FROM invoices WHERE id = %s",
                (id,)
            )
            inv = cursor.fetchone()
            if not inv:
                raise HTTPException(status_code=404, detail="Invoice Not Found")

            inv_id, inv_num, current_status, pay_status = inv

            if pay_status == "Paid":
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot reject invoice {inv_num}; it has already been paid."
                )

            cursor.execute(
                """
                UPDATE invoices
                SET status = 'Rejected', payment_status = 'Rejected', updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (id,)
            )
            conn.commit()

            try:
                from audit_logs import log_action
                log_action(
                    user_id=current_user.get("id"),
                    user_name=current_user.get("name"),
                    user_email=current_user.get("email"),
                    action="INVOICE_REJECTED",
                    entity_type="INVOICE",
                    entity_id=str(id),
                    details=f"Rejected invoice {inv_num}. Payment blocked."
                )
            except Exception as le:
                print("Audit log invoice reject error:", le)

        return {
            "message": f"Invoice {inv_num} has been rejected. Payment processing blocked.",
            "status": "Rejected",
            "payment_status": "Rejected"
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("REJECT INVOICE ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# PROCESS PAYMENT (Strictly Finance Authorized)
# ==================================================
@router.post("/{id}/pay")
@router.put("/{id}/pay")
@router.post("/{id}/final-payment")
async def pay_invoice(
    id: int,
    request: Request,
    amount: Optional[float] = None,
    payment_method: Optional[str] = "Electronic Funds Transfer",
    current_user: dict = Depends(check_role(["Admin", "Finance Officer"]))
):
    try:
        conn.rollback()
        today = date.today()

        # Extract amount and payment_method from JSON body if present
        pay_amount_input = amount
        pay_method_input = payment_method
        try:
            content_type = request.headers.get("content-type", "")
            if "application/json" in content_type:
                body_json = await request.json()
                if isinstance(body_json, dict):
                    if "amount" in body_json and body_json["amount"] is not None:
                        pay_amount_input = body_json["amount"]
                    if "payment_method" in body_json and body_json["payment_method"] is not None:
                        pay_method_input = body_json["payment_method"]
        except Exception:
            pass

        with conn.cursor() as cursor:
            # 1. Fetch invoice details with row lock
            cursor.execute(
                """
                SELECT 
                    id, po_id, vendor_id, invoice_number, invoice_amount, status, payment_status,
                    COALESCE(paid_amount, 0.00),
                    COALESCE(remaining_amount, invoice_amount - COALESCE(paid_amount, 0.00)),
                    COALESCE(advance_amount, 0.00),
                    COALESCE(advance_percentage, 0.00)
                FROM invoices
                WHERE id = %s
                FOR UPDATE
                """,
                (id,)
            )
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Invoice Not Found")

            (
                inv_id, po_id, vendor_id, inv_num, inv_amount, review_status, pay_status,
                cur_paid, cur_remaining, adv_amount, adv_percentage
            ) = row

            inv_amount = float(inv_amount or 0)
            cur_paid = float(cur_paid or 0)
            cur_remaining = float(cur_remaining if cur_remaining is not None else (inv_amount - cur_paid))
            cur_remaining = round(cur_remaining, 2)

            # 2. Validation: Block Rejected Invoices
            clean_review = (review_status or "").strip().lower()
            clean_pay = (pay_status or "").strip().lower()
            if clean_review == "rejected" or clean_pay == "rejected":
                raise HTTPException(
                    status_code=400,
                    detail=f"Payment Blocked: Invoice {inv_num} was Rejected during Finance Review and cannot be paid."
                )

            # 3. Validation: Block Unapproved Invoices
            if clean_review != "approved" and clean_pay != "approved":
                raise HTTPException(
                    status_code=400,
                    detail=f"Payment Blocked: Invoice {inv_num} requires Finance Officer approval before processing payment (Current Review Status: '{review_status}')."
                )

            # 4. Validation: Block Duplicate Payment or Settled Invoices
            if clean_pay == "paid" or cur_remaining <= 0.005:
                raise HTTPException(
                    status_code=400,
                    detail=f"Payment Blocked: Invoice {inv_num} has already been fully paid (Remaining balance: ₹0.00)."
                )

            # 5. Determine payment amount
            if pay_amount_input is not None:
                try:
                    pay_amount = round(float(pay_amount_input), 2)
                except (ValueError, TypeError):
                    raise HTTPException(status_code=400, detail="Invalid payment amount specified.")
                if pay_amount <= 0:
                    raise HTTPException(status_code=400, detail="Payment amount must be greater than zero.")
                if pay_amount > cur_remaining + 0.01:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Payment amount (₹{pay_amount:,.2f}) exceeds remaining balance of ₹{cur_remaining:,.2f}. Payment cannot make the paid amount exceed total invoice amount."
                    )
            else:
                # Default payment is the entire remaining balance (e.g. 75% final payment)
                pay_amount = cur_remaining

            new_paid = round(cur_paid + pay_amount, 2)
            new_remaining = round(max(0.0, inv_amount - new_paid), 2)

            is_fully_settled = (new_remaining <= 0.01) or (new_paid >= inv_amount - 0.01)
            if is_fully_settled:
                new_remaining = 0.00
                new_paid = inv_amount
                new_pay_status = "Paid"
                new_inv_status = "Paid"
                payment_type = "Final"
            else:
                new_pay_status = "Partially Paid"
                new_inv_status = "Approved"
                payment_type = "Advance" if cur_paid == 0 else "Partial"

            # 6. Generate Payment Reference: PAY-FIN-2026-00001 or PAY-PART-2026-00001
            cursor.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM payments")
            next_pay_id = cursor.fetchone()[0]
            prefix = "FIN" if is_fully_settled else "PART"
            pay_ref = f"PAY-{prefix}-2026-{next_pay_id:05d}"

            # 7. Insert into payments table
            cursor.execute(
                """
                INSERT INTO payments
                (
                    id,
                    invoice_id,
                    po_id,
                    vendor_id,
                    amount,
                    payment_status,
                    payment_method,
                    payment_reference,
                    payment_date,
                    created_by,
                    payment_type,
                    created_at,
                    updated_at
                )
                VALUES
                (%s, %s, %s, %s, %s, 'Paid', %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                (
                    next_pay_id,
                    id,
                    po_id,
                    vendor_id,
                    pay_amount,
                    pay_method_input or "Electronic Funds Transfer",
                    pay_ref,
                    today,
                    current_user.get("id"),
                    payment_type
                )
            )

            # 8. Update Invoice record
            cursor.execute(
                """
                UPDATE invoices
                SET
                    paid_amount = %s,
                    remaining_amount = %s,
                    status = %s,
                    payment_status = %s,
                    payment_date = %s,
                    final_payment_amount = CASE WHEN %s THEN %s ELSE final_payment_amount END,
                    final_payment_date = CASE WHEN %s THEN CURRENT_TIMESTAMP ELSE final_payment_date END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (
                    new_paid,
                    new_remaining,
                    new_inv_status,
                    new_pay_status,
                    today,
                    is_fully_settled,
                    pay_amount,
                    is_fully_settled,
                    id
                )
            )

            # 9. Synchronize the associated Purchase Order if applicable
            if po_id:
                cursor.execute(
                    """
                    UPDATE purchase_orders
                    SET
                        paid_amount = %s,
                        remaining_amount = %s,
                        payment_status = CASE WHEN %s THEN 'Paid' ELSE 'Partially Paid' END,
                        final_payment_amount = CASE WHEN %s THEN %s ELSE final_payment_amount END,
                        final_payment_date = CASE WHEN %s THEN CURRENT_TIMESTAMP ELSE final_payment_date END,
                        status = CASE WHEN %s AND LOWER(status) IN ('delivered', 'approved') THEN 'Completed' ELSE status END,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    """,
                    (
                        new_paid,
                        new_remaining,
                        is_fully_settled,
                        is_fully_settled,
                        pay_amount,
                        is_fully_settled,
                        is_fully_settled,
                        po_id
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
                    action="PAYMENT_PROCESSED",
                    entity_type="PAYMENT",
                    entity_id=str(next_pay_id),
                    details=f"Payment {pay_ref} executed for Invoice {inv_num} (Paid: ₹{pay_amount:,.2f}, Total Paid: ₹{new_paid:,.2f}, Remaining: ₹{new_remaining:,.2f}, Status: {new_pay_status})"
                )
            except Exception as le:
                print("Audit log payment process error:", le)

        # 10. Recalculate vendor reliability on completed order fulfillment
        if vendor_id and is_fully_settled:
            calculate_vendor_reliability(vendor_id)
            save_vendor_performance_history(vendor_id)

        return {
            "message": f"Payment executed successfully for Invoice {inv_num}. Status: {new_pay_status}.",
            "payment_reference": pay_ref,
            "payment_id": next_pay_id,
            "invoice_number": inv_num,
            "amount": float(pay_amount),
            "paid_amount": float(new_paid),
            "remaining_amount": float(new_remaining),
            "payment_status": new_pay_status,
            "status": new_inv_status,
            "payment_date": str(today)
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        print("PAY INVOICE ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# INVOICE SUMMARY STATISTICS API
# ==================================================
@router.get("/summary")
def get_invoices_summary(current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    vendor_id = current_user.get("vendor_id")
    
    if role not in ["Admin", "Finance Officer", "Vendor", "Procurement Manager"]:
        raise HTTPException(status_code=403, detail="Permission Denied")
        
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            if role == "Vendor":
                if not vendor_id:
                    raise HTTPException(status_code=400, detail="Vendor ID not associated with user")
                cursor.execute("""
                    SELECT 
                        COUNT(*),
                        COALESCE(SUM(invoice_amount), 0),
                        COUNT(CASE WHEN payment_status IN ('Pending', 'Partially Paid') THEN 1 END),
                        COALESCE(SUM(CASE WHEN payment_status IN ('Pending', 'Partially Paid') THEN invoice_amount END), 0),
                        COUNT(CASE WHEN payment_status='Paid' THEN 1 END),
                        COALESCE(SUM(CASE WHEN payment_status='Paid' THEN invoice_amount END), 0),
                        COUNT(CASE WHEN payment_status = 'Partially Paid' THEN 1 END)
                    FROM invoices
                    WHERE vendor_id = %s
                """, (vendor_id,))
            else:
                cursor.execute("""
                    SELECT 
                        COUNT(*),
                        COALESCE(SUM(invoice_amount), 0),
                        COUNT(CASE WHEN payment_status IN ('Pending', 'Partially Paid') AND LOWER(COALESCE(status, '')) != 'rejected' THEN 1 END),
                        COALESCE(SUM(CASE WHEN payment_status IN ('Pending', 'Partially Paid') AND LOWER(COALESCE(status, '')) != 'rejected' THEN invoice_amount END), 0),
                        COUNT(CASE WHEN payment_status='Paid' THEN 1 END),
                        COALESCE(SUM(CASE WHEN payment_status='Paid' THEN invoice_amount END), 0),
                        COUNT(CASE WHEN LOWER(COALESCE(status, '')) = 'pending review' THEN 1 END),
                        COUNT(CASE WHEN LOWER(COALESCE(status, '')) = 'approved' AND payment_status != 'Paid' THEN 1 END),
                        COUNT(CASE WHEN payment_status = 'Partially Paid' THEN 1 END)
                    FROM invoices
                """)
            row = cursor.fetchone()
            conn.commit()

            pending_rev = row[6] if len(row) > 6 else 0
            approved_invoices = row[7] if len(row) > 7 else 0
            partially_paid = row[8] if len(row) > 8 else (row[6] if len(row) > 6 and role == "Vendor" else 0)

            return {
                "total_count": row[0],
                "total_amount": float(row[1]),
                "pending_count": row[2],
                "pending_amount": float(row[3]),
                "paid_count": row[4],
                "paid_amount": float(row[5]),
                "pending_review_count": pending_rev,
                "approved_count": approved_invoices,
                "partially_paid_count": partially_paid
            }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# INVOICE REVIEW & DETAIL API (Full Joined Context)
# ==================================================
@router.get("/{id}")
@router.get("/{id}/review")
def get_invoice_detail(
    id: int,
    current_user: dict = Depends(get_current_user)
):
    user_role = normalize_role(current_user.get("role"))
    user_vendor_id = current_user.get("vendor_id")
    
    allowed_roles = {"Administrator", "Procurement Manager", "Supply Chain Manager", "Finance Officer", "Auditor", "Vendor"}
    if user_role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Permission Denied: Unauthorized role")

    try:
        conn.rollback()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    i.id,
                    i.invoice_number,
                    i.invoice_amount,
                    i.status,
                    i.payment_status,
                    i.invoice_date,
                    i.due_date,
                    i.payment_date,
                    i.created_at,
                    i.updated_at,
                    i.po_id,
                    i.vendor_id,
                    po.po_number,
                    COALESCE(po.product_name, 'Procurement Line Item') AS product_name,
                    po.quantity,
                    po.unit_price,
                    po.total_amount,
                    po.status AS po_status,
                    po.order_date,
                    po.expected_delivery,
                    po.created_by,
                    po.dataco_order_id,
                    v.vendor_name,
                    v.company,
                    v.email,
                    v.phone,
                    v.address,
                    v.status AS vendor_status,
                    COALESCE(v.reliability_score, 0),
                    COALESCE(v.delivery_rate, 0),
                    COALESCE(v.quality_score, 0),
                    COALESCE(v.total_orders, 0),
                    COALESCE(v.completed_orders, 0),
                    v.risk_level,
                    v.category,
                    i.created_by,
                    u.name AS creator_name,
                    u.email AS creator_email,
                    u.role AS creator_role,
                    COALESCE(i.paid_amount, po.paid_amount, 0.00) AS paid_amount,
                    COALESCE(i.remaining_amount, po.remaining_amount, i.invoice_amount - COALESCE(i.paid_amount, po.paid_amount, 0.00)) AS remaining_amount,
                    COALESCE(i.advance_amount, po.advance_amount, 0.00) AS advance_amount,
                    COALESCE(i.advance_percentage, po.advance_percentage, 0.00) AS advance_percentage,
                    COALESCE(i.final_payment_amount, po.final_payment_amount, 0.00) AS final_payment_amount
                FROM invoices i
                JOIN vendors v ON i.vendor_id = v.id
                LEFT JOIN purchase_orders po ON i.po_id = po.id
                LEFT JOIN users u ON i.created_by = u.id
                WHERE i.id = %s
            """, (id,))
            row = cur.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail=f"Invoice #{id} Not Found")

            (
                inv_id, inv_num, inv_amount, inv_status, inv_pay_status,
                inv_date, due_date, pay_date, inv_created_at, inv_updated_at,
                po_id, vendor_id, po_num, po_prod_name, po_qty, po_unit_price,
                po_total, po_status, po_order_date, po_expected_delivery,
                po_created_by, po_dataco_order_id, v_name, v_company, v_email,
                v_phone, v_address, v_status, v_rel, v_deliv_rate, v_qual,
                v_total_orders, v_completed_orders, v_risk, v_category,
                inv_created_by, creator_name, creator_email, creator_role,
                inv_paid, inv_rem, inv_adv, inv_adv_pct, inv_final_amt
            ) = row

            # If creator_name is not populated via foreign key, check audit_logs
            if not creator_name:
                cur.execute("""
                    SELECT user_name, user_email, 'Finance Officer'
                    FROM audit_logs
                    WHERE entity_type = 'INVOICE' AND (entity_id = %s OR entity_id = %s) AND action = 'INVOICE_CREATED'
                    ORDER BY id ASC
                    LIMIT 1
                """, (str(inv_id), inv_num))
                al_row = cur.fetchone()
                if al_row:
                    creator_name, creator_email, creator_role = al_row[0], al_row[1], al_row[2]
                else:
                    creator_name = "Finance Officer"
                    creator_email = "finance@vendoriq.com"
                    creator_role = "Finance Officer"

            # Cross-tenant check for Vendor role
            if user_role == "Vendor":
                if not user_vendor_id or int(user_vendor_id) != int(vendor_id):
                    raise HTTPException(
                        status_code=403,
                        detail="Access Denied: Vendors may only inspect invoices issued to their own organization."
                    )

            # Query Associated Delivery Information (if available)
            delivery_info = None
            if po_id or po_dataco_order_id:
                cur.execute("""
                    SELECT 
                        id, shipping_mode, delivery_status, late_delivery_risk, is_on_time,
                        scheduled_days, actual_days, COALESCE(actual_days - scheduled_days, 0) AS delay_days,
                        expected_delivery_date, actual_delivery_date
                    FROM deliveries
                    WHERE po_id = %s OR (dataco_order_id IS NOT NULL AND dataco_order_id = %s)
                    ORDER BY id DESC
                    LIMIT 1
                """, (po_id, po_dataco_order_id))
                deliv_row = cur.fetchone()
                if deliv_row:
                    delivery_info = {
                        "delivery_id": deliv_row[0],
                        "shipping_mode": deliv_row[1] or "Standard Class",
                        "delivery_status": deliv_row[2] or "Delivered",
                        "late_delivery_risk": int(deliv_row[3] or 0),
                        "is_on_time": bool(deliv_row[4]) if deliv_row[4] is not None else None,
                        "scheduled_days": int(deliv_row[5] or 0),
                        "actual_days": int(deliv_row[6] or 0),
                        "delay_days": int(deliv_row[7] or 0),
                        "expected_delivery_date": str(deliv_row[8]) if deliv_row[8] else None,
                        "actual_delivery_date": str(deliv_row[9]) if deliv_row[9] else None
                    }

            # Query linked payments history ledger
            cur.execute("""
                SELECT id, amount, payment_status, payment_method, payment_reference, payment_date, payment_type, created_at
                FROM payments
                WHERE invoice_id = %s OR (po_id = %s AND po_id IS NOT NULL)
                ORDER BY id ASC
            """, (id, po_id))
            pay_rows = cur.fetchall()
            payments_history = []
            for pr in pay_rows:
                payments_history.append({
                    "id": pr[0],
                    "amount": float(pr[1] or 0),
                    "payment_status": pr[2] or "Paid",
                    "payment_method": pr[3] or "Electronic Funds Transfer",
                    "payment_reference": pr[4] or "",
                    "payment_date": str(pr[5]) if pr[5] else "",
                    "payment_type": pr[6] or "Disbursement",
                    "created_at": str(pr[7]) if pr[7] else ""
                })

            conn.commit()

        # Clean display name for vendor proxies
        v_display = v_name or f"Vendor-{vendor_id}"
        if vendor_id and str(v_display).lower().startswith("derived vendor proxy"):
            v_display = f"Vendor-{vendor_id}"

        qty = int(po_qty or 1)
        unit_price = float(po_unit_price or 0)
        po_total_amt = float(po_total or 0)
        calc_total = round(qty * unit_price, 2)
        pricing_consistent = abs(calc_total - po_total_amt) < 0.05
        is_app_po = bool(po_created_by is not None or po_dataco_order_id is None)

        deliv_status_display = delivery_info.get("delivery_status") if delivery_info else (po_status or "N/A")

        tot_inv_amount = float(inv_amount or 0)
        paid_val = float(inv_paid or 0)
        rem_val = float(inv_rem if inv_rem is not None else max(0.0, tot_inv_amount - paid_val))

        return {
            "invoice": {
                "id": inv_id,
                "invoice_number": inv_num or f"INV-{inv_id:06d}",
                "invoice_amount": tot_inv_amount,
                "paid_amount": paid_val,
                "remaining_amount": rem_val,
                "advance_amount": float(inv_adv or 0),
                "advance_percentage": float(inv_adv_pct or 0),
                "final_payment_amount": float(inv_final_amt or 0),
                "status": inv_status or "Pending Review",
                "review_status": "Paid" if inv_pay_status == "Paid" else (inv_status or "Pending Review"),
                "payment_status": inv_pay_status or "Pending",
                "invoice_date": str(inv_date) if inv_date else "",
                "due_date": str(due_date) if due_date else "",
                "payment_date": str(pay_date) if pay_date else "",
                "po_id": po_id,
                "vendor_id": vendor_id,
                "created_by": inv_created_by,
                "created_by_name": creator_name or "Finance Officer",
                "created_by_role": creator_role or "Finance Officer",
                "created_by_email": creator_email or "finance@vendoriq.com",
                "created_at": str(inv_created_at) if inv_created_at else "",
                "updated_at": str(inv_updated_at) if inv_updated_at else "",
                "payments_history": payments_history
            },
            "purchase_order": {
                "id": po_id,
                "po_number": po_num or (f"PO-{po_id}" if po_id else "N/A"),
                "product_name": po_prod_name,
                "quantity": qty,
                "unit_price": unit_price,
                "total_amount": po_total_amt,
                "paid_amount": paid_val,
                "remaining_amount": rem_val,
                "advance_amount": float(inv_adv or 0),
                "advance_percentage": float(inv_adv_pct or 0),
                "payment_status": inv_pay_status or "Pending",
                "status": po_status or "N/A",
                "order_date": str(po_order_date) if po_order_date else "",
                "expected_delivery": str(po_expected_delivery) if po_expected_delivery else "",
                "delivery_status": deliv_status_display,
                "pricing_consistent": pricing_consistent,
                "calculated_total": calc_total,
                "is_app_po": is_app_po
            },
            "vendor": {
                "id": vendor_id,
                "name": v_display,
                "company": v_company or v_display,
                "email": v_email or "",
                "phone": v_phone or "",
                "address": v_address or "",
                "status": v_status or "Active",
                "reliability_score": round(float(v_rel or 0), 1),
                "delivery_rate": round(float(v_deliv_rate or 0), 1),
                "quality_score": round(float(v_qual or 0), 1),
                "total_orders": int(v_total_orders or 0),
                "completed_orders": int(v_completed_orders or 0),
                "risk_level": v_risk or "Low Risk",
                "category": v_category or "General"
            },
            "delivery": delivery_info
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("GET INVOICE DETAIL ERROR:", e)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

