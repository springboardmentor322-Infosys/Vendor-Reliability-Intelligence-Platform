from fastapi import APIRouter, Form, Depends, HTTPException, Request
from typing import Optional
from db import conn
from datetime import date
from auth import get_current_user, check_role

router = APIRouter()


# ==================================================
# GET CONTRACT MONITORING
# ==================================================
@router.get("/contract-monitoring")
def contract_monitoring(vendor_id: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    try:
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")

        if user_role == "Vendor":
            if vendor_id is not None and vendor_id != user_vendor_id:
                raise HTTPException(status_code=403, detail="Forbidden: Vendors may only access their own contract monitoring data.")
            target_vendor_id = user_vendor_id
        else:
            target_vendor_id = vendor_id

        conn.rollback()
        with conn.cursor() as cur:
            if target_vendor_id is not None:
                cur.execute("""
                    SELECT
                        c.id,
                        c.vendor_id,
                        v.vendor_name,
                        c.contract_name,
                        c.start_date,
                        c.end_date,
                        c.status,
                        c.contract_value,
                        c.compliance_status,
                        c.renewal_status,
                        v.category,
                        v.gst_number
                    FROM contracts c
                    JOIN vendors v
                        ON c.vendor_id = v.id
                    WHERE c.vendor_id = %s
                    ORDER BY c.end_date ASC
                """, (target_vendor_id,))
            else:
                cur.execute("""
                    SELECT
                        c.id,
                        c.vendor_id,
                        v.vendor_name,
                        c.contract_name,
                        c.start_date,
                        c.end_date,
                        c.status,
                        c.contract_value,
                        c.compliance_status,
                        c.renewal_status,
                        v.category,
                        v.gst_number
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
            c_vid = row[1]
            vendor_name = row[2]
            contract_name = row[3]
            start_date = row[4]
            end_date = row[5]
            raw_status = row[6] or "Active"
            contract_value = float(row[7] or 0.0)
            db_compliance = row[8]
            db_renewal = row[9]
            category = row[10]
            gst_number = row[11]

            # Calculate remaining days
            remaining_days = (end_date - today).days if end_date else 0

            # Dynamic lifecycle condition
            if raw_status.lower() in ("pending", "pending review"):
                monitoring_status = "Pending Review"
            elif raw_status.lower() in ("inactive", "terminated"):
                monitoring_status = raw_status
            elif end_date:
                if remaining_days < 0:
                    monitoring_status = "Expired"
                elif remaining_days <= 30:
                    monitoring_status = "Expiring Soon"
                else:
                    monitoring_status = "Active"
            else:
                monitoring_status = raw_status

            if monitoring_status == "Expired":
                recommendation = "Renew Contract Immediately"
            elif monitoring_status == "Expiring Soon":
                recommendation = "Start Renewal Process"
            elif monitoring_status in ("Pending", "Pending Review"):
                recommendation = "Review Contract"
            else:
                recommendation = "Contract Active"

            certifications = f"GSTIN: {gst_number}" if gst_number else None

            contracts.append({
                "id": contract_id,
                "vendor_id": c_vid,
                "vendor_name": vendor_name,
                "start_date": str(start_date) if start_date else "",
                "end_date": str(end_date) if end_date else "",
                "status": monitoring_status,
                "raw_status": raw_status,
                "remaining_days": remaining_days,
                "monitoring_status": monitoring_status,
                "recommendation": recommendation,
                "contract_name": contract_name,
                "contract_value": contract_value,
                "compliance_status": db_compliance,
                "renewal_status": db_renewal,
                "category": category,
                "sla_requirements": None,
                "vendor_certifications": certifications
            })

        return contracts

    except HTTPException:
        raise
    except Exception as e:
        try:
            conn.rollback()
        except:
            pass
        print("CONTRACT MONITORING ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# GET CONTRACTS (LIST)
# ==================================================
@router.get("/contracts")
def get_contracts(vendor_id: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    try:
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")

        if user_role == "Vendor":
            if vendor_id is not None and vendor_id != user_vendor_id:
                raise HTTPException(status_code=403, detail="Forbidden: Vendors may only access their own contracts.")
            target_vendor_id = user_vendor_id
        else:
            target_vendor_id = vendor_id

        conn.rollback()
        with conn.cursor() as cur:
            if target_vendor_id is not None:
                cur.execute("""
                    SELECT
                        c.id,
                        c.vendor_id,
                        v.vendor_name,
                        c.contract_name,
                        c.start_date,
                        c.end_date,
                        c.status,
                        c.contract_value,
                        c.compliance_status,
                        c.renewal_status,
                        v.category,
                        v.gst_number
                    FROM contracts c
                    JOIN vendors v
                        ON c.vendor_id = v.id
                    WHERE c.vendor_id = %s
                    ORDER BY c.id DESC
                """, (target_vendor_id,))
            else:
                cur.execute("""
                    SELECT
                        c.id,
                        c.vendor_id,
                        v.vendor_name,
                        c.contract_name,
                        c.start_date,
                        c.end_date,
                        c.status,
                        c.contract_value,
                        c.compliance_status,
                        c.renewal_status,
                        v.category,
                        v.gst_number
                    FROM contracts c
                    JOIN vendors v
                        ON c.vendor_id = v.id
                    ORDER BY c.id DESC
                """)
            rows = cur.fetchall()

        contracts = []
        today = date.today()
        for row in rows:
            cid = row[0]
            cvid = row[1]
            vendor_name = row[2]
            contract_name = row[3]
            c_start = row[4]
            c_end = row[5]
            raw_status = row[6] or "Active"
            contract_value = float(row[7] or 0.0)
            db_compliance = row[8]
            db_renewal = row[9]
            category = row[10]
            gst_number = row[11]

            remaining_days = (c_end - today).days if c_end else 0

            # Dynamic lifecycle calculation based on contract dates
            if raw_status.lower() in ("pending", "pending review"):
                lifecycle_status = "Pending Review"
            elif c_end:
                if remaining_days < 0:
                    lifecycle_status = "Expired"
                elif remaining_days <= 30:
                    lifecycle_status = "Expiring Soon"
                else:
                    lifecycle_status = "Active"
            else:
                lifecycle_status = raw_status

            certifications = f"GSTIN: {gst_number}" if gst_number else None

            contracts.append({
                "id": cid,
                "vendor_id": cvid,
                "vendor_name": vendor_name,
                "contract_name": contract_name,
                "start_date": str(c_start) if c_start else "",
                "end_date": str(c_end) if c_end else "",
                "status": lifecycle_status,
                "raw_status": raw_status,
                "lifecycle_status": lifecycle_status,
                "remaining_days": remaining_days,
                "contract_value": contract_value,
                "compliance_status": db_compliance,
                "renewal_status": db_renewal,
                "category": category,
                "sla_requirements": None,
                "vendor_certifications": certifications,
                "is_action_required": (remaining_days <= 30)
            })

        return contracts

    except HTTPException:
        raise
    except Exception as e:
        try:
            conn.rollback()
        except:
            pass
        print("GET CONTRACTS ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# GET SINGLE CONTRACT BY ID
# ==================================================
@router.get("/contracts/{contract_id}")
def get_contract_by_id(contract_id: int, current_user: dict = Depends(get_current_user)):
    try:
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")

        conn.rollback()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    c.id,
                    c.vendor_id,
                    v.vendor_name,
                    c.contract_name,
                    c.start_date,
                    c.end_date,
                    c.status,
                    c.contract_value,
                    c.compliance_status,
                    c.renewal_status,
                    v.category,
                    v.gst_number
                FROM contracts c
                JOIN vendors v
                    ON c.vendor_id = v.id
                WHERE c.id = %s
            """, (contract_id,))
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Contract not found")

        contract_vendor_id = row[1]
        # Strict isolation check: Vendors may ONLY view contracts belonging to their company
        if user_role == "Vendor" and contract_vendor_id != user_vendor_id:
            raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to view this contract.")

        today = date.today()
        c_end = row[5]
        remaining_days = (c_end - today).days if c_end else 0
        raw_status = row[6] or "Active"

        if raw_status.lower() in ("pending", "pending review"):
            lifecycle_status = "Pending Review"
        elif c_end:
            if remaining_days < 0:
                lifecycle_status = "Expired"
            elif remaining_days <= 30:
                lifecycle_status = "Expiring Soon"
            else:
                lifecycle_status = "Active"
        else:
            lifecycle_status = raw_status

        db_compliance = row[8]
        db_renewal = row[9]
        category = row[10]
        gst_number = row[11]

        certifications = f"GSTIN: {gst_number}" if gst_number else None

        return {
            "id": row[0],
            "vendor_id": contract_vendor_id,
            "vendor_name": row[2],
            "contract_name": row[3],
            "start_date": str(row[4]) if row[4] else "",
            "end_date": str(c_end) if c_end else "",
            "status": lifecycle_status,
            "raw_status": raw_status,
            "lifecycle_status": lifecycle_status,
            "remaining_days": remaining_days,
            "contract_value": float(row[7] or 0.0),
            "compliance_status": db_compliance,
            "renewal_status": db_renewal,
            "category": category,
            "sla_requirements": None,
            "vendor_certifications": certifications,
            "is_action_required": (remaining_days <= 30)
        }

    except HTTPException:
        raise
    except Exception as e:
        try:
            conn.rollback()
        except:
            pass
        print("GET CONTRACT BY ID ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# ADD CONTRACT (Admin / Procurement Manager Only)
# ==================================================
@router.post("/contracts")
async def add_contract(
    request: Request,
    current_user: dict = Depends(check_role(["Admin", "Administrator", "Procurement Manager"]))
):
    try:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            data = await request.json()
            vendor_id = int(data.get("vendor_id"))
            contract_name = str(data.get("contract_name", "")).strip()
            start_date = str(data.get("start_date", "")).strip()
            end_date = str(data.get("end_date", "")).strip()
            status = str(data.get("status", "Active")).strip()
            contract_value = float(data.get("contract_value", 0.0))
            compliance_status = data.get("compliance_status")
            renewal_status = data.get("renewal_status")
        else:
            form = await request.form()
            vendor_id = int(form.get("vendor_id"))
            contract_name = str(form.get("contract_name", "")).strip()
            start_date = str(form.get("start_date", "")).strip()
            end_date = str(form.get("end_date", "")).strip()
            status = str(form.get("status", "Active")).strip()
            contract_value = float(form.get("contract_value", 0.0))
            compliance_status = form.get("compliance_status")
            renewal_status = form.get("renewal_status")

        if not contract_name:
            raise HTTPException(status_code=400, detail="Contract name is required.")
        if end_date < start_date:
            raise HTTPException(status_code=400, detail="Contract end date cannot be earlier than start date.")
        if contract_value < 0:
            raise HTTPException(status_code=400, detail="Contract value cannot be negative.")

        conn.rollback()
        with conn.cursor() as cursor:
            # Check vendor exists to satisfy foreign key
            cursor.execute("SELECT id FROM vendors WHERE id = %s", (vendor_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail=f"Vendor with ID {vendor_id} does not exist.")

            cursor.execute("""
                INSERT INTO contracts
                (
                    vendor_id,
                    contract_name,
                    start_date,
                    end_date,
                    status,
                    contract_value,
                    compliance_status,
                    renewal_status,
                    created_by,
                    created_at,
                    updated_at
                )
                VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id
            """, (
                vendor_id,
                contract_name,
                start_date,
                end_date,
                status,
                contract_value,
                compliance_status,
                renewal_status,
                current_user.get("id")
            ))
            new_contract_id = cursor.fetchone()[0]
            conn.commit()

        # Log Contract Creation
        try:
            from audit_logs import log_action
            log_action(
                user_id=current_user.get('id'),
                user_name=current_user.get('name'),
                user_email=current_user.get('email'),
                action="CONTRACT_CREATED",
                entity_type="CONTRACT",
                entity_id=str(new_contract_id),
                details=f"Registered contract: {contract_name} (ID: {new_contract_id}) for Vendor {vendor_id}"
            )
        except Exception as log_err:
            print("Audit log error:", log_err)

        return {
            "message": "Contract added successfully",
            "contract_id": new_contract_id
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        print("ADD CONTRACT ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# EDIT / UPDATE CONTRACT (Admin / Procurement Manager Only)
# ==================================================
@router.put("/contracts/{contract_id}")
async def update_contract(
    contract_id: int,
    request: Request,
    current_user: dict = Depends(check_role(["Admin", "Administrator", "Procurement Manager"]))
):
    try:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            data = await request.json()
            vendor_id = int(data.get("vendor_id"))
            contract_name = str(data.get("contract_name", "")).strip()
            start_date = str(data.get("start_date", "")).strip()
            end_date = str(data.get("end_date", "")).strip()
            status = str(data.get("status", "Active")).strip()
            contract_value = float(data.get("contract_value", 0.0))
            compliance_status = data.get("compliance_status")
            renewal_status = data.get("renewal_status")
        else:
            form = await request.form()
            vendor_id = int(form.get("vendor_id"))
            contract_name = str(form.get("contract_name", "")).strip()
            start_date = str(form.get("start_date", "")).strip()
            end_date = str(form.get("end_date", "")).strip()
            status = str(form.get("status", "Active")).strip()
            contract_value = float(form.get("contract_value", 0.0))
            compliance_status = form.get("compliance_status")
            renewal_status = form.get("renewal_status")

        if end_date < start_date:
            raise HTTPException(status_code=400, detail="Contract end date cannot be earlier than start date.")
        if contract_value < 0:
            raise HTTPException(status_code=400, detail="Contract value cannot be negative.")

        conn.rollback()
        with conn.cursor() as cursor:
            # Check contract exists
            cursor.execute("SELECT id, contract_name FROM contracts WHERE id = %s", (contract_id,))
            existing = cursor.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="Contract not found")

            # Check vendor exists
            cursor.execute("SELECT id FROM vendors WHERE id = %s", (vendor_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail=f"Vendor with ID {vendor_id} does not exist.")

            cursor.execute("""
                UPDATE contracts
                SET
                    vendor_id = %s,
                    contract_name = %s,
                    start_date = %s,
                    end_date = %s,
                    status = %s,
                    contract_value = %s,
                    compliance_status = COALESCE(%s, compliance_status),
                    renewal_status = COALESCE(%s, renewal_status),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (
                vendor_id,
                contract_name,
                start_date,
                end_date,
                status,
                contract_value,
                compliance_status,
                renewal_status,
                contract_id
            ))
            conn.commit()

        # Log Contract Update
        try:
            from audit_logs import log_action
            log_action(
                user_id=current_user.get('id'),
                user_name=current_user.get('name'),
                user_email=current_user.get('email'),
                action="CONTRACT_UPDATED",
                entity_type="CONTRACT",
                entity_id=str(contract_id),
                details=f"Updated contract details for: {contract_name} (ID: {contract_id})"
            )
        except Exception as log_err:
            print("Audit log error:", log_err)

        return {
            "message": "Contract updated successfully"
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        print("UPDATE CONTRACT ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# DELETE CONTRACT (Admin / Administrator Only)
# ==================================================
@router.delete("/contracts/{contract_id}")
def delete_contract(contract_id: int, current_user: dict = Depends(check_role(["Admin", "Administrator"]))):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, contract_name FROM contracts WHERE id = %s", (contract_id,))
            existing = cursor.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            contract_name = existing[1]

            cursor.execute("DELETE FROM contracts WHERE id = %s", (contract_id,))
            conn.commit()

        # Log Contract Deletion
        try:
            from audit_logs import log_action
            log_action(
                user_id=current_user.get('id'),
                user_name=current_user.get('name'),
                user_email=current_user.get('email'),
                action="DELETE",
                entity_type="CONTRACT",
                entity_id=str(contract_id),
                details=f"Deleted contract: {contract_name} (ID: {contract_id})"
            )
        except Exception as log_err:
            print("Audit log error:", log_err)

        return {
            "message": "Contract deleted successfully"
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        print("DELETE CONTRACT ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))
