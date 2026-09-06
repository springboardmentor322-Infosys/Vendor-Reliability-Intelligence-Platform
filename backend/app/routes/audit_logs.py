from datetime import datetime
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLogResponse
from app.services.authorization import require_roles


router = APIRouter(
    prefix="/audit-logs",
    tags=["Audit Logs"]
)


@router.get("")
def get_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),

    search: Optional[str] = None,
    action: Optional[str] = None,
    module: Optional[str] = None,
    role: Optional[str] = None,

    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            "Administrator",
            "Auditor"
        )
    )
):
    query = db.query(AuditLog)

    # -----------------------------------------
    # SEARCH
    # -----------------------------------------

    if search:

        search_value = f"%{search}%"

        query = query.filter(
            or_(
                AuditLog.user_name.ilike(
                    search_value
                ),
                AuditLog.description.ilike(
                    search_value
                ),
                AuditLog.entity_type.ilike(
                    search_value
                ),
                AuditLog.entity_id.ilike(
                    search_value
                )
            )
        )

    # -----------------------------------------
    # ACTION FILTER
    # -----------------------------------------

    if action:
        query = query.filter(
            AuditLog.action == action
        )

    # -----------------------------------------
    # MODULE FILTER
    # -----------------------------------------

    if module:
        query = query.filter(
            AuditLog.module == module
        )

    # -----------------------------------------
    # ROLE FILTER
    # -----------------------------------------

    if role:
        query = query.filter(
            AuditLog.user_role == role
        )

    # -----------------------------------------
    # DATE FILTER
    # -----------------------------------------

    if start_date:
        query = query.filter(
            AuditLog.created_at >= start_date
        )

    if end_date:
        query = query.filter(
            AuditLog.created_at <= end_date
        )

    # -----------------------------------------
    # TOTAL
    # -----------------------------------------

    total = query.count()

    total_pages = (
        ceil(total / limit)
        if total > 0
        else 1
    )

    # -----------------------------------------
    # PAGINATION
    # -----------------------------------------

    offset = (page - 1) * limit

    logs = (
        query
        .order_by(
            AuditLog.created_at.desc()
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "logs": [
            AuditLogResponse.model_validate(
                log
            )
            for log in logs
        ],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }


@router.get(
    "/{log_id}",
    response_model=AuditLogResponse
)
def get_audit_log(
    log_id: int,

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            "Administrator",
            "Auditor"
        )
    )
):

    log = (
        db.query(AuditLog)
        .filter(
            AuditLog.id == log_id
        )
        .first()
    )

    if not log:

        raise HTTPException(
            status_code=404,
            detail="Audit log not found."
        )

    return log