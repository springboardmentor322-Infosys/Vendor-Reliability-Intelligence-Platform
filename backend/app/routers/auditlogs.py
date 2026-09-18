from fastapi import APIRouter

router = APIRouter(
    prefix="/auditlogs",
    tags=["Audit Logs"]
)

audit_logs = [
    {
        "id": 1,
        "user": "Admin",
        "action": "Created Vendor",
        "module": "Vendor",
        "date": "2026-08-06"
    },
    {
        "id": 2,
        "user": "Procurement Manager",
        "action": "Approved Purchase Order",
        "module": "Purchase Order",
        "date": "2026-08-06"
    }
]


@router.get("/")
def get_audit_logs():
    return audit_logs


@router.get("/{log_id}")
def get_audit_log(log_id: int):
    for log in audit_logs:
        if log["id"] == log_id:
            return log

    return {"message": "Audit Log not found"}
