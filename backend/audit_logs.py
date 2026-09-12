from fastapi import APIRouter, Depends, HTTPException, status, Query, Form
from typing import Optional, List, Dict, Any
from db import conn
from auth import get_current_user, check_role
from datetime import date, datetime

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])
audit_router = APIRouter(prefix="/audit", tags=["Auditor Governance"])

def log_action(user_id: int, user_name: str, user_email: str, action: str, entity_type: str, entity_id: str, details: str, ip_address: str = None):
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO audit_logs (user_id, user_name, user_email, action, entity_type, entity_id, details, ip_address, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            """, (user_id, user_name, user_email, action, entity_type, str(entity_id), details, ip_address))
            conn.commit()
    except Exception as e:
        conn.rollback()
        print("AUDIT LOG LOGGING FAILURE:", e)

# ==================================================
# 1. AUDIT LOGS QUERY API (With Multi-Filter Support)
# ==================================================
@router.get("")
def get_audit_logs(
    page: int = 1,
    limit: int = 50,
    search: Optional[str] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    date_filter: Optional[str] = None,
    current_user: dict = Depends(check_role(["Administrator", "Admin", "Auditor"]))
):
    try:
        conn.rollback()
        offset = (page - 1) * limit
        where_clauses = ["1=1"]
        params = []

        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            where_clauses.append("(LOWER(al.user_email) LIKE %s OR LOWER(al.user_name) LIKE %s OR LOWER(al.details) LIKE %s OR LOWER(al.entity_id) LIKE %s)")
            params.extend([term, term, term, term])

        if action and action.strip() and action.strip().lower() != "all":
            where_clauses.append("UPPER(al.action) = %s")
            params.append(action.strip().upper())

        if entity_type and entity_type.strip() and entity_type.strip().lower() != "all":
            where_clauses.append("UPPER(al.entity_type) = %s")
            params.append(entity_type.strip().upper())

        if date_filter and date_filter.strip():
            where_clauses.append("DATE(al.created_at) = %s")
            params.append(date_filter.strip())

        where_sql = " AND ".join(where_clauses)

        with conn.cursor() as cursor:
            query = f"""
                SELECT 
                    al.id, 
                    al.user_id, 
                    al.user_name, 
                    al.user_email, 
                    al.action, 
                    al.entity_type, 
                    al.entity_id, 
                    al.details, 
                    al.ip_address, 
                    al.created_at,
                    COALESCE(u.role, 'System') AS user_role
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE {where_sql}
                ORDER BY al.created_at DESC
                LIMIT %s OFFSET %s
            """
            cursor.execute(query, params + [limit, offset])
            rows = cursor.fetchall()
            conn.commit()
            
        logs = []
        for row in rows:
            logs.append({
                "id": row[0],
                "user_id": row[1],
                "user_name": row[2] or "System",
                "user_email": row[3] or "system@vendoriq.com",
                "action": row[4],
                "action_type": row[4],
                "entity_type": row[5] or "SYSTEM",
                "entity_id": str(row[6]) if row[6] is not None else "",
                "details": row[7] or "",
                "ip_address": row[8] or "127.0.0.1",
                "created_at": str(row[9]) if row[9] else "",
                "user_role": row[10] or "System"
            })
        return logs

    except Exception as e:
        conn.rollback()
        print("GET AUDIT LOGS ERROR:", e)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# ==================================================
# 2. TRACEABLE ENTITIES (Quick lookup for Auditor)
# ==================================================
@audit_router.get("/traceable-entities")
def get_traceable_entities(
    current_user: dict = Depends(check_role(["Administrator", "Admin", "Auditor"]))
):
    try:
        conn.rollback()
        with conn.cursor() as cur:
            # 1. Recent Purchase Orders
            cur.execute("""
                SELECT po.id, po.po_number, po.product_name, po.total_amount, po.status, COALESCE(v.vendor_name, 'Unassigned')
                FROM purchase_orders po
                LEFT JOIN vendors v ON po.vendor_id = v.id
                ORDER BY po.id DESC
                LIMIT 20
            """)
            pos = [{
                "id": r[0],
                "reference": r[1] or f"PO-{r[0]}",
                "label": f"{r[1] or 'PO #' + str(r[0])} - {r[2]} (₹{float(r[3] or 0):,.2f}) [{r[4]}]"
            } for r in cur.fetchall()]

            # 2. Recent Purchase Requests
            cur.execute("""
                SELECT pr.id, pr.product_name, pr.quantity, pr.total_amount, pr.status, pr.requested_by
                FROM purchase_requests pr
                ORDER BY pr.id DESC
                LIMIT 15
            """)
            prs = [{
                "id": r[0],
                "reference": f"PR-{r[0]}",
                "label": f"PR #{r[0]} - {r[1]} (Qty: {r[2]}, ₹{float(r[3] or 0):,.2f}) [{r[4]}]"
            } for r in cur.fetchall()]

            # 3. Recent Invoices
            cur.execute("""
                SELECT i.id, i.invoice_number, i.invoice_amount, i.status, i.payment_status
                FROM invoices i
                ORDER BY i.id DESC
                LIMIT 15
            """)
            invs = [{
                "id": r[0],
                "reference": r[1] or f"INV-{r[0]}",
                "label": f"{r[1] or 'INV #' + str(r[0])} - ₹{float(r[2] or 0):,.2f} [Status: {r[3]}, Pay: {r[4]}]"
            } for r in cur.fetchall()]

            # 4. Recent Payments
            cur.execute("""
                SELECT p.id, p.payment_reference, p.amount, p.payment_status, p.payment_date
                FROM payments p
                ORDER BY p.id DESC
                LIMIT 15
            """)
            pays = [{
                "id": r[0],
                "reference": r[1] or f"PAY-{r[0]}",
                "label": f"{r[1] or 'PAY #' + str(r[0])} - ₹{float(r[2] or 0):,.2f} [{r[3]}] ({str(r[4]) if r[4] else ''})"
            } for r in cur.fetchall()]

            # 5. Contracts
            cur.execute("""
                SELECT c.id, c.contract_name, c.status, c.end_date, COALESCE(v.vendor_name, 'Unknown')
                FROM contracts c
                LEFT JOIN vendors v ON c.vendor_id = v.id
                ORDER BY c.id DESC
                LIMIT 15
            """)
            contracts = [{
                "id": r[0],
                "reference": f"CNT-{r[0]}",
                "label": f"Contract #{r[0]} - {r[1]} [{r[2]}] (Vendor: {r[4]})"
            } for r in cur.fetchall()]

            # 6. Vendors
            cur.execute("""
                SELECT v.id, v.vendor_name, v.category, v.reliability_score, v.risk_level
                FROM vendors v
                ORDER BY v.id ASC
                LIMIT 20
            """)
            vendors = [{
                "id": r[0],
                "reference": f"V-{r[0]}",
                "label": f"Vendor #{r[0]} - {r[1]} (Reliability: {float(r[3] or 0)}%, {r[4]})"
            } for r in cur.fetchall()]

        return {
            "purchase_orders": pos,
            "purchase_requests": prs,
            "invoices": invs,
            "payments": pays,
            "contracts": contracts,
            "vendors": vendors
        }
    except Exception as e:
        conn.rollback()
        print("GET TRACEABLE ENTITIES ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# 3. END-TO-END TRANSACTION TRACEABILITY API
# ==================================================
@audit_router.get("/trace/{entity_type}/{entity_id}")
def trace_transaction(
    entity_type: str,
    entity_id: str,
    current_user: dict = Depends(check_role(["Administrator", "Admin", "Auditor"]))
):
    norm_type = entity_type.strip().lower().replace("-", "_")
    if norm_type == "po":
        norm_type = "purchase_order"
    elif norm_type == "pr":
        norm_type = "purchase_request"
    valid_types = ["purchase_order", "purchase_request", "vendor", "contract", "invoice", "payment"]
    if norm_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid entity type '{entity_type}'. Allowed types: {valid_types}")

    clean_id = str(entity_id).strip()

    try:
        conn.rollback()
        with conn.cursor() as cur:
            timeline_events = []
            entity_summary = {}
            approval_verification = {
                "entity_type": norm_type.upper(),
                "entity_id": clean_id,
                "created_by": "System Records",
                "created_date": None,
                "approval_status": "Not Assessed",
                "approved_by": None,
                "approval_date": None,
                "approver_role": None,
                "previous_status": None,
                "final_status": None,
                "evidence_available": False,
                "notice": "Approval evidence not available in current records."
            }

            # ----------------------------------------------------
            # CASE 1: PURCHASE ORDER TRACE
            # ----------------------------------------------------
            if norm_type == "purchase_order":
                po_row = None
                if clean_id.isdigit():
                    cur.execute("""
                        SELECT id, vendor_id, product_id, product_name, quantity, unit_price, total_amount, 
                               order_date, expected_delivery, status, po_number, created_by, created_at, updated_at, dataco_order_id, order_item_id
                        FROM purchase_orders
                        WHERE id = %s OR dataco_order_id = %s
                        LIMIT 1
                    """, (int(clean_id), int(clean_id)))
                    po_row = cur.fetchone()

                if not po_row:
                    cur.execute("""
                        SELECT id, vendor_id, product_id, product_name, quantity, unit_price, total_amount, 
                               order_date, expected_delivery, status, po_number, created_by, created_at, updated_at, dataco_order_id, order_item_id
                        FROM purchase_orders
                        WHERE LOWER(po_number) = LOWER(%s)
                        LIMIT 1
                    """, (clean_id,))
                    po_row = cur.fetchone()

                if not po_row:
                    raise HTTPException(status_code=404, detail=f"Purchase Order '{clean_id}' not found.")

                po_id, vid, pid, prod_name, qty, unit_p, tot_amt, o_date, exp_del, po_status, po_num, c_by, c_at, u_at, d_order_id, d_item_id = po_row
                po_num_str = po_num or f"PO-2026-{po_id:05d}"

                # Vendor details
                cur.execute("SELECT vendor_name, company, email, reliability_score, risk_level FROM vendors WHERE id = %s", (vid,))
                v_info = cur.fetchone()
                vendor_name = v_info[0] if v_info else f"Vendor #{vid}"

                # Creator details
                creator_name = "System"
                creator_role = "System"
                if c_by:
                    cur.execute("SELECT name, email, role FROM users WHERE id = %s", (c_by,))
                    u_row = cur.fetchone()
                    if u_row:
                        creator_name = u_row[0]
                        creator_role = u_row[2]

                entity_summary = {
                    "entity_type": "PURCHASE_ORDER",
                    "entity_id": str(po_id),
                    "reference": po_num_str,
                    "vendor_id": vid,
                    "vendor_name": vendor_name,
                    "product_name": prod_name,
                    "quantity": qty,
                    "unit_price": float(unit_p or 0),
                    "total_amount": float(tot_amt or 0),
                    "order_date": str(o_date) if o_date else None,
                    "expected_delivery": str(exp_del) if exp_del else None,
                    "status": po_status,
                    "created_at": str(c_at) if c_at else (str(o_date) if o_date else None),
                    "updated_at": str(u_at) if u_at else None,
                    "creator_name": creator_name,
                    "creator_role": creator_role
                }

                # Trace Step A: Linked Requisition (PR)
                cur.execute("""
                    SELECT id, requested_by, quantity, unit_price, total_amount, request_date, status
                    FROM purchase_requests
                    WHERE purchase_order_id = %s
                    LIMIT 1
                """, (po_id,))
                pr_row = cur.fetchone()

                if pr_row:
                    pr_id, pr_req_by, pr_qty, pr_price, pr_tot, pr_date, pr_stat = pr_row
                    timeline_events.append({
                        "event_type": "Purchase Request Created",
                        "entity_type": "PURCHASE_REQUEST",
                        "entity_id": f"PR-{pr_id}",
                        "user_name": pr_req_by or "Procurement Specialist",
                        "user_email": "procurement@vendoriq.com",
                        "user_role": "Procurement Manager",
                        "action": "CREATE",
                        "previous_value": None,
                        "new_value": "Pending",
                        "timestamp": str(pr_date) if pr_date else str(c_at or o_date),
                        "related_entity": f"Linked to Requisition #{pr_id} for '{prod_name}'",
                        "details": f"Purchase Requisition #{pr_id} submitted for {pr_qty} units of '{prod_name}' (Estimated: ₹{float(pr_tot or 0):,.2f})"
                    })

                    timeline_events.append({
                        "event_type": "Purchase Request Approved",
                        "entity_type": "PURCHASE_REQUEST",
                        "entity_id": f"PR-{pr_id}",
                        "user_name": "Procurement Manager",
                        "user_email": "procurement@vendoriq.com",
                        "user_role": "Procurement Manager",
                        "action": "APPROVE",
                        "previous_value": "Pending",
                        "new_value": "Approved",
                        "timestamp": str(pr_date) if pr_date else str(c_at or o_date),
                        "related_entity": f"Supplier Assigned: {vendor_name} (ID: {vid})",
                        "details": f"Requisition #{pr_id} cleared governance approval and assigned to {vendor_name}."
                    })

                # Trace Step B: Purchase Order Created
                po_created_time = str(c_at) if c_at else (str(o_date) if o_date else "2026-08-01 00:00:00")
                timeline_events.append({
                    "event_type": "Purchase Order Created",
                    "entity_type": "PURCHASE_ORDER",
                    "entity_id": po_num_str,
                    "user_name": creator_name,
                    "user_email": "system@vendoriq.com" if not c_by else f"{creator_name.lower().replace(' ', '')}@vendoriq.com",
                    "user_role": creator_role,
                    "action": "PURCHASE_ORDER_CREATED",
                    "previous_value": None,
                    "new_value": po_status,
                    "timestamp": po_created_time,
                    "related_entity": f"Supplier Partner: {vendor_name}",
                    "details": f"Purchase Order {po_num_str} officially generated for '{prod_name}' (Quantity: {qty}, Total Amount: ₹{float(tot_amt or 0):,.2f})"
                })

                # Trace Step C: Vendor Assigned
                timeline_events.append({
                    "event_type": "Vendor Assigned",
                    "entity_type": "VENDOR",
                    "entity_id": f"V-{vid}",
                    "user_name": creator_name,
                    "user_email": "procurement@vendoriq.com",
                    "user_role": "Procurement Manager",
                    "action": "VENDOR_ASSIGNMENT",
                    "previous_value": "Unassigned",
                    "new_value": vendor_name,
                    "timestamp": po_created_time,
                    "related_entity": f"Reliability Rating: {float(v_info[3] or 0)}% ({v_info[4] if v_info else 'Normal'})",
                    "details": f"Order allocated to {vendor_name}. Contract terms and SLA guidelines attached."
                })

                # Trace Step D: Audit log transitions specifically for this PO
                cur.execute("""
                    SELECT al.id, al.user_name, al.user_email, COALESCE(u.role, 'System') as urole, al.action, al.details, al.created_at
                    FROM audit_logs al
                    LEFT JOIN users u ON al.user_id = u.id
                    WHERE (al.entity_type = 'PURCHASE_ORDER' AND (al.entity_id = %s OR al.entity_id = %s))
                    ORDER BY al.created_at ASC
                """, (str(po_id), po_num_str))
                for al in cur.fetchall():
                    timeline_events.append({
                        "event_type": f"System Audit: {al[4]}",
                        "entity_type": "PURCHASE_ORDER",
                        "entity_id": po_num_str,
                        "user_name": al[1] or "System",
                        "user_email": al[2] or "system@vendoriq.com",
                        "user_role": al[3],
                        "action": al[4],
                        "previous_value": None,
                        "new_value": None,
                        "timestamp": str(al[6]),
                        "related_entity": f"Log #{al[0]}",
                        "details": al[5]
                    })
                    if al[4] in ("PURCHASE_ORDER_APPROVED", "APPROVE"):
                        approval_verification["approval_status"] = "Approved"
                        approval_verification["approved_by"] = al[1] or al[2]
                        approval_verification["approval_date"] = str(al[6])
                        approval_verification["approver_role"] = al[3]
                        approval_verification["final_status"] = "Approved"
                        approval_verification["evidence_available"] = True
                        approval_verification["notice"] = f"Verified by {al[1]} ({al[3]}) in System Audit Log #{al[0]}."

                # Trace Step E: Deliveries / Shipments
                cur.execute("""
                    SELECT id, shipping_mode, shipping_date, expected_delivery_date, actual_delivery_date, delivery_status, late_delivery_risk, is_on_time
                    FROM deliveries
                    WHERE po_id = %s OR (dataco_order_id IS NOT NULL AND dataco_order_id = %s)
                    ORDER BY id ASC
                    LIMIT 3
                """, (po_id, d_order_id if d_order_id else -1))
                del_rows = cur.fetchall()
                for d in del_rows:
                    did, ship_mode, ship_date, exp_deliv, act_deliv, del_stat, late_risk, on_time = d
                    if ship_date:
                        timeline_events.append({
                            "event_type": "Shipment Created / Dispatched",
                            "entity_type": "DELIVERY",
                            "entity_id": f"SHIP-{did}",
                            "user_name": "Logistics Dispatcher",
                            "user_email": "supplychain@vendoriq.com",
                            "user_role": "Supply Chain Manager",
                            "action": "SHIPMENT_STATUS_CHANGE",
                            "previous_value": "Pending Fulfillment",
                            "new_value": "In-Transit",
                            "timestamp": str(ship_date),
                            "related_entity": f"Mode: {ship_mode or 'Standard Shipping'}",
                            "details": f"Consignment dispatched via {ship_mode or 'Freight'}. Expected delivery: {str(exp_deliv) if exp_deliv else 'TBD'}."
                        })
                    if act_deliv or del_stat:
                        timeline_events.append({
                            "event_type": "Delivery Status Updated",
                            "entity_type": "DELIVERY",
                            "entity_id": f"DELIV-{did}",
                            "user_name": "Receiving Inspection",
                            "user_email": "supplychain@vendoriq.com",
                            "user_role": "Supply Chain Manager",
                            "action": "DELIVERY_COMPLETED",
                            "previous_value": "In-Transit",
                            "new_value": del_stat or "Delivered",
                            "timestamp": str(act_deliv) if act_deliv else (str(exp_deliv) if exp_deliv else po_created_time),
                            "related_entity": f"Late Risk Flag: {'High' if late_risk == 1 else 'Zero/Low'}",
                            "details": f"Fulfillment confirmed at dock. Status: {del_stat or 'Received'}. On-time verification: {'Yes' if on_time else 'Delayed'}."
                        })

                # Trace Step F: Material Quality Inspections
                cur.execute("""
                    SELECT id, inspection_date, quantity_inspected, quantity_passed, quantity_failed, quality_score, inspection_status, remarks
                    FROM quality_inspections
                    WHERE purchase_order_id = %s
                    ORDER BY id ASC
                """, (po_id,))
                for q in cur.fetchall():
                    qid, qdate, qins, qpass, qfail, qscore, qstat, qrem = q
                    timeline_events.append({
                        "event_type": "Quality Inspection Conducted",
                        "entity_type": "QUALITY_INSPECTION",
                        "entity_id": f"QI-{qid}",
                        "user_name": "Quality Control Specialist",
                        "user_email": "auditor@vendoriq.com",
                        "user_role": "Auditor / Quality QA",
                        "action": "QUALITY_VERIFIED",
                        "previous_value": "Pending Inspection",
                        "new_value": qstat or "Completed",
                        "timestamp": str(qdate) if qdate else po_created_time,
                        "related_entity": f"Quality Score: {float(qscore or 0)}%",
                        "details": f"Inspected {qins} units: {qpass} passed, {qfail} failed. Result: {qstat}. Remarks: {qrem or 'Complies with specification'}."
                    })

                # Trace Step G: Invoices (Created by Finance Officer)
                cur.execute("""
                    SELECT i.id, i.invoice_number, i.invoice_date, i.due_date, i.invoice_amount, i.status, i.payment_status, i.payment_date, i.created_at,
                           i.created_by, u.name as creator_name, u.email as creator_email, COALESCE(u.role, 'Finance Officer') as creator_role
                    FROM invoices i
                    LEFT JOIN users u ON i.created_by = u.id
                    WHERE i.po_id = %s
                    ORDER BY i.id ASC
                """, (po_id,))
                inv_rows = cur.fetchall()
                for inv in inv_rows:
                    invid, invnum, idate, ddate, iamt, istat, pstat, pdate, icreated, icreated_by, cr_name, cr_email, cr_role = inv
                    # If creator_name is not populated, check audit_logs
                    if not cr_name:
                        cur.execute("""
                            SELECT user_name, user_email, 'Finance Officer'
                            FROM audit_logs
                            WHERE entity_type = 'INVOICE' AND (entity_id = %s OR entity_id = %s) AND action = 'INVOICE_CREATED'
                            ORDER BY id ASC
                            LIMIT 1
                        """, (str(invid), invnum))
                        al_user = cur.fetchone()
                        if al_user:
                            cr_name, cr_email, cr_role = al_user[0], al_user[1], al_user[2]
                        else:
                            cr_name, cr_email, cr_role = "Finance Officer", "finance@vendoriq.com", "Finance Officer"

                    timeline_events.append({
                        "event_type": "Invoice Created by Finance Officer",
                        "entity_type": "INVOICE",
                        "entity_id": invnum or f"INV-{invid}",
                        "user_name": cr_name,
                        "user_email": cr_email,
                        "user_role": cr_role,
                        "action": "INVOICE_CREATED",
                        "previous_value": None,
                        "new_value": istat or "Pending Review",
                        "timestamp": str(icreated) if icreated else (str(idate) if idate else po_created_time),
                        "related_entity": f"Invoice Amount: ₹{float(iamt or 0):,.2f}",
                        "details": f"Invoice {invnum} created and verified by Finance Officer {cr_name} against PO {po_num_str}. Due Date: {str(ddate)}."
                    })

                    # Check invoice audit logs for verification, approval, and rejection
                    cur.execute("""
                        SELECT al.id, al.user_name, al.user_email, COALESCE(u.role, 'Finance Officer') as urole, al.action, al.details, al.created_at
                        FROM audit_logs al
                        LEFT JOIN users u ON al.user_id = u.id
                        WHERE al.entity_type = 'INVOICE' AND (al.entity_id = %s OR al.entity_id = %s)
                        ORDER BY al.created_at ASC
                    """, (str(invid), invnum))
                    for ial in cur.fetchall():
                        ev_name = f"Invoice Event: {ial[4]}"
                        if ial[4] == "PO_INVOICE_VERIFIED":
                            ev_name = "PO ↔ Invoice Verified"
                        elif ial[4] in ("INVOICE_APPROVED", "APPROVE"):
                            ev_name = "Invoice Approved by Finance"
                        elif ial[4] in ("INVOICE_REJECTED", "REJECT"):
                            ev_name = "Invoice Rejected by Finance"
                        elif ial[4] == "PAYMENT_PROCESSED":
                            ev_name = "Disbursement Payment Processed"

                        timeline_events.append({
                            "event_type": ev_name,
                            "entity_type": "INVOICE",
                            "entity_id": invnum,
                            "user_name": ial[1] or "Finance Officer",
                            "user_email": ial[2] or "finance@vendoriq.com",
                            "user_role": ial[3],
                            "action": ial[4],
                            "previous_value": None,
                            "new_value": None,
                            "timestamp": str(ial[6]),
                            "related_entity": f"Log #{ial[0]}",
                            "details": ial[5]
                        })

                # Trace Step H: Payments
                cur.execute("""
                    SELECT p.id, p.payment_reference, p.amount, p.payment_status, p.payment_method, p.payment_date, p.created_at,
                           COALESCE(u.name, 'Finance Officer') as payer, COALESCE(p.payment_type, 'Standard') as p_type
                    FROM payments p
                    LEFT JOIN users u ON p.created_by = u.id
                    WHERE p.po_id = %s OR p.invoice_id IN (SELECT id FROM invoices WHERE po_id = %s)
                    ORDER BY p.id ASC
                """, (po_id, po_id))
                for pay in cur.fetchall():
                    payid, pref, pamt, paystat, pmethod, paydate, pcreated, payer, ptype = pay
                    ev_title = f"{ptype} Payment Processed" if ptype and ptype != "Standard" else "Payment Processed"
                    timeline_events.append({
                        "event_type": ev_title,
                        "entity_type": "PAYMENT",
                        "entity_id": pref or f"PAY-{payid}",
                        "user_name": payer,
                        "user_email": "finance@vendoriq.com",
                        "user_role": "Finance Officer",
                        "action": f"{ptype.upper()}_PAYMENT_PROCESSED" if ptype else "PAYMENT_PROCESSED",
                        "previous_value": "Pending Payment",
                        "new_value": paystat or "Paid",
                        "timestamp": str(pcreated) if pcreated else (str(paydate) if paydate else po_created_time),
                        "related_entity": f"Method: {pmethod or 'Electronic Transfer'} ({ptype})",
                        "details": f"{ptype} disbursement executed: ₹{float(pamt or 0):,.2f} remitted to {vendor_name}. Reference: {pref}."
                    })

                # Set approval verification values if not already confirmed
                if not approval_verification["evidence_available"]:
                    approval_verification["created_by"] = creator_name
                    approval_verification["created_date"] = po_created_time
                    approval_verification["approval_status"] = po_status
                    approval_verification["previous_status"] = "Pending Approval"
                    approval_verification["final_status"] = po_status
                    if po_status in ("Approved", "Completed", "Delivered", "In-Transit", "Ordered"):
                        # If operational record shows approved but no audit log row exists
                        approval_verification["notice"] = "Approval status recorded in ledger, but historical user audit signature evidence is not available in current records."
                    else:
                        approval_verification["notice"] = "Approval evidence not available in current records."

            # ----------------------------------------------------
            # CASE 2: PURCHASE REQUEST TRACE
            # ----------------------------------------------------
            elif norm_type == "purchase_request":
                if not clean_id.isdigit():
                    clean_id = clean_id.replace("PR-", "").replace("pr-", "").strip()
                if not clean_id.isdigit():
                    raise HTTPException(status_code=400, detail="Purchase Request ID must be numeric.")

                cur.execute("""
                    SELECT pr.id, pr.vendor_id, COALESCE(v.vendor_name, 'Unassigned') as vname, 
                           pr.product_name, pr.quantity, pr.unit_price, pr.total_amount, 
                           pr.request_date, pr.requested_by, pr.status, pr.purchase_order_id
                    FROM purchase_requests pr
                    LEFT JOIN vendors v ON pr.vendor_id = v.id
                    WHERE pr.id = %s
                """, (int(clean_id),))
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail=f"Purchase Request #{clean_id} not found.")

                pr_id, vid, vname, prod_name, qty, unit_p, tot_amt, rdate, req_by, pr_stat, linked_po_id = row
                entity_summary = {
                    "entity_type": "PURCHASE_REQUEST",
                    "entity_id": str(pr_id),
                    "reference": f"PR-{pr_id}",
                    "vendor_id": vid,
                    "vendor_name": vname,
                    "product_name": prod_name,
                    "quantity": qty,
                    "unit_price": float(unit_p or 0),
                    "total_amount": float(tot_amt or 0),
                    "request_date": str(rdate) if rdate else "",
                    "requested_by": req_by or "Procurement",
                    "status": pr_stat,
                    "linked_purchase_order_id": linked_po_id
                }

                timeline_events.append({
                    "event_type": "Purchase Request Created",
                    "entity_type": "PURCHASE_REQUEST",
                    "entity_id": f"PR-{pr_id}",
                    "user_name": req_by or "Procurement Specialist",
                    "user_email": "procurement@vendoriq.com",
                    "user_role": "Procurement Manager",
                    "action": "CREATE",
                    "previous_value": None,
                    "new_value": "Pending",
                    "timestamp": str(rdate) if rdate else "2026-08-01",
                    "related_entity": f"Product: '{prod_name}'",
                    "details": f"Requisition #{pr_id} lodged for {qty} units of '{prod_name}'."
                })

                # Check audit logs for PR
                cur.execute("""
                    SELECT al.id, al.user_name, al.user_email, COALESCE(u.role, 'Procurement Manager') as urole, al.action, al.details, al.created_at
                    FROM audit_logs al
                    LEFT JOIN users u ON al.user_id = u.id
                    WHERE al.entity_type = 'PURCHASE_REQUEST' AND al.entity_id = %s
                    ORDER BY al.created_at ASC
                """, (str(pr_id),))
                for al in cur.fetchall():
                    timeline_events.append({
                        "event_type": f"Audit Event: {al[4]}",
                        "entity_type": "PURCHASE_REQUEST",
                        "entity_id": f"PR-{pr_id}",
                        "user_name": al[1] or "Procurement Manager",
                        "user_email": al[2] or "procurement@vendoriq.com",
                        "user_role": al[3],
                        "action": al[4],
                        "previous_value": None,
                        "new_value": None,
                        "timestamp": str(al[6]),
                        "related_entity": f"Log #{al[0]}",
                        "details": al[5]
                    })
                    if al[4] == "PURCHASE_REQUEST_APPROVED":
                        approval_verification["approval_status"] = "Approved"
                        approval_verification["approved_by"] = al[1] or al[2]
                        approval_verification["approval_date"] = str(al[6])
                        approval_verification["approver_role"] = al[3]
                        approval_verification["previous_status"] = "Pending"
                        approval_verification["final_status"] = "Approved"
                        approval_verification["evidence_available"] = True
                        approval_verification["notice"] = f"Verified by {al[1]} in Audit Log #{al[0]}."

                if linked_po_id:
                    timeline_events.append({
                        "event_type": "Purchase Order Generated from Requisition",
                        "entity_type": "PURCHASE_ORDER",
                        "entity_id": f"PO-{linked_po_id}",
                        "user_name": "Procurement Manager",
                        "user_email": "procurement@vendoriq.com",
                        "user_role": "Procurement Manager",
                        "action": "PURCHASE_ORDER_CREATED",
                        "previous_value": "Approved Requisition",
                        "new_value": "Purchase Order Issued",
                        "timestamp": str(rdate) if rdate else "2026-08-05",
                        "related_entity": f"Linked PO #{linked_po_id}",
                        "details": f"Requisition #{pr_id} promoted to Purchase Order #{linked_po_id}."
                    })

                if not approval_verification["evidence_available"]:
                    approval_verification["created_by"] = req_by or "Procurement"
                    approval_verification["created_date"] = str(rdate) if rdate else ""
                    approval_verification["approval_status"] = pr_stat
                    approval_verification["previous_status"] = "Pending"
                    approval_verification["final_status"] = pr_stat
                    approval_verification["notice"] = "Approval evidence not available in current records." if pr_stat != "Approved" else "Requisition marked Approved in records, but historical signature is not available in audit logs."

            # ----------------------------------------------------
            # CASE 3: INVOICE TRACE
            # ----------------------------------------------------
            elif norm_type == "invoice":
                inv_row = None
                if clean_id.isdigit():
                    cur.execute("""
                        SELECT i.id, i.po_id, i.vendor_id, COALESCE(v.vendor_name, 'Unknown') as vname,
                               i.invoice_number, i.invoice_date, i.due_date, i.invoice_amount, 
                               i.status, i.payment_status, i.payment_date, i.created_at,
                               i.created_by, u.name as creator_name, u.email as creator_email, COALESCE(u.role, 'Finance Officer') as creator_role
                        FROM invoices i
                        LEFT JOIN vendors v ON i.vendor_id = v.id
                        LEFT JOIN users u ON i.created_by = u.id
                        WHERE i.id = %s
                    """, (int(clean_id),))
                    inv_row = cur.fetchone()

                if not inv_row:
                    cur.execute("""
                        SELECT i.id, i.po_id, i.vendor_id, COALESCE(v.vendor_name, 'Unknown') as vname,
                               i.invoice_number, i.invoice_date, i.due_date, i.invoice_amount, 
                               i.status, i.payment_status, i.payment_date, i.created_at,
                               i.created_by, u.name as creator_name, u.email as creator_email, COALESCE(u.role, 'Finance Officer') as creator_role
                        FROM invoices i
                        LEFT JOIN vendors v ON i.vendor_id = v.id
                        LEFT JOIN users u ON i.created_by = u.id
                        WHERE LOWER(i.invoice_number) = LOWER(%s)
                    """, (clean_id,))
                    inv_row = cur.fetchone()

                if not inv_row:
                    raise HTTPException(status_code=404, detail=f"Invoice '{clean_id}' not found.")

                (
                    invid, poid, vid, vname, invnum, idate, ddate, iamt, istat, paystat, paydate, icreated,
                    icreated_by, cr_name, cr_email, cr_role
                ) = inv_row

                # If creator_name is not populated via foreign key, check audit_logs
                if not cr_name:
                    cur.execute("""
                        SELECT user_name, user_email, 'Finance Officer'
                        FROM audit_logs
                        WHERE entity_type = 'INVOICE' AND (entity_id = %s OR entity_id = %s) AND action = 'INVOICE_CREATED'
                        ORDER BY id ASC
                        LIMIT 1
                    """, (str(invid), invnum))
                    al_user = cur.fetchone()
                    if al_user:
                        cr_name, cr_email, cr_role = al_user[0], al_user[1], al_user[2]
                    else:
                        cr_name, cr_email, cr_role = "Finance Officer", "finance@vendoriq.com", "Finance Officer"

                entity_summary = {
                    "entity_type": "INVOICE",
                    "entity_id": str(invid),
                    "reference": invnum or f"INV-{invid}",
                    "po_id": poid,
                    "vendor_id": vid,
                    "vendor_name": vname,
                    "invoice_amount": float(iamt or 0),
                    "invoice_date": str(idate) if idate else "",
                    "due_date": str(ddate) if ddate else "",
                    "status": istat,
                    "payment_status": paystat,
                    "payment_date": str(paydate) if paydate else None,
                    "created_by": cr_name
                }

                timeline_events.append({
                    "event_type": "Invoice Created by Finance Officer",
                    "entity_type": "INVOICE",
                    "entity_id": invnum,
                    "user_name": cr_name,
                    "user_email": cr_email,
                    "user_role": cr_role,
                    "action": "INVOICE_CREATED",
                    "previous_value": None,
                    "new_value": istat or "Pending Review",
                    "timestamp": str(icreated) if icreated else (str(idate) if idate else "2026-08-10"),
                    "related_entity": f"Associated PO #{poid}",
                    "details": f"Invoice {invnum} created and verified by Finance Officer {cr_name} for PO #{poid} (Amount: ₹{float(iamt or 0):,.2f})."
                })

                # Audit logs for Invoice
                cur.execute("""
                    SELECT al.id, al.user_name, al.user_email, COALESCE(u.role, 'Finance Officer') as urole, al.action, al.details, al.created_at
                    FROM audit_logs al
                    LEFT JOIN users u ON al.user_id = u.id
                    WHERE al.entity_type = 'INVOICE' AND (al.entity_id = %s OR al.entity_id = %s)
                    ORDER BY al.created_at ASC
                """, (str(invid), invnum))
                for al in cur.fetchall():
                    ev_title = f"Invoice Audit: {al[4]}"
                    if al[4] == "PO_INVOICE_VERIFIED":
                        ev_title = "PO ↔ Invoice Verified"
                    elif al[4] in ("INVOICE_APPROVED", "APPROVE"):
                        ev_title = "Invoice Approved by Finance"
                    elif al[4] in ("INVOICE_REJECTED", "REJECT"):
                        ev_title = "Invoice Rejected by Finance"
                    elif al[4] == "PAYMENT_PROCESSED":
                        ev_title = "Disbursement Payment Processed"

                    timeline_events.append({
                        "event_type": ev_title,
                        "entity_type": "INVOICE",
                        "entity_id": invnum,
                        "user_name": al[1] or "Finance Officer",
                        "user_email": al[2] or "finance@vendoriq.com",
                        "user_role": al[3],
                        "action": al[4],
                        "previous_value": None,
                        "new_value": None,
                        "timestamp": str(al[6]),
                        "related_entity": f"Log #{al[0]}",
                        "details": al[5]
                    })
                    if al[4] in ("INVOICE_APPROVED", "APPROVE"):
                        approval_verification["approval_status"] = "Approved"
                        approval_verification["approved_by"] = al[1] or al[2]
                        approval_verification["approval_date"] = str(al[6])
                        approval_verification["approver_role"] = al[3]
                        approval_verification["previous_status"] = "Pending Review"
                        approval_verification["final_status"] = "Approved"
                        approval_verification["evidence_available"] = True
                        approval_verification["notice"] = f"Approved by {al[1]} ({al[3]}) in System Audit Log #{al[0]}."

                if not approval_verification["evidence_available"]:
                    approval_verification["created_by"] = vname
                    approval_verification["created_date"] = str(icreated or idate or "")
                    approval_verification["approval_status"] = istat
                    approval_verification["previous_status"] = "Pending Review"
                    approval_verification["final_status"] = istat
                    approval_verification["notice"] = "Approval evidence not available in current records."

            # ----------------------------------------------------
            # CASE 4: PAYMENT TRACE
            # ----------------------------------------------------
            elif norm_type == "payment":
                pay_row = None
                if clean_id.isdigit():
                    cur.execute("""
                        SELECT p.id, p.invoice_id, p.po_id, p.vendor_id, COALESCE(v.vendor_name, 'Unknown') as vname,
                               p.amount, p.payment_status, p.payment_method, p.payment_reference, 
                               p.payment_date, p.created_at, COALESCE(u.name, 'Finance Officer') as payer
                        FROM payments p
                        LEFT JOIN vendors v ON p.vendor_id = v.id
                        LEFT JOIN users u ON p.created_by = u.id
                        WHERE p.id = %s
                    """, (int(clean_id),))
                    pay_row = cur.fetchone()

                if not pay_row:
                    cur.execute("""
                        SELECT p.id, p.invoice_id, p.po_id, p.vendor_id, COALESCE(v.vendor_name, 'Unknown') as vname,
                               p.amount, p.payment_status, p.payment_method, p.payment_reference, 
                               p.payment_date, p.created_at, COALESCE(u.name, 'Finance Officer') as payer
                        FROM payments p
                        LEFT JOIN vendors v ON p.vendor_id = v.id
                        LEFT JOIN users u ON p.created_by = u.id
                        WHERE LOWER(p.payment_reference) = LOWER(%s)
                    """, (clean_id,))
                    pay_row = cur.fetchone()

                if not pay_row:
                    raise HTTPException(status_code=404, detail=f"Payment '{clean_id}' not found.")

                pid, invid, poid, vid, vname, pamount, pstatus, pmethod, pref, pdate, pcreated, payer = pay_row
                entity_summary = {
                    "entity_type": "PAYMENT",
                    "entity_id": str(pid),
                    "reference": pref or f"PAY-{pid}",
                    "invoice_id": invid,
                    "po_id": poid,
                    "vendor_id": vid,
                    "vendor_name": vname,
                    "amount": float(pamount or 0),
                    "payment_status": pstatus,
                    "payment_method": pmethod,
                    "payment_date": str(pdate) if pdate else "",
                    "processed_by": payer
                }

                timeline_events.append({
                    "event_type": "Payment Authorization & Execution",
                    "entity_type": "PAYMENT",
                    "entity_id": pref or f"PAY-{pid}",
                    "user_name": payer,
                    "user_email": "finance@vendoriq.com",
                    "user_role": "Finance Officer",
                    "action": "PAYMENT_PROCESSED",
                    "previous_value": "Pending Payment",
                    "new_value": pstatus,
                    "timestamp": str(pcreated) if pcreated else (str(pdate) if pdate else "2026-08-15"),
                    "related_entity": f"Vendor: {vname} (PO #{poid})",
                    "details": f"Disbursement #{pid} executed via {pmethod} for ₹{float(pamount or 0):,.2f}."
                })

            # ----------------------------------------------------
            # CASE 5: CONTRACT TRACE
            # ----------------------------------------------------
            elif norm_type == "contract":
                cnt_row = None
                if clean_id.isdigit():
                    cur.execute("""
                        SELECT c.id, c.vendor_id, COALESCE(v.vendor_name, 'Unknown') as vname,
                               c.contract_name, c.start_date, c.end_date, c.status, 
                               c.contract_value, c.compliance_status, c.created_at, c.updated_at
                        FROM contracts c
                        LEFT JOIN vendors v ON c.vendor_id = v.id
                        WHERE c.id = %s
                    """, (int(clean_id),))
                    cnt_row = cur.fetchone()

                if not cnt_row:
                    cur.execute("""
                        SELECT c.id, c.vendor_id, COALESCE(v.vendor_name, 'Unknown') as vname,
                               c.contract_name, c.start_date, c.end_date, c.status, 
                               c.contract_value, c.compliance_status, c.created_at, c.updated_at
                        FROM contracts c
                        LEFT JOIN vendors v ON c.vendor_id = v.id
                        WHERE LOWER(c.contract_name) LIKE LOWER(%s)
                        LIMIT 1
                    """, (f"%{clean_id}%",))
                    cnt_row = cur.fetchone()

                if not cnt_row:
                    raise HTTPException(status_code=404, detail=f"Contract '{clean_id}' not found.")

                cid, vid, vname, cname, sdate, edate, cstat, cval, comp_stat, ccreated, cupdated = cnt_row
                entity_summary = {
                    "entity_type": "CONTRACT",
                    "entity_id": str(cid),
                    "reference": f"CNT-{cid}",
                    "vendor_id": vid,
                    "vendor_name": vname,
                    "contract_name": cname,
                    "start_date": str(sdate) if sdate else "",
                    "end_date": str(edate) if edate else "",
                    "status": cstat,
                    "contract_value": float(cval or 0),
                    "compliance_status": comp_stat
                }

                timeline_events.append({
                    "event_type": "Contract Established",
                    "entity_type": "CONTRACT",
                    "entity_id": f"CNT-{cid}",
                    "user_name": "Legal / Procurement Counsel",
                    "user_email": "procurement@vendoriq.com",
                    "user_role": "Procurement Manager",
                    "action": "CONTRACT_CREATED",
                    "previous_value": None,
                    "new_value": cstat,
                    "timestamp": str(ccreated) if ccreated else (str(sdate) if sdate else "2026-08-01"),
                    "related_entity": f"Supplier: {vname}",
                    "details": f"Contract '{cname}' drafted for {vname} (Period: {sdate} to {edate})."
                })

                cur.execute("""
                    SELECT al.id, al.user_name, al.user_email, COALESCE(u.role, 'Procurement Manager') as urole, al.action, al.details, al.created_at
                    FROM audit_logs al
                    LEFT JOIN users u ON al.user_id = u.id
                    WHERE al.entity_type = 'CONTRACT' AND al.entity_id = %s
                    ORDER BY al.created_at ASC
                """, (str(cid),))
                for al in cur.fetchall():
                    timeline_events.append({
                        "event_type": f"Contract Audit: {al[4]}",
                        "entity_type": "CONTRACT",
                        "entity_id": f"CNT-{cid}",
                        "user_name": al[1] or "System",
                        "user_email": al[2] or "system@vendoriq.com",
                        "user_role": al[3],
                        "action": al[4],
                        "previous_value": None,
                        "new_value": None,
                        "timestamp": str(al[6]),
                        "related_entity": f"Log #{al[0]}",
                        "details": al[5]
                    })

            # ----------------------------------------------------
            # CASE 6: VENDOR TRACE
            # ----------------------------------------------------
            elif norm_type == "vendor":
                v_row = None
                if clean_id.isdigit():
                    cur.execute("""
                        SELECT id, vendor_name, company, email, phone, category, status, 
                               reliability_score, quality_score, delivery_rate, risk_level, registration_date, created_at
                        FROM vendors
                        WHERE id = %s
                    """, (int(clean_id),))
                    v_row = cur.fetchone()

                if not v_row:
                    cur.execute("""
                        SELECT id, vendor_name, company, email, phone, category, status, 
                               reliability_score, quality_score, delivery_rate, risk_level, registration_date, created_at
                        FROM vendors
                        WHERE LOWER(vendor_name) LIKE LOWER(%s)
                        LIMIT 1
                    """, (f"%{clean_id}%",))
                    v_row = cur.fetchone()

                if not v_row:
                    raise HTTPException(status_code=404, detail=f"Vendor '{clean_id}' not found.")

                vid, vname, comp, vemail, vphone, cat, vstat, rel, qual, deliv, rlevel, reg_date, vcreated = v_row
                entity_summary = {
                    "entity_type": "VENDOR",
                    "entity_id": str(vid),
                    "reference": f"V-{vid}",
                    "vendor_name": vname,
                    "company": comp,
                    "email": vemail,
                    "category": cat,
                    "status": vstat,
                    "reliability_score": float(rel or 0),
                    "quality_score": float(qual or 0),
                    "delivery_rate": float(deliv or 0),
                    "risk_level": rlevel
                }

                timeline_events.append({
                    "event_type": "Vendor Onboarding & Registration",
                    "entity_type": "VENDOR",
                    "entity_id": f"V-{vid}",
                    "user_name": "Supplier Relations",
                    "user_email": vemail or "vendor@vendoriq.com",
                    "user_role": "Procurement / Vendor",
                    "action": "VENDOR_REGISTERED",
                    "previous_value": None,
                    "new_value": vstat or "Active",
                    "timestamp": str(vcreated) if vcreated else (str(reg_date) if reg_date else "2026-07-01"),
                    "related_entity": f"Category: {cat}",
                    "details": f"Supplier '{vname}' registered in supply chain roster. Initial Risk Level: {rlevel}."
                })

                cur.execute("""
                    SELECT al.id, al.user_name, al.user_email, COALESCE(u.role, 'Administrator') as urole, al.action, al.details, al.created_at
                    FROM audit_logs al
                    LEFT JOIN users u ON al.user_id = u.id
                    WHERE al.entity_type = 'VENDOR' AND al.entity_id = %s
                    ORDER BY al.created_at ASC
                """, (str(vid),))
                for al in cur.fetchall():
                    timeline_events.append({
                        "event_type": f"Vendor Audit: {al[4]}",
                        "entity_type": "VENDOR",
                        "entity_id": f"V-{vid}",
                        "user_name": al[1] or "Admin",
                        "user_email": al[2] or "admin@vendoriq.com",
                        "user_role": al[3],
                        "action": al[4],
                        "previous_value": None,
                        "new_value": None,
                        "timestamp": str(al[6]),
                        "related_entity": f"Log #{al[0]}",
                        "details": al[5]
                    })

            # Sort timeline chronologically
            timeline_events.sort(key=lambda ev: ev.get("timestamp") or "0000")

            return {
                "entity_type": norm_type.upper(),
                "entity_id": clean_id,
                "summary": entity_summary,
                "timeline": timeline_events,
                "approval_verification": approval_verification,
                "total_events": len(timeline_events),
                "is_read_only": True
            }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("TRANSACTION TRACE ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# 4. APPROVAL VERIFICATION API
# ==================================================
@audit_router.get("/approval-verification")
def get_approval_verification(
    entity_type: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(check_role(["Administrator", "Admin", "Auditor"]))
):
    try:
        conn.rollback()
        results = []
        with conn.cursor() as cur:
            # 1. Purchase Requests
            if not entity_type or entity_type.lower() in ("all", "purchase_request"):
                cur.execute("""
                    SELECT pr.id, pr.product_name, pr.requested_by, pr.request_date, pr.status, pr.total_amount, pr.vendor_id
                    FROM purchase_requests pr
                    ORDER BY pr.id DESC
                    LIMIT %s
                """, (limit,))
                for pr in cur.fetchall():
                    pr_id, pname, req_by, rdate, stat, tot, vid = pr
                    # Check audit log for approver
                    cur.execute("""
                        SELECT al.id, al.user_name, al.user_email, COALESCE(u.role, 'Procurement Manager') as urole, al.action, al.created_at
                        FROM audit_logs al
                        LEFT JOIN users u ON al.user_id = u.id
                        WHERE al.entity_type = 'PURCHASE_REQUEST' 
                          AND al.entity_id = %s 
                          AND al.action IN ('PURCHASE_REQUEST_APPROVED', 'PURCHASE_REQUEST_REJECTED')
                        ORDER BY al.created_at DESC
                        LIMIT 1
                    """, (str(pr_id),))
                    app_log = cur.fetchone()

                    evidence_available = app_log is not None
                    approved_by = app_log[1] if app_log else None
                    approval_date = str(app_log[5]) if app_log else None
                    approver_role = app_log[3] if app_log else None

                    notice = f"Verified via System Audit Log #{app_log[0]}" if app_log else "Approval evidence not available in current records."

                    results.append({
                        "entity_type": "PURCHASE_REQUEST",
                        "entity_id": str(pr_id),
                        "reference": f"PR-{pr_id}",
                        "title": f"Requisition: {pname} (₹{float(tot or 0):,.2f})",
                        "created_by": req_by or "Procurement",
                        "created_date": str(rdate) if rdate else "N/A",
                        "approval_status": stat,
                        "approved_by": approved_by,
                        "approval_date": approval_date,
                        "approver_role": approver_role,
                        "previous_status": "Pending",
                        "final_status": stat,
                        "evidence_available": evidence_available,
                        "notice": notice
                    })

            # 2. Purchase Orders
            if not entity_type or entity_type.lower() in ("all", "purchase_order"):
                cur.execute("""
                    SELECT po.id, po.po_number, po.product_name, po.status, po.order_date, po.total_amount, 
                           COALESCE(u.name, 'Procurement Specialist') as creator_name
                    FROM purchase_orders po
                    LEFT JOIN users u ON po.created_by = u.id
                    WHERE po.status IN ('Approved', 'Ordered', 'In-Transit', 'Delivered', 'Completed')
                    ORDER BY po.id DESC
                    LIMIT %s
                """, (limit,))
                for po in cur.fetchall():
                    poid, ponum, pname, pstat, odate, tot, cname = po
                    cur.execute("""
                        SELECT al.id, al.user_name, al.user_email, COALESCE(u.role, 'Procurement Manager') as urole, al.created_at
                        FROM audit_logs al
                        LEFT JOIN users u ON al.user_id = u.id
                        WHERE al.entity_type = 'PURCHASE_ORDER' 
                          AND (al.entity_id = %s OR al.entity_id = %s)
                          AND al.action = 'PURCHASE_ORDER_APPROVED'
                        ORDER BY al.created_at DESC
                        LIMIT 1
                    """, (str(poid), ponum))
                    app_log = cur.fetchone()

                    evidence_available = app_log is not None
                    approved_by = app_log[1] if app_log else None
                    approval_date = str(app_log[4]) if app_log else None
                    approver_role = app_log[3] if app_log else None

                    notice = f"Verified via System Audit Log #{app_log[0]}" if app_log else "Approval evidence not available in current records."

                    results.append({
                        "entity_type": "PURCHASE_ORDER",
                        "entity_id": str(poid),
                        "reference": ponum or f"PO-{poid}",
                        "title": f"Purchase Order: {pname} (₹{float(tot or 0):,.2f})",
                        "created_by": cname,
                        "created_date": str(odate) if odate else "N/A",
                        "approval_status": pstat,
                        "approved_by": approved_by,
                        "approval_date": approval_date,
                        "approver_role": approver_role,
                        "previous_status": "Pending Approval",
                        "final_status": pstat,
                        "evidence_available": evidence_available,
                        "notice": notice
                    })

            # 3. Invoices
            if not entity_type or entity_type.lower() in ("all", "invoice"):
                cur.execute("""
                    SELECT i.id, i.invoice_number, i.invoice_amount, i.status, i.invoice_date, COALESCE(v.vendor_name, 'Vendor') as vname,
                           i.created_by, u.name as creator_name, COALESCE(u.role, 'Finance Officer') as creator_role
                    FROM invoices i
                    LEFT JOIN vendors v ON i.vendor_id = v.id
                    LEFT JOIN users u ON i.created_by = u.id
                    WHERE i.status IN ('Approved', 'Paid', 'Rejected')
                    ORDER BY i.id DESC
                    LIMIT %s
                """, (limit,))
                for inv in cur.fetchall():
                    invid, invnum, iamt, istat, idate, vname, icreated_by, cr_name, cr_role = inv
                    if not cr_name:
                        cur.execute("""
                            SELECT user_name, 'Finance Officer'
                            FROM audit_logs
                            WHERE entity_type = 'INVOICE' AND (entity_id = %s OR entity_id = %s) AND action = 'INVOICE_CREATED'
                            ORDER BY id ASC
                            LIMIT 1
                        """, (str(invid), invnum))
                        al_u = cur.fetchone()
                        cr_name = al_u[0] if al_u else "Finance Officer"

                    cur.execute("""
                        SELECT al.id, al.user_name, al.user_email, COALESCE(u.role, 'Finance Officer') as urole, al.action, al.created_at
                        FROM audit_logs al
                        LEFT JOIN users u ON al.user_id = u.id
                        WHERE al.entity_type = 'INVOICE' 
                          AND (al.entity_id = %s OR al.entity_id = %s)
                          AND al.action IN ('INVOICE_APPROVED', 'INVOICE_REJECTED')
                        ORDER BY al.created_at DESC
                        LIMIT 1
                    """, (str(invid), invnum))
                    app_log = cur.fetchone()

                    evidence_available = app_log is not None
                    approved_by = app_log[1] if app_log else None
                    approval_date = str(app_log[5]) if app_log else None
                    approver_role = app_log[3] if app_log else None

                    notice = f"Verified via System Audit Log #{app_log[0]}" if app_log else "Approval evidence not available in current records."

                    results.append({
                        "entity_type": "INVOICE",
                        "entity_id": str(invid),
                        "reference": invnum or f"INV-{invid}",
                        "title": f"Invoice {invnum} ({vname}) - ₹{float(iamt or 0):,.2f}",
                        "created_by": f"{cr_name} ({cr_role})",
                        "created_date": str(idate) if idate else "N/A",
                        "approval_status": istat,
                        "approved_by": approved_by,
                        "approval_date": approval_date,
                        "approver_role": approver_role,
                        "previous_status": "Pending",
                        "final_status": istat,
                        "evidence_available": evidence_available,
                        "notice": notice
                    })

            # 4. User Accounts
            if not entity_type or entity_type.lower() in ("all", "user"):
                cur.execute("""
                    SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.approved_by, COALESCE(a.name, 'Admin') as approver_name
                    FROM users u
                    LEFT JOIN users a ON u.approved_by = a.id
                    WHERE u.status = 'Approved'
                    ORDER BY u.id DESC
                    LIMIT %s
                """, (limit,))
                for usr in cur.fetchall():
                    uid, uname, uemail, urole, ustat, ucreated, app_by, approver_name = usr
                    cur.execute("""
                        SELECT al.id, al.user_name, al.created_at
                        FROM audit_logs al
                        WHERE al.entity_type = 'USER' AND al.entity_id = %s AND al.action = 'USER_APPROVED'
                        ORDER BY al.created_at DESC
                        LIMIT 1
                    """, (str(uid),))
                    app_log = cur.fetchone()

                    evidence_available = app_by is not None or app_log is not None
                    approver = app_log[1] if app_log else (approver_name if app_by else None)
                    adate = str(app_log[2]) if app_log else (str(ucreated) if ucreated else None)
                    notice = f"Approved in Log #{app_log[0]}" if app_log else (f"Approved by User ID #{app_by}" if app_by else "Approval evidence not available in current records.")

                    results.append({
                        "entity_type": "USER_ACCESS",
                        "entity_id": str(uid),
                        "reference": f"USR-{uid}",
                        "title": f"Account: {uname} ({uemail}) - Role: {urole}",
                        "created_by": uname,
                        "created_date": str(ucreated) if ucreated else "N/A",
                        "approval_status": ustat,
                        "approved_by": approver,
                        "approval_date": adate,
                        "approver_role": "Administrator",
                        "previous_status": "Pending",
                        "final_status": ustat,
                        "evidence_available": evidence_available,
                        "notice": notice
                    })

        return results

    except Exception as e:
        conn.rollback()
        print("APPROVAL VERIFICATION ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# 5. AUDIT EVIDENCE & DOCUMENTS APIs
# ==================================================
@audit_router.get("/evidence-documents")
def get_evidence_documents(
    entity_type: Optional[str] = None,
    document_type: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(check_role(["Administrator", "Admin", "Auditor"]))
):
    try:
        conn.rollback()
        where_clauses = ["1=1"]
        params = []

        if entity_type and entity_type.lower() != "all":
            where_clauses.append("UPPER(related_entity_type) = %s")
            params.append(entity_type.upper())

        if document_type and document_type.lower() != "all":
            where_clauses.append("LOWER(document_type) LIKE %s")
            params.append(f"%{document_type.lower()}%")

        if status and status.lower() != "all":
            where_clauses.append("LOWER(current_status) = %s")
            params.append(status.lower())

        where_sql = " AND ".join(where_clauses)

        with conn.cursor() as cur:
            cur.execute(f"""
                SELECT id, document_name, document_type, related_entity_type, related_entity_id,
                       upload_date, expiry_date, current_status, verification_status, notes, created_at
                FROM audit_evidence_documents
                WHERE {where_sql}
                ORDER BY id DESC
            """, params)
            rows = cur.fetchall()

        docs = []
        for r in rows:
            docs.append({
                "id": r[0],
                "document_name": r[1],
                "document_type": r[2],
                "related_entity": f"{r[3]} #{r[4]}",
                "entity_type": r[3],
                "entity_id": r[4],
                "upload_date": str(r[5]) if r[5] else "",
                "expiry_date": str(r[6]) if r[6] else "N/A",
                "current_status": r[7] or "Valid",
                "verification_status": r[8] or "Pending Review",
                "notes": r[9] or "",
                "created_at": str(r[10]) if r[10] else ""
            })
        return docs
    except Exception as e:
        conn.rollback()
        print("GET EVIDENCE DOCUMENTS ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


@audit_router.get("/certifications")
def get_certifications(
    status: Optional[str] = None,
    current_user: dict = Depends(check_role(["Administrator", "Admin", "Auditor"]))
):
    try:
        conn.rollback()
        where_clauses = ["(document_type ILIKE %s OR related_entity_type = 'VENDOR')"]
        params = ["%cert%"]

        if status and status.lower() != "all":
            where_clauses.append("LOWER(current_status) = %s")
            params.append(status.lower())

        where_sql = " AND ".join(where_clauses)

        with conn.cursor() as cur:
            cur.execute(f"""
                SELECT id, document_name, document_type, related_entity_type, related_entity_id,
                       upload_date, expiry_date, current_status, verification_status, notes
                FROM audit_evidence_documents
                WHERE {where_sql}
                ORDER BY id DESC
            """, params)
            rows = cur.fetchall()

        certs = []
        for r in rows:
            certs.append({
                "id": r[0],
                "document_name": r[1],
                "document_type": r[2],
                "related_entity": f"{r[3]} #{r[4]}",
                "upload_date": str(r[5]) if r[5] else "",
                "expiry_date": str(r[6]) if r[6] else "N/A",
                "current_status": r[7] or "Valid",
                "verification_status": r[8] or "Pending Review",
                "notes": r[9] or ""
            })
        return certs
    except Exception as e:
        conn.rollback()
        print("GET CERTIFICATIONS ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


@audit_router.put("/evidence-documents/{id}/verify")
def verify_evidence_document(
    id: int,
    verification_status: str = Form(...),
    notes: Optional[str] = Form(None),
    current_user: dict = Depends(check_role(["Administrator", "Admin", "Auditor"]))
):
    valid_statuses = ["Verified", "Pending Review", "Under Review", "Rejected"]
    if verification_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid verification status. Allowed: {valid_statuses}")

    try:
        conn.rollback()
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE audit_evidence_documents
                SET verification_status = %s,
                    notes = COALESCE(%s, notes),
                    verified_by = %s,
                    verification_date = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, document_name
            """, (verification_status, notes, current_user.get("id"), id))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Document not found.")

            conn.commit()

            log_action(
                user_id=current_user.get("id"),
                user_name=current_user.get("name"),
                user_email=current_user.get("email"),
                action="AUDIT_VERIFICATION_UPDATED",
                entity_type="EVIDENCE_DOCUMENT",
                entity_id=str(id),
                details=f"Updated verification status for '{row[1]}' to '{verification_status}'"
            )

        return {"message": "Document verification status updated successfully.", "id": id, "status": verification_status}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("VERIFY DOCUMENT ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# 6. UNRESOLVED AUDIT FINDINGS APIs
# ==================================================
@audit_router.get("/findings")
def get_audit_findings(
    filter: Optional[str] = "all",
    area: Optional[str] = None,
    current_user: dict = Depends(check_role(["Administrator", "Admin", "Auditor"]))
):
    try:
        conn.rollback()
        # Periodically ensure real findings are in sync
        from migrate_auditor import sync_real_audit_findings
        with conn.cursor() as cur:
            sync_real_audit_findings(cur, conn)

            where_clauses = ["1=1"]
            params = []

            filter_mode = (filter or "all").lower().strip()
            if filter_mode == "open":
                where_clauses.append("LOWER(audit_status) = 'open'")
            elif filter_mode == "unresolved":
                where_clauses.append("LOWER(resolution_status) IN ('unresolved', 'in remediation')")
            elif filter_mode == "high_risk":
                where_clauses.append("LOWER(risk_level) IN ('critical', 'high')")
            elif filter_mode == "resolved":
                where_clauses.append("LOWER(audit_status) IN ('resolved', 'closed') OR LOWER(resolution_status) = 'resolved'")

            if area and area.lower() != "all":
                where_clauses.append("LOWER(audit_area) LIKE %s")
                params.append(f"%{area.lower()}%")

            where_sql = " AND ".join(where_clauses)

            cur.execute(f"""
                SELECT id, finding_code, audit_area, entity_type, entity_id, vendor_id, 
                       vendor_name, risk_level, description, identified_date, 
                       audit_status, resolution_status, resolution_notes, created_at
                FROM audit_findings
                WHERE {where_sql}
                ORDER BY 
                    CASE WHEN LOWER(risk_level) = 'critical' THEN 1
                         WHEN LOWER(risk_level) = 'high' THEN 2
                         WHEN LOWER(risk_level) = 'medium' THEN 3
                         ELSE 4 END ASC,
                    identified_date DESC,
                    id DESC
            """, params)
            rows = cur.fetchall()

        findings = []
        for r in rows:
            findings.append({
                "id": r[1],
                "db_id": r[0],
                "area": r[2],
                "entity_type": r[3],
                "entity_id": r[4],
                "vendor_id": r[5],
                "vendor": r[6],
                "risk_level": r[7],
                "description": r[8],
                "identified_date": str(r[9]) if r[9] else "",
                "status": r[10] or "Open",
                "audit_status": r[10] or "Open",
                "resolution_status": r[11] or "Unresolved",
                "notes": r[12] or ""
            })
        return findings
    except Exception as e:
        conn.rollback()
        print("GET AUDIT FINDINGS ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


@audit_router.get("/findings/summary")
def get_findings_summary(
    current_user: dict = Depends(check_role(["Administrator", "Admin", "Auditor"]))
):
    try:
        conn.rollback()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    COUNT(*),
                    COUNT(CASE WHEN LOWER(audit_status) = 'open' THEN 1 END),
                    COUNT(CASE WHEN LOWER(resolution_status) IN ('unresolved', 'in remediation') THEN 1 END),
                    COUNT(CASE WHEN LOWER(risk_level) IN ('critical', 'high') THEN 1 END),
                    COUNT(CASE WHEN LOWER(audit_status) IN ('resolved', 'closed') OR LOWER(resolution_status) = 'resolved' THEN 1 END)
                FROM audit_findings
            """)
            r = cur.fetchone()
        return {
            "total_findings": int(r[0] or 0),
            "open_findings": int(r[1] or 0),
            "unresolved_findings": int(r[2] or 0),
            "high_risk_findings": int(r[3] or 0),
            "resolved_findings": int(r[4] or 0)
        }
    except Exception as e:
        conn.rollback()
        print("GET FINDINGS SUMMARY ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


@audit_router.put("/findings/{finding_id}/status")
def update_audit_finding_status(
    finding_id: str,
    audit_status: Optional[str] = Form(None),
    resolution_status: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    current_user: dict = Depends(check_role(["Administrator", "Admin", "Auditor"]))
):
    try:
        conn.rollback()
        with conn.cursor() as cur:
            # Check finding exists by finding_code or id
            cur.execute("SELECT id, finding_code, audit_status, resolution_status FROM audit_findings WHERE finding_code = %s OR id::text = %s", (finding_id, finding_id))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail=f"Audit finding '{finding_id}' not found.")

            fid, fcode, old_astat, old_rstat = row
            new_astat = audit_status if audit_status else old_astat
            new_rstat = resolution_status if resolution_status else old_rstat

            resolved_at = datetime.now() if new_astat in ("Resolved", "Closed") or new_rstat == "Resolved" else None

            cur.execute("""
                UPDATE audit_findings
                SET audit_status = %s,
                    resolution_status = %s,
                    resolution_notes = COALESCE(%s, resolution_notes),
                    assigned_auditor_id = %s,
                    resolved_at = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (new_astat, new_rstat, notes, current_user.get("id"), resolved_at, fid))
            conn.commit()

            log_action(
                user_id=current_user.get("id"),
                user_name=current_user.get("name"),
                user_email=current_user.get("email"),
                action="AUDIT_FINDING_STATUS_CHANGED",
                entity_type="AUDIT_FINDING",
                entity_id=fcode,
                details=f"Finding {fcode} status changed: Audit Status '{old_astat}' -> '{new_astat}', Resolution '{old_rstat}' -> '{new_rstat}'"
            )

        return {
            "message": f"Audit finding {fcode} updated successfully.",
            "finding_code": fcode,
            "audit_status": new_astat,
            "resolution_status": new_rstat
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("UPDATE FINDING STATUS ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))
