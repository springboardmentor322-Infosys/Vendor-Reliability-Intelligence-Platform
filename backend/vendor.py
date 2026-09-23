import os
import re
import time
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Form, File, UploadFile, HTTPException, Depends, Header
from fastapi.responses import FileResponse
from db import conn
from auth import get_current_user, check_role, SECRET_KEY, ALGORITHM
import jwt

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads", "vendor_documents")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Validation regular expressions
PAN_REGEX = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$")
GSTIN_REGEX = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")
IFSC_REGEX = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
PHONE_REGEX = re.compile(r"^(?:\+91|0)?[6-9]\d{9}$")
PIN_REGEX = re.compile(r"^\d{6}$")
ACCOUNT_REGEX = re.compile(r"^\d{8,20}$")


def get_optional_current_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    if not authorization:
        return None
    try:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
    except Exception:
        return None
    return None


def generate_unique_vendor_code(cur) -> str:
    """Generate the next unique VEN-xxxxx formatted vendor code."""
    cur.execute("""
        SELECT COALESCE(MAX(
            CASE
                WHEN vendor_code ~ '^VEN-[0-9]+$' THEN SUBSTRING(vendor_code FROM 5)::INTEGER
                ELSE 0
            END
        ), 0) + 1 FROM vendors
    """)
    next_num = cur.fetchone()[0]
    candidate = f"VEN-{next_num:05d}"

    # Ensure absolute collision prevention
    cur.execute("SELECT id FROM vendors WHERE vendor_code = %s", (candidate,))
    if cur.fetchone():
        cur.execute("SELECT COALESCE(MAX(id), 0) + 1000 FROM vendors")
        fallback_num = cur.fetchone()[0]
        candidate = f"VEN-{fallback_num:05d}"
    return candidate


async def save_uploaded_doc(file: Optional[UploadFile], prefix: str, vendor_key: str) -> Optional[str]:
    """Safely persist an uploaded verification document to local storage."""
    if not file or not file.filename:
        return None
    raw_ext = os.path.splitext(file.filename)[1].lower()
    allowed_exts = [".pdf", ".png", ".jpg", ".jpeg"]
    ext = raw_ext if raw_ext in allowed_exts else ".pdf"
    safe_key = re.sub(r"[^a-zA-Z0-9_]", "_", vendor_key)
    filename = f"{prefix}_{safe_key}_{int(time.time() * 1000)}{ext}"
    target_path = os.path.join(UPLOAD_DIR, filename)

    content = await file.read()
    if not content:
        return None
    with open(target_path, "wb") as f:
        f.write(content)
    return filename


# ==================================================
# REGISTER / ADD VENDOR (FULL PRODUCTION ONBOARDING)
# ==================================================
@router.post("/vendors")
@router.post("/vendors/register")
async def register_vendor(
    # Company Information
    vendor_name: str = Form(...),
    company: Optional[str] = Form(None),
    company_type: Optional[str] = Form(None),
    pan: Optional[str] = Form(None),
    gstin: Optional[str] = Form(None),
    cin: Optional[str] = Form(None),
    msme_number: Optional[str] = Form(None),

    # Contact Information
    address: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    state: Optional[str] = Form(None),
    pin_code: Optional[str] = Form(None),
    contact_person: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),

    # Business Information
    category: Optional[str] = Form(None),
    products_services: Optional[str] = Form(None),
    business_description: Optional[str] = Form(None),

    # Bank Details
    bank_account_name: Optional[str] = Form(None),
    bank_name: Optional[str] = Form(None),
    bank_account_number: Optional[str] = Form(None),
    bank_ifsc: Optional[str] = Form(None),
    bank_branch: Optional[str] = Form(None),

    # Document Uploads
    doc_pan: Optional[UploadFile] = File(None),
    doc_cancelled_cheque: Optional[UploadFile] = File(None),
    doc_gst: Optional[UploadFile] = File(None),
    doc_incorporation: Optional[UploadFile] = File(None),
    doc_msme: Optional[UploadFile] = File(None),

    # Optional authentication
    current_user: Optional[dict] = Depends(get_optional_current_user)
):
    try:
        # 1. Clean and normalize string inputs
        v_name = (vendor_name or "").strip()
        comp = (company or v_name).strip()
        c_type = (company_type or "").strip()
        clean_pan = (pan or "").strip().upper()
        clean_gstin = (gstin or "").strip().upper() or None
        clean_cin = (cin or "").strip().upper() or None
        clean_msme = (msme_number or "").strip().upper() or None

        addr = (address or "").strip()
        c_city = (city or "").strip()
        c_state = (state or "").strip()
        c_pin = (pin_code or "").strip()
        c_person = (contact_person or "").strip()
        c_email = (email or "").strip().lower()
        c_phone = re.sub(r"[\s\-\(\)]", "", (phone or "").strip())

        c_cat = (category or "").strip()
        c_prod = (products_services or "").strip()
        c_desc = (business_description or "").strip() or None

        b_acc_name = (bank_account_name or "").strip()
        b_name = (bank_name or "").strip()
        b_acc_num = re.sub(r"[\s\-]", "", (bank_account_number or "").strip())
        b_ifsc = (bank_ifsc or "").strip().upper()
        b_branch = (bank_branch or "").strip() or None

        # 2. Server-side validation of mandatory fields
        missing_fields = []
        if not v_name: missing_fields.append("Company/Firm Name")
        if not c_type: missing_fields.append("Vendor/Company Type")
        if not clean_pan: missing_fields.append("PAN")
        if not addr: missing_fields.append("Registered Address")
        if not c_city: missing_fields.append("City")
        if not c_state: missing_fields.append("State")
        if not c_pin: missing_fields.append("PIN Code")
        if not c_person: missing_fields.append("Contact Person")
        if not c_email: missing_fields.append("Official Email")
        if not c_phone: missing_fields.append("Mobile Number")
        if not c_cat: missing_fields.append("Product Category")
        if not c_prod: missing_fields.append("Products/Services Offered")
        if not b_acc_name: missing_fields.append("Account Holder Name")
        if not b_name: missing_fields.append("Bank Name")
        if not b_acc_num: missing_fields.append("Account Number")
        if not b_ifsc: missing_fields.append("IFSC Code")

        if missing_fields:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required fields: {', '.join(missing_fields)}"
            )

        # 3. Format validations
        if not EMAIL_REGEX.match(c_email):
            raise HTTPException(status_code=400, detail="Invalid email address format.")

        if not PHONE_REGEX.match(c_phone):
            raise HTTPException(status_code=400, detail="Invalid mobile number. Please provide a valid 10-digit Indian mobile number.")

        if not PAN_REGEX.match(clean_pan):
            raise HTTPException(status_code=400, detail="Invalid PAN format. Standard format is 5 uppercase letters, 4 digits, 1 uppercase letter (e.g. ABCDE1234F).")

        if clean_gstin and not GSTIN_REGEX.match(clean_gstin):
            raise HTTPException(status_code=400, detail="Invalid GSTIN format. Expected 15-character alphanumeric GSTIN (e.g. 22AAAAA0000A1Z5).")

        if not PIN_REGEX.match(c_pin):
            raise HTTPException(status_code=400, detail="Invalid PIN code. Expected exactly 6 numeric digits.")

        if not IFSC_REGEX.match(b_ifsc):
            raise HTTPException(status_code=400, detail="Invalid IFSC code format. Standard format is 4 letters, '0', followed by 6 alphanumeric characters (e.g. SBIN0001234).")

        if not ACCOUNT_REGEX.match(b_acc_num):
            raise HTTPException(status_code=400, detail="Invalid Bank Account Number. Expected 8 to 20 numeric digits.")

        # 4. Mandatory Document uploads check
        if not doc_pan or not doc_pan.filename:
            raise HTTPException(status_code=400, detail="PAN document file upload is mandatory.")
        if not doc_cancelled_cheque or not doc_cancelled_cheque.filename:
            raise HTTPException(status_code=400, detail="Cancelled Cheque file upload is mandatory.")

        # 5. Database duplicate prevention check (excluding rejected registrations)
        conn.rollback()
        with conn.cursor() as cursor:
            # Check PAN uniqueness
            cursor.execute(
                "SELECT id, vendor_name, status FROM vendors WHERE pan = %s AND status NOT IN ('Rejected')",
                (clean_pan,)
            )
            existing_pan = cursor.fetchone()
            if existing_pan:
                raise HTTPException(
                    status_code=409,
                    detail=f"Vendor with PAN '{clean_pan}' is already registered (Status: {existing_pan[2]}). Duplicate registration is not permitted."
                )

            # Check GSTIN uniqueness if provided
            if clean_gstin:
                cursor.execute(
                    "SELECT id, vendor_name, status FROM vendors WHERE gstin = %s AND status NOT IN ('Rejected')",
                    (clean_gstin,)
                )
                existing_gst = cursor.fetchone()
                if existing_gst:
                    raise HTTPException(
                        status_code=409,
                        detail=f"Vendor with GSTIN '{clean_gstin}' is already registered (Status: {existing_gst[2]})."
                    )

            # Check Official Email uniqueness
            cursor.execute(
                "SELECT id, vendor_name, status FROM vendors WHERE LOWER(email) = %s AND status NOT IN ('Rejected')",
                (c_email,)
            )
            existing_email = cursor.fetchone()
            if existing_email:
                raise HTTPException(
                    status_code=409,
                    detail=f"Vendor with official email '{c_email}' is already registered (Status: {existing_email[2]})."
                )

        # 6. Save uploaded documents safely
        pan_filename = await save_uploaded_doc(doc_pan, "pan", clean_pan)
        cheque_filename = await save_uploaded_doc(doc_cancelled_cheque, "cheque", clean_pan)
        gst_filename = await save_uploaded_doc(doc_gst, "gst", clean_pan) if doc_gst else None
        incorp_filename = await save_uploaded_doc(doc_incorporation, "incorp", clean_pan) if doc_incorporation else None
        msme_filename = await save_uploaded_doc(doc_msme, "msme", clean_pan) if doc_msme else None

        # 7. Initial Status is strictly PENDING_VERIFICATION
        initial_status = "Pending Verification"
        created_by_id = current_user.get("id") if current_user else None

        # 8. Persist new vendor record
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO vendors
                (
                    vendor_name,
                    company,
                    company_type,
                    pan,
                    gstin,
                    cin,
                    msme_number,
                    address,
                    city,
                    state,
                    pin_code,
                    contact_person,
                    email,
                    phone,
                    category,
                    products_services,
                    business_description,
                    bank_account_name,
                    bank_name,
                    bank_account_number,
                    bank_ifsc,
                    bank_branch,
                    doc_pan,
                    doc_cancelled_cheque,
                    doc_gst,
                    doc_incorporation,
                    doc_msme,
                    status,
                    created_by,
                    created_at,
                    updated_at
                )
                VALUES
                (
                    %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                RETURNING id
                """,
                (
                    v_name,
                    comp,
                    c_type,
                    clean_pan,
                    clean_gstin,
                    clean_cin,
                    clean_msme,
                    addr,
                    c_city,
                    c_state,
                    c_pin,
                    c_person,
                    c_email,
                    c_phone,
                    c_cat,
                    c_prod,
                    c_desc,
                    b_acc_name,
                    b_name,
                    b_acc_num,
                    b_ifsc,
                    b_branch,
                    pan_filename,
                    cheque_filename,
                    gst_filename,
                    incorp_filename,
                    msme_filename,
                    initial_status,
                    created_by_id
                )
            )
            new_vendor_id = cursor.fetchone()[0]
        conn.commit()

        # 9. Audit Logging
        try:
            from audit_logs import log_action
            user_id = current_user.get("id") if current_user else new_vendor_id
            user_name = current_user.get("name") if current_user else c_person
            user_email = current_user.get("email") if current_user else c_email
            log_action(
                user_id=user_id,
                user_name=user_name,
                user_email=user_email,
                action="VENDOR_REGISTRATION_SUBMITTED",
                entity_type="VENDOR",
                entity_id=str(new_vendor_id),
                details=f"New vendor registration submitted for '{v_name}' (PAN: {clean_pan}). Status: Pending Verification."
            )
        except Exception as le:
            print("Audit log error on vendor registration:", le)

        return {
            "message": "Vendor registration submitted successfully. Application is pending verification by the Procurement team.",
            "vendor_id": new_vendor_id,
            "id": new_vendor_id,
            "status": initial_status,
            "vendor_name": v_name
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()
        print("VENDOR REGISTRATION ERROR:", e)
        raise HTTPException(status_code=500, detail=f"Vendor registration failed: {str(e)}")


# ==================================================
# RESUBMIT VENDOR (AFTER CORRECTION REQUESTED)
# ==================================================
@router.put("/vendors/{id}/resubmit")
async def resubmit_vendor(
    id: int,
    vendor_name: str = Form(...),
    company: Optional[str] = Form(None),
    company_type: Optional[str] = Form(None),
    pan: Optional[str] = Form(None),
    gstin: Optional[str] = Form(None),
    cin: Optional[str] = Form(None),
    msme_number: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    state: Optional[str] = Form(None),
    pin_code: Optional[str] = Form(None),
    contact_person: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    products_services: Optional[str] = Form(None),
    business_description: Optional[str] = Form(None),
    bank_account_name: Optional[str] = Form(None),
    bank_name: Optional[str] = Form(None),
    bank_account_number: Optional[str] = Form(None),
    bank_ifsc: Optional[str] = Form(None),
    bank_branch: Optional[str] = Form(None),
    doc_pan: Optional[UploadFile] = File(None),
    doc_cancelled_cheque: Optional[UploadFile] = File(None),
    doc_gst: Optional[UploadFile] = File(None),
    doc_incorporation: Optional[UploadFile] = File(None),
    doc_msme: Optional[UploadFile] = File(None),
    current_user: Optional[dict] = Depends(get_optional_current_user)
):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, status, doc_pan, doc_cancelled_cheque, doc_gst, doc_incorporation, doc_msme FROM vendors WHERE id = %s", (id,))
            target = cursor.fetchone()
            if not target:
                raise HTTPException(status_code=404, detail=f"Vendor #{id} not found.")

            v_status = target[1]
            if v_status not in ("Correction Requested", "Pending Verification", "Pending"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Vendor #{id} cannot be resubmitted while in '{v_status}' status. Resubmission is only allowed for 'Correction Requested' or 'Pending Verification'."
                )

        v_name = (vendor_name or "").strip()
        comp = (company or v_name).strip()
        c_type = (company_type or "").strip()
        clean_pan = (pan or "").strip().upper()
        clean_gstin = (gstin or "").strip().upper() or None
        clean_cin = (cin or "").strip().upper() or None
        clean_msme = (msme_number or "").strip().upper() or None

        addr = (address or "").strip()
        c_city = (city or "").strip()
        c_state = (state or "").strip()
        c_pin = (pin_code or "").strip()
        c_person = (contact_person or "").strip()
        c_email = (email or "").strip().lower()
        c_phone = re.sub(r"[\s\-\(\)]", "", (phone or "").strip())

        c_cat = (category or "").strip()
        c_prod = (products_services or "").strip()
        c_desc = (business_description or "").strip() or None

        b_acc_name = (bank_account_name or "").strip()
        b_name = (bank_name or "").strip()
        b_acc_num = re.sub(r"[\s\-]", "", (bank_account_number or "").strip())
        b_ifsc = (bank_ifsc or "").strip().upper()
        b_branch = (bank_branch or "").strip() or None

        # Format checks
        if not EMAIL_REGEX.match(c_email):
            raise HTTPException(status_code=400, detail="Invalid email address format.")
        if not PHONE_REGEX.match(c_phone):
            raise HTTPException(status_code=400, detail="Invalid mobile number.")
        if not PAN_REGEX.match(clean_pan):
            raise HTTPException(status_code=400, detail="Invalid PAN format.")
        if clean_gstin and not GSTIN_REGEX.match(clean_gstin):
            raise HTTPException(status_code=400, detail="Invalid GSTIN format.")
        if not PIN_REGEX.match(c_pin):
            raise HTTPException(status_code=400, detail="Invalid PIN code.")
        if not IFSC_REGEX.match(b_ifsc):
            raise HTTPException(status_code=400, detail="Invalid IFSC code.")
        if not ACCOUNT_REGEX.match(b_acc_num):
            raise HTTPException(status_code=400, detail="Invalid Account Number.")

        # Duplicate check against other vendors
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM vendors WHERE pan = %s AND id != %s AND status NOT IN ('Rejected')", (clean_pan, id))
            if cursor.fetchone():
                raise HTTPException(status_code=409, detail=f"PAN '{clean_pan}' is already registered with another vendor.")
            if clean_gstin:
                cursor.execute("SELECT id FROM vendors WHERE gstin = %s AND id != %s AND status NOT IN ('Rejected')", (clean_gstin, id))
                if cursor.fetchone():
                    raise HTTPException(status_code=409, detail=f"GSTIN '{clean_gstin}' is already registered with another vendor.")

        # Handle document replacements (or retain existing)
        cur_pan_doc = target[2]
        cur_cheque_doc = target[3]
        cur_gst_doc = target[4]
        cur_incorp_doc = target[5]
        cur_msme_doc = target[6]

        new_pan_doc = await save_uploaded_doc(doc_pan, "pan", clean_pan) if doc_pan and doc_pan.filename else cur_pan_doc
        new_cheque_doc = await save_uploaded_doc(doc_cancelled_cheque, "cheque", clean_pan) if doc_cancelled_cheque and doc_cancelled_cheque.filename else cur_cheque_doc
        new_gst_doc = await save_uploaded_doc(doc_gst, "gst", clean_pan) if doc_gst and doc_gst.filename else cur_gst_doc
        new_incorp_doc = await save_uploaded_doc(doc_incorporation, "incorp", clean_pan) if doc_incorporation and doc_incorporation.filename else cur_incorp_doc
        new_msme_doc = await save_uploaded_doc(doc_msme, "msme", clean_pan) if doc_msme and doc_msme.filename else cur_msme_doc

        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE vendors
                SET
                    vendor_name = %s,
                    company = %s,
                    company_type = %s,
                    pan = %s,
                    gstin = %s,
                    cin = %s,
                    msme_number = %s,
                    address = %s,
                    city = %s,
                    state = %s,
                    pin_code = %s,
                    contact_person = %s,
                    email = %s,
                    phone = %s,
                    category = %s,
                    products_services = %s,
                    business_description = %s,
                    bank_account_name = %s,
                    bank_name = %s,
                    bank_account_number = %s,
                    bank_ifsc = %s,
                    bank_branch = %s,
                    doc_pan = %s,
                    doc_cancelled_cheque = %s,
                    doc_gst = %s,
                    doc_incorporation = %s,
                    doc_msme = %s,
                    status = 'Pending Verification',
                    correction_reason = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (
                    v_name, comp, c_type, clean_pan, clean_gstin, clean_cin, clean_msme,
                    addr, c_city, c_state, c_pin, c_person, c_email, c_phone,
                    c_cat, c_prod, c_desc,
                    b_acc_name, b_name, b_acc_num, b_ifsc, b_branch,
                    new_pan_doc, new_cheque_doc, new_gst_doc, new_incorp_doc, new_msme_doc,
                    id
                )
            )
        conn.commit()

        try:
            from audit_logs import log_action
            log_action(
                user_id=current_user.get("id") if current_user else id,
                user_name=current_user.get("name") if current_user else c_person,
                user_email=current_user.get("email") if current_user else c_email,
                action="VENDOR_RESUBMITTED",
                entity_type="VENDOR",
                entity_id=str(id),
                details=f"Vendor #{id} ('{v_name}') resubmitted application for verification."
            )
        except Exception:
            pass

        return {
            "message": "Vendor registration resubmitted successfully. Pending verification by the Procurement team.",
            "vendor_id": id,
            "id": id,
            "status": "Pending Verification"
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Resubmission failed: {str(e)}")


# ==================================================
# APPROVAL WORKFLOW ENDPOINTS (ADMIN & PROCUREMENT)
# ==================================================

@router.post("/vendors/{id}/approve")
def approve_vendor(
    id: int,
    notes: Optional[str] = Form(None),
    current_user: dict = Depends(check_role(["Admin", "Administrator", "Procurement Manager"]))
):
    """Approve a vendor: generates unique VEN-xxxxx Vendor ID and sets status to Active."""
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, vendor_name, status, vendor_code, email FROM vendors WHERE id = %s", (id,))
            vendor = cursor.fetchone()
            if not vendor:
                raise HTTPException(status_code=404, detail=f"Vendor #{id} not found.")

            v_id, v_name, v_status, v_code, v_email = vendor

            if v_status == "Active" and v_code:
                return {
                    "message": f"Vendor '{v_name}' is already Active.",
                    "vendor_id": v_id,
                    "vendor_code": v_code,
                    "status": "Active"
                }

            # Generate unique vendor code (e.g. VEN-00125)
            new_vendor_code = v_code or generate_unique_vendor_code(cursor)
            approver_name = current_user.get("name") or current_user.get("email") or "Procurement Authority"
            now_dt = datetime.utcnow()

            cursor.execute(
                """
                UPDATE vendors
                SET
                    vendor_code = %s,
                    status = 'Active',
                    approved_by = %s,
                    approved_at = %s,
                    rejection_reason = NULL,
                    correction_reason = NULL,
                    review_notes = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (new_vendor_code, approver_name, now_dt, notes or "Approved by authorized procurement reviewer", id)
            )

            # If a user account exists with this email, link to this vendor_id and set Active
            if v_email:
                cursor.execute(
                    """
                    UPDATE users
                    SET vendor_id = %s, status = 'Active', updated_at = CURRENT_TIMESTAMP
                    WHERE LOWER(email) = LOWER(%s) AND (vendor_id IS NULL OR vendor_id = %s)
                    """,
                    (id, v_email, id)
                )

        conn.commit()

        # Audit log
        try:
            from audit_logs import log_action
            log_action(
                user_id=current_user.get("id"),
                user_name=approver_name,
                user_email=current_user.get("email"),
                action="VENDOR_APPROVED",
                entity_type="VENDOR",
                entity_id=str(id),
                details=f"Approved vendor '{v_name}'. Generated Vendor ID: {new_vendor_code}. Status: Active."
            )
        except Exception as le:
            print("Audit log error on approval:", le)

        return {
            "message": f"Vendor '{v_name}' approved successfully.",
            "vendor_id": id,
            "id": id,
            "vendor_code": new_vendor_code,
            "status": "Active",
            "approved_by": approver_name,
            "approved_at": now_dt.isoformat()
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        print("APPROVE VENDOR ERROR:", e)
        raise HTTPException(status_code=500, detail=f"Failed to approve vendor: {str(e)}")


@router.post("/vendors/{id}/reject")
def reject_vendor(
    id: int,
    rejection_reason: str = Form(...),
    notes: Optional[str] = Form(None),
    current_user: dict = Depends(check_role(["Admin", "Administrator", "Procurement Manager"]))
):
    """Reject a vendor application with mandatory reason."""
    reason = (rejection_reason or "").strip()
    if not reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required.")

    try:
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, vendor_name FROM vendors WHERE id = %s", (id,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail=f"Vendor #{id} not found.")

            v_name = row[1]
            reviewer_name = current_user.get("name") or current_user.get("email") or "Procurement Authority"

            cursor.execute(
                """
                UPDATE vendors
                SET
                    status = 'Rejected',
                    rejection_reason = %s,
                    review_notes = %s,
                    approved_by = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (reason, notes or f"Rejected by {reviewer_name}", reviewer_name, id)
            )
        conn.commit()

        try:
            from audit_logs import log_action
            log_action(
                user_id=current_user.get("id"),
                user_name=reviewer_name,
                user_email=current_user.get("email"),
                action="VENDOR_REJECTED",
                entity_type="VENDOR",
                entity_id=str(id),
                details=f"Rejected vendor '{v_name}'. Reason: {reason}"
            )
        except Exception:
            pass

        return {
            "message": f"Vendor '{v_name}' registration has been rejected.",
            "vendor_id": id,
            "id": id,
            "status": "Rejected",
            "rejection_reason": reason
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to reject vendor: {str(e)}")


@router.post("/vendors/{id}/request-correction")
def request_vendor_correction(
    id: int,
    correction_reason: str = Form(...),
    notes: Optional[str] = Form(None),
    current_user: dict = Depends(check_role(["Admin", "Administrator", "Procurement Manager"]))
):
    """Request corrections from the vendor with specific reason/instructions."""
    reason = (correction_reason or "").strip()
    if not reason:
        raise HTTPException(status_code=400, detail="Correction reason is required.")

    try:
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, vendor_name FROM vendors WHERE id = %s", (id,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail=f"Vendor #{id} not found.")

            v_name = row[1]
            reviewer_name = current_user.get("name") or current_user.get("email") or "Procurement Authority"

            cursor.execute(
                """
                UPDATE vendors
                SET
                    status = 'Correction Requested',
                    correction_reason = %s,
                    review_notes = %s,
                    approved_by = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (reason, notes or f"Correction requested by {reviewer_name}", reviewer_name, id)
            )
        conn.commit()

        try:
            from audit_logs import log_action
            log_action(
                user_id=current_user.get("id"),
                user_name=reviewer_name,
                user_email=current_user.get("email"),
                action="VENDOR_CORRECTION_REQUESTED",
                entity_type="VENDOR",
                entity_id=str(id),
                details=f"Correction requested for vendor '{v_name}'. Details: {reason}"
            )
        except Exception:
            pass

        return {
            "message": f"Correction requested for vendor '{v_name}'.",
            "vendor_id": id,
            "id": id,
            "status": "Correction Requested",
            "correction_reason": reason
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to request correction: {str(e)}")


# ==================================================
# DOCUMENT ACCESS (SECURE SERVING)
# ==================================================

@router.get("/vendors/{id}/documents/{doc_type}")
def get_vendor_document(
    id: int,
    doc_type: str,
    token: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """Safely stream uploaded verification documents to authorized users."""
    raw_token = token
    if authorization and authorization.startswith("Bearer "):
        raw_token = authorization.split(" ")[1]

    if not raw_token:
        raise HTTPException(status_code=401, detail="Authentication token required to view verification documents.")

    try:
        user = jwt.decode(raw_token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    user_role = user.get("role")
    user_vendor_id = user.get("vendor_id")

    if user_role == "Vendor" and id != user_vendor_id:
        raise HTTPException(status_code=403, detail="Permission Denied: Cannot access another vendor's documents.")
    elif user_role not in ["Admin", "Administrator", "Procurement Manager", "Auditor", "Vendor"]:
        raise HTTPException(status_code=403, detail="Permission Denied.")

    valid_types = {
        "pan": "doc_pan",
        "gst": "doc_gst",
        "incorporation": "doc_incorporation",
        "cancelled_cheque": "doc_cancelled_cheque",
        "cheque": "doc_cancelled_cheque",
        "msme": "doc_msme"
    }

    if doc_type.lower() not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid document type. Must be one of: {list(valid_types.keys())}")

    db_col = valid_types[doc_type.lower()]
    conn.rollback()
    with conn.cursor() as cur:
        cur.execute(f"SELECT {db_col} FROM vendors WHERE id = %s", (id,))
        row = cur.fetchone()

    if not row or not row[0]:
        raise HTTPException(status_code=404, detail="Document not on file for this vendor.")

    filename = row[0]
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Document file not found on disk.")

    return FileResponse(file_path, filename=filename)


# ==================================================
# GET ALL VENDORS
# ==================================================
@router.get("/vendors")
def get_vendors(
    status: Optional[str] = None,
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    try:
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")

        conn.rollback()
        with conn.cursor() as cursor:
            query = """
                SELECT
                    id,
                    vendor_name,
                    company,
                    email,
                    phone,
                    address,
                    reliability_score,
                    quality_score,
                    delivery_rate,
                    total_orders,
                    completed_orders,
                    category,
                    status,
                    vendor_code,
                    company_type,
                    pan,
                    gstin,
                    cin,
                    msme_number,
                    pin_code,
                    city,
                    state,
                    contact_person,
                    approved_by,
                    approved_at,
                    rejection_reason,
                    correction_reason,
                    products_services,
                    business_description,
                    bank_account_name,
                    bank_name,
                    bank_account_number,
                    bank_ifsc,
                    bank_branch,
                    doc_pan,
                    doc_cancelled_cheque,
                    doc_gst,
                    doc_incorporation,
                    doc_msme
                FROM vendors
                WHERE 1=1
            """
            params = []

            if user_role == "Vendor":
                if not user_vendor_id:
                    return []
                query += " AND id = %s"
                params.append(user_vendor_id)
            else:
                if status and status.strip():
                    query += " AND LOWER(status) = LOWER(%s)"
                    params.append(status.strip())
                if category and category.strip():
                    query += " AND LOWER(category) = LOWER(%s)"
                    params.append(category.strip())

            query += " ORDER BY id"
            cursor.execute(query, tuple(params))
            data = cursor.fetchall()

        vendors = []
        for row in data:
            v_code = row[13] or f"VEN-{row[0]:05d}"
            vendors.append({
                "id": row[0],
                "vendor_name": row[1],
                "company": row[2],
                "email": row[3],
                "phone": row[4],
                "address": row[5],
                "reliability_score": float(row[6] or 0),
                "quality_score": float(row[7] or 0),
                "delivery_rate": float(row[8] or 0),
                "total_orders": int(row[9] or 0),
                "completed_orders": int(row[10] or 0),
                "category": row[11],
                "status": row[12],
                "vendor_code": v_code,
                "company_type": row[14],
                "pan": row[15],
                "gstin": row[16],
                "cin": row[17],
                "msme_number": row[18],
                "pin_code": row[19],
                "city": row[20],
                "state": row[21],
                "contact_person": row[22],
                "approved_by": row[23],
                "approved_at": row[24].isoformat() if row[24] else None,
                "rejection_reason": row[25],
                "correction_reason": row[26],
                "products_services": row[27],
                "business_description": row[28],
                "bank_account_name": row[29],
                "bank_name": row[30],
                "bank_account_number": row[31],
                "bank_ifsc": row[32],
                "bank_branch": row[33],
                "doc_pan": row[34],
                "doc_cancelled_cheque": row[35],
                "doc_gst": row[36],
                "doc_incorporation": row[37],
                "doc_msme": row[38]
            })

        return vendors

    except Exception as e:
        conn.rollback()
        print("GET VENDORS ERROR:", e)
        return {"error": str(e)}


# ==================================================
# GET VENDOR BY ID
# ==================================================
@router.get("/vendors/{id}")
def get_vendor(id: int, current_user: dict = Depends(get_current_user)):
    try:
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")

        if user_role == "Vendor" and id != user_vendor_id:
            raise HTTPException(status_code=403, detail="Permission Denied: Cannot access another vendor's profile")

        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    vendor_name,
                    company,
                    email,
                    phone,
                    address,
                    reliability_score,
                    quality_score,
                    delivery_rate,
                    total_orders,
                    completed_orders,
                    category,
                    status,
                    contact_person,
                    city,
                    state,
                    pin_code,
                    vendor_code,
                    company_type,
                    pan,
                    gstin,
                    cin,
                    msme_number,
                    products_services,
                    business_description,
                    bank_account_name,
                    bank_name,
                    bank_account_number,
                    bank_ifsc,
                    bank_branch,
                    approved_by,
                    approved_at,
                    rejection_reason,
                    correction_reason,
                    review_notes,
                    doc_pan,
                    doc_cancelled_cheque,
                    doc_gst,
                    doc_incorporation,
                    doc_msme
                FROM vendors
                WHERE id = %s
                """,
                (id,)
            )
            row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Vendor not found")

        v_code = row[17] or f"VEN-{row[0]:05d}"
        return {
            "id": row[0],
            "vendor_name": row[1],
            "name": row[1],
            "company": row[2],
            "email": row[3],
            "phone": row[4],
            "address": row[5],
            "reliability_score": float(row[6] or 0),
            "quality_score": float(row[7] or 0),
            "delivery_rate": float(row[8] or 0),
            "total_orders": int(row[9] or 0),
            "completed_orders": int(row[10] or 0),
            "category": row[11],
            "status": row[12],
            "contact_name": row[13],
            "contact_person": row[13],
            "city": row[14],
            "state": row[15],
            "pin_code": row[16],
            "vendor_code": v_code,
            "company_type": row[18],
            "pan": row[19],
            "gstin": row[20],
            "cin": row[21],
            "msme_number": row[22],
            "products_services": row[23],
            "business_description": row[24],
            "bank_account_name": row[25],
            "bank_name": row[26],
            "bank_account_number": row[27],
            "bank_ifsc": row[28],
            "bank_branch": row[29],
            "approved_by": row[30],
            "approved_at": row[31].isoformat() if row[31] else None,
            "rejection_reason": row[32],
            "correction_reason": row[33],
            "review_notes": row[34],
            "doc_pan": row[35],
            "doc_cancelled_cheque": row[36],
            "doc_gst": row[37],
            "doc_incorporation": row[38],
            "doc_msme": row[39]
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"GET VENDOR {id} ERROR:", e)
        return {"error": str(e)}


# ==================================================
# UPDATE VENDOR (LEGACY & GENERAL PROFILE EDIT)
# ==================================================
@router.put("/vendors/{id}")
def update_vendor(
    id: int,
    vendor_name: str = Form(...),
    company: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    category: str = Form(...),
    status: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    try:
        user_role = current_user.get("role")
        user_vendor_id = current_user.get("vendor_id")

        if user_role == "Vendor":
            if id != user_vendor_id:
                raise HTTPException(status_code=403, detail="Permission Denied: Cannot modify another vendor")
            with conn.cursor() as cursor:
                cursor.execute("SELECT status FROM vendors WHERE id = %s", (id,))
                current_status_row = cursor.fetchone()
                status = current_status_row[0] if current_status_row else "Pending"
        elif user_role not in ["Admin", "Administrator", "Procurement Manager"]:
            raise HTTPException(status_code=403, detail="Permission Denied: Unauthorized role")

        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE vendors
                SET
                    vendor_name=%s,
                    company=%s,
                    email=%s,
                    phone=%s,
                    address=%s,
                    category=%s,
                    status=%s,
                    updated_at=CURRENT_TIMESTAMP
                WHERE id=%s
                """,
                (vendor_name, company, email, phone, address, category, status, id)
            )
        conn.commit()

        from audit_logs import log_action
        log_action(
            user_id=current_user.get('id'),
            user_name=current_user.get('name'),
            user_email=current_user.get('email'),
            action="VENDOR_UPDATED",
            entity_type="VENDOR",
            entity_id=str(id),
            details=f"Updated vendor details for: {vendor_name}"
        )

        return {"message": "Vendor Updated Successfully"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print("UPDATE VENDOR ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# DELETE VENDOR
# ==================================================
@router.delete("/vendors/{id}")
def delete_vendor(id: int, current_user: dict = Depends(check_role(["Admin", "Administrator"]))):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute("SELECT vendor_name FROM vendors WHERE id = %s", (id,))
            row = cursor.fetchone()
            vendor_name = row[0] if row else "Unknown"

            cursor.execute("DELETE FROM vendors WHERE id=%s", (id,))
        conn.commit()

        from audit_logs import log_action
        log_action(
            user_id=current_user.get('id'),
            user_name=current_user.get('name'),
            user_email=current_user.get('email'),
            action="VENDOR_DELETED",
            entity_type="VENDOR",
            entity_id=str(id),
            details=f"Deleted vendor: {vendor_name} (ID: {id})"
        )

        return {"message": "Vendor Deleted Successfully"}

    except Exception as e:
        conn.rollback()
        print("DELETE VENDOR ERROR:", e)
        return {"error": str(e)}


# ==================================================
# CALCULATE RELIABILITY SCORE
# ==================================================
@router.put("/vendors/calculate-score/{id}")
def calculate_score(id: int, current_user: dict = Depends(check_role(["Admin", "Procurement Manager", "Supply Chain Manager"]))):
    try:
        from vendor_performance import calculate_vendor_reliability
        final_score = calculate_vendor_reliability(id)
        if final_score is None:
            return {"message": "Vendor Not Found"}

        return {
            "message": "Reliability Score Calculated",
            "score": final_score
        }
    except Exception as e:
        print("CALCULATE SCORE ERROR:", e)
        return {"error": str(e)}
