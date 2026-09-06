from datetime import datetime

from app.models.audit_log import AuditLog


def create_audit_log(
    db,
    user=None,
    action="UNKNOWN",
    module="SYSTEM",
    entity_type=None,
    entity_id=None,
    description="",
    old_values=None,
    new_values=None,
    ip_address=None
):

    audit_log = AuditLog(

        user_id=(
            getattr(user, "id", None)
            if user
            else None
        ),

        user_name=(
            getattr(user, "full_name", None)
            if user
            else None
        ),

        user_role=(
            getattr(user, "role", None)
            if user
            else None
        ),

        action=action,

        module=module,

        entity_type=entity_type,

        entity_id=(
            str(entity_id)
            if entity_id is not None
            else None
        ),

        description=description,

        old_values=old_values,

        new_values=new_values,

        ip_address=ip_address,

        created_at=datetime.utcnow()
    )

    db.add(audit_log)

    return audit_log