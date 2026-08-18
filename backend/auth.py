from fastapi import APIRouter, Form, Header, Depends, HTTPException, status
from typing import Optional
from db import conn
from passlib.context import CryptContext
import jwt
import os

SECRET_KEY = os.getenv("SECRET_KEY", "vendor_iq_platform_secret_key_secure_32_bytes_long_fallback")
ALGORITHM = "HS256"

def create_access_token(data: dict):
    to_encode = data.copy()
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Header"
        )
    try:
        scheme, token = authorization.split(" ")
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token scheme"
            )
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or Expired Token"
        )

def check_role(allowed_roles: list):
    def dependency(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission Denied"
            )
        return current_user
    return dependency

router = APIRouter()

# Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ==========================
# Register
# ==========================
@router.post("/register")
def register(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    role: Optional[str] = Form(None)
):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            # Check if email already exists
            cursor.execute(
                "SELECT id FROM users WHERE email=%s",
                (email,)
            )
            user = cursor.fetchone()

            if user:
                return {
                    "message": "Email Already Registered"
                }

            # Hash Password
            hashed_password = pwd_context.hash(password)

            sql = """
            INSERT INTO users
            (name, email, password, role, status)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
            """
            cursor.execute(
                sql,
                (
                    name,
                    email,
                    hashed_password,
                    role,
                    "Pending"
                )
            )
            new_user_id = cursor.fetchone()[0]
            conn.commit()

            # Log Register Action
            from audit_logs import log_action
            log_action(user_id=new_user_id, user_name=name, user_email=email, action="REGISTER", entity_type="USER", entity_id=str(new_user_id), details=f"Registered user account: {name}")

        return {
            "message": "Registration Successful. Please wait for Admin Approval."
        }
    except Exception as e:
        conn.rollback()
        return {
            "error": str(e)
        }


# ==========================
# Login
# ==========================
@router.post("/login")
def login(
    email: str = Form(...),
    password: str = Form(...)
):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, name, email, password, role, status, vendor_id
                FROM users
                WHERE email=%s
                """,
                (email,)
            )
            user = cursor.fetchone()

        if user is None:
            return {
                "message": "Invalid Email or Password"
            }

        db_password = user[3]
        user_status = user[5]

        # Verify Password
        if pwd_context.verify(password, db_password):
            if user_status == "Pending":
                return {
                    "message": "Waiting for Admin Approval"
                }
            elif user_status == "Rejected":
                return {
                    "message": "Your Account has been Rejected"
                }
            elif user_status == "Approved":
                # Log Login Action
                from audit_logs import log_action
                log_action(user_id=user[0], user_name=user[1], user_email=user[2], action="LOGIN", entity_type="USER", entity_id=str(user[0]), details=f"User login successful: {user[1]}")

                token = create_access_token({
                    "id": user[0],
                    "name": user[1],
                    "email": user[2],
                    "role": user[4],
                    "vendor_id": user[6]
                })
                return {
                    "message": "Login Successful",
                    "access_token": token,
                    "token_type": "bearer",
                    "role": user[4],
                    "name": user[1]
                }
            else:
                return {
                    "message": "Waiting for Admin Approval"
                }

        return {
            "message": "Invalid Email or Password"
        }
    except Exception as e:
        conn.rollback()
        return {
            "error": str(e)
        }


@router.get("/pending-users")
def pending_users(current_user: dict = Depends(check_role(["Admin"]))):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, name, email
                FROM users
                WHERE status='Pending'
            """)
            users = cursor.fetchall()

        data = []
        for user in users:
            data.append({
                "id": user[0],
                "name": user[1],
                "email": user[2]
            })
        return data
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.put("/approve-user/{id}")
def approve_user(
    id: int,
    role: str = Form(...),
    vendor_id: Optional[int] = Form(None),
    current_user: dict = Depends(check_role(["Admin"]))
):
    try:
        conn.rollback()
        # Verify valid roles
        valid_roles = {"Admin", "Vendor", "Procurement Manager", "Finance Officer", "Auditor", "Supply Chain Manager"}
        if role not in valid_roles:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid role: {role}. Must be one of {list(valid_roles)}"
            )

        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE users
                SET role=%s,
                    status='Approved',
                    vendor_id=%s
                WHERE id=%s
                """,
                (role, vendor_id, id)
            )
            conn.commit()

        return {
            "message": "User Approved Successfully"
        }
    except HTTPException as he:
        conn.rollback()
        raise he
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.put("/reject-user/{id}")
def reject_user(
    id: int,
    current_user: dict = Depends(check_role(["Admin"]))
):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE users
                SET status='Rejected'
                WHERE id=%s
                """,
                (id,)
            )
            conn.commit()

        return {
            "message": "User Rejected"
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==================================================
# PASSWORD RESET WORKFLOW APIs
# ==================================================

import secrets
from datetime import datetime, timedelta

@router.post("/forgot-password")
def forgot_password(email: str = Form(...)):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            # Check if user exists
            cursor.execute("SELECT id FROM users WHERE email=%s", (email,))
            user = cursor.fetchone()
            if not user:
                # Security best practice: don't reveal if user email doesn't exist
                return {"message": "If the email is registered, a password reset link has been logged."}
            
            # Generate secure token
            token = secrets.token_hex(20)
            expiry = datetime.utcnow() + timedelta(hours=1)
            
            # Save token to database
            cursor.execute(
                """
                INSERT INTO password_resets (email, token, expiry)
                VALUES (%s, %s, %s)
                """,
                (email, token, expiry)
            )
            conn.commit()
            
            # Log the reset link to standard output (development-safe link mechanism)
            reset_link = f"http://127.0.0.1:8000/frontend/reset-password.html?token={token}"
            print("\n" + "="*80)
            print(f"PASSWORD RESET LINK GENERATED FOR {email}:")
            print(reset_link)
            print("="*80 + "\n")
            
        return {"message": "If the email is registered, a password reset link has been logged."}
    except Exception as e:
        conn.rollback()
        return {"error": str(e)}


@router.post("/reset-password")
def reset_password(token: str = Form(...), password: str = Form(...)):
    try:
        conn.rollback()
        with conn.cursor() as cursor:
            # Fetch reset request
            cursor.execute(
                "SELECT email, expiry, used FROM password_resets WHERE token=%s",
                (token,)
            )
            record = cursor.fetchone()
            
            if not record:
                raise HTTPException(status_code=400, detail="Invalid token")
                
            email, expiry, used = record
            
            # Validate expiration and reuse
            if used:
                raise HTTPException(status_code=400, detail="Token already used")
            if expiry < datetime.utcnow():
                raise HTTPException(status_code=400, detail="Token expired")
                
            # Update password
            hashed_pw = pwd_context.hash(password)
            cursor.execute(
                "UPDATE users SET password=%s WHERE email=%s",
                (hashed_pw, email)
            )
            
            # Mark token as used
            cursor.execute(
                "UPDATE password_resets SET used=TRUE WHERE token=%s",
                (token,)
            )
            conn.commit()
            
        return {"message": "Password reset successfully"}
    except HTTPException as he:
        conn.rollback()
        raise he
    except Exception as e:
        conn.rollback()
        return {"error": str(e)}


# ==================================================
# PROFILE MANAGEMENT APIs
# ==================================================

@router.get("/users/me")
def get_me(current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user.get("id")
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, name, email, role, status, first_name, last_name, phone, vendor_id
                FROM users
                WHERE id=%s
                """,
                (user_id,)
            )
            user = cursor.fetchone()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
                
            return {
                "id": user[0],
                "name": user[1],
                "email": user[2],
                "role": user[3],
                "status": user[4],
                "first_name": user[5] or "",
                "last_name": user[6] or "",
                "phone": user[7] or "",
                "vendor_id": user[8]
            }
    except HTTPException as he:
        raise he
    except Exception as e:
        return {"error": str(e)}

@router.put("/users/me")
def update_me(
    name: str = Form(...),
    first_name: str = Form(""),
    last_name: str = Form(""),
    phone: str = Form(""),
    current_user: dict = Depends(get_current_user)
):
    try:
        user_id = current_user.get("id")
        conn.rollback()
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE users
                SET name=%s, first_name=%s, last_name=%s, phone=%s
                WHERE id=%s
                """,
                (name, first_name, last_name, phone, user_id)
            )
            conn.commit()
        return {"message": "Profile updated successfully"}
    except Exception as e:
        conn.rollback()
        return {"error": str(e)}