"""Tests for Vendor Reliability Scoring Engine and operational recalculation hooks."""

from __future__ import annotations

import uuid
from datetime import date, timedelta
from decimal import Decimal
import pytest
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.models import (
    Contract,
    PurchaseOrder,
    Vendor,
    VendorCategory,
    VendorReliabilityHistory,
    Notification
)
from app.services.reliability_service import (
    calculate_vendor_score,
    trigger_score_recalculation,
    NOT_YET_RATED
)
from tests.conftest import _auth, _make_user

# Helper to create category
def _make_category(db: Session) -> VendorCategory:
    c = VendorCategory(name=f"Cat_{uuid.uuid4().hex[:6]}")
    db.add(c)
    db.flush()
    return c

# Helper to create vendor
def _make_vendor(db: Session, cat: VendorCategory, user_id: int) -> Vendor:
    uid = uuid.uuid4().hex[:6]
    v = Vendor(
        company_name=f"Vendor {uid}",
        registration_number=f"REG-{uid}",
        gst_number=f"GST-{uid}",
        email=f"v_{uid}@test.com",
        phone="9999999999",
        address="Test",
        city="Test",
        state="Test",
        country="India",
        postal_code="110001",
        category_id=cat.id,
        approval_status="Approved",
        created_by=user_id
    )
    db.add(v)
    db.flush()
    return v

# ---------------------------------------------------------------------------
# Brand-New Vendor: Insufficient data
# ---------------------------------------------------------------------------
def test_brand_new_vendor_score_is_none(db: Session):
    cat = _make_category(db)
    user = _make_user(db, "Administrator")
    vendor = _make_vendor(db, cat, user.id)

    res = calculate_vendor_score(db, vendor.id)
    assert res["score"] is None
    assert res["risk_category"] == NOT_YET_RATED
    assert not res["metrics_used"]

# ---------------------------------------------------------------------------
# Weight Redistribution & Thresholds
# ---------------------------------------------------------------------------
def test_perfect_vendor_all_metrics(db: Session):
    cat = _make_category(db)
    user = _make_user(db, "Administrator")
    vendor = _make_vendor(db, cat, user.id)

    from app.models import ProcurementRequest
    req = ProcurementRequest(
        title="Test Req",
        department="Engineering",
        description="Desc",
        estimated_cost=Decimal("1000.00"),
        required_date=date.today() + timedelta(days=30),
        status="Approved",
        line_items=[],
        created_by=user.id
    )
    db.add(req)
    db.flush()

    # 1. On-Time Delivery / PO Performance (Delivered PO, expected date in future)
    po = PurchaseOrder(
        po_number=f"PO-{uuid.uuid4().hex[:6]}",
        vendor_id=vendor.id,
        procurement_request_id=req.id,
        issue_date=date.today(),
        expected_delivery_date=date.today() + timedelta(days=5),
        status="Completed",
        total_amount=Decimal("1000.00"),
        created_by=user.id
    )
    db.add(po)

    # 2. Contract Compliance
    c = Contract(
        contract_number=f"CON-{uuid.uuid4().hex[:6]}",
        vendor_id=vendor.id,
        start_date=date.today(),
        end_date=date.today() + timedelta(days=100),
        compliance_status="Compliant",
        terms="Terms",
        created_by=user.id
    )
    db.add(c)

    db.flush()

    res = calculate_vendor_score(db, vendor.id)
    assert res["score"] == Decimal("100.00")
    assert res["risk_category"] == "Low Risk"

def test_poor_vendor_recalculation_and_history(db: Session):
    cat = _make_category(db)
    user = _make_user(db, "Administrator")
    vendor = _make_vendor(db, cat, user.id)

    # Contract Non-Compliant
    c = Contract(
        contract_number=f"CON-{uuid.uuid4().hex[:6]}",
        vendor_id=vendor.id,
        start_date=date.today(),
        end_date=date.today() + timedelta(days=100),
        compliance_status="Non-Compliant",
        terms="Terms",
        created_by=user.id
    )
    db.add(c)
    db.flush()

    # Recalculate
    res = trigger_score_recalculation(db, vendor.id, triggered_by_user_id=user.id)
    assert res["score"] == Decimal("0.00")
    assert res["risk_category"] == "Critical Risk"

    # Verify history logged
    from sqlalchemy import select
    hist = db.scalars(
        select(VendorReliabilityHistory).where(VendorReliabilityHistory.vendor_id == vendor.id)
    ).all()
    assert len(hist) == 1
    assert hist[0].score == Decimal("0.00")
    assert hist[0].risk_category == "Critical Risk"
