import requests
import random

BASE_URL = "http://127.0.0.1:8000"

def test_api():
    print("Testing Milestone 2 APIs...\n")
    
    # 1. Login to get token (Admin)
    print("1. Logging in as Admin...")
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@vendorintel.com", "password": "1234"})
    if res.status_code != 200:
        print(f"FAILED TO LOGIN: {res.text}")
        return
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("   Success!")

    # 2. Procurement Requests
    print("\n2. Testing Procurement Requests (PR)...")
    req_num = f"PR-TEST-{random.randint(1000, 9999)}"
    pr_payload = {
        "request_number": req_num,
        "department": "IT",
        "total_cost": 5000.00,
        "estimated_cost": 5000.00
    }
    res = requests.post(f"{BASE_URL}/api/procurement_requests", json=pr_payload, headers=headers)
    if res.status_code == 200:
        pr_id = res.json()["id"]
        print(f"   Success! Created PR ID {pr_id}")
        
        # Test PR Item
        item_payload = {
            "item_details": "Dell XPS 15",
            "quantity": 2,
            "estimated_cost": 2500.00
        }
        res2 = requests.post(f"{BASE_URL}/api/procurement_requests/{pr_id}/items", json=item_payload, headers=headers)
        if res2.status_code == 200:
            print("   Success! Added Line Item to PR.")
        else:
            print(f"   Failed to add item: {res2.text}")
            
        # Update PR Status
        res3 = requests.put(f"{BASE_URL}/api/procurement_requests/{pr_id}/status", json={"approval_status": "Approved"}, headers=headers)
        if res3.status_code == 200:
            print("   Success! Approved PR.")
        else:
            print(f"   Failed to approve PR: {res3.text}")
    else:
        print(f"   Failed to create PR: {res.text}")

    # 3. Vendor APIs
    print("\n3. Testing Vendor APIs...")
    res = requests.get(f"{BASE_URL}/api/vendors")
    if res.status_code == 200:
        vendors = res.json()
        if vendors:
            vendor_id = vendors[0]["id"]
            print(f"   Success! Fetched vendors. Modifying Vendor ID {vendor_id}...")
            # Update vendor
            res2 = requests.put(f"{BASE_URL}/api/vendors/{vendor_id}", json={"risk_level": "Low", "approval_status": "Approved"}, headers=headers)
            if res2.status_code == 200:
                print("   Success! Updated Vendor profile.")
            else:
                print(f"   Failed to update vendor: {res2.text}")
        else:
            print("   No vendors found.")
    else:
        print(f"   Failed to fetch vendors: {res.text}")

    # 4. Purchase Order Flow
    print("\n4. Testing PO Fulfillment Flow...")
    # First, let's create a PO to ensure we have one!
    print("   Creating a PO first...")
    po_res = requests.post(f"{BASE_URL}/api/purchase_orders", json={"pr_id": 1, "vendor_id": vendors[0]["id"], "po_number": f"PO-{random.randint(1000, 9999)}"}, headers=headers)
    if po_res.status_code == 200:
        po_id = po_res.json()["id"]
        print(f"   Success! Created PO ID {po_id}.")
        # Update PO status
        res2 = requests.put(f"{BASE_URL}/api/purchase_orders/{po_id}/status", json={"fulfillment_status": "Delivered"}, headers=headers)
        if res2.status_code == 200:
            print("   Success! Updated PO fulfillment status.")
        else:
            print(f"   Failed to update PO: {res2.text}")
            
        # Upload Invoice
        res3 = requests.post(f"{BASE_URL}/api/purchase_orders/{po_id}/upload", json={"invoice_receipt_url": "https://fake.com/invoice.pdf"}, headers=headers)
        if res3.status_code == 200:
            print("   Success! Uploaded PO Invoice Mock.")
        else:
            print(f"   Failed to upload invoice: {res3.text}")
    else:
        print(f"   Failed to create PO: {po_res.text}")

    # 5. Audit Logs
    print("\n5. Testing Audit Logs...")
    res = requests.get(f"{BASE_URL}/api/audit_logs", headers=headers)
    if res.status_code == 200:
        logs = res.json()
        print(f"   Success! Fetched {len(logs)} audit logs.")
        for log in logs[-3:]:
            print(f"     - {log['action']} on {log['entity_type']}")
    else:
        print(f"   Failed to fetch audit logs: {res.text}")

if __name__ == '__main__':
    test_api()
