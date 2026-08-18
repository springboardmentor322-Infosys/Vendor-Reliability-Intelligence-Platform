from fastapi import APIRouter, Depends, HTTPException, status
from db import conn
from auth import get_current_user, check_role

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])

def log_action(user_id: int, user_name: str, user_email: str, action: str, entity_type: str, entity_id: str, details: str, ip_address: str = None):
    try:
        # Use a local connection or rollback state carefully
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO audit_logs (user_id, user_name, user_email, action, entity_type, entity_id, details, ip_address, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            """, (user_id, user_name, user_email, action, entity_type, entity_id, details, ip_address))
            conn.commit()
    except Exception as e:
        conn.rollback()
        print("AUDIT LOG LOGGING FAILURE:", e)

@router.get("")
def get_audit_logs(
    page: int = 1,
    limit: int = 50,
    current_user: dict = Depends(check_role(["Admin", "Auditor"]))
):
    try:
        conn.rollback()
        offset = (page - 1) * limit
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    al.id, 
                    al.user_id, 
                    al.user_name, 
                    al.user_email, 
                    al.action, 
                    al.entity_type, 
                    al.entity_id, 
                    al.details, 
                    al.ip_address, 
                    al.created_at,
                    u.role AS user_role
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                ORDER BY al.created_at DESC
                LIMIT %s OFFSET %s
            """, (limit, offset))
            rows = cursor.fetchall()
            conn.commit()
            
        logs = []
        for row in rows:
            logs.append({
                "id": row[0],
                "user_id": row[1],
                "user_name": row[2],
                "user_email": row[3],
                "action": row[4],
                "action_type": row[4],
                "entity_type": row[5],
                "entity_id": row[6],
                "details": row[7],
                "ip_address": row[8],
                "created_at": str(row[9]) if row[9] else "",
                "user_role": row[10] or "N/A"
            })
        return logs

    except Exception as e:
        conn.rollback()
        print("GET AUDIT LOGS ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )
