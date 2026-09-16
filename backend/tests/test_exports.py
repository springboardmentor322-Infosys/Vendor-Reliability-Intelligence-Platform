"""Tests for Data Exports (CSV) endpoints."""

from __future__ import annotations

import pytest
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from tests.conftest import _auth, _make_user

def test_exports_rbac_checks(client: TestClient, admin_user, vendor_user, auditor_user, db: Session):
    # Vendor is blocked
    r1 = client.get("/api/v1/exports/vendors", headers=_auth(vendor_user))
    assert r1.status_code == 403

    # Admin is allowed
    r2 = client.get("/api/v1/exports/vendors", headers=_auth(admin_user))
    assert r2.status_code == 200
    assert r2.headers["content-type"] == "text/csv; charset=utf-8"

    # Auditor is allowed
    r3 = client.get("/api/v1/exports/vendors", headers=_auth(auditor_user))
    assert r3.status_code == 200
