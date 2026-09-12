from typing import Optional
from datetime import date
from fastapi import APIRouter, Form, HTTPException, Depends
from db import conn
from auth import get_current_user, check_role

router = APIRouter()


# ==================================================
# ADD PURCHASE REQUEST
# ==================================================
@router.post("/purchase-requests")
def add_purchase_request(
    product_name: str = Form(...),
    quantity: int = Form(...),
    unit_price: float = Form(...),
    request_date: str = Form(...),
    total_amount: Optional[float] = Form(None),
    vendor_id: Optional[str] = Form(None),
    requested_by: Optional[str] = Form(None),
    status: Optional[str] = Form(None),
    current_user: dict = Depends(check_role(["Admin", "Procurement Manager"]))
):
    try:
        # Backend validation: reject non-positive quantity or unit_price
        if quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be greater than zero.")
        if unit_price <= 0:
            raise HTTPException(status_code=400, detail="Unit price must be greater than zero.")

        # Authoritative backend calculation: total_amount = quantity * unit_price
        authoritative_total = round(float(quantity) * float(unit_price), 2)

        conn.rollback()
        with conn.cursor() as cursor:
            # 1. Enforce initial status to 'Pending' automatically
            initial_status = "Pending"

            # 2. Extract authenticated logged-in user name (do not trust user input)
            auth_user_name = current_user.get("name") or current_user.get("email") or "Procurement Officer"

            # 3. Optional vendor selection during requisition creation
            v_id = None
            if vendor_id and str(vendor_id).strip() and str(vendor_id).strip().lower() not in ("0", "none", "null", "undefined", ""):
                try:
                    v_id = int(vendor_id)
                except ValueError:
                    v_id = None

            # Verify vendor exists if provided
            if v_id:
                cursor.execute("SELECT id FROM vendors WHERE id = %s", (v_id,))
                if not cursor.fetchone():
                    v_id = None

            cursor.execute(
                """
                INSERT INTO purchase_requests
                (
                    vendor_id,
                    product_name,
                    quantity,
                    unit_price,
                    total_amount,
                    request_date,
                    requested_by,
                    status
                )
                VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    v_id,
                    product_name.strip(),
                    quantity,
                    unit_price,
                    authoritative_total,
                    request_date,
                    auth_user_name,
                    initial_status
                )
            )
            new_id = cursor.fetchone()[0]
            conn.commit()

            try:
                from audit_logs import log_action
                log_action(
                    user_id=current_user.get("id"),
                    user_name=current_user.get("name") or auth_user_name,
                    user_email=current_user.get("email"),
                    action="PURCHASE_REQUEST_CREATED",
                    entity_type="PURCHASE_REQUEST",
                    entity_id=str(new_id),
                    details=f"Created Purchase Request #{new_id} for '{product_name.strip()}' (Qty: {quantity}, Amount: ₹{authoritative_total})"
                )
            except Exception as le:
                print("Audit log PR creation error:", le)

        return {
            "message": "Purchase Request Created Successfully",
            "id": new_id,
            "status": "Pending",
            "requested_by": auth_user_name,
            "unit_price": float(unit_price),
            "total_amount": authoritative_total
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("ADD PURCHASE REQUEST ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


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
                        pr.id,
                        pr.vendor_id,
                        COALESCE(v.vendor_name, 'Unassigned') AS vendor_name,
                        pr.product_name,
                        pr.quantity,
                        pr.request_date,
                        pr.requested_by,
                        pr.status,
                        pr.purchase_order_id,
                        COALESCE(v.reliability_score, 0) AS reliability_score,
                        COALESCE(pr.unit_price, 0.00) AS unit_price,
                        COALESCE(pr.total_amount, 0.00) AS total_amount
                    FROM purchase_requests pr
                    LEFT JOIN vendors v ON pr.vendor_id = v.id
                    WHERE pr.vendor_id = %s
                    ORDER BY pr.id DESC
                    """,
                    (user_vendor_id,)
                )
            else:
                cur.execute(
                    """
                    SELECT
                        pr.id,
                        pr.vendor_id,
                        COALESCE(v.vendor_name, 'Unassigned') AS vendor_name,
                        pr.product_name,
                        pr.quantity,
                        pr.request_date,
                        pr.requested_by,
                        pr.status,
                        pr.purchase_order_id,
                        COALESCE(v.reliability_score, 0) AS reliability_score,
                        COALESCE(pr.unit_price, 0.00) AS unit_price,
                        COALESCE(pr.total_amount, 0.00) AS total_amount
                    FROM purchase_requests pr
                    LEFT JOIN vendors v ON pr.vendor_id = v.id
                    ORDER BY pr.id DESC
                    """
                )
            data = cur.fetchall()
            conn.commit()

        requests = []
        for row in data:
            v_name = row[2]
            # Professional vendor display: clean up 'Derived Vendor Proxy 24' -> 'Vendor-24'
            if row[1] and str(v_name).lower().startswith("derived vendor proxy"):
                v_name = f"Vendor-{row[1]}"

            requests.append({
                "id": row[0],
                "vendor_id": row[1],
                "vendor_name": v_name,
                "product_name": row[3],
                "quantity": row[4],
                "request_date": str(row[5]) if row[5] else "",
                "requested_by": row[6],
                "status": row[7] or "Pending",
                "purchase_order_id": row[8],
                "vendor_reliability": float(row[9] or 0),
                "unit_price": float(row[10] or 0),
                "total_amount": float(row[11] or 0)
            })

        return requests
    except Exception as e:
        print("GET PURCHASE REQUEST ERROR:", e)
        try:
            conn.rollback()
        except:
            pass
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# UPDATE / EDIT / RESUBMIT PURCHASE REQUEST
# ==================================================
@router.put("/purchase-requests/{id}")
def update_purchase_request(
    id: int,
    product_name: str = Form(...),
    quantity: int = Form(...),
    request_date: str = Form(...),
    unit_price: Optional[float] = Form(None),
    total_amount: Optional[float] = Form(None),
    vendor_id: Optional[str] = Form(None),
    status: Optional[str] = Form(None),
    current_user: dict = Depends(check_role(["Admin", "Procurement Manager"]))
):
    try:
        if quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be greater than zero.")
        if unit_price is not None and unit_price <= 0:
            raise HTTPException(status_code=400, detail="Unit price must be greater than zero.")

        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id, status, purchase_order_id, COALESCE(unit_price, 0) FROM purchase_requests WHERE id=%s",
                (id,)
            )
            existing = cursor.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="Purchase Request Not Found")

            current_status = existing[1]
            existing_po_id = existing[2]
            existing_price = float(existing[3] or 0)

            # If PO was already created, prevent modifying details
            if existing_po_id:
                raise HTTPException(status_code=400, detail=f"Cannot edit requisition; Purchase Order #{existing_po_id} has already been issued.")

            # Parse vendor_id
            v_id = None
            if vendor_id and str(vendor_id).strip() and str(vendor_id).strip().lower() not in ("0", "none", "null", "undefined", ""):
                try:
                    v_id = int(vendor_id)
                except ValueError:
                    v_id = None

            # Resubmission workflow: if request was Rejected, updating it resets status to 'Pending' for review
            new_status = current_status
            if current_status == "Rejected":
                new_status = "Pending"
            elif status and status in ("Pending", "Approved", "Rejected") and current_user.get("role") in ("Admin", "Procurement Manager"):
                new_status = status

            final_price = unit_price if unit_price is not None else existing_price
            authoritative_total = round(float(quantity) * float(final_price), 2)

            cursor.execute(
                """
                UPDATE purchase_requests
                SET
                    vendor_id = %s,
                    product_name = %s,
                    quantity = %s,
                    unit_price = %s,
                    total_amount = %s,
                    request_date = %s,
                    status = %s
                WHERE id = %s
                """,
                (
                    v_id,
                    product_name.strip(),
                    quantity,
                    final_price,
                    authoritative_total,
                    request_date,
                    new_status,
                    id
                )
            )
            conn.commit()

            try:
                from audit_logs import log_action
                log_action(
                    user_id=current_user.get("id"),
                    user_name=current_user.get("name"),
                    user_email=current_user.get("email"),
                    action="PURCHASE_REQUEST_UPDATED",
                    entity_type="PURCHASE_REQUEST",
                    entity_id=str(id),
                    details=f"Updated Purchase Request #{id} for '{product_name.strip()}' (Status: '{new_status}', Amount: ₹{authoritative_total})"
                )
            except Exception as le:
                print("Audit log PR update error:", le)

        return {
            "message": "Purchase Request Updated Successfully",
            "status": new_status
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("UPDATE PURCHASE REQUEST ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# DELETE PURCHASE REQUEST
# ==================================================
@router.delete("/purchase-requests/{id}")
def delete_purchase_request(id: int, current_user: dict = Depends(check_role(["Administrator", "Admin", "Procurement Manager"]))):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute("SELECT purchase_order_id FROM purchase_requests WHERE id=%s", (id,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Purchase Request Not Found")
            
            if row[0]:
                raise HTTPException(status_code=400, detail=f"Cannot delete requisition with issued Purchase Order #{row[0]}.")

            cursor.execute("DELETE FROM purchase_requests WHERE id=%s", (id,))
            conn.commit()

            try:
                from audit_logs import log_action
                log_action(
                    user_id=current_user.get("id"),
                    user_name=current_user.get("name"),
                    user_email=current_user.get("email"),
                    action="PURCHASE_REQUEST_DELETED",
                    entity_type="PURCHASE_REQUEST",
                    entity_id=str(id),
                    details=f"Deleted Purchase Request #{id}"
                )
            except Exception as le:
                print("Audit log PR delete error:", le)

        return {"message": "Purchase Request Deleted Successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("DELETE PURCHASE REQUEST ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# APPROVE PURCHASE REQUEST (Assigns vendor if unassigned)
# ==================================================
@router.put("/purchase-requests/approve/{id}")
def approve_request(
    id: int,
    vendor_id: Optional[str] = Form(None),
    current_user: dict = Depends(check_role(["Admin", "Procurement Manager"]))
):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id, vendor_id, product_name, quantity, status, purchase_order_id FROM purchase_requests WHERE id=%s",
                (id,)
            )
            request = cursor.fetchone()

            if not request:
                raise HTTPException(status_code=404, detail="Request Not Found")

            current_vendor_id = request[1]
            current_status = request[4]
            existing_po_id = request[5]

            # If already approved, return notice
            if current_status == "Approved":
                return {
                    "message": "Requisition is already approved.",
                    "status": "Approved",
                    "purchase_order_id": existing_po_id
                }

            # Optional vendor assignment during approval
            final_vendor_id = current_vendor_id
            if vendor_id and str(vendor_id).strip() and str(vendor_id).strip().lower() not in ("0", "none", "null", "undefined", ""):
                try:
                    final_vendor_id = int(vendor_id)
                except ValueError:
                    pass

            if not final_vendor_id:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot approve requisition without an assigned supplier. Please select a supplier based on reliability score."
                )

            cursor.execute(
                """
                UPDATE purchase_requests
                SET status = 'Approved', vendor_id = %s
                WHERE id = %s
                """,
                (final_vendor_id, id)
            )
            conn.commit()

            try:
                from audit_logs import log_action
                log_action(
                    user_id=current_user.get("id"),
                    user_name=current_user.get("name"),
                    user_email=current_user.get("email"),
                    action="PURCHASE_REQUEST_APPROVED",
                    entity_type="PURCHASE_REQUEST",
                    entity_id=str(id),
                    details=f"Approved Purchase Request #{id} and assigned Vendor ID #{final_vendor_id}"
                )
            except Exception as le:
                print("Audit log PR approval error:", le)

        return {
            "message": "Requisition Approved Successfully. You may now promote it to a Purchase Order.",
            "status": "Approved",
            "vendor_id": final_vendor_id
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("APPROVE REQUEST ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# REJECT PURCHASE REQUEST
# ==================================================
@router.put("/purchase-requests/reject/{id}")
def reject_request(
    id: int,
    current_user: dict = Depends(check_role(["Admin", "Procurement Manager"]))
):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id, status, purchase_order_id FROM purchase_requests WHERE id=%s",
                (id,)
            )
            request = cursor.fetchone()
            if not request:
                raise HTTPException(status_code=404, detail="Request Not Found")

            if request[2]:
                raise HTTPException(status_code=400, detail=f"Cannot reject; Purchase Order #{request[2]} has already been issued.")

            cursor.execute(
                "UPDATE purchase_requests SET status = 'Rejected' WHERE id = %s",
                (id,)
            )
            conn.commit()

            try:
                from audit_logs import log_action
                log_action(
                    user_id=current_user.get("id"),
                    user_name=current_user.get("name"),
                    user_email=current_user.get("email"),
                    action="PURCHASE_REQUEST_REJECTED",
                    entity_type="PURCHASE_REQUEST",
                    entity_id=str(id),
                    details=f"Rejected Purchase Request #{id}"
                )
            except Exception as le:
                print("Audit log PR reject error:", le)

        return {
            "message": "Requisition has been Rejected. It can be modified and resubmitted.",
            "status": "Rejected"
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("REJECT REQUEST ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# EXPLICIT PURCHASE ORDER CREATION (Duplicate Protected)
# ==================================================
@router.post("/purchase-requests/create-po/{id}")
@router.post("/purchase-requests/{id}/create-po")
def create_po_from_request(
    id: int,
    current_user: dict = Depends(check_role(["Admin", "Procurement Manager"]))
):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    pr.id,
                    pr.vendor_id,
                    pr.product_name,
                    pr.quantity,
                    pr.status,
                    pr.purchase_order_id,
                    COALESCE(pr.unit_price, 0.00),
                    COALESCE(pr.total_amount, 0.00)
                FROM purchase_requests pr
                WHERE pr.id = %s
                """,
                (id,)
            )
            request = cursor.fetchone()

            if not request:
                raise HTTPException(status_code=404, detail="Requisition Not Found")

            req_id, vendor_id, product_name, quantity, status, existing_po_id, pr_unit_price, pr_total_amount = request

            # 1. Prevent duplicate PO creation
            if existing_po_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Duplicate Order Blocked: A Purchase Order (PO ID #{existing_po_id}) has already been generated for this requisition."
                )

            # 2. Check that request is approved
            if status != "Approved":
                raise HTTPException(
                    status_code=400,
                    detail=f"Requisition must be Approved before issuing a Purchase Order (Current Status: '{status}')."
                )

            # 3. Check that vendor is assigned
            if not vendor_id:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot issue Purchase Order: No supplier partner assigned to this requisition."
                )

            # 4. Resolve Unit Price: prioritize requisition pricing
            req_price = float(pr_unit_price or 0)
            if req_price > 0:
                unit_price = req_price
            else:
                # Fallback to product catalog price if requisition didn't specify
                cursor.execute(
                    "SELECT id, product_price FROM products WHERE LOWER(product_name) = LOWER(%s) LIMIT 1",
                    (product_name.strip(),)
                )
                prod_row = cursor.fetchone()
                unit_price = float(prod_row[1]) if prod_row and prod_row[1] else 0.0

            # Authoritative total calculation: Quantity * Unit Price
            total_amount = round(quantity * unit_price, 2)

            # Look up or create product in products catalog
            cursor.execute(
                "SELECT id FROM products WHERE LOWER(product_name) = LOWER(%s) LIMIT 1",
                (product_name.strip(),)
            )
            prod_row = cursor.fetchone()
            product_id = prod_row[0] if prod_row else None

            # If product doesn't exist, create catalog item
            if not product_id:
                cursor.execute("SELECT COALESCE(MAX(product_card_id), 0) + 1 FROM products")
                next_card_id = cursor.fetchone()[0]
                cursor.execute(
                    """
                    INSERT INTO products (product_card_id, product_name, category_name, product_price, created_at)
                    VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
                    RETURNING id
                    """,
                    (next_card_id, product_name, "Procurement Supplies", unit_price)
                )
                product_id = cursor.fetchone()[0]
            elif unit_price > 0:
                cursor.execute(
                    "UPDATE products SET product_price = %s WHERE id = %s",
                    (unit_price, product_id)
                )

            # Create the Purchase Order with clean PO number
            cursor.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM purchase_orders")
            next_po_id = cursor.fetchone()[0]
            po_number = f"PO-2026-{next_po_id:05d}"

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
                    created_at,
                    updated_at
                )
                VALUES
                (
                    %s, %s, %s, %s, %s, %s, %s,
                    CURRENT_DATE,
                    CURRENT_DATE + INTERVAL '14 day',
                    'Approved',
                    %s,
                    %s,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                RETURNING id, po_number
                """,
                (
                    next_po_id,
                    vendor_id,
                    product_id,
                    product_name,
                    quantity,
                    unit_price,
                    total_amount,
                    po_number,
                    current_user.get("id")
                )
            )
            created_po = cursor.fetchone()
            po_id, created_po_num = created_po[0], created_po[1]

            # Link the generated PO to the requisition to prevent duplicates and sync final pricing
            cursor.execute(
                """
                UPDATE purchase_requests
                SET purchase_order_id = %s, unit_price = %s, total_amount = %s
                WHERE id = %s
                """,
                (po_id, unit_price, total_amount, req_id)
            )
            conn.commit()

            try:
                from audit_logs import log_action
                log_action(
                    user_id=current_user.get("id"),
                    user_name=current_user.get("name"),
                    user_email=current_user.get("email"),
                    action="PURCHASE_ORDER_CREATED",
                    entity_type="PURCHASE_ORDER",
                    entity_id=str(po_id),
                    details=f"Generated Purchase Order {created_po_num} (ID #{po_id}) from Requisition #{req_id} for '{product_name.strip()}' (Amount: ₹{total_amount})"
                )
            except Exception as le:
                print("Audit log PO create from PR error:", le)

        return {
            "message": "Official Purchase Order generated successfully.",
            "purchase_order_id": po_id,
            "po_number": created_po_num,
            "requisition_id": req_id
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("CREATE PO FROM REQUEST ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))