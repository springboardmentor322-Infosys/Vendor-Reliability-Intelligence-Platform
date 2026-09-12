import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_rbac_and_data():
    print("=== 1. TEST FINANCE OFFICER LOGIN ===")
    r = requests.post(f"{BASE_URL}/login", data={"email": "finance@vendoriq.com", "password": "Finance@123"})
    assert r.status_code == 200 and "access_token" in r.json(), f"Finance login failed: {r.text}"
    fin_token = r.json()["access_token"]
    fin_headers = {"Authorization": f"Bearer {fin_token}"}
    print("Finance Officer logged in successfully.")

    print("\n=== 2. TEST FINANCE OFFICER GET PURCHASE ORDERS ===")
    r = requests.get(f"{BASE_URL}/purchase-orders?page=1&limit=10", headers=fin_headers)
    assert r.status_code == 200, f"GET POs failed: {r.text}"
    data = r.json()
    pos = data.get("purchase_orders", [])
    print(f"Retrieved {len(pos)} purchase orders. Total count: {data.get('total_count')}")
    if pos:
        first_po = pos[0]
        print(f"Sample PO keys: {list(first_po.keys())}")
        print(f"PO Number: {first_po.get('po_number')}, Product: {first_po.get('product_name')}")
        print(f"Invoice Number: {first_po.get('invoice_number')}, Invoice Amount: {first_po.get('invoice_amount')}")
        print(f"Invoice Status: {first_po.get('invoice_status')}, Payment Status: {first_po.get('payment_status')}")
        assert "invoice_amount" in first_po, "invoice_amount missing from response"
        assert "payment_status" in first_po, "payment_status missing from response"

    sample_po_id = pos[0]["id"] if pos else 1

    print("\n=== 3. TEST FINANCE OFFICER POST (CREATE PO) - MUST BE 403 ===")
    create_payload = {
        "vendor_id": 1,
        "product_name": "Unauthorized Test Item",
        "quantity": 5,
        "unit_price": 100.0,
        "total_amount": 500.0,
        "order_date": "2026-09-05",
        "expected_delivery": "2026-09-10",
        "status": "Pending Approval"
    }
    r = requests.post(f"{BASE_URL}/purchase-orders", data=create_payload, headers=fin_headers)
    print(f"POST response status: {r.status_code}, body: {r.text}")
    assert r.status_code == 403, f"Expected 403 Forbidden for POST PO, got {r.status_code}"

    print("\n=== 4. TEST FINANCE OFFICER PUT (UPDATE PO) - MUST BE 403 ===")
    update_payload = {
        "vendor_id": 1,
        "product_name": "Modified Item",
        "quantity": 10,
        "unit_price": 50.0,
        "total_amount": 500.0,
        "order_date": "2026-09-05",
        "expected_delivery": "2026-09-12",
        "status": "Approved"
    }
    r = requests.put(f"{BASE_URL}/purchase-orders/{sample_po_id}", data=update_payload, headers=fin_headers)
    print(f"PUT response status: {r.status_code}, body: {r.text}")
    assert r.status_code == 403, f"Expected 403 Forbidden for PUT PO, got {r.status_code}"

    print("\n=== 5. TEST FINANCE OFFICER DELETE (DELETE PO) - MUST BE 403 ===")
    r = requests.delete(f"{BASE_URL}/purchase-orders/{sample_po_id}", headers=fin_headers)
    print(f"DELETE response status: {r.status_code}, body: {r.text}")
    assert r.status_code == 403, f"Expected 403 Forbidden for DELETE PO, got {r.status_code}"

    print("\n=== 6. TEST FINANCE OFFICER PUT STATUS (WORKFLOW TRANSITION) - MUST BE 403 ===")
    status_payload = {"status": "Approved"}
    r = requests.put(f"{BASE_URL}/purchase-orders/status/{sample_po_id}", data=status_payload, headers=fin_headers)
    print(f"PUT STATUS response status: {r.status_code}, body: {r.text}")
    assert r.status_code == 403, f"Expected 403 Forbidden for PUT PO STATUS, got {r.status_code}"

    print("\n=== 7. TEST PROCUREMENT MANAGER ACCESS ===")
    r = requests.post(f"{BASE_URL}/login", data={"email": "procurement@vendoriq.com", "password": "Procurement@123"})
    assert r.status_code == 200, f"Procurement login failed: {r.text}"
    proc_token = r.json()["access_token"]
    proc_headers = {"Authorization": f"Bearer {proc_token}"}
    r = requests.get(f"{BASE_URL}/purchase-orders?page=1&limit=5", headers=proc_headers)
    assert r.status_code == 200, f"Procurement GET POs failed: {r.status_code}"
    print("Procurement Manager can successfully query purchase orders.")

    print("\n=== 8. TEST VENDOR ROLE SCOPING ===")
    r = requests.post(f"{BASE_URL}/login", data={"email": "vendor@vendoriq.com", "password": "Vendor@123"})
    assert r.status_code == 200, f"Vendor login failed: {r.text}"
    vendor_token = r.json()["access_token"]
    vendor_headers = {"Authorization": f"Bearer {vendor_token}"}
    r = requests.get(f"{BASE_URL}/purchase-orders?page=1&limit=20", headers=vendor_headers)
    assert r.status_code == 200, f"Vendor GET POs failed: {r.status_code}"
    vendor_data = r.json()
    vendor_pos = vendor_data.get("purchase_orders", [])
    print(f"Vendor retrieved {len(vendor_pos)} orders.")
    for vpo in vendor_pos:
        assert vpo["vendor_id"] == 37, f"Data leak! Vendor saw order for vendor_id {vpo['vendor_id']}"
    print("Vendor scoping successfully verified (only own company's POs returned).")

    print("\n>>> ALL BACKEND RBAC AND DATA TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    test_rbac_and_data()
