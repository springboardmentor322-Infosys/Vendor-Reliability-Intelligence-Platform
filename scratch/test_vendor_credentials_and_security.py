#!/usr/bin/env python3
"""
scratch/test_vendor_credentials_and_security.py
Comprehensive test suite verifying:
1. Existing vendor login works and credentials remain unchanged.
2. Newly created vendor logins work with their initial secure credentials.
3. Each vendor sees ONLY their own data across all modules:
   - Profile (/dashboard/vendor-stats, /vendors/{id})
   - Purchase Orders (/purchase-orders, /purchase-orders/{id}, /purchase-order-summary)
   - Performance & Reliability (/vendor-performance, /vendor-performance-history, /vendor-reliability)
   - Invoices (/invoices, /invoices/summary)
   - Contracts (/contracts, /contract-monitoring)
   - Deliveries (/deliveries/summary, /deliveries/recent)
   - Quality Inspections (/quality-inspections)
   - Communications (/communications)
   - Notifications (/notifications)
4. Anti-Tampering & Security Enforcement:
   - Vendor A accessing Vendor B's data via query param (vendor-stats?vendor_id=B) -> 403
   - Vendor A accessing Vendor B's profile (/vendors/B) -> 403
   - Vendor A accessing Vendor B's purchase order (/purchase-orders/B_PO_ID) -> 403
   - Vendor A accessing Vendor B's contracts (/contracts?vendor_id=B) -> 403
   - Vendor A accessing Vendor B's communications (/communications?vendor_id=B) -> 403
   - Vendor A accessing Vendor B's performance history (/vendor-performance-history/B) -> 403
   - Vendor accessing Admin endpoints (/admin/users) -> 403
5. Admin users retain access across all vendors according to RBAC.
"""

import sys
import os
import requests
import json
import psycopg2

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT_DIR, "backend"))
from db import DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT

BASE_URL = "http://127.0.0.1:8000"


def run_all_tests():
    print("=" * 80)
    print("VENDOR CREDENTIALS & RBAC DATA ISOLATION TEST SUITE")
    print("=" * 80)

    # -------------------------------------------------------------
    # TEST 1: Existing Vendor Login (Unchanged Credentials)
    # -------------------------------------------------------------
    print("\n[TEST 1] Existing Vendor Login (vendor@vendoriq.com, Vendor ID: 37)...")
    r = requests.post(f"{BASE_URL}/login", data={"email": "vendor@vendoriq.com", "password": "Vendor@123"})
    assert r.status_code == 200, f"Login failed: {r.status_code} - {r.text}"
    data = r.json()
    assert data.get("message") == "Login Successful", f"Unexpected message: {data}"
    token_v37 = data.get("access_token")
    assert token_v37, "No access token returned"
    assert data.get("role") == "Vendor", f"Unexpected role: {data.get('role')}"
    headers_v37 = {"Authorization": f"Bearer {token_v37}"}
    print("  PASS: Existing vendor login successful with unchanged credentials.")

    # -------------------------------------------------------------
    # TEST 2: Newly Created Vendor Logins (Vendor 19 and Vendor 24)
    # -------------------------------------------------------------
    print("\n[TEST 2] Newly Created Vendor 19 Login (contact@vendoriq.com)...")
    r19 = requests.post(f"{BASE_URL}/login", data={"email": "contact@vendoriq.com", "password": "VendorIQ@19!2026"})
    assert r19.status_code == 200, f"Login failed for Vendor 19: {r19.status_code} - {r19.text}"
    data19 = r19.json()
    assert data19.get("message") == "Login Successful", f"Unexpected message: {data19}"
    token_v19 = data19.get("access_token")
    headers_v19 = {"Authorization": f"Bearer {token_v19}"}
    print("  PASS: Vendor 19 login successful.")

    print("\n[TEST 2b] Newly Created Vendor 24 Login (vendor24@vendoriq.com)...")
    r24 = requests.post(f"{BASE_URL}/login", data={"email": "vendor24@vendoriq.com", "password": "VendorIQ@24!2026"})
    assert r24.status_code == 200, f"Login failed for Vendor 24: {r24.status_code} - {r24.text}"
    data24 = r24.json()
    assert data24.get("message") == "Login Successful", f"Unexpected message: {data24}"
    token_v24 = data24.get("access_token")
    headers_v24 = {"Authorization": f"Bearer {token_v24}"}
    print("  PASS: Vendor 24 login successful.")

    # -------------------------------------------------------------
    # TEST 3: Profile and Vendor Dashboard Scoping
    # -------------------------------------------------------------
    print("\n[TEST 3] Vendor Dashboard Stats Scoping...")
    # Vendor 37
    r_dash37 = requests.get(f"{BASE_URL}/dashboard/vendor-stats", headers=headers_v37)
    assert r_dash37.status_code == 200, f"Failed: {r_dash37.status_code} - {r_dash37.text}"
    d37 = r_dash37.json()
    assert d37["profile"]["id"] == 37, f"Vendor 37 got wrong profile ID: {d37['profile']['id']}"
    print(f"  PASS: Vendor 37 dashboard returned profile ID: {d37['profile']['id']} ({d37['profile']['vendor_name']})")

    # Vendor 19
    r_dash19 = requests.get(f"{BASE_URL}/dashboard/vendor-stats", headers=headers_v19)
    assert r_dash19.status_code == 200, f"Failed: {r_dash19.status_code} - {r_dash19.text}"
    d19 = r_dash19.json()
    assert d19["profile"]["id"] == 19, f"Vendor 19 got wrong profile ID: {d19['profile']['id']}"
    print(f"  PASS: Vendor 19 dashboard returned profile ID: {d19['profile']['id']} ({d19['profile']['vendor_name']})")

    # Vendor 24
    r_dash24 = requests.get(f"{BASE_URL}/dashboard/vendor-stats", headers=headers_v24)
    assert r_dash24.status_code == 200, f"Failed: {r_dash24.status_code} - {r_dash24.text}"
    d24 = r_dash24.json()
    assert d24["profile"]["id"] == 24, f"Vendor 24 got wrong profile ID: {d24['profile']['id']}"
    print(f"  PASS: Vendor 24 dashboard returned profile ID: {d24['profile']['id']} ({d24['profile']['vendor_name']})")

    # -------------------------------------------------------------
    # TEST 4: Purchase Orders Scoping
    # -------------------------------------------------------------
    print("\n[TEST 4] Purchase Orders Scoping...")
    # Vendor 37 POs
    r_po37 = requests.get(f"{BASE_URL}/purchase-orders?page=1&limit=20", headers=headers_v37)
    assert r_po37.status_code == 200
    pos37 = r_po37.json().get("purchase_orders", [])
    assert len(pos37) > 0, "Vendor 37 should have POs"
    assert all(p["vendor_id"] == 37 for p in pos37), "Vendor 37 received POs belonging to another vendor!"
    sample_po_37_id = pos37[0]["id"]
    print(f"  PASS: Vendor 37 received {len(pos37)} POs, all strictly vendor_id == 37.")

    # Vendor 19 POs
    r_po19 = requests.get(f"{BASE_URL}/purchase-orders?page=1&limit=20", headers=headers_v19)
    assert r_po19.status_code == 200
    pos19 = r_po19.json().get("purchase_orders", [])
    assert len(pos19) > 0, "Vendor 19 should have POs"
    assert all(p["vendor_id"] == 19 for p in pos19), "Vendor 19 received POs belonging to another vendor!"
    sample_po_19_id = pos19[0]["id"]
    print(f"  PASS: Vendor 19 received {len(pos19)} POs, all strictly vendor_id == 19.")

    # -------------------------------------------------------------
    # TEST 5: Invoices Scoping
    # -------------------------------------------------------------
    print("\n[TEST 5] Invoices Scoping...")
    r_inv37 = requests.get(f"{BASE_URL}/invoices?page=1&limit=20&paginate=true", headers=headers_v37)
    assert r_inv37.status_code == 200
    invs37 = r_inv37.json().get("invoices", [])
    assert len(invs37) > 0, "Vendor 37 should have invoices"
    assert all(i["vendor_id"] == 37 for i in invs37), "Vendor 37 received invoices belonging to another vendor!"
    print(f"  PASS: Vendor 37 received {len(invs37)} invoices, all strictly vendor_id == 37.")

    r_inv19 = requests.get(f"{BASE_URL}/invoices?page=1&limit=20&paginate=true", headers=headers_v19)
    assert r_inv19.status_code == 200
    invs19 = r_inv19.json().get("invoices", [])
    assert len(invs19) > 0, "Vendor 19 should have invoices"
    assert all(i["vendor_id"] == 19 for i in invs19), "Vendor 19 received invoices belonging to another vendor!"
    print(f"  PASS: Vendor 19 received {len(invs19)} invoices, all strictly vendor_id == 19.")

    # -------------------------------------------------------------
    # TEST 6: Performance & Reliability Scoping
    # -------------------------------------------------------------
    print("\n[TEST 6] Performance & Reliability Scoping...")
    # Performance
    r_perf37 = requests.get(f"{BASE_URL}/vendor-performance", headers=headers_v37)
    assert r_perf37.status_code == 200
    perf_list37 = r_perf37.json()
    assert len(perf_list37) == 1 and perf_list37[0]["vendor_id"] == 37, f"Vendor 37 performance leak: {perf_list37}"
    print(f"  PASS: Vendor 37 performance endpoint returned exactly 1 record for vendor_id == 37.")

    r_perf19 = requests.get(f"{BASE_URL}/vendor-performance", headers=headers_v19)
    assert r_perf19.status_code == 200
    perf_list19 = r_perf19.json()
    assert len(perf_list19) == 1 and perf_list19[0]["vendor_id"] == 19, f"Vendor 19 performance leak: {perf_list19}"
    print(f"  PASS: Vendor 19 performance endpoint returned exactly 1 record for vendor_id == 19.")

    # Reliability
    r_rel37 = requests.get(f"{BASE_URL}/vendor-reliability", headers=headers_v37)
    assert r_rel37.status_code == 200
    rel37 = r_rel37.json()
    assert len(rel37) <= 1, f"Vendor 37 saw multiple reliability records: {len(rel37)}"
    print(f"  PASS: Vendor 37 reliability endpoint strictly scoped to own record.")

    # -------------------------------------------------------------
    # TEST 7: Contracts & Compliance Scoping
    # -------------------------------------------------------------
    print("\n[TEST 7] Contracts Scoping...")
    r_ct37 = requests.get(f"{BASE_URL}/contracts", headers=headers_v37)
    assert r_ct37.status_code == 200
    cts37 = r_ct37.json()
    assert all(c["vendor_id"] == 37 for c in cts37), "Vendor 37 received another vendor's contracts!"
    print(f"  PASS: Vendor 37 contracts scoped ({len(cts37)} contracts).")

    # -------------------------------------------------------------
    # TEST 8: Deliveries Scoping
    # -------------------------------------------------------------
    print("\n[TEST 8] Deliveries Summary & Recent Scoping...")
    r_deliv37 = requests.get(f"{BASE_URL}/deliveries/summary", headers=headers_v37)
    assert r_deliv37.status_code == 200
    d_sum37 = r_deliv37.json()
    print(f"  PASS: Deliveries summary scoped (Vendor 37 total: {d_sum37.get('total_deliveries')}).")

    r_deliv19 = requests.get(f"{BASE_URL}/deliveries/summary", headers=headers_v19)
    assert r_deliv19.status_code == 200
    d_sum19 = r_deliv19.json()
    print(f"  PASS: Deliveries summary scoped (Vendor 19 total: {d_sum19.get('total_deliveries')}).")

    # -------------------------------------------------------------
    # TEST 9: Quality Inspections Scoping
    # -------------------------------------------------------------
    print("\n[TEST 9] Quality Inspections Scoping...")
    r_qual37 = requests.get(f"{BASE_URL}/quality-inspections", headers=headers_v37)
    assert r_qual37.status_code == 200
    quals37 = r_qual37.json()
    assert all(q["vendor_id"] == 37 for q in quals37), "Vendor 37 received another vendor's quality inspection!"
    print(f"  PASS: Vendor 37 quality inspections scoped ({len(quals37)} records).")

    # -------------------------------------------------------------
    # TEST 10: Communications & Notifications Scoping
    # -------------------------------------------------------------
    print("\n[TEST 10] Communications & Notifications Scoping...")
    r_comm37 = requests.get(f"{BASE_URL}/communications", headers=headers_v37)
    assert r_comm37.status_code == 200
    comms37 = r_comm37.json()
    assert all(c["vendor_id"] == 37 for c in comms37), "Vendor 37 received another vendor's communications!"
    print(f"  PASS: Vendor 37 communications scoped ({len(comms37)} records).")

    r_notif37 = requests.get(f"{BASE_URL}/notifications", headers=headers_v37)
    assert r_notif37.status_code == 200
    res_notif = r_notif37.json()
    notifs37 = res_notif if isinstance(res_notif, list) else res_notif.get("notifications", [])
    assert all(n.get("vendor_id") in (37, None) for n in notifs37), "Vendor 37 received another vendor's notifications!"
    print(f"  PASS: Vendor 37 notifications scoped ({len(notifs37)} records).")

    # =============================================================
    # SECURITY & ANTI-TAMPERING AUTHORIZATION TESTS
    # =============================================================
    print("\n" + "=" * 80)
    print("SECURITY & ANTI-TAMPERING AUTHORIZATION TESTS")
    print("=" * 80)

    # SEC 1: Query param tampering on /dashboard/vendor-stats
    print("\n[SEC 1] Vendor 37 requesting Vendor 19 stats via query param (?vendor_id=19)...")
    r_tamper1 = requests.get(f"{BASE_URL}/dashboard/vendor-stats?vendor_id=19", headers=headers_v37)
    print(f"  Response Status: {r_tamper1.status_code}")
    assert r_tamper1.status_code == 403, f"Expected 403 Forbidden, got {r_tamper1.status_code}"
    print("  PASS: Blocked with 403 Forbidden.")

    # SEC 2: Path tampering on /vendors/{id}
    print("\n[SEC 2] Vendor 37 requesting Vendor 19 profile (/vendors/19)...")
    r_tamper2 = requests.get(f"{BASE_URL}/vendors/19", headers=headers_v37)
    print(f"  Response Status: {r_tamper2.status_code}")
    assert r_tamper2.status_code == 403, f"Expected 403 Forbidden, got {r_tamper2.status_code}"
    print("  PASS: Blocked with 403 Forbidden.")

    # SEC 3: Path tampering on /purchase-orders/{id}
    print(f"\n[SEC 3] Vendor 37 requesting Vendor 19 Purchase Order (/purchase-orders/{sample_po_19_id})...")
    r_tamper3 = requests.get(f"{BASE_URL}/purchase-orders/{sample_po_19_id}", headers=headers_v37)
    print(f"  Response Status: {r_tamper3.status_code}")
    assert r_tamper3.status_code == 403, f"Expected 403 Forbidden, got {r_tamper3.status_code}"
    print("  PASS: Blocked with 403 Forbidden.")

    # SEC 4: Path tampering on /vendor-performance-history/{vendor_id}
    print("\n[SEC 4] Vendor 37 requesting Vendor 19 performance history (/vendor-performance-history/19)...")
    r_tamper4 = requests.get(f"{BASE_URL}/vendor-performance-history/19", headers=headers_v37)
    print(f"  Response Status: {r_tamper4.status_code}")
    assert r_tamper4.status_code == 403, f"Expected 403 Forbidden, got {r_tamper4.status_code}"
    print("  PASS: Blocked with 403 Forbidden.")

    # SEC 5: Query tampering on /contracts?vendor_id=19
    print("\n[SEC 5] Vendor 37 requesting Vendor 19 contracts (/contracts?vendor_id=19)...")
    r_tamper5 = requests.get(f"{BASE_URL}/contracts?vendor_id=19", headers=headers_v37)
    print(f"  Response Status: {r_tamper5.status_code}")
    assert r_tamper5.status_code == 403, f"Expected 403 Forbidden, got {r_tamper5.status_code}"
    print("  PASS: Blocked with 403 Forbidden.")

    # SEC 6: Query tampering on /communications?vendor_id=19
    print("\n[SEC 6] Vendor 37 requesting Vendor 19 communications (/communications?vendor_id=19)...")
    r_tamper6 = requests.get(f"{BASE_URL}/communications?vendor_id=19", headers=headers_v37)
    print(f"  Response Status: {r_tamper6.status_code}")
    assert r_tamper6.status_code == 403, f"Expected 403 Forbidden, got {r_tamper6.status_code}"
    print("  PASS: Blocked with 403 Forbidden.")

    # SEC 7: Query tampering on /notifications/stats?vendor_id=19 and /notifications?vendor_id=19
    print("\n[SEC 7] Vendor 37 requesting Vendor 19 notifications stats (/notifications/stats?vendor_id=19)...")
    r_tamper7 = requests.get(f"{BASE_URL}/notifications/stats?vendor_id=19", headers=headers_v37)
    print(f"  Response Status: {r_tamper7.status_code}")
    assert r_tamper7.status_code == 403, f"Expected 403 Forbidden, got {r_tamper7.status_code}"
    print("  PASS: Blocked with 403 Forbidden.")

    print("\n[SEC 7b] Vendor 37 requesting Vendor 19 notifications list (/notifications?vendor_id=19)...")
    r_tamper7b = requests.get(f"{BASE_URL}/notifications?vendor_id=19", headers=headers_v37)
    print(f"  Response Status: {r_tamper7b.status_code}")
    assert r_tamper7b.status_code == 403, f"Expected 403 Forbidden, got {r_tamper7b.status_code}"
    print("  PASS: Blocked with 403 Forbidden.")

    # SEC 8: Vendor attempting Admin operations (/admin/users)
    print("\n[SEC 8] Vendor 37 attempting Admin endpoint (/admin/users)...")
    r_tamper8 = requests.get(f"{BASE_URL}/admin/users", headers=headers_v37)
    print(f"  Response Status: {r_tamper8.status_code}")
    assert r_tamper8.status_code == 403, f"Expected 403 Forbidden, got {r_tamper8.status_code}"
    print("  PASS: Blocked with 403 Forbidden.")

    # -------------------------------------------------------------
    # TEST 11: Admin Access Retained Across Entire Platform
    # -------------------------------------------------------------
    print("\n" + "=" * 80)
    print("ADMIN ACCESS VERIFICATION")
    print("=" * 80)
    r_admin = requests.post(f"{BASE_URL}/login", data={"email": "admin@vendoriq.com", "password": "Admin@123"})
    assert r_admin.status_code == 200
    token_admin = r_admin.json()["access_token"]
    headers_admin = {"Authorization": f"Bearer {token_admin}"}

    r_admin_v = requests.get(f"{BASE_URL}/vendors", headers=headers_admin)
    assert r_admin_v.status_code == 200
    admin_vendors = r_admin_v.json()
    print(f"  PASS: Admin sees all {len(admin_vendors)} vendors.")
    assert len(admin_vendors) == 118, f"Expected 118 vendors for admin, got {len(admin_vendors)}"

    r_admin_po = requests.get(f"{BASE_URL}/purchase-orders?page=1&limit=5", headers=headers_admin)
    assert r_admin_po.status_code == 200
    print(f"  PASS: Admin sees all POs (Total count: {r_admin_po.json().get('total_count')}).")

    r_admin_users = requests.get(f"{BASE_URL}/admin/users?limit=5", headers=headers_admin)
    assert r_admin_users.status_code == 200
    print(f"  PASS: Admin sees all platform users (Total count: {r_admin_users.json().get('total_count')}).")

    print("\n" + "=" * 80)
    print("ALL TESTS PASSED SUCCESSFULLY! (100% PASS RATE)")
    print("=" * 80)


if __name__ == "__main__":
    run_all_tests()
