"""Audit log query service for VendorIQ."""

from __future__ import annotations

from typing import Optional

from sqlalchemy import cast, Date, func, or_, select
from sqlalchemy.orm import Session

from app.models import AuditLog


def list_audit_logs(
    db: Session,
    search: Optional[str] = None,
    entity: Optional[str] = None,
    action: Optional[str] = None,
    user_id: Optional[int] = None,
    page: int = 1,
    page_size: int = 30,
) -> tuple[list[AuditLog], int]:
    """Return a paginated, filterable list of audit log entries."""
    statement = select(AuditLog).order_by(AuditLog.created_at.desc())

    if search:
        term = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                AuditLog.action.ilike(term),
                AuditLog.entity.ilike(term),
            )
        )
    if entity:
        statement = statement.where(AuditLog.entity == entity)
    if action:
        statement = statement.where(AuditLog.action.ilike(f"%{action}%"))
    if user_id:
        statement = statement.where(AuditLog.user_id == user_id)

    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    logs = db.scalars(
        statement.offset((page - 1) * page_size).limit(page_size)
    ).all()
    return list(logs), total


def get_audit_analytics(db: Session, limit_days: int = 30) -> dict:
    """Return aggregated audit log timeline and breakdown for governance dashboards."""
    total_events = db.scalar(select(func.count(AuditLog.id))) or 0
    unique_users = db.scalar(select(func.count(func.distinct(AuditLog.user_id)))) or 0

    # Daily counts timeline
    day_col = cast(AuditLog.created_at, Date)
    daily_rows = db.execute(
        select(day_col, func.count(AuditLog.id))
        .group_by(day_col)
        .order_by(day_col.desc())
        .limit(limit_days)
    ).all()
    timeline = [
        {"date": r[0].strftime("%Y-%m-%d") if hasattr(r[0], "strftime") else str(r[0]), "count": r[1]}
        for r in reversed(daily_rows)
    ]

    # Actions breakdown (top 10)
    action_rows = db.execute(
        select(AuditLog.action, func.count(AuditLog.id))
        .group_by(AuditLog.action)
        .order_by(func.count(AuditLog.id).desc())
        .limit(10)
    ).all()
    actions = [{"action": r[0], "count": r[1]} for r in action_rows]

    # Entities breakdown
    entity_rows = db.execute(
        select(AuditLog.entity, func.count(AuditLog.id))
        .group_by(AuditLog.entity)
        .order_by(func.count(AuditLog.id).desc())
        .limit(10)
    ).all()
    entities = [{"entity": r[0], "count": r[1]} for r in entity_rows]

    return {
        "total_events": total_events,
        "unique_users": unique_users,
        "timeline": timeline,
        "actions": actions,
        "entities": entities,
    }

