"""Audit log API endpoints for VendorIQ (Admin/Auditor only)."""

from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.database import get_db
from app.services.audit_service import get_audit_analytics, list_audit_logs
from app.services.milestone_two import can, fail

router = APIRouter(prefix="/api/v1/audit-logs", tags=["Audit Logs"])

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[object, Depends(get_current_user)]


@router.get("/analytics", summary="Get audit logs aggregated analytics")
def get_audit_log_analytics(
    db: DatabaseSession,
    user: CurrentUser,
    days: int = Query(30, ge=1, le=365),
):
    """Return aggregated timeline and breakdown of audit activities."""
    if not can(user, "Administrator", "Auditor"):
        fail(403, "Only Administrators and Auditors can view audit analytics.")
    return get_audit_analytics(db, limit_days=days)


@router.get("", summary="List audit logs (Admin/Auditor only)")
def get_audit_logs(
    db: DatabaseSession,
    user: CurrentUser,
    search: Optional[str] = Query(None),
    entity: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
):
    """Return a paginated, filterable audit log for system accountability."""
    if not can(user, "Administrator", "Auditor"):
        fail(403, "Only Administrators and Auditors can view audit logs.")

    logs, total = list_audit_logs(db, search, entity, action, user_id, page, page_size)
    return {
        "items": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "action": log.action,
                "entity": log.entity,
                "entity_id": log.entity_id,
                "created_at": log.created_at,
            }
            for log in logs
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }
