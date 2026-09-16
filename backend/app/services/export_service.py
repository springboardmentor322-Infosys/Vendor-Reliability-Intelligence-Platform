"""CSV export service for VendorIQ — respects user permissions."""

from __future__ import annotations

import csv
import io
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    AuditLog,
    Contract,
    ProcurementRequest,
    PurchaseOrder,
    Vendor,
)


def _writer(output: io.StringIO) -> csv.writer:
    return csv.writer(output, quoting=csv.QUOTE_ALL)


def export_vendors_csv(db: Session, approval_status: Optional[str] = None) -> str:
    stmt = select(Vendor).order_by(Vendor.company_name)
    if approval_status:
        stmt = stmt.where(Vendor.approval_status == approval_status)
    vendors = db.scalars(stmt).all()

    output = io.StringIO()
    w = _writer(output)
    w.writerow([
        "ID", "Company Name", "Registration Number", "GST Number",
        "Email", "Phone", "City", "State", "Country",
        "Approval Status", "Reliability Score", "Risk Category",
        "Last Calculated At", "Created At",
    ])
    for v in vendors:
        w.writerow([
            v.id, v.company_name, v.registration_number, v.gst_number,
            v.email, v.phone, v.city, v.state, v.country,
            v.approval_status,
            float(v.reliability_score) if v.reliability_score is not None else "N/A",
            v.risk_category or "Not Yet Rated",
            v.last_calculated_at.isoformat() if v.last_calculated_at else "",
            v.created_at.isoformat(),
        ])
    return output.getvalue()


def export_procurement_csv(db: Session, user_id: Optional[int] = None, is_admin: bool = False) -> str:
    stmt = select(ProcurementRequest).order_by(ProcurementRequest.created_at.desc())
    if not is_admin and user_id:
        stmt = stmt.where(ProcurementRequest.created_by == user_id)
    requests = db.scalars(stmt).all()

    output = io.StringIO()
    w = _writer(output)
    w.writerow([
        "ID", "Title", "Department", "Priority", "Estimated Cost",
        "Required Date", "Status", "Created By", "Approved By", "Created At",
    ])
    for r in requests:
        w.writerow([
            r.id, r.title, r.department, r.priority,
            float(r.estimated_cost), str(r.required_date), r.status,
            r.created_by, r.approved_by or "", r.created_at.isoformat(),
        ])
    return output.getvalue()


def export_purchase_orders_csv(db: Session, user_id: Optional[int] = None, is_admin: bool = False) -> str:
    stmt = select(PurchaseOrder).order_by(PurchaseOrder.created_at.desc())
    orders = db.scalars(stmt).all()

    output = io.StringIO()
    w = _writer(output)
    w.writerow([
        "ID", "PO Number", "Vendor ID", "Procurement Request ID",
        "Issue Date", "Expected Delivery", "Status", "Total Amount",
        "Invoice Uploaded", "Delivery Proof Uploaded", "Created At",
    ])
    for o in orders:
        w.writerow([
            o.id, o.po_number, o.vendor_id, o.procurement_request_id,
            str(o.issue_date), str(o.expected_delivery_date), o.status,
            float(o.total_amount), bool(o.invoice_path), bool(o.delivery_proof_path),
            o.created_at.isoformat(),
        ])
    return output.getvalue()


def export_contracts_csv(db: Session) -> str:
    contracts = db.scalars(select(Contract).order_by(Contract.end_date)).all()

    output = io.StringIO()
    w = _writer(output)
    w.writerow([
        "ID", "Contract Number", "Vendor ID", "Start Date", "End Date",
        "Renewal Notice Days", "Compliance Status", "Has Contract File", "Created At",
    ])
    for c in contracts:
        w.writerow([
            c.id, c.contract_number, c.vendor_id,
            str(c.start_date), str(c.end_date),
            c.renewal_notice_days, c.compliance_status,
            bool(c.contract_file), c.created_at.isoformat(),
        ])
    return output.getvalue()


def export_audit_logs_csv(db: Session) -> str:
    logs = db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc())).all()

    output = io.StringIO()
    w = _writer(output)
    w.writerow(["ID", "User ID", "Action", "Entity", "Entity ID", "Created At"])
    for log in logs:
        w.writerow([
            log.id, log.user_id or "", log.action, log.entity,
            log.entity_id or "", log.created_at.isoformat(),
        ])
    return output.getvalue()
