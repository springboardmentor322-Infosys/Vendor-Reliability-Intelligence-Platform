from fastapi import APIRouter, Form, Depends, HTTPException
from db import conn
from datetime import date
from auth import get_current_user, check_role

router = APIRouter()


@router.get("/contract-monitoring")
def contract_monitoring(current_user: dict = Depends(get_current_user)):
    try:
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")

        conn.rollback()
        with conn.cursor() as cur:
            if user_role == "Vendor":
                if not user_vendor_id:
                    return []
                cur.execute("""
                    SELECT
                        c.id,
                        c.vendor_id,
                        v.vendor_name,
                        c.contract_name,
                        c.start_date,
                        c.end_date,
                        c.status
                    FROM contracts c
                    JOIN vendors v
                        ON c.vendor_id = v.id
                    WHERE c.vendor_id = %s
                    ORDER BY c.end_date ASC
                """, (user_vendor_id,))
            else:
                cur.execute("""
                    SELECT
                        c.id,
                        c.vendor_id,
                        v.vendor_name,
                        c.contract_name,
                        c.start_date,
                        c.end_date,
                        c.status
                    FROM contracts c
                    JOIN vendors v
                        ON c.vendor_id = v.id
                    ORDER BY c.end_date ASC
                """)
            rows = cur.fetchall()

        contracts = []
        today = date.today()

        for row in rows:
            contract_id = row[0]
            vendor_id = row[1]
            vendor_name = row[2]
            contract_name = row[3]
            start_date = row[4]
            end_date = row[5]
            status = row[6]

            # Calculate remaining days
            remaining_days = (end_date - today).days

            # ==========================
            # CONTRACT CONDITION
            # ==========================
            if remaining_days < 0:
                monitoring_status = "Expired"
            elif remaining_days <= 7:
                monitoring_status = "Expiring Soon"
            elif remaining_days <= 30:
                monitoring_status = "Renewal Due Soon"
            else:
                monitoring_status = "Active"

            # ==========================
            # RECOMMENDATION
            # ==========================
            if monitoring_status == "Expired":
                recommendation = "Renew Contract Immediately"
            elif monitoring_status == "Expiring Soon":
                recommendation = "Start Renewal Process"
            elif monitoring_status == "Renewal Due Soon":
                recommendation = "Review Contract"
            else:
                recommendation = "Contract Active"

            contracts.append({
                "id": contract_id,
                "vendor_id": vendor_id,
                "vendor_name": vendor_name,
                "start_date": str(start_date),
                "end_date": str(end_date),
                "status": status,
                "remaining_days": remaining_days,
                "monitoring_status": monitoring_status,
                "recommendation": recommendation,
                "contract_name": contract_name
            })

        return contracts

    except Exception as e:
        try:
            conn.rollback()
        except:
            pass
        print("CONTRACT MONITORING ERROR:", e)
        return {
            "error": str(e)
        }


# ==================================================
# GET CONTRACTS
# ==================================================
@router.get("/contracts")
def get_contracts(current_user: dict = Depends(get_current_user)):
    try:
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")

        conn.rollback()
        with conn.cursor() as cur:
            if user_role == "Vendor":
                if not user_vendor_id:
                    return []
                cur.execute("""
                    SELECT
                        c.id,
                        c.vendor_id,
                        v.vendor_name,
                        c.contract_name,
                        c.start_date,
                        c.end_date,
                        c.status
                    FROM contracts c
                    JOIN vendors v
                        ON c.vendor_id = v.id
                    WHERE c.vendor_id = %s
                    ORDER BY c.id DESC
                """, (user_vendor_id,))
            else:
                cur.execute("""
                    SELECT
                        c.id,
                        c.vendor_id,
                        v.vendor_name,
                        c.contract_name,
                        c.start_date,
                        c.end_date,
                        c.status
                    FROM contracts c
                    JOIN vendors v
                        ON c.vendor_id = v.id
                    ORDER BY c.id DESC
                """)
            rows = cur.fetchall()

        contracts = []
        for row in rows:
            contracts.append({
                "id": row[0],
                "vendor_id": row[1],
                "vendor_name": row[2],
                "contract_name": row[3],
                "start_date": str(row[4]),
                "end_date": str(row[5]),
                "status": row[6]
            })

        return contracts

    except Exception as e:
        try:
            conn.rollback()
        except:
            pass
        print("GET CONTRACTS ERROR:", e)
        return {
            "error": str(e)
        }



# ==================================================
# ADD CONTRACT
# ==================================================
@router.post("/contracts")
def add_contract(
    vendor_id: int = Form(...),
    contract_name: str = Form(...),
    start_date: str = Form(...),
    end_date: str = Form(...),
    status: str = Form(...),
    contract_value: float = Form(0.0),
    current_user: dict = Depends(check_role(["Admin", "Procurement Manager"]))
):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            # Check vendor exists to satisfy foreign key
            cursor.execute("SELECT id FROM vendors WHERE id = %s", (vendor_id,))
            if not cursor.fetchone():
                return {
                    "error": f"Vendor with ID {vendor_id} does not exist."
                }

            cursor.execute("""
                INSERT INTO contracts
                (
                    vendor_id,
                    contract_name,
                    start_date,
                    end_date,
                    status,
                    contract_value
                )
                VALUES
                (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                vendor_id,
                contract_name,
                start_date,
                end_date,
                status,
                contract_value
            ))
            new_contract_id = cursor.fetchone()[0]
            conn.commit()

        # Log Contract Creation
        from audit_logs import log_action
        log_action(user_id=current_user.get('id'), user_name=current_user.get('name'), user_email=current_user.get('email'), action="CREATE", entity_type="CONTRACT", entity_id=str(new_contract_id), details=f"Registered contract: {contract_name}")

        return {
            "message": "Contract added successfully"
        }

    except Exception as e:
        conn.rollback()
        print("ADD CONTRACT ERROR:", e)
        return {
            "error": str(e)
        }



# ==================================================
# EDIT / UPDATE CONTRACT
# ==================================================
@router.put("/contracts/{contract_id}")
def update_contract(
    contract_id: int,
    vendor_id: int = Form(...),
    contract_name: str = Form(...),
    start_date: str = Form(...),
    end_date: str = Form(...),
    status: str = Form(...),
    contract_value: float = Form(0.0),
    current_user: dict = Depends(check_role(["Admin", "Procurement Manager", "Vendor"]))
):
    try:
        conn.rollback()
        
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")
        
        if user_role == "Vendor":
            with conn.cursor() as cursor:
                cursor.execute("SELECT vendor_id FROM contracts WHERE id = %s", (contract_id,))
                row = cursor.fetchone()
                if not row:
                    return {"message": "Contract not found"}
                if row[0] != user_vendor_id:
                    raise HTTPException(status_code=403, detail="Permission Denied: You can only edit your own contracts")
                if vendor_id != user_vendor_id:
                    raise HTTPException(status_code=403, detail="Permission Denied: You cannot assign your contract to another vendor")

        with conn.cursor() as cursor:
            # Check contract exists
            cursor.execute(
                """
                SELECT id
                FROM contracts
                WHERE id = %s
                """,
                (contract_id,)
            )
            existing = cursor.fetchone()

            if not existing:
                return {
                    "message": "Contract not found"
                }

            # Check vendor exists
            cursor.execute("SELECT id FROM vendors WHERE id = %s", (vendor_id,))
            if not cursor.fetchone():
                return {
                    "error": f"Vendor with ID {vendor_id} does not exist."
                }

            cursor.execute(
                """
                UPDATE contracts
                SET
                    vendor_id = %s,
                    contract_name = %s,
                    start_date = %s,
                    end_date = %s,
                    status = %s,
                    contract_value = %s
                WHERE id = %s
                """,
                (
                    vendor_id,
                    contract_name,
                    start_date,
                    end_date,
                    status,
                    contract_value,
                    contract_id
                )
            )
            conn.commit()

        # Log Contract Update
        from audit_logs import log_action
        log_action(user_id=current_user.get('id'), user_name=current_user.get('name'), user_email=current_user.get('email'), action="UPDATE", entity_type="CONTRACT", entity_id=str(contract_id), details=f"Updated contract details for: {contract_name}")

        return {
            "message": "Contract updated successfully"
        }

    except HTTPException as he:
        conn.rollback()
        raise he
    except Exception as e:
        conn.rollback()
        print("UPDATE CONTRACT ERROR:", e)
        return {
            "error": str(e)
        }



# ==================================================
# DELETE CONTRACT
# ==================================================
@router.delete("/contracts/{contract_id}")
def delete_contract(contract_id: int, current_user: dict = Depends(check_role(["Admin"]))):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            # Check contract exists and get details for logging
            cursor.execute(
                """
                SELECT id, contract_name
                FROM contracts
                WHERE id = %s
                """,
                (contract_id,)
            )
            existing = cursor.fetchone()

            if not existing:
                return {
                    "message": "Contract not found"
                }
            
            contract_name = existing[1]

            # Delete contract
            cursor.execute(
                """
                DELETE FROM contracts
                WHERE id = %s
                """,
                (contract_id,)
            )
            conn.commit()

        # Log Contract Deletion
        from audit_logs import log_action
        log_action(user_id=current_user.get('id'), user_name=current_user.get('name'), user_email=current_user.get('email'), action="DELETE", entity_type="CONTRACT", entity_id=str(contract_id), details=f"Deleted contract: {contract_name} (ID: {contract_id})")

        return {
            "message": "Contract deleted successfully"
        }

    except Exception as e:
        conn.rollback()
        print("DELETE CONTRACT ERROR:", e)
        return {
            "error": str(e)
        }