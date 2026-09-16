"""Regression tests for Vendor user to Vendor company PO isolation."""

from __future__ import annotations

from datetime import date, timedelta
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Contract, Vendor
from tests.conftest import _auth


def _request_payload() -> dict:
    return {
        "title": f"Vendor visibility {uuid4().hex[:8]}",
        "department": "Manufacturing",
        "description": "Purchase request used only by the transactional regression test.",
        "priority": "High",
        "required_date": str(date.today() + timedelta(days=30)),
        "line_items": [{"item_name": "Brake disc", "quantity": 10, "estimated_price": 2400}],
    }


def _approved_request(client: TestClient, pm_user, finance_user) -> int:
    created = client.post("/api/v1/procurement-requests", json=_request_payload(), headers=_auth(pm_user))
    assert created.status_code == 201
    request_id = created.json()["id"]
    assert client.post(f"/api/v1/procurement-requests/{request_id}/submit", headers=_auth(pm_user)).status_code == 200
    approved = client.post(
        f"/api/v1/procurement-requests/{request_id}/approve",
        json={"comment": "Approved for visibility regression test."},
        headers=_auth(finance_user),
    )
    assert approved.status_code == 200
    return request_id


def _po_payload(request_id: int, vendor_id: int) -> dict:
    return {
        "vendor_id": vendor_id,
        "procurement_request_id": request_id,
        "issue_date": str(date.today()),
        "expected_delivery_date": str(date.today() + timedelta(days=14)),
        "items": [{"item_name": "Brake disc", "quantity": 10, "unit_price": 2400}],
    }


def test_vendor_sees_and_accepts_only_its_company_po(
    client: TestClient, db: Session, admin_user, pm_user, finance_user, vendor_user, approved_vendor
):
    """One PO is shared by procurement and the linked vendor account."""
    vendor_user.vendor_id = approved_vendor.id
    db.flush()

    request_id = _approved_request(client, pm_user, finance_user)
    created = client.post("/api/v1/purchase-orders", json=_po_payload(request_id, approved_vendor.id), headers=_auth(pm_user))
    assert created.status_code == 201
    po = created.json()
    assert po["vendor_id"] == approved_vendor.id

    assert client.patch(f"/api/v1/purchase-orders/{po['id']}/send", headers=_auth(pm_user)).status_code == 200
    vendor_list = client.get("/api/v1/purchase-orders", headers=_auth(vendor_user))
    assert vendor_list.status_code == 200
    assert [item["id"] for item in vendor_list.json()] == [po["id"]]

    assert client.get(f"/api/v1/purchase-orders/{po['id']}", headers=_auth(vendor_user)).status_code == 200
    accepted = client.patch(f"/api/v1/purchase-orders/{po['id']}/accept", headers=_auth(vendor_user))
    assert accepted.status_code == 200
    assert accepted.json()["status"] == "Accepted"

    procurement_view = client.get(f"/api/v1/purchase-orders/{po['id']}", headers=_auth(pm_user))
    assert procurement_view.json()["status"] == "Accepted"


def test_vendor_cannot_view_another_company_purchase_order(
    client: TestClient, db: Session, admin_user, pm_user, finance_user, vendor_user, approved_vendor, category
):
    vendor_user.vendor_id = approved_vendor.id
    suffix = uuid4().hex[:8]
    other_vendor = Vendor(
        company_name=f"Other Vendor {suffix}", registration_number=f"OTHER-{suffix}", gst_number=f"GST-{suffix}",
        email=f"other-{suffix}@example.com", phone="9000000000", address="Test address", city="Pune",
        state="Maharashtra", country="India", postal_code="411001", category_id=category.id,
        approval_status="Approved", created_by=admin_user.id,
    )
    db.add(other_vendor)
    db.flush()

    request_id = _approved_request(client, pm_user, finance_user)
    created = client.post("/api/v1/purchase-orders", json=_po_payload(request_id, other_vendor.id), headers=_auth(pm_user))
    assert created.status_code == 201
    assert client.get(f"/api/v1/purchase-orders/{created.json()['id']}", headers=_auth(vendor_user)).status_code == 403


def test_vendor_contract_and_profile_are_scoped_to_its_company(
    client: TestClient, db: Session, admin_user, vendor_user, approved_vendor, category
):
    """Vendor users can read their company profile/contracts and not another supplier's."""
    vendor_user.vendor_id = approved_vendor.id
    suffix = uuid4().hex[:8]
    other_vendor = Vendor(
        company_name=f"Contract Other {suffix}", registration_number=f"CONTRACT-{suffix}", gst_number=f"GST-C-{suffix}",
        email=f"contract-{suffix}@example.com", phone="9000000000", address="Test address", city="Pune",
        state="Maharashtra", country="India", postal_code="411001", category_id=category.id,
        approval_status="Approved", created_by=admin_user.id,
    )
    db.add(other_vendor)
    db.flush()
    own_contract = Contract(contract_number=f"OWN-{suffix}", vendor_id=approved_vendor.id, start_date=date.today(),
                            end_date=date.today() + timedelta(days=365), renewal_notice_days=30,
                            compliance_status="Compliant", terms="Test contract terms", created_by=admin_user.id)
    other_contract = Contract(contract_number=f"OTHER-{suffix}", vendor_id=other_vendor.id, start_date=date.today(),
                              end_date=date.today() + timedelta(days=365), renewal_notice_days=30,
                              compliance_status="Compliant", terms="Other contract terms", created_by=admin_user.id)
    db.add_all([own_contract, other_contract])
    db.flush()

    assert client.get(f"/api/v1/vendors/{approved_vendor.id}", headers=_auth(vendor_user)).status_code == 200
    assert client.get(f"/api/v1/vendors/{other_vendor.id}", headers=_auth(vendor_user)).status_code == 403
    contracts = client.get("/api/v1/contracts", headers=_auth(vendor_user))
    assert contracts.status_code == 200
    assert [item["id"] for item in contracts.json()] == [own_contract.id]
    assert client.get(f"/api/v1/contracts/{own_contract.id}", headers=_auth(vendor_user)).status_code == 200
    assert client.get(f"/api/v1/contracts/{other_contract.id}", headers=_auth(vendor_user)).status_code == 403
