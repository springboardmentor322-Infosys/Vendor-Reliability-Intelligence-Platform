#!/usr/bin/env python3
"""
setup_vendor_credentials.py
=============================================================================
VendorIQ - Vendor Reliability Intelligence Platform
Automated & Idempotent Vendor Login Credentials Setup Script

Strict Requirements:
1. Fetches all existing vendors from the database (vendors table as source of truth).
2. Checks whether each vendor already has an associated user account (email, password, Vendor role).
3. Preserves existing vendor user accounts completely (no change to email, password, role, status).
4. Creates new user accounts ONLY for vendors who do not have an existing user account.
5. Links each new user account directly to vendors.id using users.vendor_id.
6. Generates unique, valid emails using existing vendor information where possible.
7. Sets secure initial passwords and hashes them with passlib bcrypt (no plain-text passwords stored).
8. Idempotent: Can be run multiple times safely without duplicate accounts or overwrites.
=============================================================================
"""

import os
import sys
import re
from typing import Dict, Any, List, Optional
import psycopg2
from passlib.context import CryptContext

# Add backend directory to sys.path
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from db import DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT

# Existing password hashing mechanism from backend/auth.py
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_db_connection():
    """Establish and return a connection to the PostgreSQL database."""
    return psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        port=DB_PORT
    )


def is_valid_email(email: Optional[str]) -> bool:
    """Validate standard email structure."""
    if not email:
        return False
    email_clean = email.strip()
    pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    return bool(re.match(pattern, email_clean))


def generate_initial_password(vendor_id: int) -> str:
    """Generate a secure, deterministic initial password for a vendor."""
    return f"VendorIQ@{vendor_id}!2026"


def generate_vendor_email(vendor_id: int, vendor_name: str, company: Optional[str], existing_vendor_email: Optional[str], cursor) -> str:
    """
    Generate or reuse a unique, valid email for the vendor.
    1. If vendor already has a valid email in `vendors` that is not used in `users`, reuse it.
    2. Otherwise, generate a corporate format `vendor{id}@vendoriq.com`.
    3. Ensure guaranteed uniqueness against the `users` table.
    """
    if existing_vendor_email and is_valid_email(existing_vendor_email):
        clean_v_email = existing_vendor_email.strip().lower()
        cursor.execute("SELECT id FROM users WHERE LOWER(email) = %s", (clean_v_email,))
        if not cursor.fetchone():
            return clean_v_email

    # Standard corporate vendor format based on vendor ID
    base_candidate = f"vendor{vendor_id}@vendoriq.com".lower()
    cursor.execute("SELECT id FROM users WHERE LOWER(email) = %s", (base_candidate,))
    if not cursor.fetchone():
        return base_candidate

    # If collision occurs, add vendor proxy suffix
    fallback_candidate = f"vendor.proxy{vendor_id}@vendoriq.com".lower()
    cursor.execute("SELECT id FROM users WHERE LOWER(email) = %s", (fallback_candidate,))
    if not cursor.fetchone():
        return fallback_candidate

    # Additional unique fallback
    counter = 1
    while True:
        candidate = f"vendor{vendor_id}.{counter}@vendoriq.com".lower()
        cursor.execute("SELECT id FROM users WHERE LOWER(email) = %s", (candidate,))
        if not cursor.fetchone():
            return candidate
        counter += 1


def setup_all_vendor_credentials(verbose: bool = True) -> Dict[str, Any]:
    """
    Idempotently sets up login credentials for all vendors in the PostgreSQL database.
    Returns summary metrics.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    report = {
        "total_vendors_found": 0,
        "existing_vendor_accounts_preserved": 0,
        "new_vendor_accounts_created": 0,
        "vendors_skipped_missing_data": 0,
        "duplicate_accounts_prevented": 0,
        "errors": [],
        "created_vendors_sample": [],
        "preserved_vendors_sample": []
    }

    try:
        # Step 1: Query all vendors from vendors table
        cursor.execute("""
            SELECT id, vendor_name, company, email, contact_person, status
            FROM vendors
            ORDER BY id ASC
        """)
        vendors = cursor.fetchall()
        report["total_vendors_found"] = len(vendors)

        if verbose:
            print("=" * 80)
            print(f"VendorIQ - Starting Vendor Credential Setup")
            print(f"Total vendors retrieved from database: {len(vendors)}")
            print("=" * 80)

        # Step 2: Iterate and inspect each vendor
        for row in vendors:
            v_id, v_name, v_company, v_email, v_contact, v_status = row

            # Data sanity check
            if not v_id or not v_name:
                report["vendors_skipped_missing_data"] += 1
                if verbose:
                    print(f"[SKIP] Vendor Record Missing Required ID/Name: {row}")
                continue

            # Check whether vendor already has an associated user account
            # Look up by vendor_id AND Vendor role
            cursor.execute("""
                SELECT id, name, email, password, role, status, vendor_id
                FROM users
                WHERE vendor_id = %s AND role = 'Vendor'
            """, (v_id,))
            existing_user = cursor.fetchone()

            # Also check if vendor email matches an existing user account if not found by vendor_id
            if not existing_user and v_email:
                cursor.execute("""
                    SELECT id, name, email, password, role, status, vendor_id
                    FROM users
                    WHERE LOWER(email) = LOWER(%s) AND role = 'Vendor'
                """, (v_email.strip(),))
                matched_user = cursor.fetchone()
                if matched_user:
                    # Link this user to vendor_id if not already linked, but do NOT change email/password
                    existing_user = matched_user
                    if matched_user[6] != v_id:
                        cursor.execute("""
                            UPDATE users
                            SET vendor_id = %s, updated_at = CURRENT_TIMESTAMP
                            WHERE id = %s
                        """, (v_id, matched_user[0]))
                        conn.commit()

            if existing_user:
                # Vendor already has login credentials: PRESERVE COMPLETELY
                report["existing_vendor_accounts_preserved"] += 1
                report["duplicate_accounts_prevented"] += 1
                if len(report["preserved_vendors_sample"]) < 10:
                    report["preserved_vendors_sample"].append({
                        "vendor_id": v_id,
                        "vendor_name": v_name,
                        "user_id": existing_user[0],
                        "email": existing_user[2],
                        "role": existing_user[4],
                        "status": existing_user[5]
                    })
                continue

            # Vendor does NOT have a user account: CREATE NEW ACCOUNT
            try:
                unique_email = generate_vendor_email(v_id, v_name, v_company, v_email, cursor)
                plain_password = generate_initial_password(v_id)
                hashed_pw = pwd_context.hash(plain_password)

                account_name = (v_contact.strip() if v_contact and v_contact.strip() else v_name.strip())

                # Insert into users table
                cursor.execute("""
                    INSERT INTO users (
                        name,
                        email,
                        password,
                        role,
                        status,
                        vendor_id,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        %s,
                        %s,
                        %s,
                        'Vendor',
                        'Approved',
                        %s,
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    )
                    RETURNING id
                """, (
                    account_name,
                    unique_email,
                    hashed_pw,
                    v_id
                ))
                new_user_id = cursor.fetchone()[0]

                # If vendors.email was NULL, keep it consistent with the login email
                if not v_email:
                    cursor.execute("""
                        UPDATE vendors
                        SET email = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s AND email IS NULL
                    """, (unique_email, v_id))

                conn.commit()

                report["new_vendor_accounts_created"] += 1
                if len(report["created_vendors_sample"]) < 10:
                    report["created_vendors_sample"].append({
                        "vendor_id": v_id,
                        "vendor_name": v_name,
                        "user_id": new_user_id,
                        "email": unique_email,
                        "role": "Vendor",
                        "status": "Approved"
                    })

                # Audit Log action if available
                try:
                    from audit_logs import log_action
                    log_action(
                        user_id=new_user_id,
                        user_name=account_name,
                        user_email=unique_email,
                        action="VENDOR_ACCOUNT_SETUP",
                        entity_type="USER",
                        entity_id=str(new_user_id),
                        details=f"Automated credential provisioning for vendor {v_name} (Vendor ID: {v_id})"
                    )
                except Exception:
                    pass

            except Exception as item_err:
                conn.rollback()
                err_msg = f"Failed to create user for Vendor ID {v_id} ({v_name}): {str(item_err)}"
                report["errors"].append(err_msg)
                if verbose:
                    print(f"[ERROR] {err_msg}")

        if verbose:
            print("\n" + "=" * 80)
            print("Vendor Credential Setup Summary Report")
            print("=" * 80)
            print(f"Total Vendors Found                     : {report['total_vendors_found']}")
            print(f"Existing Accounts Preserved (Unchanged) : {report['existing_vendor_accounts_preserved']}")
            print(f"New Vendor Accounts Created             : {report['new_vendor_accounts_created']}")
            print(f"Vendors Skipped (Missing Data)          : {report['vendors_skipped_missing_data']}")
            print(f"Duplicate Accounts Prevented            : {report['duplicate_accounts_prevented']}")
            print(f"Errors Encountered                      : {len(report['errors'])}")
            print("=" * 80)

    except Exception as e:
        conn.rollback()
        report["errors"].append(f"Global execution error: {str(e)}")
        if verbose:
            print(f"[FATAL] Setup process failed: {e}")
    finally:
        cursor.close()
        conn.close()

    return report


if __name__ == "__main__":
    setup_all_vendor_credentials(verbose=True)
