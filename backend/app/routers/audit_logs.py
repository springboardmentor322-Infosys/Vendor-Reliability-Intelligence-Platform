from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.security import get_current_user_with_role
from app.db.session import get_db
from app.models.communication import AuditLog
from app.models.user import Role, User
from app.schemas.audit_log import AuditLogResponse

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


def _to_response(entry: AuditLog) -> AuditLogResponse:
    return AuditLogResponse(
        id=entry.id,
        action_description=entry.action_description,
        performed_by=entry.performed_by,
        performer_name=entry.actor.name if entry.actor else None,
        entity_type=entry.entity_type,
        entity_id=entry.entity_id,
        timestamp=entry.timestamp,
    )


@router.get("", response_model=list[AuditLogResponse])
def list_audit_logs(
    entity_type: str | None = Query(None),
    entity_id: int | None = Query(None, ge=1),
    search: str | None = Query(None, min_length=1, max_length=200),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user_with_role([Role.ADMINISTRATOR, Role.AUDITOR])),
) -> list[AuditLogResponse]:
    query = select(AuditLog).options(selectinload(AuditLog.actor))

    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if entity_id is not None:
        query = query.where(AuditLog.entity_id == entity_id)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                AuditLog.action_description.ilike(pattern),
                AuditLog.entity_type.ilike(pattern),
            )
        )

    query = query.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit)
    entries = db.scalars(query).all()
    return [_to_response(entry) for entry in entries]
