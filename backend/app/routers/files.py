"""Secure file download/streaming endpoint for VendorIQ uploads."""

from __future__ import annotations

from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_user
from app.database.database import get_db
from app.models import Contract, Invoice, PurchaseOrder, Vendor
from app.services.milestone_two import can, fail

router = APIRouter(prefix="/api/v1/files", tags=["File Downloads"])

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[object, Depends(get_current_user)]


def _resolve_path(relative_path: str) -> Path:
    """Convert stored path (forward-slashes) to a safe absolute path."""
    # Normalise any backslashes from legacy Windows uploads
    clean = relative_path.replace("\\", "/").lstrip("/")
    full = (Path(settings.uploads_dir) / clean).resolve()
    # Safety: ensure the resolved path is still inside uploads_dir
    if not full.is_relative_to(Path(settings.uploads_dir).resolve()):
        fail(400, "Invalid file path.")
    if not full.exists():
        fail(404, "File not found.")
    return full


@router.get("/download", summary="Securely download an uploaded file")
def download_file(
    db: DatabaseSession,
    user: CurrentUser,
    path: str = Query(..., description="Relative path stored in database (e.g. purchase-orders/abc.pdf)"),
):
    """Stream an uploaded file after verifying the caller is authorized.

    Authorization rules:
    - Administrators and Procurement Managers can access all files.
    - Auditors can access all files (read-only review).
    - Vendors can only access files linked to their own POs / Contracts.
    - Supply Chain Managers and Finance Officers can access PO/Contract files.
    """
    clean_path = path.replace("\\", "/").lstrip("/")

    # Privileged roles — full access
    if can(user, "Administrator", "Procurement Manager", "Auditor",
           "Supply Chain Manager", "Finance Officer"):
        return FileResponse(_resolve_path(clean_path))

    # Vendor — can only access files tied to their vendor records
    if can(user, "Vendor"):
        # The authenticated supplier account is bound to exactly one company.
        vendor_ids = [user.vendor_id] if user.vendor_id is not None else []
        if vendor_ids:
            pos = db.scalars(
                select(PurchaseOrder).where(PurchaseOrder.vendor_id.in_(vendor_ids))
            ).all()
            for po in pos:
                for stored in (po.invoice_path, po.delivery_proof_path):
                    if stored and stored.replace("\\", "/") == clean_path:
                        return FileResponse(_resolve_path(clean_path))

            invoices = db.scalars(
                select(Invoice).where(Invoice.vendor_id.in_(vendor_ids))
            ).all()
            for invoice in invoices:
                if invoice.document_path and invoice.document_path.replace("\\", "/") == clean_path:
                    return FileResponse(_resolve_path(clean_path))

            contracts = db.scalars(
                select(Contract).where(Contract.vendor_id.in_(vendor_ids))
            ).all()
            for c in contracts:
                if c.contract_file and c.contract_file.replace("\\", "/") == clean_path:
                    return FileResponse(_resolve_path(clean_path))

        fail(403, "You do not have permission to access this file.")

    fail(403, "You do not have permission to access this file.")
