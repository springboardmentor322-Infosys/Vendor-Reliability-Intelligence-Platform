from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.core.security import get_current_user_with_role
from app.db.session import engine, get_db
from app.models.app_setting import AppSetting
from app.models.communication import AuditLog
from app.models.user import INTERNAL_ASSIGNABLE_ROLES, Role, User
from app.models.vendoriq import PurchaseOrder
from app.schemas.admin import (
    AdminUserUpdate,
    AppSettingsResponse,
    AppSettingsUpdate,
    HealthCheckItem,
    PurchaseOrderTrail,
    PurchaseOrderTrailEvent,
    SystemHealthResponse,
)
from app.schemas.auth import UserResponse
from app.services.audit import record_audit_log

router = APIRouter(prefix="/admin", tags=["admin"])

STARTED_AT = datetime.now(timezone.utc)

DEFAULT_SETTINGS = {
    "contract_expiry_alert_days": "30",
    "invoice_due_days": "30",
}

SETTING_KEYS = tuple(DEFAULT_SETTINGS.keys())


def _admin_user(current_user: User = Depends(get_current_user_with_role([Role.ADMINISTRATOR]))) -> User:
    return current_user


def _count_active_admins(db: Session) -> int:
    return int(
        db.scalar(
            select(func.count()).select_from(User).where(
                User.role == Role.ADMINISTRATOR,
                User.is_active.is_(True),
            )
        )
        or 0
    )


def _is_sole_active_admin(user: User, db: Session) -> bool:
    return (
        user.role == Role.ADMINISTRATOR
        and user.is_active
        and _count_active_admins(db) <= 1
    )


def _ensure_defaults(db: Session) -> None:
    existing = {row.key for row in db.scalars(select(AppSetting)).all()}
    for key, value in DEFAULT_SETTINGS.items():
        if key not in existing:
            db.add(AppSetting(key=key, value=value))
    db.flush()


def _settings_response(db: Session) -> AppSettingsResponse:
    _ensure_defaults(db)
    rows = {row.key: row for row in db.scalars(select(AppSetting).where(AppSetting.key.in_(SETTING_KEYS)))}
    latest = max((row.updated_at for row in rows.values() if row.updated_at), default=None)
    return AppSettingsResponse(
        contract_expiry_alert_days=int(rows["contract_expiry_alert_days"].value),
        invoice_due_days=int(rows["invoice_due_days"].value),
        updated_at=latest,
    )


@router.get("/users", response_model=list[UserResponse])
def list_users(
    search: str | None = Query(None, min_length=1, max_length=200),
    role: str | None = Query(None),
    is_active: bool | None = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(_admin_user),
) -> list[User]:
    query = select(User)
    if search:
        pattern = f"%{search.strip()}%"
        query = query.where(or_(User.name.ilike(pattern), User.email.ilike(pattern)))
    if role:
        try:
            query = query.where(User.role == Role(role))
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of: {', '.join(r.value for r in Role)}",
            ) from exc
    if is_active is not None:
        query = query.where(User.is_active.is_(is_active))
    return list(db.scalars(query.order_by(User.id)))


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_user),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.role is None and payload.is_active is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No changes provided")

    sole_admin = _is_sole_active_admin(user, db)
    new_role = payload.role if payload.role is not None else user.role
    new_active = payload.is_active if payload.is_active is not None else user.is_active

    if sole_admin and (new_role != Role.ADMINISTRATOR or not new_active):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate or change the role of the sole Administrator",
        )

    changes: list[str] = []
    if payload.role is not None and payload.role != user.role:
        if user.role == Role.ADMINISTRATOR or payload.role == Role.ADMINISTRATOR:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Administrator is seeded only and cannot be assigned or changed",
            )
        if user.role == Role.VENDOR or payload.role == Role.VENDOR:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vendor is an external account type and cannot be reassigned to or from internal roles",
            )
        if user.role not in INTERNAL_ASSIGNABLE_ROLES or payload.role not in INTERNAL_ASSIGNABLE_ROLES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Role changes are only allowed among: "
                    + ", ".join(sorted(role.value for role in INTERNAL_ASSIGNABLE_ROLES))
                ),
            )
        changes.append(f"role {user.role.value} → {payload.role.value}")
        user.role = payload.role
    if payload.is_active is not None and payload.is_active != user.is_active:
        if user.role == Role.ADMINISTRATOR and not payload.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate the seeded Administrator",
            )
        label = "activated" if payload.is_active else "deactivated"
        changes.append(label)
        user.is_active = payload.is_active

    if changes:
        record_audit_log(
            db,
            action_description=(
                f"User {user.name} ({user.email}) {', '.join(changes)} by {current_user.name}"
            ),
            performed_by=current_user.id,
            entity_type="user",
            entity_id=user.id,
        )
        db.commit()
        db.refresh(user)

    return user


@router.get("/settings", response_model=AppSettingsResponse)
def get_settings(
    db: Session = Depends(get_db),
    _: User = Depends(_admin_user),
) -> AppSettingsResponse:
    response = _settings_response(db)
    db.commit()
    return response


@router.put("/settings", response_model=AppSettingsResponse)
def update_settings(
    payload: AppSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_user),
) -> AppSettingsResponse:
    _ensure_defaults(db)
    values = {
        "contract_expiry_alert_days": str(payload.contract_expiry_alert_days),
        "invoice_due_days": str(payload.invoice_due_days),
    }
    for key, value in values.items():
        row = db.get(AppSetting, key)
        if row is None:
            row = AppSetting(key=key, value=value, updated_by=current_user.id)
            db.add(row)
        else:
            row.value = value
            row.updated_by = current_user.id
            row.updated_at = datetime.now(timezone.utc)
    record_audit_log(
        db,
        action_description=(
            f"System settings updated by {current_user.name}: "
            f"contract expiry alert {payload.contract_expiry_alert_days} days, "
            f"invoice due {payload.invoice_due_days} days"
        ),
        performed_by=current_user.id,
        entity_type="app_settings",
        entity_id=1,
    )
    db.commit()
    return _settings_response(db)


@router.get("/health", response_model=SystemHealthResponse)
def get_system_health(
    _: User = Depends(_admin_user),
) -> SystemHealthResponse:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        database = HealthCheckItem(ok=True, detail="Database connection OK")
    except Exception as exc:  # noqa: BLE001 — health check must not crash
        database = HealthCheckItem(ok=False, detail=f"Database connection failed: {exc}")

    settings = get_settings()
    smtp_ready = bool(settings.SMTP_HOST and settings.SMTP_USER)
    smtp = HealthCheckItem(
        ok=smtp_ready,
        detail="SMTP configured" if smtp_ready else "SMTP not configured",
    )

    now = datetime.now(timezone.utc)
    uptime = max(0, int((now - STARTED_AT).total_seconds()))
    backend = HealthCheckItem(ok=True, detail=f"Backend up for {uptime} seconds")
    return SystemHealthResponse(
        database=database,
        backend=backend,
        smtp=smtp,
        uptime_seconds=uptime,
        started_at=STARTED_AT,
    )


@router.get("/po-approval-trails", response_model=list[PurchaseOrderTrail])
def list_po_approval_trails(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user_with_role([Role.ADMINISTRATOR, Role.AUDITOR])),
) -> list[PurchaseOrderTrail]:
    purchase_orders = list(
        db.scalars(
            select(PurchaseOrder)
            .options(selectinload(PurchaseOrder.vendor))
            .order_by(PurchaseOrder.id.desc())
        )
    )
    logs = list(
        db.scalars(
            select(AuditLog)
            .options(selectinload(AuditLog.actor))
            .where(AuditLog.entity_type == "purchase_order")
            .order_by(AuditLog.timestamp.asc())
        )
    )
    events_by_po: dict[int, list[PurchaseOrderTrailEvent]] = defaultdict(list)
    for entry in logs:
        events_by_po[entry.entity_id].append(
            PurchaseOrderTrailEvent(
                id=entry.id,
                action_description=entry.action_description,
                performed_by=entry.performed_by,
                performer_name=entry.actor.name if entry.actor else None,
                timestamp=entry.timestamp,
            )
        )

    return [
        PurchaseOrderTrail(
            purchase_order_id=po.id,
            po_number=po.po_number,
            vendor_id=po.vendor_id,
            vendor_name=po.vendor.name if po.vendor else None,
            status=po.status.value if hasattr(po.status, "value") else str(po.status),
            created_at=po.created_at,
            events=events_by_po.get(po.id, []),
        )
        for po in purchase_orders
    ]
