"""Tests for Notifications: CRUD, mark read, and duplicate prevention."""

from __future__ import annotations

import pytest
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.models import Notification
from app.services.notification_service import create_notification
from tests.conftest import _auth, _make_user

def test_notification_creation_and_unread_count(client: TestClient, db: Session):
    admin = _make_user(db, "Administrator")
    
    # Send a notification
    n1 = create_notification(
        db,
        recipient_id=admin.id,
        title="Alert 1",
        message="A new contract expiry is coming.",
        type="contract",
        severity="warning",
        related_entity="Contract",
        related_entity_id=10
    )
    db.commit()

    r = client.get("/api/v1/notifications", headers=_auth(admin))
    assert r.status_code == 200
    data = r.json()
    assert data["unread_count"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["title"] == "Alert 1"

def test_duplicate_prevention(db: Session):
    admin = _make_user(db, "Administrator")

    # Send first notification
    n1 = create_notification(
        db,
        recipient_id=admin.id,
        title="Risk Warning",
        message="Vendor A risk is high",
        type="reliability",
        severity="warning",
        related_entity="Vendor",
        related_entity_id=5
    )
    db.flush()

    # Try sending identical unread notification
    n2 = create_notification(
        db,
        recipient_id=admin.id,
        title="Risk Warning",
        message="Vendor A risk is high",
        type="reliability",
        severity="warning",
        related_entity="Vendor",
        related_entity_id=5
    )
    db.flush()

    # They should be the exact same DB object!
    assert n1.id == n2.id

    # Verify count in database
    count = db.query(Notification).filter_by(recipient_id=admin.id).count()
    assert count == 1

def test_mark_as_read(client: TestClient, db: Session):
    admin = _make_user(db, "Administrator")
    n = create_notification(
        db,
        recipient_id=admin.id,
        title="PO Delayed",
        message="PO-123 is delayed",
        type="po",
        severity="critical",
        related_entity="PurchaseOrder",
        related_entity_id=1
    )
    db.commit()

    # Mark as read via API
    r = client.patch(f"/api/v1/notifications/{n.id}/read", headers=_auth(admin))
    assert r.status_code == 200
    assert r.json()["is_read"] is True

    # Mark all read
    r_all = client.patch("/api/v1/notifications/read-all", headers=_auth(admin))
    assert r_all.status_code == 200
