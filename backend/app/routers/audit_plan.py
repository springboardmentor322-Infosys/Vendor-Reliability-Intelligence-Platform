from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit_plan import AuditPlan
from app.models.audit_trail import AuditTrail
from app.models.vendor import Vendor

from app.schemas.audit_plan import (
    AuditPlanCreate,
    AuditPlanUpdate
)

from app.utils.permissions import (
    require_roles,
    AUDITOR
)


router = APIRouter(
    prefix="/audit-plans",
    tags=["Audit Plans"]
)


# ==========================================
# SERIALIZE AUDIT PLAN
# ==========================================

def serialize(
    item: AuditPlan,
    db: Session
):

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
        "audit_id": item.audit_id,
        "title": item.title,
        "vendor_id": item.vendor_id,
        "vendor": vendor_name,
        "auditor": item.auditor,
        "audit_type": item.audit_type,
        "priority": item.priority,
        "start_date": (
            item.start_date.isoformat()
            if item.start_date
            else None
        ),
        "due_date": (
            item.due_date.isoformat()
            if item.due_date
            else None
        ),
        "status": item.status,
        "progress": item.progress,
        "scope": item.scope
    }


# ==========================================
# GET ALL AUDIT PLANS
# ==========================================

@router.get("/")
def get_audit_plans(

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(AUDITOR)
    )

):

    items = (
        db.query(AuditPlan)
        .order_by(
            AuditPlan.id.desc()
        )
        .all()
    )

    return [
        serialize(item, db)
        for item in items
    ]


# ==========================================
# GET SINGLE AUDIT PLAN
# ==========================================

@router.get("/{audit_plan_id}")
def get_audit_plan(

    audit_plan_id: int,

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(AUDITOR)
    )

):

    item = (
        db.query(AuditPlan)
        .filter(
            AuditPlan.id == audit_plan_id
        )
        .first()
    )

    if not item:

        raise HTTPException(
            status_code=404,
            detail="Audit plan not found"
        )

    return serialize(item, db)


# ==========================================
# CREATE AUDIT PLAN
# ==========================================

@router.post("/")
def create_audit_plan(

    data: AuditPlanCreate,

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(AUDITOR)
    )

):

    # --------------------------------------
    # VALIDATE VENDOR
    # --------------------------------------

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
                detail="Vendor not found"
            )


    # --------------------------------------
    # GENERATE AUDIT ID
    # --------------------------------------

    last = (
        db.query(AuditPlan)
        .order_by(
            AuditPlan.id.desc()
        )
        .first()
    )

    next_number = (
        last.id + 1
        if last
        else 1
    )

    audit_code = (
        f"AUD-{date.today().year}"
        f"-{next_number:03d}"
    )


    # --------------------------------------
    # CREATE AUDIT PLAN
    # --------------------------------------

    item = AuditPlan(

        audit_id=audit_code,

        title=data.title.strip(),

        vendor_id=data.vendor_id,

        auditor=data.auditor.strip(),

        audit_type=data.audit_type,

        priority=data.priority,

        start_date=data.start_date,

        due_date=data.due_date,

        status=data.status,

        progress=data.progress,

        scope=(
            data.scope.strip()
            if data.scope
            else None
        )

    )

    db.add(item)

    db.commit()

    db.refresh(item)


    # --------------------------------------
    # AUDIT TRAIL
    # --------------------------------------

    user_name = (
        getattr(
            current_user,
            "name",
            None
        )
        or getattr(
            current_user,
            "username",
            None
        )
        or "Auditor"
    )

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

        action="Created Audit Plan",

        module="Audit Plan",

        description=(
            f"Created audit plan "
            f"{item.audit_id}"
        ),

        status="Success"

    )

    db.add(trail)

    db.commit()


    return serialize(
        item,
        db
    )


# ==========================================
# UPDATE AUDIT PLAN
# ==========================================

@router.put("/{audit_plan_id}")
def update_audit_plan(

    audit_plan_id: int,

    data: AuditPlanUpdate,

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(AUDITOR)
    )

):

    item = (
        db.query(AuditPlan)
        .filter(
            AuditPlan.id == audit_plan_id
        )
        .first()
    )

    if not item:

        raise HTTPException(
            status_code=404,
            detail="Audit plan not found"
        )


    # --------------------------------------
    # VALIDATE VENDOR
    # --------------------------------------

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
                detail="Vendor not found"
            )


    # --------------------------------------
    # UPDATE
    # --------------------------------------

    update_data = data.model_dump(
        exclude_unset=True
    )


    for field, value in update_data.items():

        if (
            isinstance(value, str)
            and field in {
                "title",
                "auditor",
                "scope"
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


    # --------------------------------------
    # AUDIT TRAIL
    # --------------------------------------

    user_name = (
        getattr(
            current_user,
            "name",
            None
        )
        or getattr(
            current_user,
            "username",
            None
        )
        or "Auditor"
    )

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

        action="Updated Audit Plan",

        module="Audit Plan",

        description=(
            f"Updated audit plan "
            f"{item.audit_id}"
        ),

        status="Success"

    )

    db.add(trail)

    db.commit()


    return serialize(
        item,
        db
    )


# ==========================================
# DELETE AUDIT PLAN
# ==========================================

@router.delete("/{audit_plan_id}")
def delete_audit_plan(

    audit_plan_id: int,

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(AUDITOR)
    )

):

    item = (
        db.query(AuditPlan)
        .filter(
            AuditPlan.id == audit_plan_id
        )
        .first()
    )

    if not item:

        raise HTTPException(
            status_code=404,
            detail="Audit plan not found"
        )


    audit_code = item.audit_id


    db.delete(item)

    db.commit()


    # --------------------------------------
    # AUDIT TRAIL
    # --------------------------------------

    user_name = (
        getattr(
            current_user,
            "name",
            None
        )
        or getattr(
            current_user,
            "username",
            None
        )
        or "Auditor"
    )

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

        action="Deleted Audit Plan",

        module="Audit Plan",

        description=(
            f"Deleted audit plan "
            f"{audit_code}"
        ),

        status="Success"

    )

    db.add(trail)

    db.commit()


    return {
        "message":
            "Audit plan deleted"
    }