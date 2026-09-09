from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit_finding import AuditFinding
from app.models.audit_trail import AuditTrail
from app.models.vendor import Vendor
from app.schemas.audit_finding import (
    AuditFindingCreate,
    AuditFindingUpdate,
)
from app.utils.permissions import require_roles, AUDITOR


router = APIRouter(
    prefix="/audit-findings",
    tags=["Audit Findings"],
)


# ==========================================
# SERIALIZE FINDING
# ==========================================

def serialize(item: AuditFinding, db: Session):

    vendor_name = None

    if item.vendor_id:

        vendor = (
            db.query(Vendor)
            .filter(
                Vendor.id == item.vendor_id
            )
            .first()
        )

        if vendor:
            vendor_name = vendor.vendor_name

    return {
        "id": item.id,
        "finding_id": item.finding_id,
        "finding": item.finding,
        "description": item.description,
        "vendor_id": item.vendor_id,
        "vendor": vendor_name,
        "audit": item.audit,
        "severity": item.severity,
        "status": item.status,
        "evidence_url": item.evidence_url,
        "due_date": (
            item.due_date.isoformat()
            if item.due_date
            else None
        ),
    }


# ==========================================
# GET ALL FINDINGS
# ==========================================

@router.get("/")
def get_findings(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(AUDITOR)
    ),
):

    items = (
        db.query(AuditFinding)
        .order_by(
            AuditFinding.id.desc()
        )
        .all()
    )

    return [
        serialize(item, db)
        for item in items
    ]


# ==========================================
# GET SINGLE FINDING
# ==========================================

@router.get("/{finding_id}")
def get_finding(
    finding_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(AUDITOR)
    ),
):

    item = (
        db.query(AuditFinding)
        .filter(
            AuditFinding.id == finding_id
        )
        .first()
    )

    if not item:

        raise HTTPException(
            status_code=404,
            detail="Audit finding not found",
        )

    return serialize(item, db)


# ==========================================
# CREATE FINDING
# ==========================================

@router.post("/")
def create_finding(
    data: AuditFindingCreate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(AUDITOR)
    ),
):

    # Validate vendor
    if data.vendor_id is not None:

        vendor = (
            db.query(Vendor)
            .filter(
                Vendor.id == data.vendor_id
            )
            .first()
        )

        if not vendor:

            raise HTTPException(
                status_code=404,
                detail="Vendor not found",
            )

    # Generate finding number
    last = (
        db.query(AuditFinding)
        .order_by(
            AuditFinding.id.desc()
        )
        .first()
    )

    next_number = (
        last.id + 1
        if last
        else 1
    )

    finding_code = (
        f"FND-{date.today().year}"
        f"-{next_number:03d}"
    )

    item = AuditFinding(

        finding_id=finding_code,

        finding=data.finding.strip(),

        description=data.description,

        vendor_id=data.vendor_id,

        audit=data.audit.strip(),

        severity=data.severity,

        status=data.status,

        evidence_url=data.evidence_url,

        due_date=data.due_date,
    )

    db.add(item)

    db.commit()

    db.refresh(item)


    # ==========================================
    # CREATE AUDIT TRAIL
    # ==========================================

    user_name = getattr(
        current_user,
        "name",
        None
    ) or getattr(
        current_user,
        "username",
        None
    ) or "Auditor"

    user_role = getattr(
        current_user,
        "role",
        "Auditor"
    )

    last_log = (
        db.query(AuditTrail)
        .order_by(
            AuditTrail.id.desc()
        )
        .first()
    )

    next_log_number = (
        last_log.id + 1
        if last_log
        else 1
    )

    log_code = (
        f"LOG-{date.today().year}"
        f"-{next_log_number:03d}"
    )

    trail = AuditTrail(

        log_id=log_code,

        user=user_name,

        role=user_role,

        action="Created Finding",

        module="Audit Findings",

        description=(
            f"Created finding "
            f"{item.finding_id}"
        ),

        status="Success"
    )

    db.add(trail)

    db.commit()


    return serialize(item, db)


# ==========================================
# UPDATE FINDING
# ==========================================

@router.put("/{finding_id}")
def update_finding(
    finding_id: int,
    data: AuditFindingUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(AUDITOR)
    ),
):

    item = (
        db.query(AuditFinding)
        .filter(
            AuditFinding.id == finding_id
        )
        .first()
    )

    if not item:

        raise HTTPException(
            status_code=404,
            detail="Audit finding not found",
        )


    # Validate vendor
    if data.vendor_id is not None:

        vendor = (
            db.query(Vendor)
            .filter(
                Vendor.id == data.vendor_id
            )
            .first()
        )

        if not vendor:

            raise HTTPException(
                status_code=404,
                detail="Vendor not found",
            )


    update_data = data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():

        if (
            isinstance(value, str)
            and field in {
                "finding",
                "audit"
            }
        ):
            value = value.strip()

        setattr(
            item,
            field,
            value
        )

    db.commit()

    db.refresh(item)


    # ==========================================
    # CREATE AUDIT TRAIL
    # ==========================================

    user_name = getattr(
        current_user,
        "name",
        None
    ) or getattr(
        current_user,
        "username",
        None
    ) or "Auditor"

    user_role = getattr(
        current_user,
        "role",
        "Auditor"
    )

    last_log = (
        db.query(AuditTrail)
        .order_by(
            AuditTrail.id.desc()
        )
        .first()
    )

    next_log_number = (
        last_log.id + 1
        if last_log
        else 1
    )

    log_code = (
        f"LOG-{date.today().year}"
        f"-{next_log_number:03d}"
    )

    trail = AuditTrail(

        log_id=log_code,

        user=user_name,

        role=user_role,

        action="Updated Finding",

        module="Audit Findings",

        description=(
            f"Updated finding "
            f"{item.finding_id}"
        ),

        status="Success"
    )

    db.add(trail)

    db.commit()


    return serialize(item, db)


# ==========================================
# DELETE FINDING
# ==========================================

@router.delete("/{finding_id}")
def delete_finding(
    finding_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(AUDITOR)
    ),
):

    item = (
        db.query(AuditFinding)
        .filter(
            AuditFinding.id == finding_id
        )
        .first()
    )

    if not item:

        raise HTTPException(
            status_code=404,
            detail="Audit finding not found",
        )


    finding_code = item.finding_id


    # Delete finding
    db.delete(item)

    db.commit()


    # ==========================================
    # CREATE AUDIT TRAIL
    # ==========================================

    user_name = getattr(
        current_user,
        "name",
        None
    ) or getattr(
        current_user,
        "username",
        None
    ) or "Auditor"

    user_role = getattr(
        current_user,
        "role",
        "Auditor"
    )

    last_log = (
        db.query(AuditTrail)
        .order_by(
            AuditTrail.id.desc()
        )
        .first()
    )

    next_log_number = (
        last_log.id + 1
        if last_log
        else 1
    )

    log_code = (
        f"LOG-{date.today().year}"
        f"-{next_log_number:03d}"
    )

    trail = AuditTrail(

        log_id=log_code,

        user=user_name,

        role=user_role,

        action="Deleted Finding",

        module="Audit Findings",

        description=(
            f"Deleted finding "
            f"{finding_code}"
        ),

        status="Success"
    )

    db.add(trail)

    db.commit()


    return {
        "message": "Audit finding deleted"
    }