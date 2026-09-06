from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
from database import get_db
from auth import require_roles


router = APIRouter(
    prefix="/api",
    tags=["Audit"]
)


@router.get("/audit-logs")
def list_audit_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles(
            models.RoleEnum.ADMIN,
            models.RoleEnum.AUDITOR,
        )
    ),
):
    logs = (
        db.query(models.AuditLog)
        .order_by(models.AuditLog.created_at.desc())
        .all()
    )

    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "user_name": log.user_name,
            "user_role": log.user_role,
            "action": log.action,
            "module": log.module,
            "details": log.details,
            "record_id": log.record_id,
            "created_at": log.created_at,
        }
        for log in logs
    ]