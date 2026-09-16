"""Tests for new enterprise analytics endpoints and security enhancements."""

from __future__ import annotations

import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import _auth


def test_admin_self_registration_forbidden(client: TestClient):
    uid = uuid.uuid4().hex[:8]
    payload = {
        "first_name": "Rogue",
        "last_name": "Admin",
        "email": f"rogue_{uid}@example.com",
        "password": "SecurePassword123!",
        "role_name": "Administrator",
    }
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 403
    assert "Administrator accounts cannot be self-registered" in r.json()["detail"]


def test_audit_log_analytics_endpoint(client: TestClient, admin_user, vendor_user):
    # Admin access
    r_admin = client.get("/api/v1/audit-logs/analytics", headers=_auth(admin_user))
    assert r_admin.status_code == 200
    data = r_admin.json()
    assert "total_events" in data
    assert "unique_users" in data
    assert "timeline" in data
    assert "actions" in data
    assert "entities" in data
    assert isinstance(data["timeline"], list)

    # Vendor access forbidden
    r_vendor = client.get("/api/v1/audit-logs/analytics", headers=_auth(vendor_user))
    assert r_vendor.status_code == 403


def test_financial_summary_endpoint(client: TestClient, finance_user, vendor_user):
    # Finance access
    r_fin = client.get("/api/v1/invoices/analytics/financial-summary", headers=_auth(finance_user))
    assert r_fin.status_code == 200
    data = r_fin.json()
    assert "total_po_spend" in data
    assert "total_invoiced" in data
    assert "total_paid" in data
    assert "pending_invoices_count" in data
    assert "spend_by_category" in data
    assert "spend_by_vendor" in data
    assert "monthly_trend" in data
    assert "ap_aging" in data
    assert "0-30" in data["ap_aging"]

    # Vendor access forbidden
    r_vendor = client.get("/api/v1/invoices/analytics/financial-summary", headers=_auth(vendor_user))
    assert r_vendor.status_code == 403


def test_risk_history_trend_endpoint(client: TestClient, auditor_user, vendor_user):
    # Auditor access
    r_aud = client.get("/api/v1/vendors/risk/history-trend", headers=_auth(auditor_user))
    assert r_aud.status_code == 200
    data = r_aud.json()
    assert "transitions" in data
    assert "daily_trend" in data
    assert "history_by_category" in data
    assert "total_evaluations" in data

    # Vendor access forbidden
    r_vendor = client.get("/api/v1/vendors/risk/history-trend", headers=_auth(vendor_user))
    assert r_vendor.status_code == 403

