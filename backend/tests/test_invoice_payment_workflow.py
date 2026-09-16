"""Regression tests for the connected vendor invoice and Finance payment workflow."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuditLog, Invoice, POFulfillment, POItem, ProcurementRequest, PurchaseOrder, Vendor
from tests.conftest import _auth


def _completed_po(db: Session, pm_user, vendor: Vendor) -> PurchaseOrder:
    """Create a completed PO with real receiving and quality evidence for a test."""
    suffix = uuid4().hex[:8]
    procurement_request = ProcurementRequest(
        title=f"Invoice workflow request {suffix}",
        department="Manufacturing",
        description="Transactional invoice workflow test record.",
        estimated_cost=Decimal("2400000.00"),
        priority="High",
        required_date=date.today() + timedelta(days=14),
        status="Purchase Order Created",
        line_items=[{"item_name": "Automotive component", "quantity": 1000, "estimated_price": 2400, "subtotal": 2400000}],
        created_by=pm_user.id,
    )
    db.add(procurement_request)
    db.flush()
    po = PurchaseOrder(
        po_number=f"PO-INV-{suffix}",
        vendor_id=vendor.id,
        procurement_request_id=procurement_request.id,
        issue_date=date.today() - timedelta(days=14),
        expected_delivery_date=date.today() - timedelta(days=3),
        status="Completed",
        total_amount=Decimal("2400000.00"),
        created_by=pm_user.id,
    )
    po.items = [
        POItem(
            item_name="Automotive component",
            quantity=Decimal("1000"),
            unit_price=Decimal("2400"),
            subtotal=Decimal("2400000"),
        )
    ]
    po.fulfillment = POFulfillment(
        shipment_reference=f"SHIP-{suffix}",
        fulfillment_status="Completed",
        shipped_at=date.today() - timedelta(days=6),
        actual_delivery_date=date.today() - timedelta(days=2),
        received_at=date.today() - timedelta(days=2),
        ordered_quantity=Decimal("1000"),
        received_quantity=Decimal("1000"),
        accepted_quantity=Decimal("1000"),
        rejected_quantity=Decimal("0"),
        quality_status="Passed",
        sla_violations=0,
        recorded_by=pm_user.id,
    )
    db.add(po)
    db.flush()
    return po


def _invoice_payload(po_id: int, suffix: str) -> dict:
    return {
        "purchase_order_id": po_id,
        "invoice_number": f"INV-APEX-{suffix}",
        "invoice_date": str(date.today()),
        "due_date": str(date.today() + timedelta(days=30)),
        "subtotal": "2400000.00",
        "tax_amount": "0.00",
        "notes": "Invoice supported by completed receiving evidence.",
    }


def test_vendor_invoice_finance_review_and_payment_lifecycle(
    client: TestClient, db: Session, admin_user, pm_user, vendor_user, finance_user, approved_vendor
):
    """A supplier may invoice a completed own PO; Finance owns review and payment."""
    vendor_user.vendor_id = approved_vendor.id
    db.flush()
    po = _completed_po(db, pm_user, approved_vendor)
    suffix = uuid4().hex[:8]

    created = client.post("/api/v1/invoices", json=_invoice_payload(po.id, suffix), headers=_auth(vendor_user))
    assert created.status_code == 201
    invoice = created.json()
    assert invoice["status"] == "Draft"
    assert invoice["purchase_order_id"] == po.id
    assert invoice["vendor_id"] == approved_vendor.id
    assert invoice["po_number"] == po.po_number
    assert invoice["vendor_name"] == approved_vendor.company_name
    assert invoice["receiving_evidence"]["quality_status"] == "Passed"

    invoice_id = invoice["id"]
    assert client.post(f"/api/v1/invoices/{invoice_id}/submit", headers=_auth(vendor_user)).json()["status"] == "Submitted"
    assert client.post(
        f"/api/v1/invoices/{invoice_id}/review", json={"comment": "Evidence verified."}, headers=_auth(finance_user)
    ).json()["status"] == "Under Review"
    assert client.post(
        f"/api/v1/invoices/{invoice_id}/approve", json={"comment": "Approved for payment."}, headers=_auth(finance_user)
    ).json()["status"] == "Approved"
    assert client.post(
        f"/api/v1/invoices/{invoice_id}/payment-pending", json={"comment": "Queued in AP."}, headers=_auth(finance_user)
    ).json()["status"] == "Payment Pending"

    payment = client.post(
        f"/api/v1/invoices/{invoice_id}/payments",
        json={
            "payment_date": str(date.today()),
            "amount": "2400000.00",
            "payment_method": "NEFT",
            "reference_number": f"NEFT-{suffix}",
            "notes": "Paid in full.",
        },
        headers=_auth(finance_user),
    )
    assert payment.status_code == 201
    assert payment.json()["reference_number"] == f"NEFT-{suffix}"
    assert payment.json()["updated_at"]

    final_invoice = client.get(f"/api/v1/invoices/{invoice_id}", headers=_auth(vendor_user))
    assert final_invoice.status_code == 200
    assert final_invoice.json()["status"] == "Paid"
    assert final_invoice.json()["payments"][0]["amount"] == "2400000.00"

    actions = set(db.scalars(select(AuditLog.action).where(AuditLog.entity == "Invoice")).all())
    assert {"INVOICE_CREATED", "INVOICE_SUBMITTED", "INVOICE_REVIEWED", "INVOICE_APPROVED", "INVOICE_MARKED_PAID"}.issubset(actions)


def test_invoice_scope_and_read_only_roles(
    client: TestClient,
    db: Session,
    admin_user,
    pm_user,
    scm_user,
    finance_user,
    auditor_user,
    vendor_user,
    approved_vendor,
    category,
):
    """Supplier scope cannot be bypassed; internal review roles remain read-only."""
    vendor_user.vendor_id = approved_vendor.id
    suffix = uuid4().hex[:8]
    other_vendor = Vendor(
        company_name=f"Other Supplier {suffix}",
        registration_number=f"OTHER-{suffix}",
        gst_number=f"GST-OTHER-{suffix}",
        email=f"other-{suffix}@example.com",
        phone="9000000000",
        address="1 Test Road",
        city="Pune",
        state="Maharashtra",
        country="India",
        postal_code="411001",
        category_id=category.id,
        approval_status="Approved",
        created_by=admin_user.id,
    )
    db.add(other_vendor)
    db.flush()
    own_po = _completed_po(db, pm_user, approved_vendor)
    other_po = _completed_po(db, pm_user, other_vendor)

    own_created = client.post("/api/v1/invoices", json=_invoice_payload(own_po.id, f"OWN-{suffix}"), headers=_auth(vendor_user))
    assert own_created.status_code == 201
    # A Vendor cannot invoice another supplier's PO by replacing an ID in the request body.
    cross_vendor = client.post("/api/v1/invoices", json=_invoice_payload(other_po.id, f"CROSS-{suffix}"), headers=_auth(vendor_user))
    assert cross_vendor.status_code == 403

    other_invoice = Invoice(
        invoice_number=f"INV-OTHER-{suffix}",
        vendor_id=other_vendor.id,
        purchase_order_id=other_po.id,
        invoice_date=date.today(),
        due_date=date.today() + timedelta(days=30),
        subtotal=Decimal("2400000"),
        tax_amount=Decimal("0"),
        total_amount=Decimal("2400000"),
        currency="INR",
        status="Draft",
        created_by=admin_user.id,
    )
    db.add(other_invoice)
    db.flush()

    assert client.get(f"/api/v1/invoices/{other_invoice.id}", headers=_auth(vendor_user)).status_code == 403
    visible = client.get("/api/v1/invoices", headers=_auth(vendor_user))
    assert visible.status_code == 200
    assert [item["id"] for item in visible.json()] == [own_created.json()["id"]]

    # These roles can inspect records but cannot create or process an invoice.
    for internal_user in (admin_user, pm_user, scm_user, auditor_user, finance_user):
        assert client.get(f"/api/v1/invoices/{other_invoice.id}", headers=_auth(internal_user)).status_code == 200
    assert client.post("/api/v1/invoices", json=_invoice_payload(own_po.id, f"PM-{suffix}"), headers=_auth(pm_user)).status_code == 403
    assert client.post(f"/api/v1/invoices/{own_created.json()['id']}/approve", json={}, headers=_auth(pm_user)).status_code == 403
    assert client.post(
        f"/api/v1/invoices/{own_created.json()['id']}/payments",
        json={"payment_date": str(date.today()), "amount": "1", "payment_method": "NEFT", "reference_number": f"BAD-{suffix}"},
        headers=_auth(auditor_user),
    ).status_code == 403
