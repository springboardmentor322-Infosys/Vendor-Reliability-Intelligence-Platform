"""Data export endpoints (CSV) for VendorIQ."""

from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.database import get_db
from app.services.export_service import (
    export_audit_logs_csv,
    export_contracts_csv,
    export_procurement_csv,
    export_purchase_orders_csv,
    export_vendors_csv,
)
from app.services.milestone_two import can, fail

router = APIRouter(prefix="/api/v1/exports", tags=["Data Exports"])

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[object, Depends(get_current_user)]


def _csv_response(content: str, filename: str) -> StreamingResponse:
    return StreamingResponse(
        iter([content]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/vendors", summary="Export vendors as CSV")
def export_vendors(
    db: DatabaseSession,
    user: CurrentUser,
    approval_status: Optional[str] = Query(None),
):
    if not can(user, "Administrator", "Procurement Manager", "Auditor"):
        fail(403, "You do not have permission to export vendor data.")
    csv_content = export_vendors_csv(db, approval_status)
    return _csv_response(csv_content, "vendors.csv")


@router.get("/procurement-requests", summary="Export procurement requests as CSV")
def export_procurement(db: DatabaseSession, user: CurrentUser):
    is_admin = can(user, "Administrator", "Procurement Manager", "Finance Officer", "Auditor")
    if not is_admin and not can(user, "Supply Chain Manager"):
        fail(403, "You do not have permission to export procurement data.")
    csv_content = export_procurement_csv(db, user_id=user.id, is_admin=is_admin)
    return _csv_response(csv_content, "procurement_requests.csv")


@router.get("/purchase-orders", summary="Export purchase orders as CSV")
def export_pos(db: DatabaseSession, user: CurrentUser):
    if not can(user, "Administrator", "Procurement Manager", "Finance Officer", "Auditor"):
        fail(403, "You do not have permission to export purchase order data.")
    csv_content = export_purchase_orders_csv(db)
    return _csv_response(csv_content, "purchase_orders.csv")


@router.get("/contracts", summary="Export contracts as CSV")
def export_contracts(db: DatabaseSession, user: CurrentUser):
    if not can(user, "Administrator", "Procurement Manager", "Finance Officer", "Auditor"):
        fail(403, "You do not have permission to export contract data.")
    csv_content = export_contracts_csv(db)
    return _csv_response(csv_content, "contracts.csv")


@router.get("/audit-logs", summary="Export audit logs as CSV")
def export_audits(db: DatabaseSession, user: CurrentUser):
    if not can(user, "Administrator", "Auditor"):
        fail(403, "Only Administrators and Auditors can export audit logs.")
    csv_content = export_audit_logs_csv(db)
    return _csv_response(csv_content, "audit_logs.csv")
