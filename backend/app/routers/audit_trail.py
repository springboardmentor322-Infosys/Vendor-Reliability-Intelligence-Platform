from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit_trail import AuditTrail
from app.utils.permissions import require_roles, AUDITOR


router = APIRouter(
    prefix="/audit-trails",
    tags=["Audit Trails"]
)


def serialize(item: AuditTrail):
    return {
        "id": item.id,
        "log_id": item.log_id,
        "user": item.user,
        "role": item.role,
        "action": item.action,
        "module": item.module,
        "description": item.description,
        "status": item.status,
        "created_at": (
            item.created_at.isoformat()
            if item.created_at
            else None
        )
    }


@router.get("/")
def get_audit_trails(
    search: str | None = None,
    module: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(AUDITOR))
):
    query = db.query(AuditTrail)

    if search and search.strip():
        term = f"%{search.strip()}%"

        query = query.filter(
            or_(
                AuditTrail.log_id.ilike(term),
                AuditTrail.user.ilike(term),
                AuditTrail.action.ilike(term),
                AuditTrail.module.ilike(term),
                AuditTrail.description.ilike(term)
            )
        )

    if module and module != "All Modules":
        query = query.filter(
            AuditTrail.module == module
        )

    if status and status != "All Status":
        query = query.filter(
            AuditTrail.status == status
        )

    items = (
        query
        .order_by(AuditTrail.id.desc())
        .all()
    )

    return [
        serialize(item)
        for item in items
    ]


@router.get("/{trail_id}")
def get_audit_trail(
    trail_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(AUDITOR))
):
    item = (
        db.query(AuditTrail)
        .filter(AuditTrail.id == trail_id)
        .first()
    )

    if not item:
        return {
            "message": "Audit trail not found"
        }

    return serialize(item)


@router.post("/")
def create_audit_trail(
    data: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(AUDITOR))
):
    last = (
        db.query(AuditTrail)
        .order_by(AuditTrail.id.desc())
        .first()
    )

    next_number = (
        last.id + 1
        if last
        else 1
    )

    log_id = (
        f"LOG-{__import__('datetime').date.today().year}"
        f"-{next_number:03d}"
    )

    item = AuditTrail(
        log_id=log_id,
        user=data.get(
            "user",
            current_user.name
            if hasattr(current_user, "name")
            else "Auditor"
        ),
        role=data.get(
            "role",
            current_user.role
        ),
        action=data.get(
            "action",
            "System Activity"
        ),
        module=data.get(
            "module",
            "System"
        ),
        description=data.get(
            "description"
        ),
        status=data.get(
            "status",
            "Success"
        )
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return serialize(item)