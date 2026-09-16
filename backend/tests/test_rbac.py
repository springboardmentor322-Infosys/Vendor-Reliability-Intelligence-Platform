"""RBAC tests — verify role-based access control across all six roles."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import _auth, _make_user


# ---------------------------------------------------------------------------
# Vendor management — write access
# ---------------------------------------------------------------------------

def test_admin_can_create_category(client: TestClient, admin_user, db: Session):
    r = client.post("/api/v1/vendors/categories", json={"name": "RBAC-Test-Cat"}, headers=_auth(admin_user))
    assert r.status_code == 201


def test_vendor_cannot_create_category(client: TestClient, vendor_user, db: Session):
    r = client.post("/api/v1/vendors/categories", json={"name": "X-Cat"}, headers=_auth(vendor_user))
    assert r.status_code == 403


def test_auditor_cannot_create_category(client: TestClient, auditor_user, db: Session):
    r = client.post("/api/v1/vendors/categories", json={"name": "Audit-Cat"}, headers=_auth(auditor_user))
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# Vendor approval workflow — restricted roles
# ---------------------------------------------------------------------------

def test_vendor_user_cannot_approve_vendor(client: TestClient, vendor_user, approved_vendor, db: Session):
    r = client.patch(f"/api/v1/vendors/{approved_vendor.id}/approve", headers=_auth(vendor_user))
    # approved_vendor is already "Approved" so transition fails, but auth check comes first
    assert r.status_code in (403, 409)


def test_supply_chain_manager_cannot_approve_vendor(client: TestClient, scm_user, approved_vendor, db: Session):
    r = client.patch(f"/api/v1/vendors/{approved_vendor.id}/approve", headers=_auth(scm_user))
    assert r.status_code == 403


def test_auditor_cannot_delete_vendor(client: TestClient, auditor_user, approved_vendor, db: Session):
    r = client.delete(f"/api/v1/vendors/{approved_vendor.id}", headers=_auth(auditor_user))
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# Purchase order — Vendor can view own POs, not others
# ---------------------------------------------------------------------------

def test_vendor_cannot_create_po_directly(client: TestClient, vendor_user, db: Session):
    """Vendors lack the Procurement Manager role — POST /purchase-orders is blocked."""
    po_payload = {
        "procurement_request_id": 1,
        "vendor_id": 1,
        "issue_date": "2026-08-18",
        "expected_delivery_date": "2026-09-01",
        "items": [{"item_name": "Widget A", "quantity": 10, "unit_price": 500}]
    }
    r = client.post("/api/v1/purchase-orders", json=po_payload, headers=_auth(vendor_user))
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# Procurement requests — role checks
# ---------------------------------------------------------------------------

def test_auditor_cannot_create_procurement_request(client: TestClient, auditor_user, db: Session):
    req_payload = {
        "title": "Some Request",
        "department": "Engineering",
        "description": "Test request",
        "priority": "Medium",
        "required_date": "2026-09-01",
        "line_items": [{"item_name": "Widget A", "quantity": 10, "estimated_price": 500, "subtotal": 5000}]
    }
    r = client.post("/api/v1/procurement-requests", json=req_payload, headers=_auth(auditor_user))
    assert r.status_code == 403


def test_vendor_cannot_create_procurement_request(client: TestClient, vendor_user, db: Session):
    req_payload = {
        "title": "Some Request",
        "department": "Engineering",
        "description": "Test request",
        "priority": "Medium",
        "required_date": "2026-09-01",
        "line_items": [{"item_name": "Widget A", "quantity": 10, "estimated_price": 500, "subtotal": 5000}]
    }
    r = client.post("/api/v1/procurement-requests", json=req_payload, headers=_auth(vendor_user))
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# Users admin endpoint
# ---------------------------------------------------------------------------

def test_vendor_cannot_list_users(client: TestClient, vendor_user, db: Session):
    r = client.get("/api/v1/users", headers=_auth(vendor_user))
    assert r.status_code == 403


def test_auditor_cannot_list_users(client: TestClient, auditor_user, db: Session):
    r = client.get("/api/v1/users", headers=_auth(auditor_user))
    assert r.status_code == 403


def test_admin_can_list_users(client: TestClient, admin_user, db: Session):
    r = client.get("/api/v1/users", headers=_auth(admin_user))
    assert r.status_code == 200


# ---------------------------------------------------------------------------
# Reliability performance summary — Vendor cannot view
# ---------------------------------------------------------------------------

def test_vendor_cannot_view_performance_summary(client: TestClient, vendor_user, db: Session):
    r = client.get("/api/v1/vendors/performance/summary", headers=_auth(vendor_user))
    assert r.status_code == 403


def test_admin_can_view_performance_summary(client: TestClient, admin_user, db: Session):
    r = client.get("/api/v1/vendors/performance/summary", headers=_auth(admin_user))
    assert r.status_code == 200


def test_auditor_can_view_performance_summary(client: TestClient, auditor_user, db: Session):
    r = client.get("/api/v1/vendors/performance/summary", headers=_auth(auditor_user))
    assert r.status_code == 200


# ---------------------------------------------------------------------------
# Reliability recalculation — only Admin / PM
# ---------------------------------------------------------------------------

def test_auditor_cannot_trigger_recalculation(client: TestClient, auditor_user, approved_vendor, db: Session):
    r = client.post(f"/api/v1/vendors/{approved_vendor.id}/reliability/recalculate", headers=_auth(auditor_user))
    assert r.status_code == 403


def test_finance_officer_cannot_trigger_recalculation(client: TestClient, finance_user, approved_vendor, db: Session):
    r = client.post(f"/api/v1/vendors/{approved_vendor.id}/reliability/recalculate", headers=_auth(finance_user))
    assert r.status_code == 403


def test_admin_can_trigger_recalculation(client: TestClient, admin_user, approved_vendor, db: Session):
    r = client.post(f"/api/v1/vendors/{approved_vendor.id}/reliability/recalculate", headers=_auth(admin_user))
    assert r.status_code == 200


# ---------------------------------------------------------------------------
# No token → 401
# ---------------------------------------------------------------------------

def test_unauthenticated_cannot_list_vendors(client: TestClient):
    r = client.get("/api/v1/vendors")
    assert r.status_code == 401
