"""
test_verification.py
=============================================================================
Automated End-to-End Verification Suite for:
1. Generate and Download Order Slip for all 5 roles
2. Vendor cross-tenant RBAC isolation
3. Error handling (401, 403, 404)
4. PDF structure and real PostgreSQL data validation
5. Vendor dropdown display verification
6. System regression verification (reliability score, analytics, order workflow)
=============================================================================
"""

import sys
import io
import requests
from pypdf import PdfReader

BASE_URL = "http://127.0.0.1:8000"

def log_test(name: str, passed: bool, detail: str = ""):
    status = "PASS [OK]" if passed else "FAIL [X]"
    print(f"[{status}] {name}")
    if detail:
        print(f"       -> {detail}")
    if not passed:
        raise AssertionError(f"Test failed: {name} - {detail}")


def run_tests():
    print("=" * 70)
    print("STARTING VENDORIQ ORDER SLIP & RBAC VERIFICATION SUITE")
    print("=" * 70)

    # -------------------------------------------------------------
    # 1. AUTHENTICATE ALL ROLES
    # -------------------------------------------------------------
    credentials = {
        "admin": ("admin@vendoriq.com", "Admin@123"),
        "procurement": ("procurement@vendoriq.com", "Procurement@123"),
        "finance": ("finance@vendoriq.com", "Finance@123"),
        "supplychain": ("supplychain@vendoriq.com", "SupplyChain@123"),
        "vendor24": ("vendor24@vendoriq.com", "VendorIQ@24!2026"),
        "vendor216": ("vendor216@vendoriq.com", "VendorIQ@216!2026")
    }

    tokens = {}
    for role_key, (email, pwd) in credentials.items():
        res = requests.post(f"{BASE_URL}/login", data={"email": email, "password": pwd})
        log_test(f"Login: {role_key} ({email})", res.status_code == 200, f"HTTP {res.status_code}")
        data = res.json()
        tokens[role_key] = data.get("access_token")
        assert tokens[role_key], f"Missing access_token for {role_key}"

    # -------------------------------------------------------------
    # 2. CREATE A NEW PURCHASE ORDER (Real Workflow Test)
    # -------------------------------------------------------------
    po_data = {
        "vendor_id": 24,
        "product_name": "Precision Industrial Bearing Set",
        "quantity": 100,
        "unit_price": 450.00,
        "total_amount": 45000.00,
        "order_date": "2026-09-10",
        "expected_delivery": "2026-09-24",
        "status": "Pending Approval"
    }

    create_res = requests.post(
        f"{BASE_URL}/purchase-orders",
        data=po_data,
        headers={"Authorization": f"Bearer {tokens['procurement']}"}
    )
    log_test(
        "Procurement Manager creates new Purchase Order",
        create_res.status_code == 200,
        f"HTTP {create_res.status_code}: {create_res.json().get('message')}"
    )
    new_po_id = create_res.json().get("id")
    new_po_num = create_res.json().get("po_number")
    print(f"       -> Created PO #{new_po_id} with PO Number: {new_po_num}")

    # -------------------------------------------------------------
    # 3. TEST ORDER SLIP DOWNLOAD FOR ALL 5 AUTHORIZED ROLES
    # -------------------------------------------------------------
    authorized_roles_to_test = [
        ("Administrator", tokens["admin"]),
        ("Procurement Manager", tokens["procurement"]),
        ("Finance Officer", tokens["finance"]),
        ("Supply Chain Manager", tokens["supplychain"]),
        ("Vendor (Owner of Order, Vendor #24)", tokens["vendor24"])
    ]

    last_pdf_bytes = None
    for role_title, token in authorized_roles_to_test:
        slip_res = requests.get(
            f"{BASE_URL}/purchase-orders/{new_po_id}/slip",
            headers={"Authorization": f"Bearer {token}"}
        )
        is_ok = slip_res.status_code == 200 and slip_res.headers.get("content-type") == "application/pdf"
        log_test(
            f"{role_title} downloads Order Slip for PO #{new_po_id}",
            is_ok,
            f"HTTP {slip_res.status_code}, Length: {len(slip_res.content)} bytes, Content-Disposition: {slip_res.headers.get('content-disposition')}"
        )
        last_pdf_bytes = slip_res.content

    # -------------------------------------------------------------
    # 4. TEST VENDOR ISOLATION (CROSS-TENANT RBAC SECURITY)
    # -------------------------------------------------------------
    # Vendor 216 attempts to access Vendor 24's newly created order slip
    unauthorized_slip_res = requests.get(
        f"{BASE_URL}/purchase-orders/{new_po_id}/slip",
        headers={"Authorization": f"Bearer {tokens['vendor216']}"}
    )
    is_blocked = unauthorized_slip_res.status_code == 403
    err_detail = unauthorized_slip_res.json().get("detail") if unauthorized_slip_res.headers.get("content-type", "").startswith("application/json") else unauthorized_slip_res.text
    log_test(
        "Vendor Cross-Tenant Access Blocked (Vendor 216 accessing Vendor 24's PO)",
        is_blocked,
        f"HTTP {unauthorized_slip_res.status_code}: {err_detail}"
    )

    # -------------------------------------------------------------
    # 5. TEST ERROR HANDLING (401 UNAUTHENTICATED & 404 NOT FOUND)
    # -------------------------------------------------------------
    unauth_res = requests.get(f"{BASE_URL}/purchase-orders/{new_po_id}/slip")
    log_test(
        "Unauthenticated Request Blocked (Missing Token)",
        unauth_res.status_code == 401,
        f"HTTP {unauth_res.status_code}: {unauth_res.json().get('detail')}"
    )

    notfound_res = requests.get(
        f"{BASE_URL}/purchase-orders/99999999/slip",
        headers={"Authorization": f"Bearer {tokens['admin']}"}
    )
    log_test(
        "Non-Existent Purchase Order Handled (PO #99999999)",
        notfound_res.status_code == 404,
        f"HTTP {notfound_res.status_code}: {notfound_res.json().get('detail')}"
    )

    # -------------------------------------------------------------
    # 6. PDF CONTENT & REAL POSTGRESQL DATA INTEGRITY
    # -------------------------------------------------------------
    reader = PdfReader(io.BytesIO(last_pdf_bytes))
    num_pages = len(reader.pages)
    full_text = "".join(page.extract_text() for page in reader.pages)

    log_test("PDF Structure: Non-empty document generated", num_pages >= 1, f"Total Pages: {num_pages}")
    log_test("PDF Content: Contains Platform Title", "VendorIQ Platform" in full_text)
    log_test("PDF Content: Contains Document Title", "OFFICIAL ORDER SLIP" in full_text)
    log_test("PDF Content: Contains Real PO Number", new_po_num in full_text)
    log_test("PDF Content: Contains Real Product Name", "Precision Industrial Bearing Set" in full_text)
    log_test("PDF Content: Contains Quantity & Currency", "100" in full_text and "INR" in full_text)
    log_test("PDF Content: Contains Order Date", "2026-09-10" in full_text)
    log_test("PDF Content: Contains Order Status", ("PENDING" in full_text.upper() and "APPROVAL" in full_text.upper()))
    log_test("PDF Content: Contains Governance / Audit Notice", "Electronic Document Notice" in full_text)

    # -------------------------------------------------------------
    # 7. VENDOR DROPDOWN DISPLAY VERIFICATION
    # -------------------------------------------------------------
    vendors_res = requests.get(f"{BASE_URL}/vendors", headers={"Authorization": f"Bearer {tokens['procurement']}"})
    vendors = vendors_res.json()
    log_test("Vendors API returns records", len(vendors) > 0, f"Found {len(vendors)} vendors")

    with open("frontend/js/purchase.js", "r", encoding="utf-8") as f:
        purchase_js = f.read()

    with open("frontend/js/purchase-request.js", "r", encoding="utf-8") as f:
        pr_js = f.read()

    has_rel_in_purchase_select = "Reliability:" in purchase_js[purchase_js.find("async function loadVendors"):purchase_js.find("async function loadVendors") + 600]
    log_test(
        "Purchase Order vendor dropdown displays ONLY vendor name (No reliability in purchase.js loadVendors)",
        not has_rel_in_purchase_select
    )

    has_rel_in_pr_select = "${rel}" in pr_js[pr_js.find("async function loadVendors"):pr_js.find("async function loadVendors") + 600]
    log_test(
        "Purchase Request vendor dropdown displays ONLY vendor name (No reliability in purchase-request.js loadVendors)",
        not has_rel_in_pr_select
    )

    # -------------------------------------------------------------
    # 8. REGRESSION: PRESERVE RELIABILITY CALCULATIONS & DASHBOARDS
    # -------------------------------------------------------------
    rel_res = requests.get(f"{BASE_URL}/reports/vendor-reliability", headers={"Authorization": f"Bearer {tokens['procurement']}"})
    log_test(
        "Vendor Reliability Calculations & Report API Intact",
        rel_res.status_code == 200 and len(rel_res.json()) > 0,
        f"HTTP {rel_res.status_code}, Returned {len(rel_res.json())} reliability records"
    )

    first_v = rel_res.json()[0]
    log_test(
        "Vendor Reliability Scores Retained in DB",
        "reliability_score" in first_v and float(first_v["reliability_score"]) > 0,
        f"Sample vendor {first_v.get('vendor_name')}: Reliability {first_v.get('reliability_score')}%"
    )

    print("=" * 70)
    print("ALL VERIFICATION CHECKS PASSED PERFECTLY!")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
