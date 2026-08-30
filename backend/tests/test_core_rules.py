"""Fast, database-free tests for the rules that protect procurement data."""
import os
import sys
from datetime import datetime

import pytest
from pydantic import ValidationError

os.environ.setdefault("SECRET_KEY", "test-secret-that-is-long-and-not-used-outside-tests")
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.api.routes.purchase_orders import ALLOWED_TRANSITIONS
from app.models.purchase_order import POStatus
from app.schemas.contract import ContractCreate
from app.schemas.performance import PerformanceRecordCreate
from app.schemas.purchase_order import PurchaseOrderCreate
from app.schemas.user import UserPublicRegistration
from app.services.reliability import _score_completion, _score_delivery, _score_quality, _score_responsiveness


def test_public_registration_requires_a_strong_password():
    with pytest.raises(ValidationError):
        UserPublicRegistration(full_name="A User", email="a@example.com", password="short")


def test_purchase_order_requires_positive_quantity_and_non_negative_price():
    with pytest.raises(ValidationError):
        PurchaseOrderCreate(vendor_id="00000000-0000-0000-0000-000000000001", description="Widgets", quantity=0, unit_price="1.00")
    with pytest.raises(ValidationError):
        PurchaseOrderCreate(vendor_id="00000000-0000-0000-0000-000000000001", description="Widgets", quantity=1, unit_price="-1.00")


def test_contract_end_date_must_follow_start_date():
    now = datetime.now()
    with pytest.raises(ValidationError):
        ContractCreate(vendor_id="00000000-0000-0000-0000-000000000001", title="Test", contract_number="C-1", start_date=now, end_date=now)


def test_only_valid_purchase_order_transitions_are_allowed():
    assert POStatus.APPROVED in ALLOWED_TRANSITIONS[POStatus.PENDING]
    assert POStatus.COMPLETED not in ALLOWED_TRANSITIONS[POStatus.PENDING]
    assert not ALLOWED_TRANSITIONS[POStatus.COMPLETED]


def test_missing_performance_metrics_are_neutral_not_poor():
    assert _score_delivery([]) == 50.0
    assert _score_quality([]) == 50.0
    assert _score_completion([]) == 50.0
    assert _score_responsiveness([]) == 50.0
    record = PerformanceRecordCreate(vendor_id="00000000-0000-0000-0000-000000000001")
    assert record.quality_rating is None
