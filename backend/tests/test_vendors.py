"""Tests for vendor workflow: CRUD, approval state machine, RBAC."""

from __future__ import annotations

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import _auth, _make_user


def _vendor_payload(category_id: int, **overrides) -> dict:
    uid = uuid.uuid4().hex[:6]
    base = {
        "company_name": f"VendorCo {uid}",
        "registration_number": f"REG-{uid}",
        "gst_number": f"GST-{uid}",
        "email": f"vendor_{uid}@test.com",
        "phone": "9000000001",
        "address": "1 Test Lane",
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India",
        "postal_code": "400001",
        "category_id": category_id,
        "contacts": [],
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# Vendor creation
# ---------------------------------------------------------------------------

def test_admin_create_vendor(client: TestClient, admin_user, category, db: Session):
    r = client.post("/api/v1/vendors", json=_vendor_payload(category.id), headers=_auth(admin_user))
    assert r.status_code == 201
    assert r.json()["approval_status"] == "Pending"


def test_vendor_user_cannot_create_vendor(client: TestClient, vendor_user, category, db: Session):
    r = client.post("/api/v1/vendors", json=_vendor_payload(category.id), headers=_auth(vendor_user))
    assert r.status_code == 403


def test_duplicate_registration_number(client: TestClient, admin_user, category, db: Session):
    payload = _vendor_payload(category.id)
    r1 = client.post("/api/v1/vendors", json=payload, headers=_auth(admin_user))
    assert r1.status_code == 201
    r2 = client.post("/api/v1/vendors", json=payload, headers=_auth(admin_user))
    assert r2.status_code == 409


# ---------------------------------------------------------------------------
# Vendor retrieval
# ---------------------------------------------------------------------------

def test_list_vendors(client: TestClient, admin_user, db: Session):
    r = client.get("/api/v1/vendors", headers=_auth(admin_user))
    assert r.status_code == 200
    assert "items" in r.json()


def test_get_vendor_by_id(client: TestClient, admin_user, approved_vendor, db: Session):
    r = client.get(f"/api/v1/vendors/{approved_vendor.id}", headers=_auth(admin_user))
    assert r.status_code == 200
    assert r.json()["id"] == approved_vendor.id


def test_internal_roles_can_open_vendor_profile_and_intelligence(
    client: TestClient, pm_user, scm_user, finance_user, auditor_user, approved_vendor, db: Session
):
    """Internal review workspaces must load the full vendor record and its risk context."""
    for user in (pm_user, scm_user, finance_user, auditor_user):
        assert client.get(f"/api/v1/vendors/{approved_vendor.id}", headers=_auth(user)).status_code == 200
        assert client.get(f"/api/v1/vendors/{approved_vendor.id}/reliability", headers=_auth(user)).status_code == 200
        assert client.get(f"/api/v1/vendors/{approved_vendor.id}/risk", headers=_auth(user)).status_code == 200


def test_get_vendor_not_found(client: TestClient, admin_user, db: Session):
    r = client.get("/api/v1/vendors/999999999", headers=_auth(admin_user))
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Approval state machine
# ---------------------------------------------------------------------------

def test_vendor_review_and_approve(client: TestClient, admin_user, category, db: Session):
    payload = _vendor_payload(category.id)
    vendor_id = client.post("/api/v1/vendors", json=payload, headers=_auth(admin_user)).json()["id"]

    r_review = client.patch(f"/api/v1/vendors/{vendor_id}/review", headers=_auth(admin_user))
    assert r_review.status_code == 200
    assert r_review.json()["approval_status"] == "Under Review"

    r_approve = client.patch(f"/api/v1/vendors/{vendor_id}/approve", headers=_auth(admin_user))
    assert r_approve.status_code == 200
    assert r_approve.json()["approval_status"] == "Approved"


def test_vendor_review_and_reject(client: TestClient, admin_user, category, db: Session):
    payload = _vendor_payload(category.id)
    vendor_id = client.post("/api/v1/vendors", json=payload, headers=_auth(admin_user)).json()["id"]
    client.patch(f"/api/v1/vendors/{vendor_id}/review", headers=_auth(admin_user))

    r = client.patch(f"/api/v1/vendors/{vendor_id}/reject", headers=_auth(admin_user))
    assert r.status_code == 200
    assert r.json()["approval_status"] == "Rejected"


def test_vendor_invalid_transition(client: TestClient, admin_user, approved_vendor, db: Session):
    """Approved → Approved is invalid."""
    r = client.patch(f"/api/v1/vendors/{approved_vendor.id}/approve", headers=_auth(admin_user))
    assert r.status_code == 409


def test_vendor_cannot_approve_own_vendor(client: TestClient, vendor_user, category, db: Session):
    """Vendor role cannot approve."""
    admin = _make_user(db, "Administrator")
    payload = _vendor_payload(category.id)
    vendor_id = client.post("/api/v1/vendors", json=payload, headers=_auth(admin)).json()["id"]
    client.patch(f"/api/v1/vendors/{vendor_id}/review", headers=_auth(admin))
    r = client.patch(f"/api/v1/vendors/{vendor_id}/approve", headers=_auth(vendor_user))
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# Vendor deletion
# ---------------------------------------------------------------------------

def test_admin_delete_vendor(client: TestClient, admin_user, category, db: Session):
    vendor_id = client.post("/api/v1/vendors", json=_vendor_payload(category.id), headers=_auth(admin_user)).json()["id"]
    r = client.delete(f"/api/v1/vendors/{vendor_id}", headers=_auth(admin_user))
    assert r.status_code == 204
