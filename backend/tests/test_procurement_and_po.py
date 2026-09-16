"""Tests for the Procurement Manager → Finance Officer request workflow and PO lifecycle."""

from __future__ import annotations

import uuid
from datetime import date, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import _auth


def _req_payload(**overrides):
    payload = {
        "title": f"Req {uuid.uuid4().hex[:6]}",
        "department": "Engineering",
        "description": "Test procurement request",
        "priority": "Medium",
        "required_date": str(date.today() + timedelta(days=30)),
        "line_items": [{"item_name": "Widget A", "quantity": 10, "estimated_price": 500, "subtotal": 5000}],
    }
    payload.update(overrides)
    return payload


def _po_payload(request_id: int, vendor_id: int, **overrides):
    payload = {
        "procurement_request_id": request_id,
        "vendor_id": vendor_id,
        "issue_date": str(date.today()),
        "expected_delivery_date": str(date.today() + timedelta(days=14)),
        "items": [{"item_name": "Widget A", "quantity": 10, "unit_price": 500}],
    }
    payload.update(overrides)
    return payload


def _create_submitted_request(client: TestClient, pm_user) -> int:
    created = client.post("/api/v1/procurement-requests", json=_req_payload(), headers=_auth(pm_user))
    assert created.status_code == 201
    request_id = created.json()["id"]
    submitted = client.post(f"/api/v1/procurement-requests/{request_id}/submit", headers=_auth(pm_user))
    assert submitted.status_code == 200
    assert submitted.json()["status"] == "Pending Approval"
    return request_id


def _create_approved_request(client: TestClient, pm_user, finance_user) -> int:
    request_id = _create_submitted_request(client, pm_user)
    approved = client.post(
        f"/api/v1/procurement-requests/{request_id}/approve",
        json={"comment": "Budget approved."},
        headers=_auth(finance_user),
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "Approved"
    return request_id


def test_procurement_manager_creates_draft_request(client: TestClient, pm_user, db: Session):
    response = client.post("/api/v1/procurement-requests", json=_req_payload(), headers=_auth(pm_user))
    assert response.status_code == 201
    assert response.json()["status"] == "Draft"
    assert response.json()["created_by"] == pm_user.id


def test_only_creating_procurement_manager_can_submit(client: TestClient, pm_user, admin_user, db: Session):
    created = client.post("/api/v1/procurement-requests", json=_req_payload(), headers=_auth(pm_user))
    request_id = created.json()["id"]
    assert client.post(f"/api/v1/procurement-requests/{request_id}/submit", headers=_auth(admin_user)).status_code == 403
    assert client.post(f"/api/v1/procurement-requests/{request_id}/submit", headers=_auth(pm_user)).status_code == 200


def test_finance_officer_approves_submitted_request(client: TestClient, pm_user, finance_user, db: Session):
    request_id = _create_submitted_request(client, pm_user)
    response = client.post(
        f"/api/v1/procurement-requests/{request_id}/approve",
        json={"comment": "Within approved budget."},
        headers=_auth(finance_user),
    )
    assert response.status_code == 200
    assert response.json()["status"] == "Approved"
    assert response.json()["approved_by"] == finance_user.id
    assert response.json()["approval_comment"] == "Within approved budget."


def test_procurement_notifications_route_between_finance_and_requester(client: TestClient, pm_user, finance_user, admin_user, db: Session):
    request_id = _create_submitted_request(client, pm_user)
    finance_notifications = client.get("/api/v1/notifications", headers=_auth(finance_user)).json()["items"]
    assert any(item["related_entity_id"] == request_id and item["type"] == "procurement" for item in finance_notifications)

    admin_notifications = client.get("/api/v1/notifications", headers=_auth(admin_user)).json()["items"]
    assert not any(item["related_entity_id"] == request_id and item["type"] == "procurement" for item in admin_notifications)

    assert client.post(
        f"/api/v1/procurement-requests/{request_id}/approve",
        json={"comment": "Budget approved."},
        headers=_auth(finance_user),
    ).status_code == 200
    requester_notifications = client.get("/api/v1/notifications", headers=_auth(pm_user)).json()["items"]
    assert any(item["related_entity_id"] == request_id and "approved" in item["message"] for item in requester_notifications)


def test_only_finance_officer_can_approve_or_reject(client: TestClient, pm_user, finance_user, admin_user, scm_user, auditor_user, db: Session):
    for user in (pm_user, admin_user, scm_user, auditor_user):
        request_id = _create_submitted_request(client, pm_user)
        response = client.post(
            f"/api/v1/procurement-requests/{request_id}/approve",
            json={"comment": "Not authorized."},
            headers=_auth(user),
        )
        assert response.status_code == 403

    request_id = _create_submitted_request(client, pm_user)
    response = client.post(
        f"/api/v1/procurement-requests/{request_id}/reject",
        json={"comment": "Funding is unavailable."},
        headers=_auth(finance_user),
    )
    assert response.status_code == 200
    assert response.json()["status"] == "Rejected"
    assert response.json()["rejected_by"] == finance_user.id


def test_non_finance_roles_cannot_reject_submitted_request(client: TestClient, pm_user, admin_user, scm_user, auditor_user, db: Session):
    for user in (pm_user, admin_user, scm_user, auditor_user):
        request_id = _create_submitted_request(client, pm_user)
        response = client.post(
            f"/api/v1/procurement-requests/{request_id}/reject",
            json={"comment": "Not authorized."},
            headers=_auth(user),
        )
        assert response.status_code == 403


def test_finance_rejection_requires_reason_and_request_can_be_resubmitted(client: TestClient, pm_user, finance_user, db: Session):
    request_id = _create_submitted_request(client, pm_user)
    missing_reason = client.post(f"/api/v1/procurement-requests/{request_id}/reject", json={}, headers=_auth(finance_user))
    assert missing_reason.status_code == 422

    rejected = client.post(
        f"/api/v1/procurement-requests/{request_id}/reject",
        json={"comment": "Add a cost breakdown."},
        headers=_auth(finance_user),
    )
    assert rejected.status_code == 200
    assert rejected.json()["rejection_reason"] == "Add a cost breakdown."
    assert client.post(f"/api/v1/procurement-requests/{request_id}/submit", headers=_auth(pm_user)).status_code == 200


def test_purchase_order_requires_finance_approved_request(client: TestClient, pm_user, finance_user, approved_vendor, db: Session):
    draft = client.post("/api/v1/procurement-requests", json=_req_payload(), headers=_auth(pm_user)).json()["id"]
    assert client.post("/api/v1/purchase-orders", json=_po_payload(draft, approved_vendor.id), headers=_auth(pm_user)).status_code == 409

    request_id = _create_approved_request(client, pm_user, finance_user)
    response = client.post("/api/v1/purchase-orders", json=_po_payload(request_id, approved_vendor.id), headers=_auth(pm_user))
    assert response.status_code == 201
    assert response.json()["status"] == "Created"


def test_duplicate_purchase_order_for_request_is_rejected(client: TestClient, pm_user, finance_user, approved_vendor, db: Session):
    request_id = _create_approved_request(client, pm_user, finance_user)
    assert client.post("/api/v1/purchase-orders", json=_po_payload(request_id, approved_vendor.id), headers=_auth(pm_user)).status_code == 201
    assert client.post("/api/v1/purchase-orders", json=_po_payload(request_id, approved_vendor.id), headers=_auth(pm_user)).status_code == 409


def test_complete_procurement_to_payment_lifecycle(
    client: TestClient, db: Session, admin_user, pm_user, finance_user, scm_user, vendor_user, auditor_user, category
):
    """Exercise the production API workflow without bypassing role boundaries."""
    suffix = uuid.uuid4().hex[:8]
    vendor_payload = {
        "company_name": f"Lifecycle Supplier {suffix}", "category_id": category.id,
        "registration_number": f"LIFE-REG-{suffix}", "gst_number": f"LIFE-GST-{suffix}",
        "email": f"lifecycle-{suffix}@example.com", "phone": "9000000000", "address": "1 Test Road",
        "city": "Pune", "state": "Maharashtra", "country": "India", "postal_code": "411001",
        "contacts": [{"name": "Supplier Contact", "email": f"contact-{suffix}@example.com", "phone": "9000000000"}],
    }
    created_vendor = client.post("/api/v1/vendors", json=vendor_payload, headers=_auth(pm_user))
    assert created_vendor.status_code == 201
    vendor_id = created_vendor.json()["id"]
    assert client.patch(f"/api/v1/vendors/{vendor_id}/review", headers=_auth(pm_user)).status_code == 200
    assert client.patch(f"/api/v1/vendors/{vendor_id}/approve", headers=_auth(pm_user)).status_code == 200
    vendor_user.vendor_id = vendor_id
    db.flush()

    request_payload = _req_payload(line_items=[{"item_name": "Lifecycle component", "quantity": 10, "estimated_price": 500, "subtotal": 5000}])
    procurement_request = client.post("/api/v1/procurement-requests", json=request_payload, headers=_auth(pm_user))
    assert procurement_request.status_code == 201
    request_id = procurement_request.json()["id"]
    assert client.post(f"/api/v1/procurement-requests/{request_id}/submit", headers=_auth(pm_user)).json()["status"] == "Pending Approval"
    approved = client.post(f"/api/v1/procurement-requests/{request_id}/approve", json={"comment": "Funds confirmed."}, headers=_auth(finance_user))
    assert approved.status_code == 200
    assert approved.json()["approved_by"] == finance_user.id

    po_response = client.post("/api/v1/purchase-orders", json=_po_payload(request_id, vendor_id), headers=_auth(pm_user))
    assert po_response.status_code == 201
    po_id = po_response.json()["id"]
    assert client.patch(f"/api/v1/purchase-orders/{po_id}/send", headers=_auth(pm_user)).json()["status"] == "Sent"
    own_orders = client.get("/api/v1/purchase-orders", headers=_auth(vendor_user))
    assert [order["id"] for order in own_orders.json()] == [po_id]
    assert client.patch(f"/api/v1/purchase-orders/{po_id}/accept", headers=_auth(vendor_user)).json()["status"] == "Accepted"
    for fulfillment_status in ("Processing", "Ready for Shipment", "Shipped"):
        fulfillment = client.put(
            f"/api/v1/purchase-orders/{po_id}/fulfillment",
            json={"fulfillment_status": fulfillment_status, "shipment_reference": f"SHIP-{suffix}", "shipped_at": str(date.today()), "vendor_notes": "Lifecycle update."},
            headers=_auth(vendor_user),
        )
        assert fulfillment.status_code == 200

    receipt = client.post(
        f"/api/v1/purchase-orders/{po_id}/receipt",
        json={"actual_delivery_date": str(date.today()), "received_at": str(date.today()), "received_quantity": 10, "accepted_quantity": 10, "rejected_quantity": 0, "quality_status": "Passed", "sla_violations": 0, "quality_notes": "Accepted at receiving."},
        headers=_auth(scm_user),
    )
    assert receipt.status_code == 200
    assert client.patch(f"/api/v1/purchase-orders/{po_id}/complete", headers=_auth(scm_user)).json()["status"] == "Completed"

    invoice = client.post("/api/v1/invoices", json={"purchase_order_id": po_id, "invoice_number": f"INV-LIFE-{suffix}", "invoice_date": str(date.today()), "due_date": str(date.today() + timedelta(days=30)), "subtotal": 5000, "tax_amount": 0}, headers=_auth(vendor_user))
    assert invoice.status_code == 201
    invoice_id = invoice.json()["id"]
    assert client.post(f"/api/v1/invoices/{invoice_id}/submit", headers=_auth(vendor_user)).json()["status"] == "Submitted"
    assert client.post(f"/api/v1/invoices/{invoice_id}/approve", json={"comment": "Evidence verified."}, headers=_auth(finance_user)).json()["status"] == "Approved"
    assert client.post(f"/api/v1/invoices/{invoice_id}/payment-pending", json={}, headers=_auth(finance_user)).json()["status"] == "Payment Pending"
    payment = client.post(f"/api/v1/invoices/{invoice_id}/payments", json={"payment_date": str(date.today()), "amount": 5000, "payment_method": "NEFT", "reference_number": f"PAY-{suffix}"}, headers=_auth(finance_user))
    assert payment.status_code == 201
    assert client.get(f"/api/v1/invoices/{invoice_id}", headers=_auth(vendor_user)).json()["status"] == "Paid"

    audit_log = client.get("/api/v1/audit-logs?page_size=100", headers=_auth(auditor_user))
    assert audit_log.status_code == 200
    actions = {entry["action"] for entry in audit_log.json()["items"]}
    assert {"PROCUREMENT_REQUEST_APPROVED", "PURCHASE_ORDER_ACCEPTED", "Vendor Fulfillment Updated", "Delivery, Quantity & Quality Recorded", "INVOICE_SUBMITTED", "PAYMENT_PROCESSED"}.issubset(actions)
