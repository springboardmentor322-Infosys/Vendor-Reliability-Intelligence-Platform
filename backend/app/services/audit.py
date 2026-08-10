from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.communication import AuditLog
from app.models.user import User


def _format_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%b %d, %Y %H:%M UTC")


def format_status_change_description(
    entity_label: str,
    new_status: str,
    user: User,
) -> str:
    return f"{entity_label} status changed to {new_status} by {user.name} on {_format_timestamp()}"


def record_audit_log(
    db: Session,
    *,
    action_description: str,
    performed_by: int,
    entity_type: str,
    entity_id: int,
) -> AuditLog:
    entry = AuditLog(
        action_description=action_description,
        performed_by=performed_by,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(entry)
    return entry
