import sys
import os
import requests
import json
from datetime import date

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", line_buffering=True)

# Patch requests.Session.request with a default timeout of 10s
_orig_request = requests.Session.request
def _timeout_request(self, method, url, **kwargs):
    if 'timeout' not in kwargs:
        kwargs['timeout'] = 10
    return _orig_request(self, method, url, **kwargs)
requests.Session.request = _timeout_request

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    print("==================================================")
    print("1. AUTHENTICATING ROLES")
    print("==================================================")
    # 1. Finance Officer
    r = requests.post(f"{BASE_URL}/login", data={"email": "finance@vendoriq.com", "password": "Finance@123"})
    assert r.status_code == 200 and "access_token" in r.json(), f"Finance login failed: {r.text}"
    fin_token = r.json()["access_token"]
    fin_headers = {"Authorization": f"Bearer {fin_token}"}
    print("✓ Finance Officer logged in successfully.")

    # 2. Procurement Manager
    r = requests.post(f"{BASE_URL}/login", data={"email": "procurement@vendoriq.com", "password": "Procurement@123"})
    assert r.status_code == 200 and "access_token" in r.json(), f"Procurement login failed: {r.text}"
    proc_token = r.json()["access_token"]
    proc_headers = {"Authorization": f"Bearer {proc_token}"}
    print("✓ Procurement Manager logged in successfully.")

    # 3. Vendor
    r = requests.post(f"{BASE_URL}/login", data={"email": "vendor@vendoriq.com", "password": "Vendor@123"})
    assert r.status_code == 200 and "access_token" in r.json(), f"Vendor login failed: {r.text}"
    vendor_token = r.json()["access_token"]
    vendor_headers = {"Authorization": f"Bearer {vendor_token}"}
    print("✓ Vendor logged in successfully.")

    print("\n==================================================")
    print("2. TESTING FINANCE OFFICER INVOICE READ ACCESS & DATA LINK")
    print("==================================================")
    r = requests.get(f"{BASE_URL}/invoices?page=1&limit=10&paginate=true", headers=fin_headers)
    assert r.status_code == 200, f"GET invoices failed: {r.text}"
    data = r.json()
    invoices = data.get("invoices", [])
    print(f"Retrieved {len(invoices)} invoices. Total ledger count: {data.get('total_count')}")
    assert len(invoices) > 0, "No invoices returned"

    first_inv = invoices[0]
    print(f"Sample Invoice: {first_inv['invoice_number']} for PO: {first_inv['po_number']}")
    print(f"Vendor: {first_inv['vendor_name']} | Product: {first_inv['product_name']}")
    print(f"Quantity: {first_inv.get('quantity')} | Unit Price: ₹{first_inv.get('unit_price')} | Total PO Amount: ₹{first_inv.get('po_total_amount')}")
    print(f"Invoice Amount: ₹{first_inv['invoice_amount']} | Review Status: {first_inv['status']} | Payment Status: {first_inv['payment_status']}")

    assert "quantity" in first_inv, "quantity missing from response"
    assert "unit_price" in first_inv, "unit_price missing from response"
    assert "po_total_amount" in first_inv, "po_total_amount missing from response"
    assert "invoice_amount" in first_inv, "invoice_amount missing from response"
    print("✓ All required PO financial commitment fields verified in invoice payload.")

    print("\n==================================================")
    print("3. TESTING INVOICE WORKFLOW: Pending Review -> Approve -> Mark Paid")
    print("==================================================")
    # Find or prepare a test invoice in Pending Review status
    import sys
    sys.path.append("backend")
    from db import conn

    with conn.cursor() as cur:
        # Find a pending review invoice
        cur.execute("""
            SELECT id, invoice_number, invoice_amount, status, payment_status, po_id
            FROM invoices
            WHERE LOWER(status) = 'pending review' AND LOWER(payment_status) = 'pending'
            ORDER BY id DESC
            LIMIT 1
        """)
        pending_row = cur.fetchone()
        if not pending_row:
            # Create a test PO and invoice if needed
            cur.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM invoices")
            test_id = cur.fetchone()[0]
            cur.execute("""
                INSERT INTO invoices (id, po_id, vendor_id, invoice_number, invoice_date, due_date, invoice_amount, status, payment_status, created_at, updated_at)
                VALUES (%s, 180530, 134, %s, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 108.68, 'Pending Review', 'Pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (test_id, f"INV-TEST-{test_id}"))
            conn.commit()
            test_inv_id = test_id
            test_inv_num = f"INV-TEST-{test_id}"
            test_amount = 108.68
            test_po_id = 180530
        else:
            test_inv_id, test_inv_num, test_amount, _, _, test_po_id = pending_row
            test_amount = float(test_amount)

    print(f"Targeting test invoice #{test_inv_id} ({test_inv_num}) with amount ₹{test_amount}")

    # Step 3a: Attempt to pay UNAPPROVED invoice -> MUST FAIL (HTTP 400)
    print("\nAttempting payment on unapproved invoice (must be blocked)...")
    r = requests.post(f"{BASE_URL}/invoices/{test_inv_id}/pay", headers=fin_headers)
    print(f"Direct pay status: {r.status_code}, body: {r.text}")
    assert r.status_code == 400, f"Expected 400 for paying unapproved invoice, got {r.status_code}"
    print("✓ Unapproved invoice payment strictly blocked with HTTP 400.")

    # Step 3b: Finance Officer approves invoice
    print("\nFinance Officer approving invoice...")
    r = requests.put(f"{BASE_URL}/invoices/{test_inv_id}/approve", headers=fin_headers)
    assert r.status_code == 200, f"Approve failed: {r.text}"
    app_data = r.json()
    print(f"Approval response: {app_data}")
    assert app_data.get("status") == "Approved", "Status did not change to Approved"
    print("✓ Invoice approved successfully by Finance Officer.")

    # Step 3c: Finance Officer marks approved invoice as paid
    print("\nFinance Officer processing payment on approved invoice...")
    r = requests.post(f"{BASE_URL}/invoices/{test_inv_id}/pay", headers=fin_headers)
    assert r.status_code == 200, f"Pay invoice failed: {r.text}"
    pay_data = r.json()
    print(f"Payment response: {pay_data}")
    assert pay_data.get("payment_status") == "Paid", "Payment status did not change to Paid"
    assert "payment_reference" in pay_data, "No payment reference returned"
    pay_ref = pay_data["payment_reference"]
    print(f"✓ Payment processed successfully with Reference: {pay_ref}.")

    # Step 3d: Database verification of payment
    with conn.cursor() as cur:
        cur.execute("SELECT status, payment_status, payment_date FROM invoices WHERE id = %s", (test_inv_id,))
        inv_row = cur.fetchone()
        assert inv_row[0] == "Paid" and inv_row[1] == "Paid", f"Invoice status in DB incorrect: {inv_row}"
        print(f"✓ Database verified: invoices.status = '{inv_row[0]}', payment_status = '{inv_row[1]}', payment_date = '{inv_row[2]}'.")

        cur.execute("SELECT id, amount, payment_status, payment_reference FROM payments WHERE invoice_id = %s", (test_inv_id,))
        pay_rows = cur.fetchall()
        assert len(pay_rows) > 0, "Payment record not found in payments table"
        print(f"✓ Database verified: payments record persisted: ID #{pay_rows[0][0]}, Amount ₹{pay_rows[0][1]}, Ref: {pay_rows[0][3]}.")

    # Step 3e: Duplicate payment on paid invoice -> MUST FAIL (HTTP 400)
    print("\nAttempting duplicate payment on paid invoice (must be blocked)...")
    r = requests.post(f"{BASE_URL}/invoices/{test_inv_id}/pay", headers=fin_headers)
    print(f"Duplicate pay status: {r.status_code}, body: {r.text}")
    assert r.status_code == 400, f"Expected 400 for duplicate pay, got {r.status_code}"
    print("✓ Duplicate payment strictly blocked with HTTP 400.")

    # Step 3f: Re-approving a paid invoice -> MUST FAIL (HTTP 400)
    print("\nAttempting approval on paid invoice (must be blocked)...")
    r = requests.put(f"{BASE_URL}/invoices/{test_inv_id}/approve", headers=fin_headers)
    print(f"Re-approve status: {r.status_code}, body: {r.text}")
    assert r.status_code == 400, f"Expected 400 for approving paid invoice, got {r.status_code}"
    print("✓ Approval of already-paid invoice strictly blocked with HTTP 400.")

    print("\n==================================================")
    print("4. TESTING REJECTION WORKFLOW & PAYMENT BLOCK")
    print("==================================================")
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, invoice_number FROM invoices
            WHERE LOWER(status) = 'pending review' AND LOWER(payment_status) = 'pending' AND id != %s
            LIMIT 1
        """, (test_inv_id,))
        rej_row = cur.fetchone()
        if not rej_row:
            cur.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM invoices")
            rej_id = cur.fetchone()[0]
            cur.execute("""
                INSERT INTO invoices (id, po_id, vendor_id, invoice_number, invoice_date, due_date, invoice_amount, status, payment_status, created_at, updated_at)
                VALUES (%s, 180530, 134, %s, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 50.00, 'Pending Review', 'Pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (rej_id, f"INV-REJ-{rej_id}"))
            conn.commit()
            rej_inv_id = rej_id
            rej_inv_num = f"INV-REJ-{rej_id}"
        else:
            rej_inv_id, rej_inv_num = rej_row

    print(f"Targeting rejection test invoice #{rej_inv_id} ({rej_inv_num})")
    r = requests.put(f"{BASE_URL}/invoices/{rej_inv_id}/reject", headers=fin_headers)
    assert r.status_code == 200, f"Reject failed: {r.text}"
    print("✓ Invoice rejected by Finance Officer.")

    # Attempt to pay rejected invoice -> MUST FAIL (HTTP 400)
    r = requests.post(f"{BASE_URL}/invoices/{rej_inv_id}/pay", headers=fin_headers)
    print(f"Pay rejected status: {r.status_code}, body: {r.text}")
    assert r.status_code == 400, f"Expected 400 for paying rejected invoice, got {r.status_code}"
    print("✓ Payment on rejected invoice strictly blocked with HTTP 400.")

    print("\n==================================================")
    print("5. TESTING RBAC SECURITY: UNAUTHORIZED ROLES BLOCKED")
    print("==================================================")
    # Procurement Manager cannot approve invoices
    r = requests.put(f"{BASE_URL}/invoices/{test_inv_id}/approve", headers=proc_headers)
    print(f"Procurement approve status: {r.status_code}")
    assert r.status_code == 403, f"Expected 403 for Procurement approving invoice, got {r.status_code}"

    # Procurement Manager cannot pay invoices
    r = requests.post(f"{BASE_URL}/invoices/{test_inv_id}/pay", headers=proc_headers)
    print(f"Procurement pay status: {r.status_code}")
    assert r.status_code == 403, f"Expected 403 for Procurement paying invoice, got {r.status_code}"

    # Vendor cannot approve invoices
    r = requests.put(f"{BASE_URL}/invoices/{test_inv_id}/approve", headers=vendor_headers)
    print(f"Vendor approve status: {r.status_code}")
    assert r.status_code == 403, f"Expected 403 for Vendor approving invoice, got {r.status_code}"

    # Vendor cannot pay invoices
    r = requests.post(f"{BASE_URL}/invoices/{test_inv_id}/pay", headers=vendor_headers)
    print(f"Vendor pay status: {r.status_code}")
    assert r.status_code == 403, f"Expected 403 for Vendor paying invoice, got {r.status_code}"
    print("✓ Unauthorized roles (Procurement Manager, Vendor) strictly rejected with HTTP 403.")

    print("\n==================================================")
    print("6. TESTING VENDOR DATA ISOLATION (CROSS-TENANT)")
    print("==================================================")
    r = requests.get(f"{BASE_URL}/invoices?page=1&limit=50&paginate=true", headers=vendor_headers)
    assert r.status_code == 200, f"Vendor invoices failed: {r.text}"
    v_invoices = r.json().get("invoices", [])
    print(f"Vendor retrieved {len(v_invoices)} invoices.")
    for vinv in v_invoices:
        assert vinv["vendor_id"] == 37, f"Data leak! Vendor saw invoice for vendor_id {vinv['vendor_id']}"
    print("✓ Vendor cross-tenant data isolation verified (only vendor_id 37 visible).")

    print("\n==================================================")
    print("7. VERIFYING FINANCE OFFICER CANNOT MODIFY PURCHASE ORDERS")
    print("==================================================")
    r = requests.post(f"{BASE_URL}/purchase-orders", data={"vendor_id": 1, "product_name": "X", "quantity": 1, "unit_price": 10, "total_amount": 10, "order_date": "2026-09-05", "expected_delivery": "2026-09-10", "status": "Pending"}, headers=fin_headers)
    assert r.status_code == 403, f"Finance PO POST should be 403, got {r.status_code}"

    r = requests.put(f"{BASE_URL}/purchase-orders/180530", data={"vendor_id": 1, "product_name": "X", "quantity": 1, "unit_price": 10, "total_amount": 10, "order_date": "2026-09-05", "expected_delivery": "2026-09-10", "status": "Pending"}, headers=fin_headers)
    assert r.status_code == 403, f"Finance PO PUT should be 403, got {r.status_code}"

    r = requests.delete(f"{BASE_URL}/purchase-orders/180530", headers=fin_headers)
    assert r.status_code == 403, f"Finance PO DELETE should be 403, got {r.status_code}"

    r = requests.put(f"{BASE_URL}/purchase-orders/status/180530", data={"status": "Approved"}, headers=fin_headers)
    assert r.status_code == 403, f"Finance PO status change should be 403, got {r.status_code}"
    print("✓ Finance Officer strictly blocked from creating, editing, deleting, or advancing POs (all HTTP 403).")

    print("\n>>> ALL INVOICES & PAYMENTS RBAC AND WORKFLOW TESTS PASSED! <<<")

if __name__ == "__main__":
    run_tests()
