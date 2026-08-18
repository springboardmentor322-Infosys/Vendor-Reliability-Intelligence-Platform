from fastapi import APIRouter, Depends, HTTPException, Form, status
from db import conn
from auth import get_current_user, check_role
from datetime import date

router = APIRouter(prefix="/quality-inspections", tags=["Quality Inspections"])

@router.get("")
def get_quality_inspections(current_user: dict = Depends(get_current_user)):
    try:
        conn.rollback()
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")
        
        with conn.cursor() as cursor:
            if user_role == "Vendor":
                if not user_vendor_id:
                    return []
                cursor.execute("""
                    SELECT q.id, q.vendor_id, v.vendor_name, q.product_id, p.product_name, q.purchase_order_id, q.inspection_date, q.quantity_inspected, q.quantity_passed, q.quantity_failed, q.defect_rate, q.quality_score, q.inspection_status, q.remarks
                    FROM quality_inspections q
                    JOIN vendors v ON q.vendor_id = v.id
                    JOIN products p ON q.product_id = p.id
                    WHERE q.vendor_id = %s
                    ORDER BY q.inspection_date DESC
                """, (user_vendor_id,))
            else:
                cursor.execute("""
                    SELECT q.id, q.vendor_id, v.vendor_name, q.product_id, p.product_name, q.purchase_order_id, q.inspection_date, q.quantity_inspected, q.quantity_passed, q.quantity_failed, q.defect_rate, q.quality_score, q.inspection_status, q.remarks
                    FROM quality_inspections q
                    JOIN vendors v ON q.vendor_id = v.id
                    JOIN products p ON q.product_id = p.id
                    ORDER BY q.inspection_date DESC
                """)
            rows = cursor.fetchall()
            conn.commit()
            
        inspections = []
        for row in rows:
            inspections.append({
                "id": row[0],
                "vendor_id": row[1],
                "vendor_name": row[2],
                "product_id": row[3],
                "product_name": row[4],
                "purchase_order_id": row[5],
                "inspection_date": str(row[6]) if row[6] else "",
                "quantity_inspected": int(row[7] or 0),
                "quantity_passed": int(row[8] or 0),
                "quantity_failed": int(row[9] or 0),
                "defect_rate": float(row[10] or 0),
                "quality_score": float(row[11] or 0),
                "inspection_status": row[12],
                "remarks": row[13]
            })
        return inspections
    except Exception as e:
        try:
            conn.rollback()
        except:
            pass
        print("GET QUALITY INSPECTIONS ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )

@router.post("")
def add_quality_inspection(
    purchase_order_id: int = Form(...),
    quantity_inspected: int = Form(...),
    quantity_failed: int = Form(...),
    remarks: str = Form(None),
    current_user: dict = Depends(check_role(["Admin", "Procurement Manager", "Supply Chain Manager"]))
):
    try:
        conn.rollback()
        
        if quantity_inspected <= 0:
            raise HTTPException(status_code=400, detail="Quantity inspected must be greater than 0")
        if quantity_failed < 0 or quantity_failed > quantity_inspected:
            raise HTTPException(status_code=400, detail="Invalid quantity failed")
            
        today = date.today()
        quantity_passed = quantity_inspected - quantity_failed
        defect_rate = round((quantity_failed / quantity_inspected) * 100, 2)
        quality_score = round((quantity_passed / quantity_inspected) * 100, 2)
        
        if quality_score >= 95:
            inspection_status = "Passed"
        elif quality_score >= 85:
            inspection_status = "Accepted with Minor Issues"
        else:
            inspection_status = "Review Required"
            
        with conn.cursor() as cursor:
            # Get vendor_id and product_id from purchase order
            cursor.execute("SELECT vendor_id, product_id FROM purchase_orders WHERE id = %s", (purchase_order_id,))
            po_row = cursor.fetchone()
            if not po_row:
                raise HTTPException(status_code=404, detail="Purchase Order not found")
                
            vendor_id, product_id = po_row
            
            cursor.execute("""
                INSERT INTO quality_inspections (vendor_id, product_id, purchase_order_id, inspection_date, quantity_inspected, quantity_passed, quantity_failed, defect_rate, quality_score, inspection_status, remarks, inspected_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (vendor_id, product_id, purchase_order_id, today, quantity_inspected, quantity_passed, quantity_failed, defect_rate, quality_score, inspection_status, remarks, current_user.get("id")))
            new_inspection_id = cursor.fetchone()[0]
            conn.commit()

        # Log Quality Inspection Creation
        from audit_logs import log_action
        log_action(user_id=current_user.get('id'), user_name=current_user.get('name'), user_email=current_user.get('email'), action="CREATE", entity_type="QUALITY_INSPECTION", entity_id=str(new_inspection_id), details=f"Recorded quality check on PO ID: {purchase_order_id}")
            
        return {"message": "Quality inspection added successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        conn.rollback()
        print("ADD QUALITY INSPECTION ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )
