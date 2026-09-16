"""Tests for Audit Logging of major operations."""

from __future__ import annotations

import pytest
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.models import AuditLog
from app.services.milestone_two import audit
from tests.conftest import _auth, _make_user

def test_audit_log_endpoint_rbac(client: TestClient, admin_user, vendor_user, db: Session):
    # Admin can access audit logs
    r_admin = client.get("/api/v1/audit-logs", headers=_auth(admin_user))
    assert r_admin.status_code == 200

    # Vendor cannot access audit logs
    r_vendor = client.get("/api/v1/audit-logs", headers=_auth(vendor_user))
    assert r_vendor.status_code == 403

def test_audit_logs_creation(db: Session):
    admin = _make_user(db, "Administrator")
    
    # Audit an action
    audit(db, user_id=admin.id, action="Vendor Created", entity="Vendor", entity_id=1)
    db.commit()

    # Query audit logs from db
    from sqlalchemy import select
    logs = db.scalars(select(AuditLog).where(AuditLog.user_id == admin.id)).all()
    assert len(logs) == 1
    assert logs[0].action == "Vendor Created"
    assert logs[0].entity == "Vendor"
    assert logs[0].entity_id == 1
