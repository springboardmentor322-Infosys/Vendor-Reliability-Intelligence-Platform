from fastapi import APIRouter, Depends, HTTPException, Form, status
from db import conn
from auth import get_current_user, check_role
from datetime import date

router = APIRouter(prefix="/invoices", tags=["Invoices"])

def ensure_invoices_exist():
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM invoices")
            count = cursor.fetchone()[0]
            if count == 0:
                print("Seeding invoices from purchase orders...")
                cursor.execute("""
                    INSERT INTO invoices (po_id, vendor_id, invoice_number, invoice_date, due_date, invoice_amount, payment_status, payment_date, created_at, updated_at)
                    SELECT 
                        id,
                        vendor_id,
                        'INV-' || LPAD(id::text, 6, '0'),
                        order_date,
                        (order_date + INTERVAL '30 days')::date,
                        total_amount,
                        CASE WHEN LOWER(status) = 'completed' OR LOWER(status) = 'delivered' THEN 'Paid' ELSE 'Pending' END,
                        CASE WHEN LOWER(status) = 'completed' OR LOWER(status) = 'delivered' THEN (order_date + INTERVAL '5 days')::date ELSE NULL END,
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    FROM purchase_orders
                    ON CONFLICT DO NOTHING
                """)
                conn.commit()
                print("Invoices seeded successfully.")
    except Exception as e:
        conn.rollback()
        print("SEED INVOICES FAILURE:", e)

# Auto-seed invoices if empty
ensure_invoices_exist()

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
        
        if user_role not in ["Admin", "Finance Officer", "Vendor", "Auditor", "Procurement Manager"]:
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
                filter_where += " AND LOWER(v.vendor_name) LIKE %s"
                filter_params.append(f"%{search.strip().lower()}%")
                
            if status and status != "all":
                filter_where += " AND i.payment_status = %s"
                filter_params.append(status.strip())

            # 3. Main select query
            query = f"""
                SELECT i.id, i.po_id, i.vendor_id, v.vendor_name, po.product_name, i.invoice_number, i.invoice_date, i.due_date, i.invoice_amount, i.payment_date, i.payment_status
                FROM invoices i
                JOIN vendors v ON i.vendor_id = v.id
                LEFT JOIN purchase_orders po ON i.po_id = po.id
                {filter_where}
                ORDER BY i.invoice_date DESC, i.id DESC
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
            
        invoices = []
        for row in rows:
            invoices.append({
                "id": row[0],
                "po_id": row[1],
                "vendor_id": row[2],
                "vendor_name": row[3],
                "product_name": row[4] or "N/A",
                "invoice_number": row[5],
                "invoice_date": str(row[6]) if row[6] else "",
                "due_date": str(row[7]) if row[7] else "",
                "invoice_amount": float(row[8] or 0),
                "payment_date": str(row[9]) if row[9] else "",
                "payment_status": row[10]
            })
            
        if paginate:
            with conn.cursor() as cursor:
                # Count total filtered records for pagination info
                count_query = f"""
                    SELECT COUNT(*) 
                    FROM invoices i 
                    JOIN vendors v ON i.vendor_id = v.id
                    {filter_where}
                """
                cursor.execute(count_query, filter_params)
                total_count = cursor.fetchone()[0]
                
                # Fetch unfiltered KPIs (scoped by vendor if Vendor user)
                kpi_query = f"""
                    SELECT 
                        COUNT(*),
                        COUNT(CASE WHEN payment_status='Paid' THEN 1 END),
                        COUNT(CASE WHEN payment_status='Pending' THEN 1 END),
                        COALESCE(SUM(invoice_amount), 0)
                    FROM invoices i
                    {base_where}
                """
                cursor.execute(kpi_query, where_params)
                kpi_total, kpi_paid, kpi_pending, kpi_sum = cursor.fetchone()
                
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
    except Exception as e:
        conn.rollback()
        print("GET INVOICES ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )

@router.put("/{id}/pay")
def pay_invoice(id: int, current_user: dict = Depends(check_role(["Admin", "Finance Officer"]))):
    try:
        conn.rollback()
        today = date.today()
        
        with conn.cursor() as cursor:
            # Check if invoice exists
            cursor.execute("SELECT po_id, payment_status FROM invoices WHERE id = %s", (id,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Invoice not found")
            
            po_id, current_status = row
            if current_status == "Paid":
                return {"message": "Invoice already paid"}
                
            # Update invoice to Paid
            cursor.execute("""
                UPDATE invoices
                SET payment_status = 'Paid',
                    payment_date = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (today, id))
            
            # Also update purchase order status if applicable
            cursor.execute("""
                UPDATE purchase_orders
                SET status = 'Completed'
                WHERE id = %s
            """, (po_id,))
            
            conn.commit()
            
        return {"message": "Invoice payment recorded successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        conn.rollback()
        print("PAY INVOICE ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )


# ==================================================
# INVOICE SUMMARY STATISTICS API
# ==================================================

@router.get("/summary")
def get_invoices_summary(current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    vendor_id = current_user.get("vendor_id")
    
    if role not in ["Admin", "Finance Officer", "Vendor"]:
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
                        COUNT(CASE WHEN payment_status='Pending' THEN 1 END),
                        COALESCE(SUM(CASE WHEN payment_status='Pending' THEN invoice_amount END), 0),
                        COUNT(CASE WHEN payment_status='Paid' THEN 1 END),
                        COALESCE(SUM(CASE WHEN payment_status='Paid' THEN invoice_amount END), 0)
                    FROM invoices
                    WHERE vendor_id = %s
                """, (vendor_id,))
            else:
                cursor.execute("""
                    SELECT 
                        COUNT(*),
                        COALESCE(SUM(invoice_amount), 0),
                        COUNT(CASE WHEN payment_status='Pending' THEN 1 END),
                        COALESCE(SUM(CASE WHEN payment_status='Pending' THEN invoice_amount END), 0),
                        COUNT(CASE WHEN payment_status='Paid' THEN 1 END),
                        COALESCE(SUM(CASE WHEN payment_status='Paid' THEN invoice_amount END), 0)
                    FROM invoices
                """)
            row = cursor.fetchone()
            return {
                "total_count": row[0],
                "total_amount": float(row[1]),
                "pending_count": row[2],
                "pending_amount": float(row[3]),
                "paid_count": row[4],
                "paid_amount": float(row[5])
            }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

