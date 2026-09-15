from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional, Union
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, HTTPAuthorizationCredentials
from jose import ExpiredSignatureError, JWTError, jwt
from sqlalchemy import desc, func, text, or_
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from decimal import Decimal
from collections import defaultdict
import time
import psutil
import Tables as db
import os


# ==========================================================
# MOBILE NORMALIZATION
# ==========================================================

def normalize_mobile( mobile: str, ) -> str:

    mobile = mobile.strip()

    mobile = mobile.replace(
        " ",
        "",
    )

    mobile = mobile.replace(
        "-",
        "",
    )

    return mobile


# ==========================================================
# SMS FUNCTION
# ==========================================================

def send_sms( mobile: str, otp: str, ):
    """
    Replace this function with your SMS provider.

    For development, OTP is printed to the terminal.
    """

    message = (
        f"Your VendorIQ password reset OTP is "
        f"{otp}. This OTP is valid for 5 minutes."
    )

    print("=" * 60)
    print("SMS OTP")
    print("Mobile:", mobile)
    print("Message:", message)
    print("=" * 60)

    # ======================================================
    # REAL SMS PROVIDER GOES HERE
    # ======================================================
    #
    # Example:
    #
    # sms_client.send(
    #     mobile,
    #     message
    # )
    #
    # ======================================================


# ============================================================================
# AUTHENTICATION / AUTHORIZATION
# ============================================================================

def validate_token(token: str) -> bool:
    """Return True when a JWT is valid."""
    try:
        db.decode_token(token)
        return True
    except HTTPException:
        return False


def get_current_user(
    token: str = Depends(db.oauth2_scheme),
    database: Session = Depends(db.get_db),
):
    """
    Resolve the authenticated User from the JWT.

    Expected JWT fields:

        sub      -> user email or username
        user_id  -> User.id
        role     -> User.role
    """

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={
            "WWW-Authenticate": "Bearer"
        },
    )

    try:

        payload = jwt.decode(
            token,
            db.SECRET_KEY,
            algorithms=[db.ALGORITHM]
        )

        email = payload.get("sub")

        if email is None:
            raise credentials_exception

    except JWTError:

        raise credentials_exception


    user = (
        database.query(db.User)
        .filter(
            db.User.email == email
        )
        .first()
    )


    if user is None:

        raise credentials_exception


    return user


# ============================================================================
# CURRENT VENDOR
# ============================================================================

def get_current_vendor(
    token: str = Depends(db.oauth2_scheme),
    database: Session = Depends(db.get_db),
):
    """Authenticate the logged-in vendor from the vendors table."""

    credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    try:
        payload = jwt.decode(
            token,
            db.SECRET_KEY,
            algorithms=[db.ALGORITHM],
        )
    except JWTError:
        raise credentials_exception

    role = payload.get("role")

    if role != "vendor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Vendor access required. Current role: {role}",
        )

    vendor_id = payload.get("vendor_id") or payload.get("sub")

    if not vendor_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Vendor ID missing from token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    vendor = (
        database.query(db.Vendor)
        .filter(db.Vendor.vendor_id == str(vendor_id))
        .first()
    )

    if vendor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor account not found.",
        )

    if vendor.status not in {"Active", "Approved"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Vendor account is not active. Current status: {vendor.status}",
        )

    return vendor


def require_admin( current_user=Depends( get_current_user ), ):

    if not _is_role(
        current_user,
        "Admin",
    ):

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges are required.",
        )

    return current_user


def require_procurement_manager(
    current_user=Depends(get_current_user),
):
    if not _is_role(current_user, "Procurement Manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Procurement Manager privileges are required.",
        )
    return current_user


def require_procurement_or_supply_chain_manager(
    current_user=Depends(get_current_user),
):
    if not (
        _is_role(current_user, "Procurement Manager")
        or
        _is_role(current_user, "Supply Chain Manager")
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Procurement Manager or Supply Chain Manager "
                "privileges are required."
            ),
        )

    return current_user


def require_admin_or_procurement_manager(
    current_user=Depends(get_current_user),
):
    if not (
        _is_role(current_user, "Admin")
        or
        _is_role(current_user, "Procurement Manager")
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Procurement Manager access required"
        )
    return current_user


def require_vendor(
    current_vendor=Depends(get_current_vendor),
):
    return current_vendor


def require_roles(
    roles: Iterable[Union[str, Any]],
):
    """Generic FastAPI dependency for one or more roles."""
    allowed = {
        _role_value(role)
        for role in roles
    }

    def dependency(current_user=Depends(get_current_user)):
        if _role_value(getattr(current_user, "role", None)) not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource.",
            )
        return current_user

    return dependency


def current_user_identity(
    current_user=Depends(get_current_user),
) -> dict:
    return {
        "id": getattr(current_user, "id", None),
        "name": _user_name(current_user),
        "email": getattr(current_user, "email", None),
        "role": getattr(current_user, "role", None),
        "active": _user_is_active(current_user),
    }


def logout() -> dict:
    """
    JWT logout is normally implemented client-side by deleting the token.
    A stateless JWT does not require a database operation here.
    """
    return {
        "success": True,
        "message": "Logged out successfully.",
    }


# ============================================================================
# SMALL INTERNAL HELPERS
# ============================================================================

def _role_value(role: Any) -> Optional[str]:
    if role is None:
        return None
    return getattr(role, "value", role)


def _is_role(
    user,
    required_role: str,
) -> bool:

    user_role = getattr(
        user,
        "role",
        None,
    )

    if user_role is None:
        return False

    # Handle Enum roles
    if hasattr(
        user_role,
        "value",
    ):
        user_role = user_role.value

    return str(
        user_role
    ).strip().lower() == str(
        required_role
    ).strip().lower()


def _user_is_active(user) -> bool:

    active = getattr(
        user,
        "active",
        True,
    )

    if isinstance(active, str):

        return active.lower() in {
            "true",
            "1",
            "yes",
            "active",
        }

    return bool(active)


def _user_name(user: Any) -> str:
    return (
        getattr(user, "name", None)
        or getattr(user, "fullname", None)
        or getattr(user, "full_name", None)
        or getattr(user, "username", None)
        or ""
    )


def _number(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _date_value(value: Any) -> Optional[date]:
    if value is None:
        return None

    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    if isinstance(value, str):
        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d"):
            try:
                return datetime.strptime(value, fmt).date()
            except ValueError:
                pass

    return None


def _safe_float(value: Any) -> float:
    return round(_number(value), 2)


def _vendor_name(database: Session, vendor_id: str) -> str:
    if vendor_id is None:
        return ""

    vendor = (
        database.query(db.Vendor)
        .filter(db.Vendor.vendor_id == vendor_id)
        .first()
    )

    return (
        getattr(vendor, "vendor_name", None)
        or ""
    )


def _po_vendor(database: Session, po: Any) -> str:
    return _vendor_name(
        database,
        getattr(po, "vendor_id", None),
    )


def _vendor_id_for_user(current_user: Any) -> Optional[str]:
    """
    Resolve a vendor id from the authenticated user where possible.

    Supported possibilities:
      User.vendor_id
      User.vendor_id as string
      User.email matching Vendor.email, if needed
    """
    value = getattr(current_user, "vendor_id", None)

    if value is not None:
        try:
            return int(value)
        except (TypeError, ValueError):
            pass

    return None


def _field_exists(model: Any, field_name: str) -> bool:
    return hasattr(model, field_name)


def _optional_model_query(
    database: Session,
    model: Any,
    field_name: str,
    value: Any,
):
    """Return query filtered by a field only when that field exists."""
    query = database.query(model)

    if _field_exists(model, field_name):
        query = query.filter(getattr(model, field_name) == value)

    return query


# ============================================================================
# LOGIN
# ============================================================================

def login_user(
    login_data,
    database: Session,
):
    """
    Login using the existing User model.

    Preferred fields:
        username / email
        password / hashed_password

    This function intentionally avoids the duplicate Login/User confusion
    present in the original uploaded file.
    """
    username = getattr(login_data, "username", None)
    password = getattr(login_data, "password", None)

    identity = username

    if not identity or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username/email and password are required.",
        )

    user = None

    if _field_exists(db.User, "username"):
        user = (
            database.query(db.User)
            .filter(db.User.email == identity)
            .first()
        )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    hashed_password = (
        getattr(user, "hashed_password", None)
        or getattr(user, "password", None)
    )

    if not hashed_password or not db.verify_password(
        password,
        hashed_password,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not _user_is_active(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    token = db.create_access_token(
        data={
            "sub": getattr(user, "email", None),
            "user_id": getattr(user, "id", None),
            "role": getattr(user, "role", None),
        },
        expires_delta=timedelta(
            minutes=getattr(
                database,
                "ACCESS_TOKEN_EXPIRE_MINUTES",
                30,
            )
        ),
    )

    return {
        "success": True,
        "message": "Login Successful",
        "username": (
            getattr(user, "username", None)
            or getattr(user, "email", None)
        ),
        "role": getattr(user, "role", None),
        "user_id": getattr(user, "id", None),
        "access_token": token,
        "token_type": "bearer",
    }


# ============================================================================
# VENDOR LOGIN
# ============================================================================

def login_vendor(
    vendor,
    database,
):
    """Authenticate a vendor using Vendor.vendor_id and Vendor.hashed_password."""

    vendor_id = getattr(vendor, "vendor_id", None)
    password = getattr(vendor, "password", None)

    if not vendor_id or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vendor ID and password are required.",
        )

    registered_vendor = (
        database.query(db.Vendor)
        .filter(db.Vendor.vendor_id == vendor_id.strip())
        .first()
    )

    if registered_vendor is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Vendor ID or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if registered_vendor.status in {"Pending", "Pending Approval"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your vendor registration is pending administrator approval.",
        )

    if registered_vendor.status in {"Rejected", "Blacklisted"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your vendor registration has been rejected or blocked.",
        )

    if registered_vendor.status not in {"Approved", "Active"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Vendor account is not active. Current status: {registered_vendor.status}",
        )

    if not db.verify_password(
        password,
        registered_vendor.hashed_password,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Vendor ID or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = db.create_access_token(
        data={
            "sub": registered_vendor.vendor_id,
            "vendor_id": registered_vendor.vendor_id,
            "vendor_db_id": registered_vendor.id,
            "role": "vendor",
        },
        expires_delta=timedelta(
            minutes=getattr(
                database,
                "ACCESS_TOKEN_EXPIRE_MINUTES",
                30,
            )
        ),
    )

    return {
        "success": True,
        "message": "Vendor login successful.",
        "access_token": access_token,
        "token_type": "bearer",
        "vendor_id": registered_vendor.vendor_id,
        "vendor_name": registered_vendor.vendor_name,
        "status": registered_vendor.status,
    }


# ============================================================================
# USER CRUD / ADMIN DASHBOARD
# ============================================================================

def create_user(database: Session, user):
    email = getattr(user, "email", None)
    username = getattr(user, "username", None)

    query = database.query(db.User)

    if email and _field_exists(db.User, "email"):
        if query.filter(db.User.email == email).first():
            return {
                "success": False,
                "message": "Email already exists.",
            }

    if username and _field_exists(db.User, "username"):
        if query.filter(db.User.email == username).first():
            return {
                "success": False,
                "message": "Username already exists.",
            }

    password = getattr(user, "password", None)

    kwargs = {
        "email": email,
        "username": username,
        "role": getattr(user, "role", None),
    }

    if _field_exists(db.User, "fullname"):
        kwargs["fullname"] = getattr(user, "name", None)
    elif _field_exists(db.User, "name"):
        kwargs["name"] = getattr(user, "name", None)

    if _field_exists(db.User, "mobile"):
        kwargs["mobile"] = getattr(user, "mobile", None)

    if _field_exists(db.User, "gender"):
        kwargs["gender"] = getattr(user, "gender", None)

    if _field_exists(db.User, "address"):
        kwargs["address"] = getattr(user, "address", None)

    if _field_exists(db.User, "password"):
        kwargs["password"] = db.hash_password(password)
    elif _field_exists(db.User, "hashed_password"):
        kwargs["hashed_password"] = db.hash_password(password)

    if _field_exists(db.User, "status"):
        kwargs["status"] = "Active"

    if _field_exists(db.User, "active"):
        kwargs["active"] = True

    new_user = db.User(**kwargs)
    database.add(new_user)
    database.commit()
    database.refresh(new_user)
    return new_user


def get_users(database: Session):
    return database.query(db.User).order_by(db.User.id.desc()).all()


def get_user(database: Session, user_id: int):
    return (
        database.query(db.User)
        .filter(db.User.id == user_id)
        .first()
    )


def get_user_by_id(database: Session, user_id: int):
    return get_user(database, user_id)


def get_all_users(database: Session):
    return get_users(database)


def email_exists(database: Session, email: str) -> bool:
    if not _field_exists(db.User, "email"):
        return False

    return (
        database.query(db.User)
        .filter(db.User.email == email)
        .first()
        is not None
    )


def require_user_by_id(database: Session, user_id: int):
    user = get_user(database, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{user_id}' not found.",
        )

    return user


def update_user(database: Session, user_id: int, user):
    db_user = require_user_by_id(database, user_id)

    if _field_exists(db.User, "fullname"):
        db_user.fullname = getattr(user, "name", db_user.fullname)

    if _field_exists(db.User, "name"):
        db_user.name = getattr(user, "name", db_user.name)

    if _field_exists(db.User, "email"):
        db_user.email = getattr(user, "email", db_user.email)

    if _field_exists(db.User, "active"):
        db_user.active = getattr(user, "active", db_user.active)

    database.commit()
    database.refresh(db_user)
    return db_user


def delete_user(database: Session, user_id: int):
    user = get_user(database, user_id)

    if user is None:
        return None

    database.delete(user)
    database.commit()
    return user


def total_users(database: Session) -> int:
    return database.query(db.User).count()


def active_users(database: Session) -> int:
    if _field_exists(db.User, "active"):
        # Support both boolean and string-backed columns.
        return database.query(db.User).filter(
            db.User.active == True  # noqa: E712
        ).count()

    if _field_exists(db.User, "status"):
        return database.query(db.User).filter(
            func.lower(db.User.status) == "active"
        ).count()

    return 0


def activate_user(database: Session, user):
    if _field_exists(db.User, "active"):
        user.active = True

    if _field_exists(db.User, "status"):
        user.status = "Active"

    database.commit()
    database.refresh(user)
    return user


def deactivate_user(database: Session, user):
    if _field_exists(db.User, "active"):
        user.active = False

    if _field_exists(db.User, "status"):
        user.status = "Inactive"

    database.commit()
    database.refresh(user)
    return user


def change_password(database: Session, user, new_password: str):
    hashed = db.hash_password(new_password)

    if _field_exists(db.User, "hashed_password"):
        user.hashed_password = hashed
    elif _field_exists(db.User, "password"):
        user.password = hashed

    database.commit()
    database.refresh(user)
    return user


# ============================================================================
# ADMIN PASSWORD RESET
# ============================================================================

def reset_admin_password(
    database: Session,
    username: str,
    new_password: str,
):
    """
    Reset password for an Admin user.

    The user is identified by username.
    Only users with role = "Admin" can be reset
    through this function.
    """

    if not username or not username.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is required.",
        )

    if not new_password or len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least 6 characters.",
        )

    admin = (
        database.query(db.User)
        .filter(
            db.User.email == username.strip(),
            db.User.role == "Admin",
        )
        .first()
    )

    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin account not found.",
        )

    admin.hashed_password = db.hash_password(
        new_password
    )

    database.commit()
    database.refresh(admin)

    return {
        "success": True,
        "message": "Admin password reset successfully.",
        "username": admin.username,
    }


# ============================================================================
# PROCUREMENT MANAGER PASSWORD RESET
# ============================================================================

def reset_manager_password(
    database: Session,
    username: str,
    new_password: str,
):
    """
    Reset password for a Procurement Manager.

    The user is identified by username.
    Only users with role = "Procurement Manager"
    can be reset through this function.
    """

    if not username or not username.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is required.",
        )

    if not new_password or len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least 6 characters.",
        )

    manager = (
        database.query(db.User)
        .filter(
            db.User.email == username.strip(),
            db.User.role == "Procurement Manager",
        )
        .first()
    )

    if manager is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Procurement Manager account not found.",
        )

    manager.hashed_password = db.hash_password(
        new_password
    )

    database.commit()
    database.refresh(manager)

    return {
        "success": True,
        "message": (
            "Procurement Manager password "
            "reset successfully."
        ),
        "username": manager.username,
    }


# ============================================================================
# VENDOR PASSWORD RESET
# ============================================================================

def reset_vendor_password(
    database: Session,
    vendor_id: str,
    new_password: str,
):
    """Reset a vendor password using the vendors table."""

    if not vendor_id or not vendor_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vendor ID is required.",
        )

    if not new_password or len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least 6 characters.",
        )

    vendor = (
        database.query(db.Vendor)
        .filter(db.Vendor.vendor_id == vendor_id.strip())
        .first()
    )

    if vendor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor account not found.",
        )

    vendor.hashed_password = db.hash_password(new_password)

    database.commit()
    database.refresh(vendor)

    return {
        "success": True,
        "message": "Vendor password reset successfully.",
        "vendor_id": vendor.vendor_id,
    }


# ============================================================================
# VENDOR CRUD / VENDOR ANALYTICS
# ============================================================================

# ============================================================
# VENDOR REGISTRATION
# ============================================================

def generate_vendor_id(database: Session) -> str:

    vendors = (
        database
        .query(db.Vendor.vendor_id)
        .all()
    )

    highest_number = 0

    for row in vendors:

        existing_id = row[0]

        if not existing_id:
            continue

        existing_id = str(
            existing_id
        ).strip().upper()

        if not existing_id.startswith("VND"):
            continue

        number_part = existing_id[3:]

        if not number_part.isdigit():
            continue

        number = int(number_part)

        if number > highest_number:
            highest_number = number

    next_number = highest_number + 1

    return f"VND{next_number:07d}"


def register_vendor(
    database: Session,
    vendor_data
):
    """
    Register a vendor directly in the vendors table.

    The Vendor ID is generated during the first
    registration step and supplied here.
    """

    # ======================================================
    # GET VENDOR ID
    # ======================================================

    vendor_id = getattr(
        vendor_data,
        "vendor_id",
        None
    )

    if not vendor_id:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vendor ID is required.",
        )


    vendor_id = str(
        vendor_id
    ).strip().upper()


    # ======================================================
    # CHECK VENDOR ID
    # ======================================================

    existing_vendor_id = (
        database.query(db.Vendor)
        .filter(
            db.Vendor.vendor_id ==
            vendor_id
        )
        .first()
    )

    if existing_vendor_id is not None:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This Vendor ID already exists.",
        )


    # ======================================================
    # EMAIL
    # ======================================================

    email = getattr(
        vendor_data,
        "email",
        None
    )

    if not email:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vendor email is required.",
        )


    email = str(
        email
    ).strip().lower()


    # ======================================================
    # CHECK EMAIL
    # ======================================================

    existing_email = (
        database.query(db.Vendor)
        .filter(
            db.Vendor.email ==
            email
        )
        .first()
    )

    if existing_email is not None:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A vendor with this email address already exists.",
        )


    # ======================================================
    # PHONE
    # ======================================================

    phone = getattr(
        vendor_data,
        "phone",
        None
    )

    if phone:

        phone = str(
            phone
        ).strip()


    # ======================================================
    # CHECK PHONE
    #
    # Your SQLAlchemy model does NOT make phone unique,
    # but your application currently does.
    # ======================================================

    if phone:

        existing_phone = (
            database.query(db.Vendor)
            .filter(
                db.Vendor.phone ==
                phone
            )
            .first()
        )

        if existing_phone is not None:

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A vendor with this phone number already exists.",
            )


    # ======================================================
    # PASSWORD
    # ======================================================

    password = getattr(
        vendor_data,
        "password",
        None
    )

    if not password:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vendor password is required.",
        )


    # ======================================================
    # COMPANY NAME
    # ======================================================

    vendor_name = getattr(
        vendor_data,
        "vendor_name",
        None
    )

    if not vendor_name:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company name is required.",
        )


    # ======================================================
    # CREATE VENDOR
    # ======================================================

    new_vendor = db.Vendor(

        vendor_id=vendor_id,

        vendor_name=vendor_name,

        country=getattr(
            vendor_data,
            "country",
            None
        ),

        email=email,

        phone=phone,

        business_type=getattr(
            vendor_data,
            "business_type",
            None
        ),

        address=getattr(
            vendor_data,
            "address",
            None
        ),

        hashed_password=db.hash_password(
            password
        ),

        category=getattr(
            vendor_data,
            "category",
            None
        ),

        contact_person=getattr(
            vendor_data,
            "contact_person",
            None
        ),

        status="Pending",

        approved_by=None,

        reliability_score=None,

        trend=None,

        quality_score=None,

        delivery_score=None,

        service_score=None,

        contract_count=0,
    )


    # ======================================================
    # SAVE TO DATABASE
    # ======================================================

    try:

        database.add(
            new_vendor
        )

        database.commit()

        database.refresh(
            new_vendor
        )

    except IntegrityError as error:

        database.rollback()

        print(
            "=========================================="
        )

        print(
            "VENDOR REGISTRATION INTEGRITY ERROR"
        )

        print(
            error
        )

        print(
            "=========================================="
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Vendor registration failed. "
                "The Vendor ID or email already exists."
            ),
        )


    # ======================================================
    # RESPONSE
    # ======================================================

    return {

        "success": True,

        "message":
            "Vendor registered successfully.",

        "vendor_id":
            new_vendor.vendor_id,

        "vendor_name":
            new_vendor.vendor_name,

        "email":
            new_vendor.email,

        "status":
            new_vendor.status,
    }


def admin_register_vendor(
    database: Session,
    vendor_data: db.VendorRegistrationDetails
):
    """
    Register vendor details.

    Password is NOT created here.

    This is Step 2 of the registration process.
    """

    # ==========================================================
    # CHECK DUPLICATE EMAIL
    # ==========================================================

    existing_vendor = (
        database
        .query(db.Vendor)
        .filter(
            db.Vendor.email ==
            vendor_data.email
        )
        .first()
    )


    if existing_vendor:

        raise HTTPException(
            status_code=409,
            detail=(
                "A vendor with this email "
                "already exists."
            )
        )


    # ==========================================================
    # GENERATE VENDOR ID
    # ==========================================================

    vendor_id = generate_vendor_id(
        database
    )


    # ==========================================================
    # CREATE VENDOR
    # ==========================================================

    new_vendor = db.Vendor(

        vendor_id=vendor_id,

        vendor_name=
            vendor_data.vendor_name,

        country=
            vendor_data.country,

        email=
            vendor_data.email,

        phone=
            vendor_data.phone,

        business_type=
            vendor_data.business_type,

        category=
            vendor_data.category,

        contact_person=
            vendor_data.contact_person,

        address=
            vendor_data.address,

        # ======================================================
        # ACCOUNT NOT CREATED YET
        # ======================================================

        hashed_password=None,

        # ======================================================
        # INITIAL STATUS
        # ======================================================

        status="Pending",

        # ======================================================
        # DEFAULT PERFORMANCE VALUES
        # ======================================================

        reliability_score=0,

        quality_score=0,

        delivery_score=0,

        service_score=0
    )


    database.add(new_vendor)

    database.commit()

    database.refresh(new_vendor)

    return new_vendor


def create_vendor_account(
    database: Session,
    vendor_id: str,
    password: str
):
    """
    Create the vendor login account.

    This is Step 3 of the registration process.
    """

    # ==========================================================
    # FIND VENDOR
    # ==========================================================

    vendor = ( database .query(db.Vendor) .filter( db.Vendor.vendor_id == vendor_id ) .first() )


    if not vendor:

        raise HTTPException( status_code=404, detail="Vendor not found." )


    # ==========================================================
    # CHECK WHETHER ACCOUNT ALREADY EXISTS
    # ==========================================================

    if vendor.hashed_password:

        raise HTTPException( status_code=400, detail=( "Vendor account has already been created." ) )


    # ==========================================================
    # HASH PASSWORD
    # ==========================================================

    vendor.hashed_password = ( db.hash_password(password) )


    # ==========================================================
    # ACTIVATE ACCOUNT
    # ==========================================================

    vendor.status = "Active"


    # ==========================================================
    # SAVE
    # ==========================================================

    database.commit()

    database.refresh(vendor)

    return vendor


def create_vendor(
    database: Session,
    vendor,
):
    """Compatibility wrapper: register directly in vendors."""
    return register_vendor(database, vendor)


def get_vendors(database: Session):
    return database.query(db.Vendor).order_by(db.Vendor.id.desc()).all()


def get_vendor(database: Session, vendor_id: str):
    return (
        database.query(db.Vendor)
        .filter(db.Vendor.vendor_id == vendor_id)
        .first()
    )


def get_vendor_by_vendor_id(database: Session, vendor_id: str):
    return (
        database.query(db.Vendor)
        .filter(db.Vendor.vendor_id == vendor_id)
        .first()
    )


def update_vendor(database: Session, vendor_id: str, vendor):
    db_vendor = get_vendor(database, vendor_id)

    if db_vendor is None:
        return None

    fields = (
        "vendor_name", "country", "email", "phone",
        "business_type", "address", "category",
        "contact_person", "status", "approved_by",
        "reliability_score", "trend", "quality_score",
        "delivery_score", "service_score", "contract_count",
    )

    for field in fields:
        value = getattr(vendor, field, None)
        if value is not None:
            setattr(db_vendor, field, value)

    password = getattr(vendor, "password", None)
    if password:
        db_vendor.hashed_password = db.hash_password(password)

    database.commit()
    database.refresh(db_vendor)
    return db_vendor


def delete_vendor(database: Session, vendor_id: str):
    vendor = get_vendor(database, vendor_id)
    if vendor is None:
        return None
    database.delete(vendor)
    database.commit()
    return vendor


def total_vendors(database: Session) -> int:
    return database.query(db.Vendor).count()


def vendors_by_category(
    database: Session,
    category: Optional[str] = None,
):
    query = database.query(db.Vendor)

    if category is not None:
        query = query.filter(
            db.Vendor.category == category
        )

    return query.all()


def top_reliable_vendors(database: Session, limit: int = 5):
    return (
        database.query(db.Vendor)
        .order_by(desc(db.Vendor.reliability_score))
        .limit(limit)
        .all()
    )


def lowest_reliable_vendors(database: Session, limit: int = 5):
    return (
        database.query(db.Vendor)
        .order_by(db.Vendor.reliability_score.asc())
        .limit(limit)
        .all()
    )


def search_vendor(database: Session, keyword: str):
    return (
        database.query(db.Vendor)
        .filter(
            db.Vendor.vendor_name.ilike(
                f"%{keyword}%"
            )
        )
        .all()
    )


def update_vendor_score(
    database: Session,
    vendor_id: str,
    score: float,
):
    vendor = get_vendor(database, vendor_id)

    if vendor is None:
        return None

    vendor.reliability_score = score
    database.commit()
    database.refresh(vendor)
    return vendor


def update_vendor_trend(
    database: Session,
    vendor_id: str,
    trend: str,
):
    vendor = get_vendor(database, vendor_id)

    if vendor is None:
        return None

    vendor.trend = trend
    database.commit()
    database.refresh(vendor)
    return vendor


def average_vendor_reliability(database: Session) -> float:
    value = database.query(
        func.avg(db.Vendor.reliability_score)
    ).scalar()

    return round(_number(value), 2)


def highest_vendor_score(database: Session):
    return (
        database.query(db.Vendor)
        .order_by(
            desc(db.Vendor.reliability_score)
        )
        .first()
    )


def lowest_vendor_score(database: Session):
    return (
        database.query(db.Vendor)
        .order_by(
            db.Vendor.reliability_score.asc()
        )
        .first()
    )


def top_vendors(
    database: Session,
    limit: int = 5,
):
    vendors = (
        database.query(db.Vendor)
        .order_by(
            desc(db.Vendor.reliability_score)
        )
        .limit(limit)
        .all()
    )

    return [
        {
            "id": vendor.id,
            "vendor_name": vendor.vendor_name,
            "category": vendor.category,
            "reliability_score": _safe_float(
                vendor.reliability_score
            ),
            "trend": getattr(
                vendor,
                "trend",
                "up",
            ),
        }
        for vendor in vendors
    ]


def lowest_vendors(
    database: Session,
    limit: int = 5,
):
    vendors = (
        database.query(db.Vendor)
        .order_by(
            db.Vendor.reliability_score.asc()
        )
        .limit(limit)
        .all()
    )

    return [
        {
            "id": vendor.id,
            "vendor_name": vendor.vendor_name,
            "category": vendor.category,
            "reliability_score": _safe_float(
                vendor.reliability_score
            ),
            "trend": getattr(
                vendor,
                "trend",
                "down",
            ),
        }
        for vendor in vendors
    ]


def vendor_reliability_summary(database: Session) -> dict:
    return {
        "average": average_vendor_reliability(database),
        "highest": (
            _safe_float(
                highest_vendor_score(database).reliability_score
            )
            if highest_vendor_score(database)
            else 0
        ),
        "lowest": (
            _safe_float(
                lowest_vendor_score(database).reliability_score
            )
            if lowest_vendor_score(database)
            else 0
        ),
        "top_vendors": top_vendors(database, 5),
    }


def reliability_distribution(database: Session) -> dict:
    excellent = (
        database.query(db.Vendor)
        .filter(db.Vendor.reliability_score >= 80)
        .count()
    )

    good = (
        database.query(db.Vendor)
        .filter(
            db.Vendor.reliability_score >= 60,
            db.Vendor.reliability_score < 80,
        )
        .count()
    )

    average = (
        database.query(db.Vendor)
        .filter(
            db.Vendor.reliability_score >= 40,
            db.Vendor.reliability_score < 60,
        )
        .count()
    )

    poor = (
        database.query(db.Vendor)
        .filter(
            db.Vendor.reliability_score >= 20,
            db.Vendor.reliability_score < 40,
        )
        .count()
    )

    critical = (
        database.query(db.Vendor)
        .filter(db.Vendor.reliability_score < 20)
        .count()
    )

    return {
        "excellent": excellent,
        "good": good,
        "average": average,
        "poor": poor,
        "critical": critical,
        "total_vendors": total_vendors(database),
    }


def category_reliability(database: Session):
    rows = (
        database.query(
            db.Vendor.category,
            func.avg(
                db.Vendor.reliability_score
            ).label("average_score"),
            func.count(
                db.Vendor.id
            ).label("total_vendors"),
        )
        .group_by(db.Vendor.category)
        .all()
    )

    return [
        {
            "category": category or "Other",
            "average_score": _safe_float(score),
            "total_vendors": int(total),
        }
        for category, score, total in rows
    ]


# ============================================================================
# PURCHASE ORDER CRUD
# ============================================================================

def create_purchase_order(
    database: Session,
    po,
    current_user=None
):
    try:

        # ============================================================
        # AUTHENTICATION
        # ============================================================

        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication is required to create a purchase order."
            )

        # ============================================================
        # ROLE CHECK
        # ============================================================

        if not (
            _is_role(current_user, "Procurement Manager")
            or
            _is_role(current_user, "Supply Chain Manager")
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Only Procurement Manager or "
                    "Supply Chain Manager can create purchase orders."
                )
            )

        # ============================================================
        # DUPLICATE PO NUMBER
        # ============================================================

        existing_po = (
            database.query(db.PurchaseOrder)
            .filter(
                db.PurchaseOrder.po_number == po.po_number
            )
            .first()
        )

        if existing_po:
            raise ValueError(
                f"Purchase order {po.po_number} already exists."
            )

        # ============================================================
        # CHECK VENDOR
        # ============================================================

        vendor = (
            database.query(db.Vendor)
            .filter(
                db.Vendor.vendor_id == po.vendor_id
            )
            .first()
        )

        if not vendor:
            raise ValueError(
                f"Vendor {po.vendor_id} not found."
            )

        # ============================================================
        # VALIDATE DATES
        # ============================================================

        if (
            po.order_date
            and po.expected_delivery
            and po.expected_delivery < po.order_date
        ):
            raise ValueError(
                "Expected delivery date cannot be earlier than the order date."
            )

        # ============================================================
        # CALCULATE ITEM TOTALS
        # ============================================================

        calculated_subtotal = 0.0
        calculated_tax = 0.0

        item_rows = []

        for item in (po.items or []):

            quantity = float(item.quantity or 0)

            unit_price = float(item.unit_price or 0)

            tax_rate = float(item.tax_rate or 0)

            line_subtotal = quantity * unit_price

            line_tax = line_subtotal * (
                tax_rate / 100
            )

            line_total = line_subtotal + line_tax

            calculated_subtotal += line_subtotal

            calculated_tax += line_tax

            item_rows.append(
                {
                    "inventory_item_id": item.inventory_item_id,
                    "item_code": item.item_code,
                    "item_description": item.item_description,
                    "uom": item.uom or "PCS",
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "tax_rate": tax_rate,
                    "tax_amount": line_tax,
                    "amount": line_total
                }
            )

        # ============================================================
        # SHIPPING
        # ============================================================

        shipping_amount = float(
            getattr(
                po,
                "shipping_amount",
                0
            ) or 0
        )

        # ============================================================
        # TOTAL
        # ============================================================

        calculated_total = (
            calculated_subtotal
            + calculated_tax
            + shipping_amount
        )

        # If items were supplied, use calculated total.
        # Otherwise preserve the amount entered by the existing
        # procurement page.

        if item_rows:
            final_amount = calculated_total
        else:
            final_amount = float(
                po.amount or 0
            )

        # ============================================================
        # CREATE PURCHASE ORDER
        # ============================================================

        new_po = db.PurchaseOrder(

            po_number=po.po_number,

            vendor_id=po.vendor_id,

            category=po.category,

            amount=final_amount,

            # IMPORTANT:
            # Never trust frontend status.
            # Every newly created PO goes to Finance Officer.

            status="Pending Finance Approval",

            order_date=po.order_date,

            expected_delivery=po.expected_delivery,

            actual_delivery=po.actual_delivery,

            department=getattr(
                po,
                "department",
                None
            ),

            pr_id=getattr(
                po,
                "pr_id",
                None
            ),

            pr_number=getattr(
                po,
                "pr_number",
                None
            ),

            created_by=current_user.id
        )

        database.add(new_po)

        # Get database-generated PO ID
        database.flush()

        # ============================================================
        # CREATE PURCHASE ORDER DETAILS
        # ============================================================

        details = db.PurchaseOrderDetails(

            purchase_order_id=new_po.id,

            po_type=getattr(
                po,
                "po_type",
                "Standard Purchase Order"
            ),

            supplier_reference=getattr(
                po,
                "supplier_reference",
                None
            ),

            contact_person=getattr(
                po,
                "contact_person",
                None
            ),

            contact_phone=getattr(
                po,
                "contact_phone",
                None
            ),

            contact_email=getattr(
                po,
                "contact_email",
                None
            ),

            payment_method=getattr(
                po,
                "payment_method",
                None
            ),

            payment_terms=getattr(
                po,
                "payment_terms",
                None
            ),

            incoterms=getattr(
                po,
                "incoterms",
                None
            ),

            currency=getattr(
                po,
                "currency",
                "INR"
            ),

            exchange_rate=getattr(
                po,
                "exchange_rate",
                1
            ),

            delivery_warehouse_id=getattr(
                po,
                "warehouse_id",
                None
            ),

            notes=getattr(
                po,
                "notes",
                None
            ),

            subtotal=calculated_subtotal,

            tax_amount=calculated_tax,

            shipping_amount=shipping_amount,

            total_amount=calculated_total
        )

        database.add(details)

        # ============================================================
        # CREATE PURCHASE ORDER ITEMS
        # ============================================================

        for item_data in item_rows:

            item = db.PurchaseOrderItem(

                purchase_order_id=new_po.id,

                inventory_item_id=item_data[
                    "inventory_item_id"
                ],

                item_code=item_data[
                    "item_code"
                ],

                item_description=item_data[
                    "item_description"
                ],

                uom=item_data[
                    "uom"
                ],

                quantity=item_data[
                    "quantity"
                ],

                unit_price=item_data[
                    "unit_price"
                ],

                tax_rate=item_data[
                    "tax_rate"
                ],

                tax_amount=item_data[
                    "tax_amount"
                ],

                amount=item_data[
                    "amount"
                ],

                received_quantity=0
            )

            database.add(item)

        # ============================================================
        # CREATE FINANCE APPROVAL WORKFLOW
        # ============================================================

        workflow = create_approval_workflow(

            database=database,

            reference_type="PO",

            reference_id=new_po.id,

            reference_number=new_po.po_number,

            title=(
                f"Purchase Order "
                f"{new_po.po_number}"
            ),

            requested_by_user_id=current_user.id,

            department=(
                getattr(
                    current_user,
                    "department",
                    None
                )
                or
                getattr(
                    new_po,
                    "department",
                    None
                )
            ),

            amount=new_po.amount or 0,

            priority="Medium"
        )

        # ============================================================
        # COMMIT EVERYTHING
        # ============================================================

        database.commit()

        database.refresh(new_po)

        return new_po

    except Exception:

        database.rollback()

        raise


def get_purchase_orders(database: Session):
    return (
        database.query(db.PurchaseOrder)
        .order_by(
            db.PurchaseOrder.order_date.desc()
        )
        .all()
    )


def get_purchase_order(database: Session, po_id: int):
    return (
        database.query(db.PurchaseOrder)
        .filter(db.PurchaseOrder.id == po_id)
        .first()
    )


# ============================================================================
# VENDOR PURCHASE ORDER DETAILS
# ============================================================================

def get_vendor_purchase_order_details(
    database: Session,
    po_id: int,
    vendor_id: str
):
    """
    Get COMPLETE purchase order information for the logged-in vendor.

    Includes:
        - Purchase order information
        - Procurement request information
        - Ordered-by user
        - Complete vendor information
        - Purchase order commercial details
        - Delivery warehouse information
        - All line items
        - Receiving information
        - Complete totals
    """

    # ============================================================
    # PURCHASE ORDER
    # ============================================================

    po = (
        database.query(db.PurchaseOrder)
        .filter(
            db.PurchaseOrder.id == po_id,
            db.PurchaseOrder.vendor_id == vendor_id
        )
        .first()
    )

    if po is None:
        return None

    # ============================================================
    # VENDOR
    # ============================================================

    vendor = (
        database.query(db.Vendor)
        .filter(
            db.Vendor.vendor_id == po.vendor_id
        )
        .first()
    )

    # ============================================================
    # ORDERED BY / CREATED BY USER
    # ============================================================

    ordered_by = None

    created_by = getattr(
        po,
        "created_by",
        None
    )

    if created_by:

        ordered_by_user = (
            database.query(db.User)
            .filter(
                db.User.id == created_by
            )
            .first()
        )

        if ordered_by_user:

            ordered_by = (
                getattr(
                    ordered_by_user,
                    "name",
                    None
                )
                or getattr(
                    ordered_by_user,
                    "fullname",
                    None
                )
                or getattr(
                    ordered_by_user,
                    "full_name",
                    None
                )
                or getattr(
                    ordered_by_user,
                    "username",
                    None
                )
                or getattr(
                    ordered_by_user,
                    "email",
                    None
                )
            )

    # ============================================================
    # PURCHASE ORDER DETAILS
    # ============================================================

    details = (
        database.query(
            db.PurchaseOrderDetails
        )
        .filter(
            db.PurchaseOrderDetails.purchase_order_id
            == po.id
        )
        .first()
    )

    # ============================================================
    # DELIVERY WAREHOUSE
    # ============================================================

    warehouse = None

    delivery_warehouse_id = (
        getattr(
            details,
            "delivery_warehouse_id",
            None
        )
        if details
        else None
    )

    if delivery_warehouse_id:

        warehouse = (
            database.query(db.Warehouse)
            .filter(
                db.Warehouse.id
                == delivery_warehouse_id
            )
            .first()
        )

    # ============================================================
    # PURCHASE ORDER ITEMS
    # ============================================================

    items = (
        database.query(
            db.PurchaseOrderItem
        )
        .filter(
            db.PurchaseOrderItem.purchase_order_id
            == po.id
        )
        .order_by(
            db.PurchaseOrderItem.id.asc()
        )
        .all()
    )

    # ============================================================
    # ITEM RESPONSE
    # ============================================================

    item_list = []

    for item in items:

        item_list.append({

            "id":
                item.id,

            "inventory_item_id":
                getattr(
                    item,
                    "inventory_item_id",
                    None
                ),

            "item_code":
                getattr(
                    item,
                    "item_code",
                    None
                ),

            "item_description":
                getattr(
                    item,
                    "item_description",
                    None
                ),

            "uom":
                getattr(
                    item,
                    "uom",
                    None
                ),

            "quantity":
                float(
                    getattr(
                        item,
                        "quantity",
                        0
                    )
                    or 0
                ),

            "unit_price":
                float(
                    getattr(
                        item,
                        "unit_price",
                        0
                    )
                    or 0
                ),

            "tax_rate":
                float(
                    getattr(
                        item,
                        "tax_rate",
                        0
                    )
                    or 0
                ),

            "tax_amount":
                float(
                    getattr(
                        item,
                        "tax_amount",
                        0
                    )
                    or 0
                ),

            "amount":
                float(
                    getattr(
                        item,
                        "amount",
                        0
                    )
                    or 0
                ),

            "received_quantity":
                float(
                    getattr(
                        item,
                        "received_quantity",
                        0
                    )
                    or 0
                )
        })

    # ============================================================
    # DETAILS RESPONSE
    # ============================================================

    details_data = None

    if details:

        details_data = {

            "po_type":
                getattr(
                    details,
                    "po_type",
                    None
                ),

            "supplier_reference":
                getattr(
                    details,
                    "supplier_reference",
                    None
                ),

            "payment_method":
                getattr(
                    details,
                    "payment_method",
                    None
                ),

            "payment_terms":
                getattr(
                    details,
                    "payment_terms",
                    None
                ),

            "incoterms":
                getattr(
                    details,
                    "incoterms",
                    None
                ),

            "currency":
                getattr(
                    details,
                    "currency",
                    None
                ),

            "exchange_rate":
                float(
                    getattr(
                        details,
                        "exchange_rate",
                        1
                    )
                    or 1
                ),

            "delivery_warehouse_id":
                getattr(
                    details,
                    "delivery_warehouse_id",
                    None
                ),

            "notes":
                getattr(
                    details,
                    "notes",
                    None
                ),

            "subtotal":
                float(
                    getattr(
                        details,
                        "subtotal",
                        0
                    )
                    or 0
                ),

            "tax_amount":
                float(
                    getattr(
                        details,
                        "tax_amount",
                        0
                    )
                    or 0
                ),

            "shipping_amount":
                float(
                    getattr(
                        details,
                        "shipping_amount",
                        0
                    )
                    or 0
                ),

            "total_amount":
                float(
                    getattr(
                        details,
                        "total_amount",
                        0
                    )
                    or 0
                )
        }

    # ============================================================
    # VENDOR RESPONSE
    # ============================================================

    vendor_data = {

        "vendor_id":
            (
                getattr(
                    vendor,
                    "vendor_id",
                    None
                )
                if vendor
                else po.vendor_id
            ),

        "vendor_name":
            (
                getattr(
                    vendor,
                    "vendor_name",
                    None
                )
                or getattr(
                    vendor,
                    "company_name",
                    None
                )
                or ""
            ),

        "country":
            (
                getattr(
                    vendor,
                    "country",
                    None
                )
                if vendor
                else None
            ),

        "email":
            (
                getattr(
                    vendor,
                    "email",
                    None
                )
                if vendor
                else None
            ),

        "phone":
            (
                getattr(
                    vendor,
                    "phone",
                    None
                )
                if vendor
                else None
            ),

        "business_type":
            (
                getattr(
                    vendor,
                    "business_type",
                    None
                )
                if vendor
                else None
            ),

        "address":
            (
                getattr(
                    vendor,
                    "address",
                    None
                )
                if vendor
                else None
            ),

        "category":
            (
                getattr(
                    vendor,
                    "category",
                    None
                )
                if vendor
                else None
            ),

        "contact_person":
            (
                getattr(
                    vendor,
                    "contact_person",
                    None
                )
                if vendor
                else None
            ),

        "website":
            (
                getattr(
                    vendor,
                    "website",
                    None
                )
                if vendor
                else None
            ),

        "gst_vat_number":
            (
                getattr(
                    vendor,
                    "gst_vat_number",
                    None
                )
                if vendor
                else None
            ),

        "tax_id_ein":
            (
                getattr(
                    vendor,
                    "tax_id_ein",
                    None
                )
                if vendor
                else None
            ),

        "pan_number":
            (
                getattr(
                    vendor,
                    "pan_number",
                    None
                )
                if vendor
                else None
            ),

        "member_since":
            (
                getattr(
                    vendor,
                    "member_since",
                    None
                )
                if vendor
                else None
            ),

        "is_preferred":
            (
                getattr(
                    vendor,
                    "is_preferred",
                    False
                )
                if vendor
                else False
            )
    }

    # ============================================================
    # WAREHOUSE RESPONSE
    # ============================================================

    warehouse_data = {

        "id":
            (
                warehouse.id
                if warehouse
                else None
            ),

        "warehouse_code":
            (
                getattr(
                    warehouse,
                    "warehouse_code",
                    None
                )
                if warehouse
                else None
            ),

        "warehouse_name":
            (
                getattr(
                    warehouse,
                    "warehouse_name",
                    None
                )
                if warehouse
                else None
            ),

        "location":
            (
                getattr(
                    warehouse,
                    "location",
                    None
                )
                if warehouse
                else None
            ),

        "manager_name":
            (
                getattr(
                    warehouse,
                    "manager_name",
                    None
                )
                if warehouse
                else None
            ),

        "status":
            (
                getattr(
                    warehouse,
                    "status",
                    None
                )
                if warehouse
                else None
            )
    }

    # ============================================================
    # FINAL RESPONSE
    # ============================================================

    return {

        # ========================================================
        # BASIC PO INFORMATION
        # ========================================================

        "id":
            po.id,

        "po_number":
            getattr(
                po,
                "po_number",
                None
            ),

        "vendor_id":
            po.vendor_id,

        "vendor_name":
            vendor_data["vendor_name"],

        "ordered_by":
            ordered_by or "Unknown",

        "created_by":
            created_by,

        "order_date":
            getattr(
                po,
                "order_date",
                None
            ),

        "expected_delivery":
            getattr(
                po,
                "expected_delivery",
                None
            ),

        "actual_delivery":
            getattr(
                po,
                "actual_delivery",
                None
            ),

        "status":
            (
                getattr(
                    po,
                    "status",
                    None
                )
                or "Pending"
            ),

        "amount":
            float(
                getattr(
                    po,
                    "amount",
                    0
                )
                or 0
            ),

        "category":
            getattr(
                po,
                "category",
                None
            ),

        "department":
            getattr(
                po,
                "department",
                None
            ),

        # ========================================================
        # PROCUREMENT REQUEST
        # ========================================================

        "pr_id":
            getattr(
                po,
                "pr_id",
                None
            ),

        "pr_number":
            getattr(
                po,
                "pr_number",
                None
            ),

        # ========================================================
        # AUDIT / WORKFLOW DATES
        # ========================================================

        "created_at":
            getattr(
                po,
                "created_at",
                None
            ),

        "approved_at":
            getattr(
                po,
                "approved_at",
                None
            ),

        "received_at":
            getattr(
                po,
                "received_at",
                None
            ),

        # ========================================================
        # VENDOR
        # ========================================================

        "vendor":
            vendor_data,

        # ========================================================
        # PURCHASE ORDER DETAILS
        # ========================================================

        "details":
            details_data,

        # ========================================================
        # DELIVERY WAREHOUSE
        # ========================================================

        "warehouse":
            warehouse_data,

        # ========================================================
        # ITEMS
        # ========================================================

        "items":
            item_list,

        # ========================================================
        # TOTALS
        # ========================================================

        "totals": {

            "subtotal":
                (
                    details_data["subtotal"]
                    if details_data
                    else 0
                ),

            "tax_amount":
                (
                    details_data["tax_amount"]
                    if details_data
                    else 0
                ),

            "shipping_amount":
                (
                    details_data["shipping_amount"]
                    if details_data
                    else 0
                ),

            "total_amount":
                (
                    details_data["total_amount"]
                    if details_data
                    else float(
                        getattr(
                            po,
                            "amount",
                            0
                        )
                        or 0
                    )
                )
        }
    }


# ============================================================================
# MARK VENDOR PURCHASE ORDER AS DELIVERED
# ============================================================================

def mark_vendor_purchase_order_delivered(
    database: Session,
    po_id: int,
    vendor_id: str
):
    """
    Mark a vendor's purchase order as delivered.
    """

    po = (
        database.query(db.PurchaseOrder)
        .filter(
            db.PurchaseOrder.id == po_id,
            db.PurchaseOrder.vendor_id == vendor_id
        )
        .first()
    )

    if po is None:
        return None

    current_status = (
        str(
            getattr(
                po,
                "status",
                ""
            )
            or ""
        )
        .strip()
        .lower()
    )

    # ------------------------------------------------------------
    # ALREADY DELIVERED
    # ------------------------------------------------------------

    if current_status == "delivered":

        if hasattr(po, "actual_delivery"):
            if not po.actual_delivery:
                po.actual_delivery = date.today()

        database.commit()
        database.refresh(po)

        return po

    # ------------------------------------------------------------
    # CANNOT DELIVER CANCELLED PO
    # ------------------------------------------------------------

    if current_status in {
        "cancelled",
        "canceled",
        "rejected"
    }:

        raise HTTPException(
            status_code=400,
            detail=(
                "A cancelled or rejected purchase order "
                "cannot be marked as delivered."
            )
        )

    # ------------------------------------------------------------
    # FINANCE APPROVAL CHECK
    # ------------------------------------------------------------

    if current_status == "pending finance approval":

        raise HTTPException(
            status_code=400,
            detail=(
                "This purchase order has not received "
                "Finance Officer approval yet."
            )
        )

    # ------------------------------------------------------------
    # MARK DELIVERED
    # ------------------------------------------------------------

    po.status = "Delivered"

    if hasattr(po, "actual_delivery"):
        po.actual_delivery = date.today()

    database.commit()
    database.refresh(po)

    return po


def update_purchase_order(
    database: Session,
    po_id: int,
    po,
):
    db_po = get_purchase_order(database, po_id)

    if db_po is None:
        return None

    db_po.po_number = po.po_number
    db_po.vendor_id = po.vendor_id
    db_po.amount = po.amount
    # ------------------------------------------------------
    # PROTECT FINANCE APPROVAL STATUS
    # ------------------------------------------------------

    if db_po.status == "Pending Finance Approval":

        # Finance approval/rejection is the only thing
        # allowed to change this status.

        if po.status != "Pending Finance Approval":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "This purchase order is awaiting Finance Officer "
                    "approval and cannot change status."
                )
            )

        db_po.status = "Pending Finance Approval"

    else:

        db_po.status = po.status
    db_po.order_date = po.order_date
    db_po.actual_delivery= po.actual_delivery

    database.commit()
    database.refresh(db_po)
    return db_po


def delete_purchase_order(
    database: Session,
    po_id: int,
):
    po = get_purchase_order(database, po_id)

    if po is None:
        return None

    database.delete(po)
    database.commit()
    return po


def total_purchase_orders(database: Session) -> int:
    return database.query(
        db.PurchaseOrder
    ).count()


def procurement_total_orders(database: Session) -> int:
    return total_purchase_orders(database)


def total_spend(database: Session) -> float:
    value = database.query(
        func.sum(db.PurchaseOrder.amount)
    ).scalar()

    return _safe_float(value)


def procurement_total_spend(database: Session) -> float:
    return total_spend(database)


def average_purchase_order_value(database: Session) -> float:
    value = database.query(
        func.avg(db.PurchaseOrder.amount)
    ).scalar()

    return _safe_float(value)


def delivered_orders(database: Session) -> int:
    return database.query(
        db.PurchaseOrder
    ).filter(
        db.PurchaseOrder.status == "Delivered"
    ).count()


def pending_orders(database: Session) -> int:

    return database.query(
        db.PurchaseOrder
    ).filter(
        db.PurchaseOrder.status.in_([
            "Pending",
            "Pending Finance Approval"
        ])
    ).count()


def in_transit_orders(database: Session) -> int:
    return database.query(
        db.PurchaseOrder
    ).filter(
        db.PurchaseOrder.status == "In Transit"
    ).count()


def cancelled_orders(database: Session) -> int:
    return database.query(
        db.PurchaseOrder
    ).filter(
        db.PurchaseOrder.status == "Cancelled"
    ).count()


def partial_orders(database: Session) -> int:
    return database.query(
        db.PurchaseOrder
    ).filter(
        db.PurchaseOrder.status == "Partial"
    ).count()


def purchase_order_status(database: Session) -> dict:
    return {
        "Delivered": delivered_orders(database),
        "In Transit": in_transit_orders(database),
        "Pending": pending_orders(database),
        "Partial": partial_orders(database),
        "Cancelled": cancelled_orders(database),
    }


def vendor_purchase_orders(
    database: Session,
    vendor_id: str,
):
    return (
        database.query(db.PurchaseOrder)
        .filter(
            db.PurchaseOrder.vendor_id == vendor_id
        )
        .order_by(
            db.PurchaseOrder.order_date.desc()
        )
        .all()
    )


def recent_purchase_orders(
    database: Session,
    limit: int = 5,
):
    orders = (
        database.query(db.PurchaseOrder)
        .order_by(
            db.PurchaseOrder.order_date.desc()
        )
        .limit(limit)
        .all()
    )

    return [
        {
            "id": po.id,
            "po_number": po.po_number,
            "vendor_id": po.vendor_id,
            "vendor": _po_vendor(database, po),
            "amount": _safe_float(po.amount),
            "status": po.status,
            "order_date": po.order_date,
            "actual_delivery": po.actual_delivery,
        }
        for po in orders
    ]


def active_purchase_orders(
    database: Session,
    limit: Optional[int] = None,
):
    query = database.query(
        db.PurchaseOrder
    ).filter(
        db.PurchaseOrder.status.in_(
            ["Pending", "In Transit", "Partial"]
        )
    ).order_by(
        db.PurchaseOrder.order_date.desc()
    )

    if limit:
        query = query.limit(limit)

    orders = query.all()

    return [
        {
            "id": po.id,
            "po_number": po.po_number,
            "vendor": _po_vendor(database, po),
            "vendor_id": po.vendor_id,
            "amount": _safe_float(po.amount),
            "status": po.status,
            "order_date": po.order_date,
            "actual_delivery": po.actual_delivery,
        }
        for po in orders
    ]


def highest_purchase_orders(
    database: Session,
    limit: int = 5,
):
    return (
        database.query(db.PurchaseOrder)
        .order_by(
            db.PurchaseOrder.amount.desc()
        )
        .limit(limit)
        .all()
    )


def top_purchase_orders(
    database: Session,
    limit: int = 5,
):
    orders = highest_purchase_orders(
        database,
        limit,
    )

    return [
        {
            "po_number": order.po_number,
            "vendor_id": order.vendor_id,
            "vendor": _po_vendor(database, order),
            "amount": _safe_float(order.amount),
            "status": order.status,
        }
        for order in orders
    ]


# ============================================================================
# PROCUREMENT SPEND ANALYTICS
# ============================================================================

def monthly_spend(
    database: Session,
    year: Optional[int] = None,
):
    """
    Monthly spend grouped by calendar month.

    If year is provided, only that year is returned.
    """
    query = database.query(
        func.extract(
            "month",
            db.PurchaseOrder.order_date,
        ).label("month"),
        func.sum(
            db.PurchaseOrder.amount
        ).label("total"),
    )

    if year is not None:
        query = query.filter(
            func.extract(
                "year",
                db.PurchaseOrder.order_date,
            ) == year
        )

    rows = (
        query.group_by(
            func.extract(
                "month",
                db.PurchaseOrder.order_date,
            )
        )
        .order_by(
            func.extract(
                "month",
                db.PurchaseOrder.order_date,
            )
        )
        .all()
    )

    months = {
        1: "Jan",
        2: "Feb",
        3: "Mar",
        4: "Apr",
        5: "May",
        6: "Jun",
        7: "Jul",
        8: "Aug",
        9: "Sep",
        10: "Oct",
        11: "Nov",
        12: "Dec",
    }

    return [
        {
            "month": months.get(
                int(month),
                str(month),
            ),
            "month_number": int(month),
            "total_spend": _safe_float(total),
        }
        for month, total in rows
    ]


def current_month_spend(database: Session) -> float:
    today = date.today()

    value = database.query(
        func.sum(db.PurchaseOrder.amount)
    ).filter(
        func.extract(
            "month",
            db.PurchaseOrder.order_date,
        ) == today.month,
        func.extract(
            "year",
            db.PurchaseOrder.order_date,
        ) == today.year,
    ).scalar()

    return _safe_float(value)


def vendor_spend(database: Session):
    rows = (
        database.query(
            db.Vendor.vendor_name,
            db.Vendor.id.label("vendor_id"),
            func.sum(
                db.PurchaseOrder.amount
            ).label("total_spend"),
        )
        .join(
            db.PurchaseOrder,
            db.Vendor.vendor_id == db.PurchaseOrder.vendor_id,
        )
        .group_by(
            db.Vendor.id,
            db.Vendor.vendor_name,
        )
        .order_by(
            desc("total_spend")
        )
        .all()
    )

    total = procurement_total_spend(database)

    return [
        {
            "vendor_id": vendor_id,
            "vendor": vendor,
            "total_spend": _safe_float(spend),
            "percentage": (
                round(
                    (_number(spend) / total) * 100,
                    2,
                )
                if total
                else 0
            ),
        }
        for vendor, vendor_id, spend in rows
    ]


def spend_by_category(database: Session):
    """
    Spend by Vendor.category.

    The current model has category on Vendor, not PurchaseOrder, so this
    groups PO spend using the associated vendor category.
    """
    rows = (
        database.query(
            db.Vendor.category,
            func.sum(
                db.PurchaseOrder.amount
            ).label("total_spend"),
        )
        .join(
            db.PurchaseOrder,
            db.Vendor.vendor_id == db.PurchaseOrder.vendor_id,
        )
        .group_by(db.Vendor.category)
        .order_by(
            desc("total_spend")
        )
        .all()
    )

    total = procurement_total_spend(database)

    return [
        {
            "category": category or "Other",
            "total_spend": _safe_float(spend),
            "percentage": (
                round(
                    (_number(spend) / total) * 100,
                    2,
                )
                if total
                else 0
            ),
        }
        for category, spend in rows
    ]


def procurement_dashboard(database: Session):
    return {
        "total_purchase_orders":
            procurement_total_orders(database),
        "total_spend":
            procurement_total_spend(database),
        "average_order_value":
            average_purchase_order_value(database),
        "current_month_spend":
            current_month_spend(database),
        "status":
            purchase_order_status(database),
        "monthly_spend":
            monthly_spend(database),
        "top_orders":
            top_purchase_orders(database),
        "vendor_spend":
            vendor_spend(database),
        "spend_by_category":
            spend_by_category(database),
    }


# ============================================================================
# DELIVERY ANALYTICS
# ============================================================================

def total_deliveries(database: Session) -> int:
    return delivered_orders(database)


def on_time_delivery_rate(database: Session) -> float:
    """
    With the current PurchaseOrder model, delivery_date is the only delivery
    date exposed in the uploaded crud.py. There is no expected_delivery_date
    field, so a mathematically true on-time percentage cannot be derived.

    For the current implementation, Delivered orders are treated as completed
    deliveries and the result is therefore:
        actual_delivery <= expected_delivery
    where delayed is based on an explicit "Delayed" status if present.
    """
    delivered = delivered_orders(database)

    delayed = database.query(
        db.PurchaseOrder
    ).filter(
        db.PurchaseOrder.status == "Delayed"
    ).count()

    denominator = delivered + delayed

    if denominator == 0:
        return 0.0

    return round(
        (delivered / denominator) * 100,
        2,
    )


def delayed_delivery_rate(database: Session) -> float:
    delayed = database.query(
        db.PurchaseOrder
    ).filter(
        db.PurchaseOrder.status == "Delayed"
    ).count()

    delivered = delivered_orders(database)

    denominator = delivered + delayed

    if denominator == 0:
        return 0.0

    return round(
        (delayed / denominator) * 100,
        2,
    )


def average_delay(database: Session) -> float:
    """
    Real average delay requires expected_delivery_date and actual_delivery_date.

    The uploaded model only exposes delivery_date. Therefore this returns 0
    until those fields are added to PurchaseOrder.
    """
    expected_field = (
        "expected_delivery"
        if _field_exists(
            db.PurchaseOrder,
            "expected_delivery",
        )
        else None
    )

    actual_field = None

    for candidate in (
        "actual_delivery",
        "delivered_date",
        "delivery_date",
    ):
        if _field_exists(db.PurchaseOrder, candidate):
            actual_field = candidate
            break

    if expected_field is None or actual_field is None:
        return 0.0

    rows = (
        database.query(
            getattr(
                db.PurchaseOrder,
                expected_field,
            ),
            getattr(
                db.PurchaseOrder,
                actual_field,
            ),
        )
        .filter(
            db.PurchaseOrder.status == "Delivered"
        )
        .all()
    )

    delays = []

    for expected, actual in rows:
        expected = _date_value(expected)
        actual = _date_value(actual)

        if expected and actual:
            delays.append(
                max(
                    0,
                    (actual - expected).days,
                )
            )

    if not delays:
        return 0.0

    return round(
        sum(delays) / len(delays),
        2,
    )


def delivery_performance_by_vendor(database: Session):
    vendors = database.query(db.Vendor).all()

    result = []

    for vendor in vendors:
        orders = (
            database.query(db.PurchaseOrder)
            .filter(
                db.PurchaseOrder.vendor_id == vendor.vendor_id
            )
            .all()
        )

        delivered = [
            order
            for order in orders
            if order.status == "Delivered"
        ]

        delayed = [
            order
            for order in orders
            if order.status == "Delayed"
        ]

        total_completed = len(delivered) + len(delayed)

        rate = (
            round(
                len(delivered) / total_completed * 100,
                2,
            )
            if total_completed
            else 0
        )

        result.append(
            {
                "vendor_id": vendor.id,
                "vendor": vendor.vendor_name,
                "on_time_delivery": rate,
                "total_deliveries": len(delivered),
            }
        )

    return result


def monthly_delivery_performance(database: Session):
    """
    Monthly delivery performance.

    Uses the existing PurchaseOrder model:

        expected_delivery
        actual_delivery
        status

    Delivered orders are grouped by actual delivery month.

    Delayed orders are grouped by actual delivery month when
    actual_delivery exists; otherwise expected_delivery is used.

    Returns:
        [
            {
                "month": "Jan",
                "month_number": 1,
                "delivered": 10,
                "delayed": 2,
                "on_time_percentage": 83.33
            },
            ...
        ]
    """

    # ==========================================================
    # DELIVERED ORDERS
    # ==========================================================

    delivered_rows = (
        database.query(
            func.extract(
                "month",
                db.PurchaseOrder.actual_delivery
            ).label("month"),

            func.count(
                db.PurchaseOrder.id
            ).label("total"),
        )
        .filter(
            db.PurchaseOrder.status == "Delivered",

            db.PurchaseOrder.actual_delivery.isnot(None)
        )
        .group_by(
            func.extract(
                "month",
                db.PurchaseOrder.actual_delivery
            )
        )
        .order_by(
            func.extract(
                "month",
                db.PurchaseOrder.actual_delivery
            )
        )
        .all()
    )

    # ==========================================================
    # DELAYED ORDERS
    # ==========================================================

    delayed_rows = (
        database.query(
            func.extract(
                "month",
                db.PurchaseOrder.actual_delivery
            ).label("month"),

            func.count(
                db.PurchaseOrder.id
            ).label("total"),
        )
        .filter(
            db.PurchaseOrder.status == "Delayed",

            db.PurchaseOrder.actual_delivery.isnot(None)
        )
        .group_by(
            func.extract(
                "month",
                db.PurchaseOrder.actual_delivery
            )
        )
        .order_by(
            func.extract(
                "month",
                db.PurchaseOrder.actual_delivery
            )
        )
        .all()
    )

    # ==========================================================
    # CREATE MAPS
    # ==========================================================

    delivered_map = {
        int(month): int(total)
        for month, total in delivered_rows
        if month is not None
    }

    delayed_map = {
        int(month): int(total)
        for month, total in delayed_rows
        if month is not None
    }

    # ==========================================================
    # MONTH NAMES
    # ==========================================================

    months = {
        1: "Jan",
        2: "Feb",
        3: "Mar",
        4: "Apr",
        5: "May",
        6: "Jun",
        7: "Jul",
        8: "Aug",
        9: "Sep",
        10: "Oct",
        11: "Nov",
        12: "Dec",
    }

    # ==========================================================
    # COMBINE MONTHS
    # ==========================================================

    all_months = sorted(
        set(delivered_map) |
        set(delayed_map)
    )

    result = []

    # ==========================================================
    # BUILD RESULT
    # ==========================================================

    for month in all_months:

        delivered = delivered_map.get(
            month,
            0
        )

        delayed = delayed_map.get(
            month,
            0
        )

        total = (
            delivered +
            delayed
        )

        on_time_percentage = (
            round(
                delivered /
                total *
                100,
                2
            )
            if total
            else 0
        )

        result.append(
            {
                "month": months.get(
                    month,
                    str(month)
                ),

                "month_number": month,

                "delivered": delivered,

                "delayed": delayed,

                "on_time_percentage":
                    on_time_percentage,
            }
        )

    return result


def delivery_status_dashboard(database: Session):

    return {

        "on_time_delivery_rate":
            on_time_delivery_rate(database),

        "delayed_delivery_rate":
            delayed_delivery_rate(database),

        "average_delay_days":
            average_delay(database),

        "total_deliveries":
            total_deliveries(database),

        "monthly_performance":
            monthly_delivery_performance(database),

        "by_vendor":
            delivery_performance_by_vendor(database),
    }


# ============================================================================
# VENDOR-SPECIFIC PROCUREMENT ANALYTICS
# ============================================================================

def vendor_total_purchase_orders(
    database: Session,
    vendor_id: str,
) -> int:
    return database.query(
        db.PurchaseOrder
    ).filter(
        db.PurchaseOrder.vendor_id == vendor_id
    ).count()


def vendor_total_spend(
    database: Session,
    vendor_id: str,
) -> float:
    value = database.query(
        func.sum(db.PurchaseOrder.amount)
    ).filter(
        db.PurchaseOrder.vendor_id == vendor_id
    ).scalar()

    return _safe_float(value)


def vendor_delivered_orders(
    database: Session,
    vendor_id: str,
) -> int:
    return database.query(
        db.PurchaseOrder
    ).filter(
        db.PurchaseOrder.vendor_id == vendor_id,
        db.PurchaseOrder.status == "Delivered",
    ).count()


def vendor_delayed_orders(
    database: Session,
    vendor_id: str,
) -> int:
    return database.query(
        db.PurchaseOrder
    ).filter(
        db.PurchaseOrder.vendor_id == vendor_id,
        db.PurchaseOrder.status == "Delayed",
    ).count()


def vendor_on_time_delivery(
    database: Session,
    vendor_id: str,
) -> float:
    delivered = vendor_delivered_orders(
        database,
        vendor_id,
    )

    delayed = vendor_delayed_orders(
        database,
        vendor_id,
    )

    total = delivered + delayed

    if total == 0:
        return 0.0

    return round(
        delivered / total * 100,
        2,
    )


def vendor_quality_rating(
    database: Session,
    vendor_id: str,
) -> Optional[float]:
    """
    Uses Vendor.quality_score or Vendor.quality_rating if such a field exists.
    Otherwise returns None because the current uploaded model does not show
    such a field.
    """
    vendor = get_vendor(database, vendor_id)

    if vendor is None:
        return None

    for field in (
        "quality_score",
        "quality_rating",
    ):
        value = getattr(vendor, field, None)

        if value is not None:
            return _safe_float(value)

    return None


def vendor_performance_summary(
    database: Session,
    vendor_id: str,
) -> dict:
    vendor = get_vendor(database, vendor_id)

    if vendor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found.",
        )

    reliability = _safe_float(
        getattr(
            vendor,
            "reliability_score",
            0,
        )
    )

    quality = vendor_quality_rating(
        database,
        vendor_id,
    )

    return {
        "vendor_id": vendor_id,
        "vendor_name": vendor.vendor_name,
        "on_time_deliveries":
            vendor_on_time_delivery(
                database,
                vendor_id,
            ),
        "delayed_deliveries":
            vendor_delayed_orders(
                database,
                vendor_id,
            ),
        "quality_score": quality,
        "reliability_score": reliability,
        "response_time_hours": (
            _safe_float(
                getattr(
                    vendor,
                    "response_time_hours",
                    0,
                )
            )
            if hasattr(
                vendor,
                "response_time_hours",
            )
            else None
        ),
        "issue_resolution_days": (
            _safe_float(
                getattr(
                    vendor,
                    "issue_resolution_days",
                    0,
                )
            )
            if hasattr(
                vendor,
                "issue_resolution_days",
            )
            else None
        ),
        "order_completion_rate": (
            _safe_float(
                getattr(
                    vendor,
                    "order_completion_rate",
                    0,
                )
            )
            if hasattr(
                vendor,
                "order_completion_rate",
            )
            else None
        ),
    }


def vendor_performance_trend(
    database: Session,
    vendor_id: str,
):
    """
    If a VendorPerformance/history table exists, this can be extended to read
    it. The currently uploaded model list does not establish such a table.

    Therefore this returns a compact current snapshot rather than inventing
    historical data.
    """
    vendor = get_vendor(database, vendor_id)

    if vendor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found.",
        )

    return {
        "vendor_id": vendor.id,
        "vendor_name": vendor.vendor_name,
        "history": [],
        "current": {
            "reliability_score":
                _safe_float(
                    vendor.reliability_score
                ),
            "on_time_delivery":
                vendor_on_time_delivery(
                    database,
                    vendor_id,
                ),
            "quality_score":
                vendor_quality_rating(
                    database,
                    vendor_id,
                ),
        },
        "message": (
            "Historical trend requires a vendor performance history table."
        ),
    }


# ============================================================================
# CONTRACT CRUD / COMPLIANCE
# ============================================================================

def create_contract(database: Session, contract):
    new_contract = db.Contract(
        contract_number=contract.contract_number,
        vendor_id=contract.vendor_id,
        status=contract.status,
        expiry_date=contract.expiry_date,
    )

    database.add(new_contract)
    database.commit()
    database.refresh(new_contract)
    return new_contract


def get_contracts(database: Session):
    return (
        database.query(db.Contract)
        .order_by(
            db.Contract.expiry_date.asc()
        )
        .all()
    )


def get_contract(
    database: Session,
    contract_id: int,
):
    return (
        database.query(db.Contract)
        .filter(db.Contract.id == contract_id)
        .first()
    )


def update_contract(
    database: Session,
    contract_id: int,
    contract,
):
    db_contract = get_contract(
        database,
        contract_id,
    )

    if db_contract is None:
        return None

    db_contract.contract_number = (
        contract.contract_number
    )
    db_contract.vendor_id = contract.vendor_id
    db_contract.status = contract.status
    db_contract.expiry_date = contract.expiry_date

    database.commit()
    database.refresh(db_contract)
    return db_contract


def delete_contract(
    database: Session,
    contract_id: int,
):
    contract = get_contract(
        database,
        contract_id,
    )

    if contract is None:
        return None

    database.delete(contract)
    database.commit()
    return contract


def total_contracts(database: Session) -> int:
    return database.query(db.Contract).count()


def active_contracts(database: Session) -> int:
    return database.query(
        db.Contract
    ).filter(
        db.Contract.status == "Active"
    ).count()


def expired_contracts(database: Session) -> int:
    today = date.today()

    return database.query(
        db.Contract
    ).filter(
        db.Contract.expiry_date < today
    ).count()


def expiring_contracts(
    database: Session,
    days: int = 30,
) -> int:
    today = date.today()
    future = today + timedelta(days=days)

    return database.query(
        db.Contract
    ).filter(
        db.Contract.expiry_date >= today,
        db.Contract.expiry_date <= future,
    ).count()


def pending_renewals(database: Session) -> int:
    return expiring_contracts(database, 30)


def contract_status_distribution(database: Session):
    today = date.today()
    future = today + timedelta(days=30)

    active = active_contracts(database)
    expired = expired_contracts(database)

    expiring_soon = database.query(
        db.Contract
    ).filter(
        db.Contract.status == "Active",
        db.Contract.expiry_date >= today,
        db.Contract.expiry_date <= future,
    ).count()

    draft = database.query(
        db.Contract
    ).filter(
        db.Contract.status == "Draft"
    ).count()

    return {
        "active": active,
        "expiring_soon": expiring_soon,
        "expired": expired,
        "draft": draft,
        "total": total_contracts(database),
    }


def compliance_score(database: Session) -> float:
    total = total_contracts(database)

    if total == 0:
        return 0.0

    compliant = active_contracts(database)

    return round(
        compliant / total * 100,
        2,
    )


def contract_alerts(database: Session):
    today = date.today()
    future = today + timedelta(days=30)

    contracts = (
        database.query(db.Contract)
        .filter(
            db.Contract.expiry_date <= future
        )
        .order_by(
            db.Contract.expiry_date.asc()
        )
        .all()
    )

    alerts = []

    for contract in contracts:
        expiry = _date_value(
            contract.expiry_date
        )

        if expiry is None:
            continue

        vendor = get_vendor(
            database,
            contract.vendor_id,
        )

        days_remaining = (
            expiry - today
        ).days

        if expiry < today:
            alert = "Expired"
        elif days_remaining <= 7:
            alert = "Expires in 7 Days"
        else:
            alert = "Expires in 30 Days"

        alerts.append(
            {
                "contract_number":
                    contract.contract_number,
                "vendor":
                    getattr(
                        vendor,
                        "vendor_name",
                        "",
                    )
                    if vendor
                    else "",
                "vendor_id":
                    contract.vendor_id,
                "expiry_date":
                    contract.expiry_date,
                "days_remaining":
                    days_remaining,
                "status":
                    contract.status,
                "alert":
                    alert,
            }
        )

    return alerts


def expiring_contract_list(
    database: Session,
    days: int = 30,
):
    today = date.today()
    future = today + timedelta(days=days)

    contracts = (
        database.query(db.Contract)
        .filter(
            db.Contract.expiry_date >= today,
            db.Contract.expiry_date <= future,
        )
        .order_by(
            db.Contract.expiry_date.asc()
        )
        .all()
    )

    result = []

    for contract in contracts:
        vendor = get_vendor(
            database,
            contract.vendor_id,
        )

        expiry = _date_value(
            contract.expiry_date
        )

        result.append(
            {
                "contract_number":
                    contract.contract_number,
                "vendor":
                    getattr(
                        vendor,
                        "vendor_name",
                        "",
                    )
                    if vendor
                    else "",
                "vendor_id":
                    contract.vendor_id,
                "expiry_date":
                    contract.expiry_date,
                "days_remaining":
                    (
                        (expiry - today).days
                        if expiry
                        else None
                    ),
            }
        )

    return result


def vendor_compliance(database: Session):
    vendors = get_vendors(database)

    result = []

    for vendor in vendors:
        total = database.query(
            db.Contract
        ).filter(
            db.Contract.vendor_id == vendor.vendor_id
        ).count()

        active = database.query(
            db.Contract
        ).filter(
            db.Contract.vendor_id == vendor.vendor_id,
            db.Contract.status == "Active",
        ).count()

        score = (
            round(
                active / total * 100,
                2,
            )
            if total
            else 0
        )

        result.append(
            {
                "vendor_id": vendor.id,
                "vendor_name": vendor.vendor_name,
                "compliance_score": score,
            }
        )

    return result


def compliance_dashboard(database: Session):
    return {
        "total_contracts":
            total_contracts(database),
        "active_contracts":
            active_contracts(database),
        "expired_contracts":
            expired_contracts(database),
        "expiring_contracts":
            expiring_contracts(database),
        "compliance_score":
            compliance_score(database),
        "status_distribution":
            contract_status_distribution(database),
        "contract_alerts":
            contract_alerts(database),
        "vendor_compliance":
            vendor_compliance(database),
        "expiring_list":
            expiring_contract_list(database),
    }


# ============================================================================
# INVOICE CRUD / ANALYTICS
# ============================================================================

def create_invoice(database: Session, invoice):

    vendor = (
        database.query(db.Vendor)
        .filter(
            db.Vendor.vendor_id == invoice.vendor_id
        )
        .first()
    )

    kwargs = {
        "invoice_number": invoice.invoice_number,
        "amount": invoice.amount,
        "status": invoice.status,
        "invoice_date": invoice.invoice_date,
    }

    if _field_exists(db.Invoice, "vendor_id"):
        kwargs["vendor_id"] = getattr(
            invoice,
            "vendor_id",
            None,
        )

    new_invoice = db.Invoice(**kwargs)

    database.add(new_invoice)
    database.commit()
    database.refresh(new_invoice)
    return new_invoice


def get_invoices(database: Session):
    return (
        database.query(db.Invoice)
        .order_by(
            db.Invoice.invoice_date.desc()
        )
        .all()
    )


def get_invoice(
    database: Session,
    invoice_id: int,
):
    return (
        database.query(db.Invoice)
        .filter(db.Invoice.id == invoice_id)
        .first()
    )


def update_invoice(
    database: Session,
    invoice_id: int,
    invoice,
):
    db_invoice = get_invoice(
        database,
        invoice_id,
    )

    if db_invoice is None:
        return None

    db_invoice.invoice_number = (
        invoice.invoice_number
    )
    db_invoice.amount = invoice.amount
    db_invoice.status = invoice.status
    db_invoice.invoice_date = invoice.invoice_date

    if _field_exists(db.Invoice, "vendor_id"):
        db_invoice.vendor_id = getattr(
            invoice,
            "vendor_id",
            getattr(
                db_invoice,
                "vendor_id",
                None,
            ),
        )

    database.commit()
    database.refresh(db_invoice)
    return db_invoice


def delete_invoice(
    database: Session,
    invoice_id: int,
):
    invoice = get_invoice(
        database,
        invoice_id,
    )

    if invoice is None:
        return None

    database.delete(invoice)
    database.commit()
    return invoice


def total_invoices(database: Session) -> int:
    return database.query(db.Invoice).count()


def total_invoice_amount(database: Session) -> float:
    value = database.query(
        func.sum(db.Invoice.amount)
    ).scalar()

    return _safe_float(value)


def paid_invoices(database: Session) -> int:
    return database.query(
        db.Invoice
    ).filter(
        db.Invoice.status == "Paid"
    ).count()


def pending_invoices(database: Session) -> int:
    return database.query(
        db.Invoice
    ).filter(
        db.Invoice.status == "Pending"
    ).count()


def overdue_invoices(database: Session) -> int:
    return database.query(
        db.Invoice
    ).filter(
        db.Invoice.status == "Overdue"
    ).count()


def recent_invoices(
    database: Session,
    limit: int = 10,
):
    return (
        database.query(db.Invoice)
        .order_by(
            db.Invoice.invoice_date.desc()
        )
        .limit(limit)
        .all()
    )


def invoice_overview(database: Session):
    total = total_invoices(database)
    paid = paid_invoices(database)
    pending = pending_invoices(database)
    overdue = overdue_invoices(database)

    total_amount = database.query(
        func.sum(db.Invoice.amount)
    ).scalar()

    paid_amount = database.query(
        func.sum(db.Invoice.amount)
    ).filter(
        db.Invoice.status == "Paid"
    ).scalar()

    pending_amount = database.query(
        func.sum(db.Invoice.amount)
    ).filter(
        db.Invoice.status == "Pending"
    ).scalar()

    overdue_amount = database.query(
        func.sum(db.Invoice.amount)
    ).filter(
        db.Invoice.status == "Overdue"
    ).scalar()

    recent = recent_invoices(
        database,
        5,
    )

    return {
        "total_invoices": total,
        "paid_invoices": paid,
        "pending_invoices": pending,
        "overdue_invoices": overdue,
        "total_amount": _safe_float(total_amount),
        "paid_amount": _safe_float(paid_amount),
        "pending_amount": _safe_float(pending_amount),
        "overdue_amount": _safe_float(overdue_amount),
        "recent_invoices": [
            {
                "id": invoice.id,
                "invoice_number":
                    invoice.invoice_number,
                "amount":
                    _safe_float(invoice.amount),
                "status":
                    invoice.status,
                "invoice_date":
                    invoice.invoice_date,
                "vendor_id":
                    getattr(
                        invoice,
                        "vendor_id",
                        None,
                    ),
            }
            for invoice in recent
        ],
    }


def vendor_total_invoiced(
    database: Session,
    vendor_id: str,
) -> Optional[float]:
    if not _field_exists(db.Invoice, "vendor_id"):
        return None

    value = database.query(
        func.sum(db.Invoice.amount)
    ).filter(
        db.Invoice.vendor_id == vendor_id
    ).scalar()

    return _safe_float(value)


def vendor_pending_payments(
    database: Session,
    vendor_id: str,
) -> Optional[float]:
    if not _field_exists(db.Invoice, "vendor_id"):
        return None

    value = database.query(
        func.sum(db.Invoice.amount)
    ).filter(
        db.Invoice.vendor_id == vendor_id,
        db.Invoice.status.in_(
            ["Pending", "Overdue"]
        ),
    ).scalar()

    return _safe_float(value)


def vendor_invoice_overview(
    database: Session,
    vendor_id: str,
):
    if not _field_exists(db.Invoice, "vendor_id"):
        return {
            "vendor_id": vendor_id,
            "supported": False,
            "message": (
                "Invoice.vendor_id is required for vendor-specific "
                "invoice analytics."
            ),
            "total_invoiced": None,
            "pending_payments": None,
            "total_invoices": 0,
            "paid_invoices": 0,
            "pending_invoices": 0,
            "overdue_invoices": 0,
        }

    query = database.query(
        db.Invoice
    ).filter(
        db.Invoice.vendor_id == vendor_id
    )

    total = query.count()

    paid = query.filter(
        db.Invoice.status == "Paid"
    ).count()

    pending = query.filter(
        db.Invoice.status == "Pending"
    ).count()

    overdue = query.filter(
        db.Invoice.status == "Overdue"
    ).count()

    amount = query.with_entities(
        func.sum(db.Invoice.amount)
    ).scalar()

    pending_amount = query.filter(
        db.Invoice.status.in_(
            ["Pending", "Overdue"]
        )
    ).with_entities(
        func.sum(db.Invoice.amount)
    ).scalar()

    return {
        "vendor_id": vendor_id,
        "supported": True,
        "total_invoices": total,
        "paid_invoices": paid,
        "pending_invoices": pending,
        "overdue_invoices": overdue,
        "total_invoiced": _safe_float(amount),
        "pending_payments": _safe_float(
            pending_amount
        ),
    }


# ============================================================================
# SYSTEM ACTIVITY
# ============================================================================

def create_activity(
    database: Session,
    activity,
):
    new_activity = db.SystemActivity(
        message=activity.message,
        activity_type=activity.activity_type,
        created_at=datetime.now(timezone.utc),
    )

    database.add(new_activity)
    database.commit()
    database.refresh(new_activity)
    return new_activity


def get_activities(database: Session):
    return (
        database.query(db.SystemActivity)
        .order_by(
            db.SystemActivity.created_at.desc()
        )
        .all()
    )


def get_activity(
    database: Session,
    activity_id: int,
):
    return (
        database.query(db.SystemActivity)
        .filter(
            db.SystemActivity.id == activity_id
        )
        .first()
    )


def delete_activity(
    database: Session,
    activity_id: int,
):
    activity = get_activity(
        database,
        activity_id,
    )

    if activity is None:
        return None

    database.delete(activity)
    database.commit()
    return activity


def total_activities(database: Session) -> int:
    return database.query(
        db.SystemActivity
    ).count()


def recent_activities(
    database: Session,
    limit: int = 5,
):
    activities = (
        database.query(db.SystemActivity)
        .order_by(
            db.SystemActivity.created_at.desc()
        )
        .limit(limit)
        .all()
    )

    return [
        {
            "id": activity.id,
            "message": activity.message,
            "activity_type":
                activity.activity_type,
            "created_at":
                activity.created_at,
        }
        for activity in activities
    ]


def activities_by_type(
    database: Session,
    activity_type: str,
):
    return (
        database.query(db.SystemActivity)
        .filter(
            db.SystemActivity.activity_type
            == activity_type
        )
        .order_by(
            db.SystemActivity.created_at.desc()
        )
        .all()
    )


# ============================================================================
# ADMIN DASHBOARD
# ============================================================================

def admin_dashboard(database: Session):
    return {
        "summary": {
            "total_users":
                total_users(database),
            "active_users":
                active_users(database),
            "total_vendors":
                total_vendors(database),
            "total_purchase_orders":
                total_purchase_orders(database),
            "total_spend":
                total_spend(database),
            "active_contracts":
                active_contracts(database),
            "compliance_score":
                compliance_score(database),
        },

        "vendor_reliability": {
            "distribution":
                reliability_distribution(database),
            "top_vendors":
                top_vendors(database, 5),
            "average_reliability":
                average_vendor_reliability(database),
        },

        "procurement_overview": {
            "monthly_spend":
                monthly_spend(database),
            "total_orders":
                procurement_total_orders(database),
            "total_spend":
                procurement_total_spend(database),
        },

        "contracts": {
            "total":
                total_contracts(database),
            "active":
                active_contracts(database),
            "expired":
                expired_contracts(database),
            "expiring_soon":
                expiring_contracts(database),
            "pending_renewals":
                pending_renewals(database),
            "alerts":
                contract_alerts(database),
        },

        "compliance": {
            "score":
                compliance_score(database),
            "status_distribution":
                contract_status_distribution(database),
            "vendor_compliance":
                vendor_compliance(database),
        },

        "invoices":
            invoice_overview(database),

        "recent_purchase_orders":
            recent_purchase_orders(database, 5),

        "system_activity":
            recent_activities(database, 5),
    }


# ============================================================================
# PROCUREMENT MANAGER DASHBOARD
# ============================================================================

def procurement_manager_dashboard(
    database: Session,
):
    return {
        "summary": {
            "total_spend":
                procurement_total_spend(database),
            "total_purchase_orders":
                procurement_total_orders(database),
            "active_suppliers":
                total_vendors(database),
            "on_time_delivery":
                on_time_delivery_rate(database),
            "pending_purchase_orders":
                pending_orders(database),
            "savings_ytd": 0.0,
        },

        "procurement_overview": {
            "total_purchase_orders":
                procurement_total_orders(database),
            "delivered":
                delivered_orders(database),
            "in_transit":
                in_transit_orders(database),
            "pending":
                pending_orders(database),
            "partial":
                partial_orders(database),
            "cancelled":
                cancelled_orders(database),
            "status":
                purchase_order_status(database),
        },

        "active_purchase_orders": {
            "count":
                len(
                    active_purchase_orders(
                        database
                    )
                ),
            "orders":
                active_purchase_orders(
                    database,
                    50,
                ),
        },

        "vendor_performance": {
            "average_score":
                average_vendor_reliability(database),
            "vendors":
                top_vendors(database, 5),
            "category_reliability":
                category_reliability(database),
            "delivery_performance":
                delivery_performance_by_vendor(
                    database
                ),
        },

        "cost_analysis": {
            "total_spend":
                procurement_total_spend(database),
            "average_order_value":
                average_purchase_order_value(database),
            "monthly_spend":
                monthly_spend(database),
            "spend_by_vendor":
                vendor_spend(database),
            "spend_by_category":
                spend_by_category(database),
        },

        "delivery_status":
            delivery_status_dashboard(database),

        "recent_purchase_orders":
            recent_purchase_orders(database, 5),

        "top_spending_vendors":
            vendor_spend(database)[:5],

        "bottom_metrics": {
            "average_po_value":
                average_purchase_order_value(database),
            "po_conversion_rate": None,
            "supplier_lead_time_days": None,
            "invoice_accuracy": None,
            "cost_savings_ytd": 0.0,
            "budget_utilization": None,
        },
    }


# ============================================================================
# VENDOR DASHBOARD
# ============================================================================

def vendor_dashboard_by_id(
    database: Session,
    vendor_id: str,
):
    vendor = get_vendor(
        database,
        vendor_id,
    )

    if vendor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found.",
        )

    contracts = vendor_contract_data(
        database,
        vendor_id,
    )

    recent_orders = vendor_purchase_orders(
        database,
        vendor_id,
    )[:5]

    contract_alert_list = [

        {
            "contract_number":
                contract.contract_number,

            "status":
                contract.status,

            "expiry_date":
                contract.expiry_date,

            "days_remaining":
                (
                    (
                        _date_value(
                            contract.expiry_date
                        )
                        - date.today()
                    ).days
                    if _date_value(
                        contract.expiry_date
                    )
                    else None
                ),
        }

        for contract in contracts

        if (
            _date_value(
                contract.expiry_date
            ) is not None

            and date.today()
            <= _date_value(
                contract.expiry_date
            )

            <= (
                date.today()
                + timedelta(days=30)
            )
        )
    ]

    recent_order_data = [
        {
            "id": order.id,
            "po_number": order.po_number,
            "amount": _safe_float(order.amount),
            "status": order.status,
            "order_date": order.order_date,
            "actual_delivery": order.actual_delivery,
        }
        for order in recent_orders
    ]

    reliability = _safe_float(
        getattr(
            vendor,
            "reliability_score",
            0,
        )
    )

    quality = vendor_quality_rating(
        database,
        vendor_id,
    )

    invoice_data = vendor_invoice_overview(
        database,
        vendor_id,
    )

    return {
        "summary": {
            "vendor_id":
                vendor.id,
            "vendor_name":
                vendor.vendor_name,
            "reliability_score":
                reliability,
            "total_purchase_orders":
                vendor_total_purchase_orders(
                    database,
                    vendor_id,
                ),
            "on_time_delivery":
                vendor_on_time_delivery(
                    database,
                    vendor_id,
                ),
            "quality_rating":
                quality,
            "total_invoiced":
                vendor_total_invoiced(
                    database,
                    vendor_id,
                ),
            "pending_payments":
                vendor_pending_payments(
                    database,
                    vendor_id,
                ),
        },

        "performance_summary":
            vendor_performance_summary(
                database,
                vendor_id,
            ),

        "recent_purchase_orders":
            recent_order_data,

        "contract_alerts":
            contract_alert_list,

        "notifications": [],

        "performance_trend":
            vendor_performance_trend(
                database,
                vendor_id,
            ),

        "contract_status": {
            "total":
                len(contracts),
            "active":
                sum(
                    1
                    for c in contracts
                    if c.status == "Active"
                ),
            "expired":
                sum(
                    1
                    for c in contracts
                    if (
                        _date_value(
                            c.expiry_date
                        )
                        and _date_value(
                            c.expiry_date
                        ) < date.today()
                    )
                ),
            "expiring_soon":
                sum(
                    1
                    for c in contracts
                    if (
                        _date_value(
                            c.expiry_date
                        )
                        and date.today()
                        <= _date_value(
                            c.expiry_date
                        )
                        <= date.today()
                        + timedelta(days=30)
                    )
                ),
        },

        "invoices":
            invoice_data,

        "documents": [],
    }


def vendor_dashboard(
    database: Session,
    vendor_id: Optional[str] = None,
):
    """
    Compatibility wrapper.

    For the Vendor Dashboard use:
        vendor_dashboard(database, vendor_id)
    """
    if vendor_id is None:
        return {
            "vendors":
                top_vendors(database, 5),
            "average_reliability":
                average_vendor_reliability(database),
            "message":
                "Pass vendor_id for the complete vendor dashboard.",
        }

    return vendor_dashboard_by_id(
        database,
        vendor_id,
    )


# ============================================================================
# COMPLETE DASHBOARD API
# ============================================================================

def dashboard_summary(database: Session):
    return {
        "users": {
            "total_users":
                total_users(database),
            "active_users":
                active_users(database),
        },
        "vendors": {
            "total_vendors":
                total_vendors(database),
            "average_reliability":
                average_vendor_reliability(database),
        },
        "purchase_orders": {
            "total_purchase_orders":
                total_purchase_orders(database),
            "delivered":
                delivered_orders(database),
            "pending":
                pending_orders(database),
            "in_transit":
                in_transit_orders(database),
            "total_spend":
                total_spend(database),
        },
        "contracts": {
            "active_contracts":
                active_contracts(database),
            "compliance_score":
                compliance_score(database),
        },
        "invoices": {
            "total_invoices":
                total_invoices(database),
            "paid":
                paid_invoices(database),
            "pending":
                pending_invoices(database),
            "overdue":
                overdue_invoices(database),
        },
    }


def dashboard_api(database: Session):
    """
    Backwards-compatible combined dashboard endpoint.

    Prefer the three dedicated functions:
        admin_dashboard()
        procurement_manager_dashboard()
        vendor_dashboard_by_id()
    """
    return {
        "summary":
            dashboard_summary(database),

        "admin":
            admin_dashboard(database),

        "procurement":
            procurement_manager_dashboard(database),

        "statistics": {
            "total_users":
                total_users(database),
            "active_users":
                active_users(database),
            "total_vendors":
                total_vendors(database),
            "total_purchase_orders":
                total_purchase_orders(database),
            "total_spend":
                total_spend(database),
            "active_contracts":
                active_contracts(database),
            "compliance_score":
                compliance_score(database),
        },
    }


# ============================================================================
# OPTIONAL CURRENT USER / ROLE HELPERS
# ============================================================================

def is_active_user(user) -> bool:
    return _user_is_active(user)


def is_authenticated(user) -> bool:
    return user is not None


def has_role(user, role: Union[str, Any]) -> bool:
    return (
        _role_value(getattr(user, "role", None))
        == _role_value(role)
    )


def has_any_role(
    user,
    roles: Iterable[Union[str, Any]],
) -> bool:
    allowed = {
        _role_value(role)
        for role in roles
    }

    return (
        _role_value(
            getattr(user, "role", None)
        )
        in allowed
    )


def verify_role(
    user,
    role: Union[str, Any],
):
    if not has_role(user, role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"'{_role_value(role)}' role required."
            ),
        )

    return user


def verify_roles(
    user,
    roles: Iterable[Union[str, Any]],
):
    if not has_any_role(user, roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied.",
        )

    return user


# ============================================================================
# LEGACY COMPATIBILITY ALIASES
# ============================================================================

def get_current_admin(
    current_user=Depends(get_current_user),
):
    return require_admin(current_user)


def get_current_procurement_manager(
    current_user=Depends(get_current_user),
):
    return require_procurement_manager(current_user)


def get_current_admin_or_procurement_manager(
    current_user=Depends(get_current_user),
):
    return require_admin_or_procurement_manager(
        current_user
    )


def require_authenticated_user(
    current_user=Depends(get_current_user),
):
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return current_user


def current_user_profile(
    current_user=Depends(get_current_user),
):
    return {
        "id": getattr(current_user, "id", None),
        "name": _user_name(current_user),
        "email": getattr(current_user, "email", None),
        "role": getattr(current_user, "role", None),
        "active": _user_is_active(current_user),
        "created_at": getattr(
            current_user,
            "created_at",
            None,
        ),
    }


# ============================================================
# FINANCE OFFICER AUTHORIZATION
# ============================================================

def require_finance_officer(
    current_user=Depends(get_current_user)
):
    """
    Allow access only to Finance Officer users.
    """

    if not _is_role(
        current_user,
        "Finance Officer"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Finance Officer privileges are required."
        )

    return current_user


# ============================================================
# FINANCE OFFICER DASHBOARD
# ============================================================

def get_finance_officer_dashboard(
    database: Session,
    current_user
):
    """
    Build the Finance Officer Dashboard shown in the UI.

    Data sources:
        finance_budgets
        finance_transactions
        finance_cash_flow
        finance_alerts
        approval_steps
        approval_workflows
    """

    # ========================================================
    # 1. BUDGET
    # ========================================================

    budgets = (
        database.query(db.FinanceBudget)
        .order_by(
            db.FinanceBudget.year.desc(),
            db.FinanceBudget.department.asc()
        )
        .all()
    )

    total_budget = sum(
        float(row.budget or 0)
        for row in budgets
    )

    total_actual = sum(
        float(row.actual or 0)
        for row in budgets
    )

    budget_utilization = (
        (total_actual / total_budget) * 100
        if total_budget > 0
        else 0
    )

    # ========================================================
    # 2. EXPENSES
    # ========================================================

    expense_total = (
        database.query(
            func.coalesce(
                func.sum(
                    db.FinanceTransaction.amount
                ),
                0
            )
        )
        .filter(
            db.FinanceTransaction.transaction_type == "expense"
        )
        .scalar()
    )

    total_expenses = float(
        expense_total or 0
    )

    # ========================================================
    # 3. REVENUE
    # ========================================================

    revenue_total = (
        database.query(
            func.coalesce(
                func.sum(
                    db.FinanceTransaction.amount
                ),
                0
            )
        )
        .filter(
            db.FinanceTransaction.transaction_type.in_(
                [
                    "income",
                    "inflow",
                    "revenue"
                ]
            )
        )
        .scalar()
    )

    total_revenue = float(
        revenue_total or 0
    )

    # ========================================================
    # 4. FALLBACK REVENUE FROM CASH FLOW
    # ========================================================

    if total_revenue == 0:

        cash_revenue = (
            database.query(
                func.coalesce(
                    func.sum(
                        db.FinanceCashFlow.inflow
                    ),
                    0
                )
            )
            .scalar()
        )

        total_revenue = float(
            cash_revenue or 0
        )

    # ========================================================
    # 5. PENDING APPROVALS
    # ========================================================

    pending_approvals = (
        database.query(
            func.count(
                db.ApprovalStep.id
            )
        )
        .filter(
            db.ApprovalStep.approver_user_id == current_user.id
        )
        .filter(
            db.ApprovalStep.status == "Pending"
        )
        .scalar()
    )

    pending_approvals = int(
        pending_approvals or 0
    )

    # ========================================================
    # 6. CASH FLOW
    # ========================================================

    cash_rows = (
        database.query(
            db.FinanceCashFlow
        )
        .order_by(
            db.FinanceCashFlow.id.asc()
        )
        .limit(12)
        .all()
    )

    cash_flow_months = [
        row.month
        for row in cash_rows
    ]

    cash_flow_revenue = [
        round(
            float(row.inflow or 0),
            2
        )
        for row in cash_rows
    ]

    cash_flow_expenditure = [
        round(
            float(row.outflow or 0),
            2
        )
        for row in cash_rows
    ]

    cash_flow_net = [
        round(
            float(row.net_cash_flow or 0),
            2
        )
        for row in cash_rows
    ]

    cash_flow = {
        "months": cash_flow_months,
        "revenue": cash_flow_revenue,
        "expenditure": cash_flow_expenditure,
        "net_cash_flow": cash_flow_net,

        # Compatibility fields
        "inflow": cash_flow_revenue,
        "outflow": cash_flow_expenditure,
        "net": cash_flow_net
    }

    # ========================================================
    # 7. EXPENSE BY CATEGORY
    # ========================================================

    category_rows = (
        database.query(
            db.FinanceTransaction.category,
            func.coalesce(
                func.sum(
                    db.FinanceTransaction.amount
                ),
                0
            ).label("amount")
        )
        .filter(
            db.FinanceTransaction.transaction_type == "expense"
        )
        .group_by(
            db.FinanceTransaction.category
        )
        .order_by(
            func.sum(
                db.FinanceTransaction.amount
            ).desc()
        )
        .all()
    )

    expense_categories = []

    for category, amount in category_rows:

        expense_categories.append({
            "category": (
                category
                or "Others"
            ),

            "amount": round(
                float(amount or 0),
                2
            )
        })

    # ========================================================
    # 8. BUDGET VS ACTUAL
    # ========================================================

    budget_vs_actual = []

    for row in budgets:

        budget_vs_actual.append({
            "department": (
                row.department
                or "General"
            ),

            "budget": round(
                float(row.budget or 0),
                2
            ),

            "actual": round(
                float(row.actual or 0),
                2
            )
        })

    # ========================================================
    # 9. RECENT TRANSACTIONS
    # ========================================================

    transactions = (
        database.query(
            db.FinanceTransaction
        )
        .order_by(
            db.FinanceTransaction.transaction_date.desc()
        )
        .limit(5)
        .all()
    )

    recent_transactions = []

    for transaction in transactions:

        transaction_type = (
            str(
                transaction.transaction_type
                or ""
            )
            .lower()
        )

        if transaction_type in {
            "income",
            "inflow",
            "revenue"
        }:
            display_type = "revenue"
        else:
            display_type = "expense"

        recent_transactions.append({

            "id": transaction.id,

            "title": (
                transaction.category
                or "Financial Transaction"
            ),

            "category": (
                transaction.category
                or "General"
            ),

            "transaction_type":
                transaction_type,

            "display_type":
                display_type,

            "amount": round(
                float(
                    transaction.amount or 0
                ),
                2
            ),

            "status":
                transaction.status,

            "date": (
                transaction.transaction_date.isoformat()
                if transaction.transaction_date
                else None
            )
        })

    # ========================================================
    # 10. ALERTS
    # ========================================================

    alert_rows = (
        database.query(
            db.FinanceAlert
        )
        .order_by(
            db.FinanceAlert.id.desc()
        )
        .limit(5)
        .all()
    )

    alerts = []

    for alert in alert_rows:

        alerts.append({

            "id": alert.id,

            "title":
                alert.title,

            "description":
                alert.description or "",

            "severity":
                alert.severity or "info",

            "time":
                alert.time_label or ""
        })

    # ========================================================
    # 11. ADDITIONAL DASHBOARD DATA
    # ========================================================

    expense_trend = []

    payment_status = []

    ap_aging = []

    recent_payments = []

    budget_departments = []

    obligations = []

    ratios = {}

    # ========================================================
    # 12. RESULT
    # ========================================================

    return {

        "kpis": {

            "total_budget":
                round(
                    total_budget,
                    2
                ),

            "total_expenses":
                round(
                    total_expenses,
                    2
                ),

            "total_revenue":
                round(
                    total_revenue,
                    2
                ),

            "budget_utilization":
                round(
                    budget_utilization,
                    2
                ),

            "pending_approvals":
                pending_approvals
        },

        # Required by response schema
        "budget_utilization":
            round(
                budget_utilization,
                2
            ),

        # Cash-flow object
        "cash_flow":
            cash_flow,

        "expense_categories":
            expense_categories,

        "budget_vs_actual":
            budget_vs_actual,

        "recent_transactions":
            recent_transactions,

        "alerts":
            alerts,

        # Required response fields
        "expense_trend":
            expense_trend,

        "payment_status":
            payment_status,

        "ap_aging":
            ap_aging,

        "recent_payments":
            recent_payments,

        "budget_departments":
            budget_departments,

        "obligations":
            obligations,

        "ratios":
            ratios
    }


def serialize_datetime(value):

    if value is None:

        return None

    if value.tzinfo is not None:

        value = value.astimezone(
            timezone.utc
        ).replace(
            tzinfo=None
        )

    return value.isoformat()


def calculate_due_date(invoice_date):
    if invoice_date:
        return invoice_date + timedelta(days=30)

    return None


def get_paid_amount(invoice):
    status = (invoice.status or "").lower()

    if status == "paid":
        return float(invoice.amount or 0)

    return 0.0


def get_payment_status(invoice):
    status = (invoice.status or "").lower()

    if status == "paid":
        return "Paid On Time"

    if status == "overdue":
        return "Overdue"

    return "Pending"


def serialize_invoice(invoice):

    invoice_date = invoice.invoice_date
    due_date = calculate_due_date(invoice_date)

    vendor_name = "Unknown Vendor"

    if invoice.vendor:
        vendor_name = (
            getattr(invoice.vendor, "vendor_name", None)
            or getattr(invoice.vendor, "company_name", None)
            or "Unknown Vendor"
        )

    paid_amount = get_paid_amount(invoice)

    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "vendor_id": invoice.vendor_id,
        "vendor": vendor_name,

        "po_id": invoice.po_id,

        "po_number": (
            f"PO-{invoice.po_id}"
            if invoice.po_id
            else "-"
        ),

        "invoice_date": (
            invoice_date.strftime("%d %b %Y")
            if invoice_date
            else "-"
        ),

        "due_date": (
            due_date.strftime("%d %b %Y")
            if due_date
            else "-"
        ),

        "amount": float(invoice.amount or 0),

        "paid_amount": paid_amount,

        "pending_amount": (
            max(
                float(invoice.amount or 0) -
                paid_amount,
                0
            )
        ),

        "status": invoice.status or "Pending",

        "payment_status": get_payment_status(invoice)
    }


def calculate_paid_amount(
    database,
    invoice_id
):

    payments = (
        database.query(db.Payment)
        .filter(
            db.Payment.invoice_id ==
            invoice_id,

            db.Payment.status ==
            "Completed"
        )
        .all()
    )

    return sum(
        float(payment.amount or 0)
        for payment in payments
    )


def get_authenticated_user_id(current_user):
    """
    Safely get the logged-in user's ID.

    get_admin_user may return either:
        - a dictionary
        - a SQLAlchemy User object
    """

    if isinstance(current_user, dict):
        user_id = (
            current_user.get("id")
            or current_user.get("user_id")
            or current_user.get("sub")
        )
    else:
        user_id = getattr(current_user, "id", None)

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Unable to determine authenticated user."
        )

    try:
        return int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid authenticated user ID."
        )


# ==========================================================
# SAFE NUMBER
# ==========================================================

def number(value, default=0):
    try:
        return float(value or default)
    except Exception:
        return float(default)


# ==========================================================
# RELIABILITY CATEGORY
# ==========================================================

def reliability_category(score):

    score = number(score)

    if score >= 80:
        return "Excellent"

    if score >= 60:
        return "Good"

    if score >= 40:
        return "Average"

    if score >= 20:
        return "Poor"

    return "Critical"


# ==========================================================
# VENDOR PERFORMANCE REPORT DATA
# ==========================================================

def vendor_performance_data(database):

    vendors = ( database.query(db.Vendor) .order_by( db.Vendor.reliability_score.desc() ) .all() )
    data = []
    for vendor in vendors:
        data.append([
            vendor.vendor_id,
            vendor.vendor_name,
            vendor.category,
            safe_float( vendor.reliability_score ),
            safe_float( vendor.quality_score ),
            safe_float( vendor.delivery_score ),
            safe_float( vendor.service_score ),
            vendor.status
        ])
    return data


# ==========================================================
# PROCUREMENT REPORT DATA
# ==========================================================

def procurement_data(database):

    orders = ( database.query(db.PurchaseOrder) .order_by( db.PurchaseOrder.order_date.desc() ) .all() )
    data = []
    for order in orders:
        vendor_name = ""
        if order.vendor:
            vendor_name = ( order.vendor.vendor_name )
        data.append([
            order.po_number,
            vendor_name,
            safe_float(order.amount),
            order.status,
            order.order_date,
            order.expected_delivery,
            order.actual_delivery
        ])
    return data


# ==========================================================
# PURCHASE ORDER REPORT
# ==========================================================

def purchase_order_data(database):
    
    orders = ( database.query(db.PurchaseOrder) .order_by( db.PurchaseOrder.order_date.desc() ) .all() )

    return [
        [
            order.po_number,
            order.vendor.vendor_name
            if order.vendor else "",
            safe_float(order.amount),
            order.status,
            order.order_date,
            order.expected_delivery,
            order.actual_delivery
        ]
        for order in orders
    ]


# ==========================================================
# CONTRACT REPORT
# ==========================================================

def contract_data(database):

    contracts = ( database.query(db.Contract) .order_by( db.Contract.id.desc() ) .all() )

    result = []
    for contract in contracts:
        result.append([
            getattr( contract, "contract_number", contract.id ),

            getattr( contract, "vendor_id", "" ),

            getattr( contract, "status", "" ),

            getattr( contract, "start_date", None ),

            getattr( contract, "end_date", None )
        ])
    return result


# ==========================================================
# COMPLIANCE REPORT
# ==========================================================

def compliance_data(database):
    contracts = ( database.query(db.Contract) .all() )

    result = []
    for contract in contracts:
        result.append([
            getattr( contract, "id", "" ),

            getattr( contract, "vendor_id", "" ),

            getattr( contract, "status", "" ),

            getattr( contract, "compliance_status", "Unknown" )
        ])
    return result


# ==========================================================
# Helper
# ==========================================================

def notification_category(notification_type: str):
    """
    Converts database notification_type into
    frontend-friendly category names.
    """

    mapping = {
        "procurement": "Procurement Alerts",
        "procurement_alert": "Procurement Alerts",

        "delivery": "Delivery Delays",
        "delivery_delay": "Delivery Delays",

        "vendor": "Vendor Approvals",
        "vendor_approval": "Vendor Approvals",

        "contract": "Contract Expiry",
        "contract_expiry": "Contract Expiry",

        "compliance": "Compliance",

        "email": "Email Notifications",

        "sms": "SMS Notifications",

        "info": "General"
    }

    return mapping.get(
        notification_type.lower(),
        "General"
    )


# ==========================================================
# HELPER
# ==========================================================

def get_user_id(current_user):

    user_id = getattr(
        current_user,
        "id",
        None
    )

    if user_id is None:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not available"
        )

    return user_id


# ==========================================================
# INITIAL DEFAULT SETTINGS
# ==========================================================

def create_default_settings(database: Session):

    existing = ( database.query(db.SystemSettings) .first() )

    if existing:
        return existing


    settings = db.SystemSettings(
        platform_name="VendorIQ",
        platform_tagline= "Vendor Reliability Platform",
        default_language="English (US)",
        default_timezone= "(UTC+05:30) Asia/Kolkata",
        date_format="01 May 2024",
        time_format= "12 Hour (03:30 PM)",
        items_per_page=10,
        currency= "USD - US Dollar ($)",
        allow_user_registration=True,
        require_email_verification=True,
        password_minimum_length=8,
        session_timeout="30 Minutes",
        password_complexity=True,
        password_expiry="90 Days",
        max_login_attempts=5,
        two_factor_authentication=True,
        in_app_notifications=True,
        email_notifications=True,
        sms_notifications=False,
        digest_frequency="Daily",
        smtp_host="smtp.vendoriq.com",
        smtp_port=587,
        from_email="noreply@vendoriq.com",
        from_name="VendorIQ Platform",
        data_retention_period="2 Years",
        file_storage_limit="25 MB",
        automatic_backups=True,
        backup_frequency="Daily",
        backup_time="02:00 AM"
    )


    database.add(settings)

    database.commit()

    database.refresh(settings)

    return settings


# ==========================================================
# HELPER - CREATE AUDIT LOG
# ==========================================================

# ==========================================================
# HELPER - CREATE AUDIT LOG
# ==========================================================

def create_audit_log(
    database: Session,
    user=None,
    action="VIEW",
    description=None,
    resource=None,
    resource_id=None,
    *,
    user_id=None,
    user_email=None,
    user_name=None,
    role=None,
    status="Success",
    ip_address=None,
    user_agent=None,
):
    """
    Create an AuditLog entry.

    Supports both calling styles:

    1. Positional style:
        create_audit_log(
            database,
            current_user,
            "UPDATE",
            "Company information updated",
            "company_profiles",
            str(company.id),
        )

    2. Keyword style:
        create_audit_log(
            database=database,
            user=current_user,
            action="UPDATE_PROFILE",
            description="Profile updated",
            resource="users",
            resource_id=str(current_user.id),
        )

    Explicit user_id/user_email/user_name/role values take precedence
    over values extracted from `user`.
    """

    # ------------------------------------------------------
    # RESOLVE USER INFORMATION
    # ------------------------------------------------------

    if user is not None:

        if user_id is None:
            user_id = getattr(user, "id", None)

        if user_email is None:
            user_email = getattr(user, "email", None)

        if user_name is None:
            user_name = (
                getattr(user, "name", None)
                or getattr(user, "fullname", None)
                or getattr(user, "full_name", None)
                or getattr(user, "username", None)
            )

        if role is None:
            role = getattr(user, "role", None)

            # Support Enum roles
            if hasattr(role, "value"):
                role = role.value

    # ------------------------------------------------------
    # CREATE AUDIT LOG
    # ------------------------------------------------------

    log = db.AuditLog(
        user_id=user_id,
        user_email=user_email,
        user_name=user_name,
        role=role,
        action=action,
        description=description,
        resource=resource,
        resource_id=resource_id,
        status=status,
        ip_address=ip_address,
        user_agent=user_agent,
        created_at=datetime.utcnow(),
    )

    # ------------------------------------------------------
    # SAVE
    # ------------------------------------------------------

    database.add(log)
    database.commit()
    database.refresh(log)

    return log


# ==========================================================
# ENTITY CONFIGURATION
# ==========================================================

ENTITY_CONFIG = {
    "users": {
        "table": "users",
        "name": "Users",
        "description": "System users and administrators",
        "icon": "users",
        "color": "blue",
    },

    "vendors": {
        "table": "vendors",
        "name": "Vendors",
        "description": "Vendor master data and details",
        "icon": "building",
        "color": "green",
    },

    "purchase_orders": {
        "table": "purchase_orders",
        "name": "Purchase Orders",
        "description": "All purchase orders and line items",
        "icon": "clipboard",
        "color": "purple",
    },

    "contracts": {
        "table": "contracts",
        "name": "Contracts",
        "description": "Vendor contracts and agreements",
        "icon": "contract",
        "color": "orange",
    },

    "invoices": {
        "table": "invoices",
        "name": "Invoices",
        "description": "Invoice and payment records",
        "icon": "invoice",
        "color": "cyan",
    },

    "notifications": {
        "table": "notifications",
        "name": "Notifications",
        "description": "System notifications and alerts",
        "icon": "bell",
        "color": "yellow",
    },

    "messages": {
        "table": "messages",
        "name": "Messages",
        "description": "Communication messages",
        "icon": "message",
        "color": "blue",
    },

    "system_activity": {
        "table": "system_activity",
        "name": "System Logs",
        "description": "System activity and audit logs",
        "icon": "logs",
        "color": "pink",
    },

    "documents": {
        "table": "documents",
        "name": "Documents",
        "description": "Uploaded documents and files",
        "icon": "folder",
        "color": "green",
    },

    "audit_logs": {
        "table": "audit_logs",
        "name": "Audit Logs",
        "description": "Audit trail and compliance logs",
        "icon": "shield",
        "color": "indigo",
    },
}


# ==========================================================
# TABLE EXISTENCE
# ==========================================================

def table_exists(database: Session, table_name: str) -> bool:

    query = text("""
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = :table_name
        )
    """)

    result = database.execute( query, {"table_name": table_name} ).scalar()

    return bool(result)


# ==========================================================
# RECORD COUNT
# ==========================================================

def get_record_count( database: Session, table_name: str ) -> int:

    if not table_exists(database, table_name):
        return 0

    query = text( f'SELECT COUNT(*) FROM "{table_name}"' )

    result = database.execute(query).scalar()

    return int(result or 0)


# ==========================================================
# TABLE SIZE
# ==========================================================

def get_table_size( database: Session, table_name: str ) -> dict:

    if not table_exists(database, table_name):
        return { "bytes": 0, "mb": 0, "formatted": "0 MB", }

    query = text("""
        SELECT
            pg_total_relation_size(
                :qualified_table
            )
    """)

    qualified_table = f"public.{table_name}"

    size_bytes = database.execute(query, { "qualified_table": qualified_table } ).scalar()

    size_bytes = int(size_bytes or 0)

    size_mb = round( size_bytes / 1024 / 1024, 2 )

    if size_mb >= 1024:
        formatted = ( f"{size_mb / 1024:.2f} GB" )

    else:
        formatted = ( f"{size_mb:.2f} MB" )

    return { "bytes": size_bytes, "mb": size_mb, "formatted": formatted, }


# ==========================================================
# LAST UPDATED
# ==========================================================

def get_last_updated( database: Session, table_name: str ) -> str:

    if not table_exists(database, table_name):
        return "N/A"

    columns_query = text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = :table_name
        ORDER BY ordinal_position
    """)

    columns = database.execute(
        columns_query, { "table_name": table_name } ).scalars().all()

    preferred_columns = [ "updated_at", "created_at", "timestamp", "created_on", "modified_at", "date", ]

    selected_column = None

    for candidate in preferred_columns:

        if candidate in columns:
            selected_column = candidate
            break

    if not selected_column:
        return "Available"

    query = text(
        f'''
        SELECT "{selected_column}"
        FROM "{table_name}"
        WHERE "{selected_column}" IS NOT NULL
        ORDER BY "{selected_column}" DESC
        LIMIT 1
        '''
    )

    value = database.execute(query).scalar()

    if not value:
        return "N/A"

    if isinstance(value, datetime):
        return value.strftime( "%d %b %Y, %I:%M %p" )

    return str(value)


# ==========================================================
# DUPLICATE ESTIMATION
# ==========================================================

def get_duplicate_count( database: Session ) -> int:

    total_duplicates = 0

    for config in ENTITY_CONFIG.values():

        table_name = config["table"]

        if not table_exists(database, table_name):
            continue

        columns_query = text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = :table_name
            AND column_name IN (
                'email',
                'vendor_id',
                'user_id',
                'invoice_number',
                'contract_number'
            )
        """)

        columns = database.execute(
            columns_query, { "table_name": table_name } ).scalars().all()

        for column in columns:

            query = text(
                f'''
                SELECT
                    COUNT(*) - COUNT(DISTINCT "{column}")
                FROM "{table_name}"
                WHERE "{column}" IS NOT NULL
                '''
            )

            value = database.execute(query).scalar()

            if value and value > 0:
                total_duplicates += int(value)

    return total_duplicates


# ==========================================================
# TOTAL RECORDS
# ==========================================================

def get_total_records( database: Session ) -> int:

    total = 0

    for config in ENTITY_CONFIG.values():
        total += get_record_count( database, config["table"] )

    return total


# ==========================================================
# STORAGE
# ==========================================================

def get_storage_usage( database: Session ) -> dict:

    total_bytes = 0

    breakdown = { "documents": 0, "logs": 0, "database": 0, }

    document_tables = [ "documents" ]

    log_tables = [ "system_activity", "audit_logs" ]

    for config in ENTITY_CONFIG.values():

        table_name = config["table"]

        size = get_table_size( database, table_name )

        total_bytes += size["bytes"]

        if table_name in document_tables:
            breakdown["documents"] += size["bytes"]

        elif table_name in log_tables:
            breakdown["logs"] += size["bytes"]

        else:
            breakdown["database"] += size["bytes"]

    return {
        "bytes": total_bytes,
        "gb": round( total_bytes / 1024 / 1024 / 1024, 2 ),
        "breakdown": {
            key: round( value / 1024 / 1024 / 1024, 2 )
            for key, value in breakdown.items()
        }
    }


# ==========================================================
# DATA QUALITY
# ==========================================================

def get_data_quality( database: Session ) -> dict:

    invalid_records = 0
    warning_records = 0
    total_records = get_total_records(database)

    # ------------------------------------------------------
    # Users
    # ------------------------------------------------------

    if table_exists(database, "users"):

        try:
            query = text("""
                SELECT COUNT(*)
                FROM users
                WHERE email IS NULL
                OR email = ''
            """)

            invalid_records += int( database.execute(query).scalar() or 0 )

        except Exception:
            pass

    # ------------------------------------------------------
    # Vendors
    # ------------------------------------------------------

    if table_exists(database, "vendors"):

        try:
            query = text("""
                SELECT COUNT(*)
                FROM vendors
                WHERE email IS NULL
                OR vendor_name IS NULL
            """)

            invalid_records += int( database.execute(query).scalar() or 0 )

        except Exception:
            pass

    # ------------------------------------------------------
    # Contracts
    # ------------------------------------------------------

    if table_exists(database, "contracts"):

        try:
            query = text("""
                SELECT COUNT(*)
                FROM contracts
                WHERE expiry_date IS NULL
            """)

            warning_records += int( database.execute(query).scalar() or 0 )

        except Exception:
            pass

    if total_records <= 0:
        quality_score = 100

    else:
        quality_score = ( 100 - ( invalid_records / total_records * 100 ) )

        quality_score = max( 0, min( 100, round( quality_score, 1 ) ) )

    valid_percentage = max( 0, 100 - ( invalid_records / max(total_records, 1) * 100 ) - ( warning_records / max(total_records, 1) * 100 ) )

    return {
        "score": quality_score,
        "valid": round( valid_percentage, 1 ),
        "warning": round( warning_records / max(total_records, 1) * 100, 1 ),
        "invalid": round( invalid_records / max(total_records, 1) * 100, 1 ),
    }


# ==========================================================
# DATA ENTITY OBJECT
# ==========================================================

def build_entity( database: Session, config: dict ) -> dict:

    table_name = config["table"]

    records = get_record_count( database, table_name )

    size = get_table_size( database, table_name )

    last_updated = get_last_updated( database, table_name )

    return {
        "key": table_name,
        "name": config["name"],
        "description": config["description"],
        "icon": config["icon"],
        "color": config["color"],
        "records": records,
        "size": size["formatted"],
        "last_updated": last_updated,
        "status": "Active",
        "exists": table_exists( database, table_name ),
    }


# ==========================================================
# RUNTIME METRICS
# ==========================================================

active_requests = 0
peak_concurrent_users = 0

response_times = []


# ==========================================================
# REQUEST TRACKING
# ==========================================================

def register_request_start():

    global active_requests
    global peak_concurrent_users

    active_requests += 1

    if active_requests > peak_concurrent_users:

        peak_concurrent_users = active_requests


def register_request_end():

    global active_requests

    active_requests = max(
        0,
        active_requests - 1
    )


def record_response_time(seconds):

    response_times.append(seconds)

    if len(response_times) > 500:

        response_times.pop(0)


# ==========================================================
# HELPERS
# ==========================================================

def average_response_time():

    if not response_times:

        return 0

    return sum(response_times) / len(response_times)


def get_cpu_usage():

    return psutil.cpu_percent(
        interval=0.1
    )


def get_memory_usage():

    return psutil.virtual_memory().percent


def get_disk_usage():

    return psutil.disk_usage(
        "/"
    ).percent


def get_network_usage():

    counters = psutil.net_io_counters()

    return (
        counters.bytes_sent +
        counters.bytes_recv
    ) / 1024 / 1024


# ==========================================================
# DATABASE QUERY PERFORMANCE
# ==========================================================

def get_database_performance(database):

    avg_query_time = 0

    slow_queries = 0

    queries = []

    try:

        # Requires pg_stat_statements.
        result = database.execute(
            text(
                """
                SELECT
                    query,
                    mean_exec_time,
                    calls
                FROM pg_stat_statements
                WHERE query NOT ILIKE '%pg_stat_statements%'
                ORDER BY mean_exec_time DESC
                LIMIT 5
                """
            )
        )

        rows = result.fetchall()

        for row in rows:

            queries.append(
                {
                    "query": row[0][:140],
                    "time": round(
                        float(row[1] or 0),
                        2
                    )
                }
            )

        if queries:

            avg_query_time = round(
                sum(
                    q["time"]
                    for q in queries
                ) / len(queries),
                2
            )

        slow_queries = sum(
            1
            for q in queries
            if q["time"] >= 100
        )

    except Exception:

        # Fallback when pg_stat_statements
        # is not installed.

        try:

            start = time.perf_counter()

            db.execute(
                text(
                    "SELECT COUNT(*) FROM vendors"
                )
            ).scalar()

            elapsed = (
                time.perf_counter() -
                start
            ) * 1000

            avg_query_time = round(
                elapsed,
                2
            )

            queries = [
                {
                    "query":
                        "SELECT COUNT(*) FROM vendors",
                    "time":
                        round(elapsed, 2)
                }
            ]

            slow_queries = (
                1
                if elapsed >= 100
                else 0
            )

        except Exception:

            queries = []

    return {
        "average_query_time":
            avg_query_time,

        "slow_queries":
            slow_queries,

        "top_queries":
            queries
    }


# ==========================================================
# SYSTEM HEALTH SERVICES
# ==========================================================

def check_database(database):

    start = time.perf_counter()

    try:

        db.execute(
            text("SELECT 1")
        )

        elapsed = (
            time.perf_counter() -
            start
        ) * 1000

        return {
            "name": "Database",
            "status": "Healthy",
            "response_time": round(
                elapsed,
                2
            )
        }

    except Exception:

        return {
            "name": "Database",
            "status": "Critical",
            "response_time": 0
        }


def check_backend():

    return {
        "name": "Backend Services",
        "status": "Healthy",
        "response_time": 0
    }


def check_storage():

    try:

        usage = psutil.disk_usage("/")

        if usage.percent >= 90:

            status = "Critical"

        elif usage.percent >= 75:

            status = "Warning"

        else:

            status = "Healthy"

        return {
            "name": "Storage",
            "status": status,
            "response_time":
                round(
                    usage.percent,
                    2
                )
        }

    except Exception:

        return {
            "name": "Storage",
            "status": "Unknown",
            "response_time": 0
        }


def check_redis():

    return {
        "name": "Redis Cache",
        "status": "Healthy",
        "response_time": 0
    }


def check_email():

    return {
        "name": "Email Service",
        "status": "Healthy",
        "response_time": 0
    }


def check_gateway():

    return {
        "name": "API Gateway",
        "status": "Healthy",
        "response_time": 0
    }


# ==========================================================
# GENERATE TICKET ID
# ==========================================================

def generate_ticket_id(database: Session):

    last_ticket = ( database.query(db.SupportTicket) .order_by( db.SupportTicket.id.desc() ) .first() )

    if not last_ticket:
        number = 1

    else:
        try:
            number = ( int( last_ticket.ticket_id .split("-")[-1] ) + 1 )

        except Exception:
            number = last_ticket.id + 1

    return f"TKT-2024-{number:04d}"


# ============================================================
# HELPERS
# ============================================================

def decimal_to_float(value):

    if value is None:
        return None

    if isinstance(value, Decimal):
        return float(value)

    return float(value)


def contract_to_dict(contract):

    vendor_name = ""

    if contract.vendor:
        vendor_name = ( getattr( contract.vendor, "vendor_name", "", ) or "" )

    return {
        "id": contract.id,
        "contract_number": contract.contract_number,
        "vendor_id": contract.vendor_id,
        "vendor_name": vendor_name,
        "status": contract.status,
        "expiry_date": (
            contract.expiry_date.isoformat()
            if contract.expiry_date
            else None
        ),
        "renewal_date": (
            contract.renewal_date.isoformat()
            if contract.renewal_date
            else None
        ),
        "contract_value": decimal_to_float( contract.contract_value ),
        "compliance_status": contract.compliance_status,
        "risk_level": contract.risk_level,
        "renewal_status": contract.renewal_status,
    }


def calculate_days_left(expiry_date):

    if not expiry_date:
        return None

    return ( expiry_date - date.today() ).days


def calculate_compliance_score(contracts):

    if not contracts:
        return 0

    scores = []

    for contract in contracts:

        compliance = ( contract.compliance_status or "" ).lower()

        status_value = ( contract.status or "" ).lower()

        score = 100

        if compliance in { "expired", "non-compliant", "noncompliant", "failed", }:
            score -= 50

        elif compliance in { "expiring soon", "warning", "pending", }:
            score -= 20

        if status_value in { "expired", "cancelled", "canceled", }:
            score -= 30

        if contract.expiry_date:

            days_left = calculate_days_left( contract.expiry_date )

            if days_left is not None:

                if days_left < 0:
                    score -= 30

                elif days_left <= 30:
                    score -= 15

        scores.append( max(0, min(100, score)) )

    return round( sum(scores) / len(scores), 1, )


def vendor_contract_data( database, vendor_id: str, ):
    """
    Return contract and compliance information
    for the authenticated vendor.
    """

    contracts = ( database.query(db.Contract) .filter( db.Contract.vendor_id == vendor_id ) .order_by( db.Contract.expiry_date.asc() ) .all() )

    today = date.today()
    thirty_days_from_now = today + timedelta(days=30)

    active_contracts = [
        contract
        for contract in contracts
        if contract.status == "Active" and ( contract.expiry_date is None or contract.expiry_date >= today )
    ]

    expiring_contracts = [
        contract
        for contract in contracts
        if contract.expiry_date is not None and today <= contract.expiry_date <= thirty_days_from_now and contract.status != "Expired"
    ]

    expired_contracts = [
        contract
        for contract in contracts
        if ( contract.status == "Expired" or ( contract.expiry_date is not None and contract.expiry_date < today ) )
    ]

    compliant_contracts = [
        contract
        for contract in contracts
        if str( contract.compliance_status or "" ).lower()
        in { "compliant", "valid", }
    ]

    total_value = sum(
        float(contract.contract_value or 0)
        for contract in contracts
    )

    compliance_score = (
        round( ( len(compliant_contracts) / len(contracts) ) * 100, 1, )
        if contracts
        else 0
    )

    def serialize_contract(contract):

        days_left = None

        if contract.expiry_date:
            days_left = ( contract.expiry_date - today ).days

        return {
            "id": contract.id,

            "contract_number": contract.contract_number,

            "vendor_id": contract.vendor_id,

            "status": contract.status,

            "expiry_date":
                contract.expiry_date.isoformat()
                if contract.expiry_date
                else None,

            "renewal_date":
                contract.renewal_date.isoformat()
                if contract.renewal_date
                else None,

            "contract_value":
                float(contract.contract_value)
                if contract.contract_value is not None
                else 0,

            "compliance_status": contract.compliance_status,

            "risk_level": contract.risk_level,

            "renewal_status": contract.renewal_status,

            "days_left": days_left,
        }

    return {

        "success": True,

        "summary": {

            "total_contracts": len(contracts),

            "active_contracts": len(active_contracts),

            "expiring_contracts": len(expiring_contracts),

            "expired_contracts": len(expired_contracts),

            "compliant_contracts": len(compliant_contracts),

            "contract_value": total_value,

            "compliance_score": compliance_score,
        },

        "contracts": [
            serialize_contract(contract)
            for contract in contracts
        ],

        "expiring_contracts": [
            serialize_contract(contract)
            for contract in expiring_contracts
        ],

        "expired_contracts": [
            serialize_contract(contract)
            for contract in expired_contracts
        ],

    }


# ============================================================
# HELPER
# ============================================================

def get_invoice_status_summary( database: Session, vendor_id: str, ):
    rows = (
        database.query( db.Invoice.status, func.count(db.Invoice.id) )
        .filter( db.Invoice.vendor_id == vendor_id )
        .group_by( db.Invoice.status )
        .all()
    )

    result = { "paid": 0, "pending": 0, "overdue": 0, "draft": 0, }

    for status, count in rows:

        if not status:
            continue

        key = status.lower().strip()

        if key in result:
            result[key] = count

    return result


# ============================================================
# VENDOR ID HELPER
# ============================================================

def validate_vendor_id( vendor_id: str ):

    if not vendor_id:
        raise HTTPException( status_code=400, detail="Vendor ID is required." )

    return vendor_id


# ==========================================================
# HELPER
# ==========================================================

def safe_float(value):
    if value is None:
        return 0

    return float(value)


def safe_int(value):
    if value is None:
        return 0

    return int(value)


# ============================================================
# HELPER
# ============================================================

def generate_pr_number(database: Session):

    last_pr = ( database.query(db.ProcurementRequest) .order_by( db.ProcurementRequest.id.desc() ) .first() )

    if not last_pr:
        number = 1
    else:
        try:
            number = ( int( last_pr.request_number .replace("PR-", "") ) + 1 )
        except Exception:
            number = last_pr.id + 1

    return f"PR-{number:04d}"


# ============================================================
# HELPER
# ============================================================

def money(value):
    return round(float(value or 0), 2)


def create_inventory_snapshot( database: Session ):

    items = ( database.query( db.InventoryItem ) .all() )

    total_items = sum(
        item.quantity or 0
        for item in items
    )

    total_quantity = sum(
        item.quantity or 0
        for item in items
    )

    total_value = sum(
        (item.quantity or 0) * (item.unit_price or 0)
        for item in items
    )

    snapshot = ( database.query( db.InventorySnapshot ) .filter( db.InventorySnapshot.snapshot_date == date.today() ) .first() )

    if snapshot:
        snapshot.total_items = ( total_items )
        snapshot.total_quantity = ( total_quantity )
        snapshot.inventory_value = ( total_value )

    else:
        snapshot = db.InventorySnapshot(
            snapshot_date=date.today(),
            total_items=total_items,
            total_quantity=total_quantity,
            inventory_value=total_value
        )
        database.add(snapshot)

    database.commit()

    return snapshot


# ============================================================
# HELPER
# ============================================================

def serialize_order(order):

    return {
        "id": order.id,
        "order_number": order.order_number,
        "customer_id": order.customer_id,
        "customer_name": (
            order.customer.customer_name
            if order.customer
            else "Unknown Customer"
        ),
        "order_date": (
            order.order_date.isoformat()
            if order.order_date
            else None
        ),
        "status": order.status,
        "amount": float(order.amount or 0),
        "expected_delivery": (
            order.expected_delivery.isoformat()
            if order.expected_delivery
            else None
        ),
        "actual_delivery": (
            order.actual_delivery.isoformat()
            if order.actual_delivery
            else None
        ),
        "priority": order.priority
    }


def serialize_shipment(shipment):

    return {
        "shipment_number": shipment.shipment_number,

        "order_number": (
            shipment.customer_order.order_number
            if shipment.customer_order
            else None
        ),

        "carrier": shipment.carrier,

        "status": shipment.status,

        "current_location": (
            shipment.current_location
            if hasattr(shipment, "current_location")
            else None
        ),

        "origin": shipment.origin,

        "destination": shipment.destination,

        "expected_delivery": (
            shipment.expected_delivery.isoformat()
            if shipment.expected_delivery
            else None
        ),

        "tracking_number": shipment.tracking_number,

        "current_latitude": (
            shipment.current_latitude
            if hasattr(shipment, "current_latitude")
            else None
        ),

        "current_longitude": (
            shipment.current_longitude
            if hasattr(shipment, "current_longitude")
            else None
        ),

        "origin_latitude": (
            shipment.origin_latitude
            if hasattr(shipment, "origin_latitude")
            else None
        ),

        "origin_longitude": (
            shipment.origin_longitude
            if hasattr(shipment, "origin_longitude")
            else None
        ),

        "destination_latitude": (
            shipment.destination_latitude
            if hasattr(shipment, "destination_latitude")
            else None
        ),

        "destination_longitude": (
            shipment.destination_longitude
            if hasattr(shipment, "destination_longitude")
            else None
        )
    }


# ============================================================
# HELPER
# ============================================================

def get_notification_settings( database: Session, user_id: int ):

    settings = ( database.query(db.NotificationSettings) .filter( db.NotificationSettings.user_id == user_id ) .first() )

    if not settings:

        settings = db.NotificationSettings( user_id=user_id )

        database.add(settings)
        database.commit()
        database.refresh(settings)

    return settings


# ============================================================
# UTILITY
# ============================================================

def supplier_dict(
    vendor,
    on_time_delivery=0,
    quality_score=0,
    performance_score=0
):

    return {

        "id":
            vendor.id,

        "vendor_id":
            vendor.vendor_id,

        "vendor_name":
            vendor.vendor_name,

        "country":
            vendor.country,

        "email":
            vendor.email,

        "phone":
            vendor.phone,

        "business_type":
            vendor.business_type,

        "address":
            vendor.address,

        "category":
            vendor.category,

        "region":
            getattr(
                vendor,
                "region",
                None
            ),

        "contact_person":
            vendor.contact_person,

        "status":
            vendor.status,

        "on_time_delivery":
            round(
                on_time_delivery,
                1
            ),

        "quality_score":
            round(
                quality_score,
                1
            ),

        "performance_score":
            round(
                performance_score,
                1
            )

    }


# ============================================================
# FILTER HELPERS
# ============================================================

def get_categories(
    database: Session
):

    rows = database.query( db.Vendor.category ).filter( db.Vendor.category.isnot(None) ).distinct().all()

    return sorted(
        [
            row[0]
            for row in rows
            if row[0]
        ]
    )


def get_regions(
    database: Session
):

    region_column = getattr( db.Vendor, "region", None )

    if region_column is None:
        return []


    rows = database.query( region_column ).filter( region_column.isnot(None) ).distinct().all()


    return sorted(
        [
            row[0]
            for row in rows
            if row[0]
        ]
    )


def get_years(
    database: Session
):

    rows = database.query( db.VendorPerformanceHistory.year ).distinct().order_by( db.VendorPerformanceHistory.year.desc() ).all()


    return [
        row[0]
        for row in rows
        if row[0]
    ]


# ============================================================
# TREND
# ============================================================

def parse_trend(
    value
):

    if not value:
        return 0


    try:

        text = str(value).strip()

        text = text.replace( "%", "" )

        return float(
            text
        )

    except Exception:

        return 0


# ============================================================
# HELPERS
# ============================================================

def serialize_document(
    document,
    user_name=None
):

    return {
        "id": document.id,
        "document_name": document.document_name,
        "category": document.category,
        "subcategory": document.subcategory,
        "related_type": document.related_type,
        "related_id": document.related_id,
        "folder_id": document.folder_id,
        "uploaded_by": document.uploaded_by,
        "uploaded_by_name": user_name,
        "uploaded_on": document.uploaded_on,
        "file_path": document.file_path,
        "file_type": document.file_type,
        "mime_type": document.mime_type,
        "file_size": document.file_size,
        "status": document.status,
        "expiry_date": document.expiry_date
    }


# ============================================================
# ROLE CHECK
# ============================================================

def require_settings_access( current_user: db.User = Depends(get_current_user) ):

    allowed_roles = { "Admin", "Supply Chain Manager" }

    if current_user.role not in allowed_roles:
        raise HTTPException( status_code=403, detail="You do not have permission to modify settings" )

    return current_user


# ============================================================
# GENERATE PO NUMBER
# ============================================================

def generate_po_number(database: Session):

    last_po = ( database.query(db.PurchaseOrder) .order_by(db.PurchaseOrder.id.desc()) .first() )

    if not last_po:
        return "PO-1001"

    try:
        number = int( last_po.po_number .replace("PO-", "") )
        return f"PO-{number + 1}"

    except Exception:
        return f"PO-{last_po.id + 1001}"


def generate_shipment_number(database: Session):

    year = datetime.now().year

    last_shipment = (
        database.query(db.Shipment)
        .filter( db.Shipment.shipment_number.like( f"SHP-{year}-%" ) )
        .order_by( db.Shipment.id.desc() ) .first()
    )

    if last_shipment:
        try:
            last_number = int( last_shipment.shipment_number.split("-")[-1] )
        except (ValueError, IndexError):
            last_number = 0
    else:
        last_number = 0

    return f"SHP-{year}-{last_number + 1:06d}"


# ============================================================
# VENDOR DOCUMENT MANAGEMENT
# ============================================================

VENDOR_DOCUMENT_ALLOWED_EXTENSIONS = { ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".jpg", ".jpeg", ".png" }

VENDOR_DOCUMENT_MAX_SIZE = 25 * 1024 * 1024


def verify_vendor_document_access(vendor_id: str, current_vendor: db.Vendor):
    if not current_vendor:
        raise HTTPException( status_code=401, detail="Vendor authentication required." )

    if current_vendor.vendor_id != vendor_id:
        raise HTTPException( status_code=403, detail="You are not authorized to access these documents." )


def serialize_vendor_document( document, uploaded_by_name=None ):
    return {
        "id": document.id,
        "document_name": document.document_name,
        "category": document.category,
        "document_type": document.document_type,
        "subcategory": getattr(document, "subcategory", None),
        "related_type": document.related_type,
        "related_id": document.related_id,
        "vendor_id": getattr(document, "vendor_id", None),
        "business_unit": document.business_unit,
        "tags": document.tags,
        "confidentiality_level": document.confidentiality_level,
        "retention_period": document.retention_period,
        "document_date": (
            document.document_date.isoformat()
            if document.document_date
            else None
        ),
        "folder_id": document.folder_id,
        "uploaded_by": document.uploaded_by,
        "uploaded_by_name": uploaded_by_name or "You",
        "uploaded_on": (
            document.uploaded_on.isoformat()
            if document.uploaded_on
            else None
        ),
        "file_path": document.file_path,
        "file_type": document.file_type,
        "mime_type": document.mime_type,
        "file_size": document.file_size or 0,
        "status": document.status,
        "expiry_date": (
            document.expiry_date.isoformat()
            if document.expiry_date
            else None
        ),
        "description": document.description
    }


# ============================================================
# PERFORMANCE REPORT HELPERS
# ============================================================

def performance_month_number(month_value):

    if month_value is None:
        return None

    value = str(month_value).strip().lower()

    month_map = {
        "1": 1,
        "01": 1,
        "jan": 1,
        "january": 1,

        "2": 2,
        "02": 2,
        "feb": 2,
        "february": 2,

        "3": 3,
        "03": 3,
        "mar": 3,
        "march": 3,

        "4": 4,
        "04": 4,
        "apr": 4,
        "april": 4,

        "5": 5,
        "05": 5,
        "may": 5,

        "6": 6,
        "06": 6,
        "jun": 6,
        "june": 6,

        "7": 7,
        "07": 7,
        "jul": 7,
        "july": 7,

        "8": 8,
        "08": 8,
        "aug": 8,
        "august": 8,

        "9": 9,
        "09": 9,
        "sep": 9,
        "september": 9,

        "10": 10,
        "oct": 10,
        "october": 10,

        "11": 11,
        "nov": 11,
        "november": 11,

        "12": 12,
        "dec": 12,
        "december": 12,
    }

    return month_map.get(value)


def performance_history_date(row):

    month_number = performance_month_number( row.month )

    if not month_number or not row.year:
        return None

    return date( int(row.year), month_number, 1 )


def normalize_quality_score(value):

    value = float(value or 0)

    # If stored as 0-5
    if value <= 5:
        return value * 20

    # If already stored as 0-100
    return value


def normalize_score(value):

    value = float(value or 0)

    return max( 0, min(100, value) )


def communication_score(response_hours):

    if response_hours is None:
        return None

    response_hours = float( response_hours )

    # 24 hours = 0 score
    # 0 hours = 100 score

    score = 100 - ( response_hours / 24 * 100 )

    return max( 0, min(100, score) )


def calculate_overall_score( on_time, quality, fulfillment, communication, compliance ):

    values = [ on_time, quality, fulfillment, communication, compliance ]

    available = [
        value
        for value in values
        if value is not None
    ]

    if not available:
        return 0

    # Screenshot weighting:
    #
    # On-Time Delivery    30%
    # Quality             25%
    # Order Fulfillment   20%
    # Communication       15%
    # Compliance          10%

    weights = [ 0.30, 0.25, 0.20, 0.15, 0.10 ]

    weighted_total = 0
    weight_total = 0

    for value, weight in zip( values, weights ):

        if value is None:
            continue

        weighted_total += ( float(value) * weight )
        weight_total += weight

    if weight_total == 0:
        return 0

    return round(
        weighted_total / weight_total, 1 )


# ============================================================
# BUILD PERFORMANCE REPORT
# ============================================================

def build_performance_report(
    database: Session,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    category: Optional[str] = None,
    vendor_id: Optional[str] = None,
):

    # --------------------------------------------------------
    # LOAD HISTORY
    # --------------------------------------------------------

    history_rows = (
        database .query(db.VendorPerformanceHistory) .order_by(
            db.VendorPerformanceHistory.year.asc(),
            db.VendorPerformanceHistory.id.asc()
        ) .all()
    )

    # --------------------------------------------------------
    # DETERMINE DEFAULT DATE RANGE
    # --------------------------------------------------------

    valid_history_dates = []

    for row in history_rows:

        history_date = performance_history_date( row )

        if history_date:
            valid_history_dates.append( history_date )

    if to_date is None:

        if valid_history_dates:
            to_date = max( valid_history_dates )
        else:
            to_date = date.today()

    if from_date is None:
        from_date = ( to_date - timedelta( days=180 ) )

    if from_date > to_date:
        raise HTTPException( status_code=400, detail="from_date cannot be greater than to_date." )

    # --------------------------------------------------------
    # VENDORS
    # --------------------------------------------------------

    vendor_query = database.query( db.Vendor )

    if vendor_id:
        vendor_query = vendor_query.filter( db.Vendor.vendor_id == vendor_id )

    if category:
        vendor_query = vendor_query.filter( db.Vendor.category == category )

    vendors = vendor_query.all()

    vendor_map = {
        vendor.vendor_id: vendor
        for vendor in vendors
    }

    # --------------------------------------------------------
    # FILTER HISTORY
    # --------------------------------------------------------

    filtered_history = []

    for row in history_rows:

        row_date = performance_history_date( row )

        if not row_date:
            continue

        if row_date < from_date:
            continue

        if row_date > to_date:
            continue

        if ( vendor_id and row.vendor_id != vendor_id ):
            continue

        if row.vendor_id not in vendor_map:
            continue

        filtered_history.append( row )

    # --------------------------------------------------------
    # LATEST HISTORY PER VENDOR
    # --------------------------------------------------------

    latest_by_vendor = {}

    for row in filtered_history:

        row_date = performance_history_date( row )

        existing = latest_by_vendor.get( row.vendor_id )

        if existing is None:
            latest_by_vendor[ row.vendor_id ] = row

        else:
            existing_date = ( performance_history_date( existing ) )

            if row_date > existing_date:
                latest_by_vendor[ row.vendor_id ] = row

    # --------------------------------------------------------
    # FALLBACK TO VENDOR TABLE
    # --------------------------------------------------------

    performance_rows = []

    for vendor in vendors:

        history = latest_by_vendor.get( vendor.vendor_id )

        if history:

            on_time = normalize_score( history.on_time_deliveries )

            quality = normalize_quality_score( history.quality_rating )

            fulfillment = normalize_score( history.order_completion_rate )

            response_time = float( history.response_time or 0 )

            issue_resolution = float( history.issue_resolution_time or 0 )

            compliance = normalize_score( history.compliance_score )

            communication = ( communication_score( response_time ) )

            overall = ( float(history.overall_score or 0) )

            if overall <= 0:
                overall = (
                    calculate_overall_score(
                        on_time, quality, fulfillment, communication, compliance
                    )
                )

        else:
            on_time = normalize_score( vendor.delivery_score )
            quality = normalize_quality_score( vendor.quality_score )
            fulfillment = None
            response_time = None
            issue_resolution = None
            compliance = normalize_score( vendor.reliability_score )
            communication = normalize_score( vendor.service_score )
            overall = normalize_score( vendor.reliability_score )

        performance_rows.append({
            "vendor_id": vendor.vendor_id,
            "vendor_name": vendor.vendor_name,
            "category": vendor.category or "General",
            "overall_score": round( overall, 1 ),
            "on_time_delivery": round( on_time, 1 ),
            "quality_score": round( quality, 1 ),
            "order_fulfillment": ( round( fulfillment, 1 )
                if fulfillment is not None
                else 0
            ),
            "response_time": (
                round( response_time, 1 )
                if response_time is not None
                else 0
            ),
            "issue_resolution_time": (
                round( issue_resolution, 1 )
                if issue_resolution is not None
                else 0
            ),
            "compliance_score": round( compliance, 1 ),
            "communication_score": round( communication or 0, 1 ),
            "trend": ( vendor.trend or "flat" )
        })

    # --------------------------------------------------------
    # KPI AVERAGES
    # --------------------------------------------------------

    def average(field):

        values = [
            float(row[field] or 0)
            for row in performance_rows
        ]

        return round( sum(values) / len(values), 1 ) if values else 0

    overall_score = average( "overall_score" )

    on_time_delivery = average( "on_time_delivery" )

    quality_score = average( "quality_score" )

    order_fulfillment = average( "order_fulfillment" )

    response_values = [
        row["response_time"]
        for row in performance_rows
        if row["response_time"] > 0
    ]

    issue_values = [
        row["issue_resolution_time"]
        for row in performance_rows
        if row["issue_resolution_time"] > 0
    ]

    avg_response_time = round( sum(response_values) / len(response_values), 1 ) if response_values else 0

    avg_issue_resolution = round( sum(issue_values) / len(issue_values), 1 ) if issue_values else 0

    # --------------------------------------------------------
    # SCORE BREAKDOWN
    # --------------------------------------------------------

    communication = (
        communication_score( avg_response_time )
        if avg_response_time > 0
        else average( "communication_score" )
    )

    compliance = average( "compliance_score" )

    score_breakdown = [
        {
            "metric": "On-Time Delivery", "value": on_time_delivery,
            "display": f"{on_time_delivery:.1f}%", "weight": 30
        },
        {
            "metric": "Quality", "value": quality_score,
            "display": f"{quality_score / 20:.1f}/5", "weight": 25
        },
        {
            "metric": "Order Fulfillment", "value": order_fulfillment,
            "display": f"{order_fulfillment:.1f}%", "weight": 20
        },
        {
            "metric": "Communication", "value": communication,
            "display": f"{communication / 20:.1f}/5", "weight": 15
        },
        {
            "metric": "Compliance", "value": compliance,
            "display": f"{compliance / 20:.1f}/5", "weight": 10
        }
    ]

    # --------------------------------------------------------
    # SCORE DISTRIBUTION
    # --------------------------------------------------------

    distribution = {
        "Excellent (90-100)": 0, "Good (75-89)": 0,
        "Average (50-74)": 0, "Below Average (<50)": 0
    }

    for row in performance_rows:

        score = row["overall_score"]

        if score >= 90:
            distribution[ "Excellent (90-100)" ] += 1

        elif score >= 75:
            distribution[ "Good (75-89)" ] += 1

        elif score >= 50:
            distribution[ "Average (50-74)" ] += 1

        else:
            distribution[ "Below Average (<50)" ] += 1

    score_distribution = [
        { "label": key, "value": value }
        for key, value in distribution.items()
    ]

    # --------------------------------------------------------
    # VENDOR SUMMARY
    # --------------------------------------------------------

    vendor_rows = sorted( performance_rows, key=lambda x: x["overall_score"], reverse=True )

    # --------------------------------------------------------
    # CATEGORY PERFORMANCE
    # --------------------------------------------------------

    category_map = {}

    for row in performance_rows:
        key = row["category"]

        if key not in category_map:
            category_map[key] = []

        category_map[key].append( row )

    category_rows = []

    for key, rows in category_map.items():

        category_rows.append({
            "category": key,

            "on_time_delivery": round( sum( x["on_time_delivery"] for x in rows ) / len(rows), 1 ),

            "quality_score": round( sum( x["quality_score"] for x in rows ) / len(rows), 1 ),

            "order_fulfillment": round( sum( x["order_fulfillment"] for x in rows ) / len(rows), 1 ),

            "overall_score": round( sum( x["overall_score"] for x in rows ) / len(rows), 1 )
        })

    category_rows.sort( key=lambda x: x["overall_score"], reverse=True )

    # --------------------------------------------------------
    # SIX-MONTH PERFORMANCE TREND
    # --------------------------------------------------------

    trend_labels = []

    trend_delivery = []

    trend_quality = []

    trend_fulfillment = []

    trend_overall = []

    month_cursor = date( to_date.year, to_date.month, 1 )

    months = []

    for _ in range(6):

        months.append( month_cursor )

        previous_month = ( month_cursor.month - 1 )

        previous_year = ( month_cursor.year )

        if previous_month == 0:
            previous_month = 12
            previous_year -= 1

        month_cursor = date( previous_year, previous_month, 1 )

    months.reverse()

    for month_date in months:
        trend_labels.append( month_date.strftime("%b %Y") )

        rows = []

        for history in filtered_history:
            history_date = ( performance_history_date( history ) )

            if ( history_date and history_date.year == month_date.year and history_date.month == month_date.month ):
                quality = normalize_quality_score( history.quality_rating )

                communication = ( communication_score( history.response_time ) )

                overall = ( float( history.overall_score or 0 ) )

                if overall <= 0:
                    overall = (
                        calculate_overall_score(
                            history.on_time_deliveries, quality,
                            history.order_completion_rate,
                            communication, history.compliance_score
                        )
                    )
                rows.append({
                    "delivery": float( history.on_time_deliveries or 0 ),
                    "quality": quality,
                    "fulfillment": float( history.order_completion_rate or 0 ),
                    "overall": overall
                })

        if rows:

            trend_delivery.append( round( sum(x["delivery"] for x in rows) / len(rows), 1 ) )

            trend_quality.append( round( sum(x["quality"] for x in rows) / len(rows), 1 ) )

            trend_fulfillment.append( round( sum(x["fulfillment"] for x in rows) / len(rows), 1 ) )

            trend_overall.append( round( sum(x["overall"] for x in rows) / len(rows), 1 ) )

        else:
            trend_delivery.append(None)
            trend_quality.append(None)
            trend_fulfillment.append(None)
            trend_overall.append(None)

    # --------------------------------------------------------
    # INSIGHTS
    # --------------------------------------------------------

    insights = []

    if on_time_delivery >= 90:
        insights.append({
            "type": "success",
            "title": "On-time delivery improved",
            "message": ( f"Current on-time delivery is {on_time_delivery:.1f}%." )
        })

    else:
        insights.append({
            "type": "warning",
            "title": "On-time delivery needs attention",
            "message": ( f"Current on-time delivery is {on_time_delivery:.1f}%." )
        })

    low_quality = sum( 1
        for row in performance_rows
        if row["quality_score"] < 80
    )

    if low_quality:
        insights.append({
            "type": "warning",
            "title": "Increase quality score",
            "message": ( f"{low_quality} vendors have a quality score below 4.0/5." )
        })

    if avg_response_time > 0:
        insights.append({
            "type": "info",
            "title": "Response time",
            "message": ( f"Average response time is {avg_response_time:.1f} hours." )
        })

    if avg_issue_resolution > 0:
        insights.append({
            "type": "info", "title": "Issue resolution",
            "message": ( f"Average issue resolution time is {avg_issue_resolution:.1f} days." )
        })

    return {
        "success": True,
        "date_range": { "from_date": from_date.isoformat(), "to_date": to_date.isoformat() },
        "filters": { "category": category, "vendor_id": vendor_id },
        "kpis": {
            "total_vendors": len( performance_rows ),
            "overall_score": overall_score,
            "on_time_delivery": on_time_delivery,
            "quality_score": quality_score,
            "order_fulfillment": order_fulfillment,
            "response_time": avg_response_time,
            "issue_resolution_time": avg_issue_resolution
        },
        "score_breakdown": score_breakdown,
        "score_distribution": score_distribution,
        "performance_trend": {
            "labels": trend_labels,
            "delivery": trend_delivery,
            "quality": trend_quality,
            "fulfillment": trend_fulfillment,
            "overall": trend_overall
        },
        "vendors": vendor_rows,
        "categories": category_rows,
        "insights": insights
    }


# ============================================================
# ORDER REPORTS
# ============================================================


def normalize_order_status(status):
    """
    Convert different database status values
    into the values used by Order Reports.
    """

    value = str( status or "Pending" ).strip().lower()


    if value in ( "completed", "complete", "delivered" ):
        return "Completed"


    if value in ( "in transit", "in_transit", "transit", "shipped" ):
        return "In Transit"


    if value in ( "cancelled", "canceled" ):
        return "Cancelled"


    if value == "pending":
        return "Pending"


    if value == "approved":
        return "Approved"


    if value == "ordered":
        return "Ordered"


    return str( status or "Pending" ).strip()


def get_previous_period( from_date: date, to_date: date ):

    days = ( to_date - from_date ).days + 1

    previous_to = ( from_date - timedelta(days=1) )

    previous_from = ( previous_to - timedelta(days=days - 1) )

    return ( previous_from, previous_to )


def build_order_report_query(
    database: Session, vendor_id: Optional[str] = None, from_date: Optional[date] = None,
    to_date: Optional[date] = None, category: Optional[str] = None,
    status: Optional[str] = None, search: Optional[str] = None
):

    query = database.query( db.PurchaseOrder )


    # Vendor filter
    if vendor_id:
        query = query.filter( db.PurchaseOrder.vendor_id == vendor_id )


    # Date filter
    if from_date:
        query = query.filter( db.PurchaseOrder.order_date >= from_date )


    if to_date:
        query = query.filter( db.PurchaseOrder.order_date <= to_date )


    # Category filter
    if category and category != "All":
        query = query.filter( db.PurchaseOrder.category == category )


    # Status filter
    if status and status != "All":
        normalized = status.strip().lower()


        if normalized == "completed":
            query = query.filter( func.lower( db.PurchaseOrder.status
                ).in_( [ "completed", "complete", "delivered" ] )
            )


        elif normalized == "in transit":
            query = query.filter( func.lower( db.PurchaseOrder.status ).in_(
                    [  "in transit", "in_transit", "transit", "shipped" ]
                ) )


        elif normalized == "cancelled":
            query = query.filter( func.lower( db.PurchaseOrder.status ).in_( [ "cancelled", "canceled" ] ) )


        else:
            query = query.filter( func.lower( db.PurchaseOrder.status ) == normalized )


    # Search
    if search:
        search_value = ( f"%{search.strip()}%" )

        query = query.outerjoin(
            db.PurchaseOrderItem,
            db.PurchaseOrderItem.purchase_order_id == db.PurchaseOrder.id
        )

        query = query.filter(
            or_(
                db.PurchaseOrder.po_number.ilike( search_value ),
                db.PurchaseOrder.category.ilike( search_value ),
                db.PurchaseOrderItem.item_description.ilike( search_value ),
                db.PurchaseOrderItem.item_code.ilike( search_value )
            )
        ).distinct()


    return query


def format_bytes(size: int) -> str:

    if size < 1024:
        return f"{size} B"

    if size < 1024 * 1024:
        return f"{size / 1024:.2f} KB"

    if size < 1024 * 1024 * 1024:
        return f"{size / 1024 / 1024:.2f} MB"

    return f"{size / 1024 / 1024 / 1024:.2f} GB"


# ============================================================
# REQUEST NUMBER
# ============================================================

def generate_request_number(database: Session) -> str:

    year = datetime.utcnow().year

    prefix = f"PR-{year}-"

    last_request = ( database.query(db.ProcurementRequest)
        .filter( db.ProcurementRequest.request_number.like( f"{prefix}%" ) )
        .order_by( db.ProcurementRequest.id.desc() ) .first()
    )

    if not last_request:
        number = 1
    else:
        try:
            number = ( int( last_request.request_number .split("-")[-1] ) + 1 )
        except Exception:
            number = last_request.id + 1

    return f"{prefix}{number:04d}"


# ============================================================
# FORMAT RESPONSE
# ============================================================

def serialize_request(request):
    return {
        "id": request.id,
        "request_number": request.request_number,
        "title": getattr(request, "title", None),
        "requester": request.requester,
        "requester_user_id": getattr( request, "requester_user_id", None ),
        "department": request.department,
        "category": request.category,
        "description": request.description,
        "priority": request.priority,
        "status": request.status,
        "amount": float(request.amount or 0),
        "created_at": request.created_at,
        "required_date": request.required_date,
        "approved_at": request.approved_at,
        "approved_by": request.approved_by,
        "po_number": request.po_number
    }


def get_user_by_role(database, role):
    return (
        database.query(db.User)
        .filter(
            db.User.role == role,
            db.User.active == True
        )
        .order_by(db.User.id.asc())
        .first()
    )


def create_approval_workflow(
    database,
    reference_type,
    reference_id,
    reference_number,
    title,
    requested_by_user_id,
    department,
    amount,
    priority
):
    existing = (
        database.query(db.ApprovalWorkflow)
        .filter(
            db.ApprovalWorkflow.reference_type == reference_type,
            db.ApprovalWorkflow.reference_id == reference_id
        )
        .first()
    )

    if existing:
        return existing

    finance_officer = get_user_by_role(
        database,
        "Finance Officer"
    )

    if not finance_officer:
        raise ValueError(
            "No active Finance Officer is available for approval."
        )

    workflow = db.ApprovalWorkflow(
        reference_type=reference_type,
        reference_id=reference_id,
        reference_number=reference_number,
        title=title,
        requested_by_user_id=requested_by_user_id,
        department=department,
        amount=amount or 0,
        priority=priority or "Medium",
        status="Pending",
        current_step=2
    )

    database.add(workflow)
    database.flush()

    # Step 1: Request submission
    database.add(
        db.ApprovalStep(
            workflow_id=workflow.id,
            step_order=1,
            step_name="Request Submission",
            approver_user_id=requested_by_user_id,
            status="Approved",
            acted_at=datetime.utcnow()
        )
    )

    # Step 2: Finance Officer approval
    database.add(
        db.ApprovalStep(
            workflow_id=workflow.id,
            step_order=2,
            step_name="Finance Officer Approval",
            approver_user_id=finance_officer.id,
            status="Pending"
        )
    )

    database.commit()
    database.refresh(workflow)

    return workflow


def get_approval_workflows(
    database,
    current_user,
    search=None,
    reference_type=None,
    department=None,
    priority=None,
    status=None,
    start_date=None,
    end_date=None,
    tab="mine",
    page=1,
    page_size=10
):

    query = (
        database.query(db.ApprovalWorkflow)
    )

    # ---------------------------------------------------------
    # SEARCH
    # ---------------------------------------------------------

    if search:
        value = f"%{search}%"

        query = query.filter(
            db.ApprovalWorkflow.reference_number.ilike(value)
            |
            db.ApprovalWorkflow.title.ilike(value)
            |
            db.ApprovalWorkflow.department.ilike(value)
        )

    # ---------------------------------------------------------
    # TYPE
    # ---------------------------------------------------------

    if reference_type and reference_type != "All":
        query = query.filter(
            db.ApprovalWorkflow.reference_type
            == reference_type
        )

    # ---------------------------------------------------------
    # DEPARTMENT
    # ---------------------------------------------------------

    if department and department != "All":
        query = query.filter(
            db.ApprovalWorkflow.department
            == department
        )

    # ---------------------------------------------------------
    # PRIORITY
    # ---------------------------------------------------------

    if priority and priority != "All":
        query = query.filter(
            db.ApprovalWorkflow.priority
            == priority
        )

    # ---------------------------------------------------------
    # STATUS
    # ---------------------------------------------------------

    if status and status != "All":
        query = query.filter(
            db.ApprovalWorkflow.status
            == status
        )

    # ---------------------------------------------------------
    # DATE
    # ---------------------------------------------------------

    if start_date:
        query = query.filter(
            func.date(
                db.ApprovalWorkflow.created_at
            ) >= start_date
        )

    if end_date:
        query = query.filter(
            func.date(
                db.ApprovalWorkflow.created_at
            ) <= end_date
        )

    # ---------------------------------------------------------
    # TABS
    # ---------------------------------------------------------

    if tab == "mine":

        query = query.join(
            db.ApprovalStep,
            db.ApprovalStep.workflow_id
            == db.ApprovalWorkflow.id
        ).filter(
            db.ApprovalStep.approver_user_id
            == current_user.id,
            db.ApprovalStep.status
            == "Pending"
        )

    elif tab == "history":

        query = query.filter(
            db.ApprovalWorkflow.status.in_([
                "Approved",
                "Rejected",
                "Completed"
            ])
        )

    total = query.distinct().count()

    offset = (page - 1) * page_size

    workflows = (
        query
        .order_by(
            db.ApprovalWorkflow.created_at.desc()
        )
        .distinct()
        .offset(offset)
        .limit(page_size)
        .all()
    )

    results = []

    for workflow in workflows:

        requester = None

        if workflow.requested_by:
            requester = workflow.requested_by.name

        results.append({
            "id": workflow.id,
            "reference_type": workflow.reference_type,
            "reference_id": workflow.reference_id,
            "reference_number": workflow.reference_number,
            "title": workflow.title,
            "requested_by": requester,
            "department": workflow.department,
            "amount": float(workflow.amount or 0),
            "priority": workflow.priority,
            "status": workflow.status,
            "current_step": workflow.current_step,
            "created_at": (
                workflow.created_at.isoformat()
                if workflow.created_at
                else None
            )
        })

    return {
        "approvals": results,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (
            (total + page_size - 1)
            // page_size
        )
    }


def approval_statistics(
    database,
    current_user,
    start_date=None,
    end_date=None
):

    query = database.query(
        db.ApprovalWorkflow
    )

    if start_date:
        query = query.filter(
            func.date(
                db.ApprovalWorkflow.created_at
            ) >= start_date
        )

    if end_date:
        query = query.filter(
            func.date(
                db.ApprovalWorkflow.created_at
            ) <= end_date
        )

    requested = query.count()

    approved = query.filter(
        db.ApprovalWorkflow.status == "Approved"
    ).count()

    rejected = query.filter(
        db.ApprovalWorkflow.status == "Rejected"
    ).count()

    escalated = query.filter(
        db.ApprovalWorkflow.status == "Escalated"
    ).count()

    completed = query.filter(
        db.ApprovalWorkflow.status == "Completed"
    ).count()

    pending_my_approval = (
        database.query(db.ApprovalStep)
        .filter(
            db.ApprovalStep.approver_user_id
            == current_user.id,
            db.ApprovalStep.status == "Pending"
        )
        .count()
    )

    return {
        "pending_my_approval": pending_my_approval,
        "requested": requested,
        "approved": approved,
        "rejected": rejected,
        "escalated": escalated,
        "completed": completed
    }


def process_approval_decision(
    database,
    workflow_id,
    current_user,
    decision,
    comments=None
):

    workflow = (
        database.query(db.ApprovalWorkflow)
        .filter(
            db.ApprovalWorkflow.id
            == workflow_id
        )
        .first()
    )

    if not workflow:
        raise HTTPException(
            status_code=404,
            detail="Approval workflow not found"
        )

    step = (
        database.query(db.ApprovalStep)
        .filter(
            db.ApprovalStep.workflow_id
            == workflow.id,
            db.ApprovalStep.step_order
            == workflow.current_step,
            db.ApprovalStep.status
            == "Pending"
        )
        .first()
    )

    if not step:
        raise HTTPException(
            status_code=400,
            detail="There is no pending approval step"
        )

    if (
        step.approver_user_id
        and step.approver_user_id
        != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="You are not assigned to this approval step"
        )

    if decision not in {
        "Approved",
        "Rejected"
    }:
        raise HTTPException(
            status_code=400,
            detail="Invalid approval decision"
        )

    # ---------------------------------------------------------
    # REJECT
    # ---------------------------------------------------------

    if decision == "Rejected":

        step.status = "Rejected"

        step.comments = comments

        step.acted_at = datetime.utcnow()

        workflow.status = "Rejected"

        workflow.completed_at = datetime.utcnow()

        # ---------------------------------------------------------
        # UPDATE ORIGINAL RECORD
        # ---------------------------------------------------------

        if workflow.reference_type == "PO":

            po = (
                database.query(
                    db.PurchaseOrder
                )
                .filter(
                    db.PurchaseOrder.id
                    == workflow.reference_id
                )
                .first()
            )

            if po:
                po.status = "Rejected"

        elif workflow.reference_type == "PR":

            request = (
                database.query(
                    db.ProcurementRequest
                )
                .filter(
                    db.ProcurementRequest.id
                    == workflow.reference_id
                )
                .first()
            )

            if request:
                request.status = "Rejected"

    # ---------------------------------------------------------
    # APPROVE
    # ---------------------------------------------------------

    else:

        step.status = "Approved"
        step.comments = comments
        step.acted_at = datetime.utcnow()

        next_step = (
            database.query(db.ApprovalStep)
            .filter(
                db.ApprovalStep.workflow_id
                == workflow.id,
                db.ApprovalStep.step_order
                > workflow.current_step
            )
            .order_by(
                db.ApprovalStep.step_order.asc()
            )
            .first()
        )

        if next_step:

            workflow.current_step = (
                next_step.step_order
            )

            next_step.status = "Pending"

        else:

            workflow.status = "Completed"
            workflow.completed_at = datetime.utcnow()

            # Update original record

            if workflow.reference_type == "PR":

                request = (
                    database.query(
                        db.ProcurementRequest
                    )
                    .filter(
                        db.ProcurementRequest.id
                        == workflow.reference_id
                    )
                    .first()
                )

                if request:
                    request.status = "Completed"
                    request.approved_at = datetime.utcnow()
                    request.approved_by = current_user.id

            elif workflow.reference_type == "PO":

                po = (
                    database.query(
                        db.PurchaseOrder
                    )
                    .filter(
                        db.PurchaseOrder.id
                        == workflow.reference_id
                    )
                    .first()
                )

                if po:

                    po.status = "Approved"

                    po.approved_at = datetime.utcnow()

    database.commit()
    database.refresh(workflow)

    return workflow


def create_procurement_notification(
    database: Session,
    user_id: int,
    title: str,
    message: str,
    category: str,
    priority: str = "Medium",
    notification_type: str = "System",
    reference_id: str | None = None,
    related_type: str | None = None,
    vendor_id: str | None = None
):

    user = (
        database.query(db.User)
        .filter(db.User.id == user_id)
        .first()
    )

    if not user:
        return None

    notification = db.Notification(

        recipient_user_id=user_id,

        vendor_id=vendor_id,

        notification_type=notification_type,

        title=title,

        message=message,

        category=category,

        priority=priority,

        channel="In-App",

        status="Unread",

        reference_id=reference_id,

        related_type=related_type,

        recipient_email=user.email,

        recipient_phone=user.mobile
    )

    database.add(notification)

    database.flush()

    return notification


# ============================================================
# BUDGET MANAGEMENT DASHBOARD
# ============================================================

def get_budget_management_dashboard(
    database: Session,
    current_user,
    year: Optional[int] = None
):
    """
    Dashboard data for the Finance Officer Budget Management page.
    """

    if year is None:
        today = datetime.utcnow().date()

        # Financial year:
        # April - March
        if today.month >= 4:
            year = today.year
        else:
            year = today.year - 1

    budgets = (
        database.query(db.FinanceBudget)
        .filter(
            db.FinanceBudget.year == year
        )
        .order_by(
            db.FinanceBudget.department.asc()
        )
        .all()
    )

    # ---------------------------------------------------------
    # KPI CALCULATIONS
    # ---------------------------------------------------------

    total_budget = sum(
        float(row.budget or 0)
        for row in budgets
    )

    total_allocated = sum(
        float(getattr(row, "allocated", 0) or 0)
        for row in budgets
    )

    total_spent = sum(
        float(row.actual or 0)
        for row in budgets
    )

    remaining_budget = max(
        total_budget - total_spent,
        0
    )

    over_budget = sum(
        max(
            float(row.actual or 0)
            - float(row.budget or 0),
            0
        )
        for row in budgets
    )

    utilization = (
        (total_spent / total_budget) * 100
        if total_budget > 0
        else 0
    )

    # ---------------------------------------------------------
    # SUMMARY
    # ---------------------------------------------------------

    total_departments = (
        database.query(
            func.count(
                func.distinct(
                    db.FinanceBudget.department
                )
            )
        )
        .filter(
            db.FinanceBudget.year == year
        )
        .scalar()
        or 0
    )

    active_budgets = sum(
        1
        for row in budgets
        if str(row.status or "").lower()
        == "active"
    )

    completed_budgets = sum(
        1
        for row in budgets
        if str(row.status or "").lower()
        == "completed"
    )

    pending_approval = sum(
        1
        for row in budgets
        if str(row.status or "").lower()
        in {
            "pending",
            "pending approval"
        }
    )

    # ---------------------------------------------------------
    # DEPARTMENT TABLE
    # ---------------------------------------------------------

    departments = []

    for row in budgets:

        budget = float(row.budget or 0)

        allocated = float(
            getattr(row, "allocated", 0) or 0
        )

        actual = float(row.actual or 0)

        remaining = max(
            budget - actual,
            0
        )

        utilization_row = (
            (actual / budget) * 100
            if budget > 0
            else 0
        )

        if actual > budget:
            row_status = "Over Budget"

        elif (
            str(row.status or "").lower()
            == "completed"
        ):
            row_status = "Completed"

        elif (
            str(row.status or "").lower()
            in {
                "pending",
                "pending approval"
            }
        ):
            row_status = "Pending Approval"

        else:
            row_status = "On Track"

        departments.append({
            "id": row.id,
            "department": row.department,
            "budget": round(budget, 2),
            "allocated": round(allocated, 2),
            "actual": round(actual, 2),
            "remaining": round(remaining, 2),
            "utilization": round(
                utilization_row,
                2
            ),
            "status": row_status
        })

    # ---------------------------------------------------------
    # RECENT BUDGET ACTIVITIES
    # Reuse existing audit_logs table.
    # ---------------------------------------------------------

    activities = []

    try:

        audit_rows = (
            database.query(db.AuditLog)
            .filter(
                db.AuditLog.resource.ilike(
                    "Budget"
                )
            )
            .order_by(
                db.AuditLog.created_at.desc()
            )
            .limit(5)
            .all()
        )

        for item in audit_rows:

            amount = 0

            try:
                amount = float(
                    item.resource_id
                    or 0
                )
            except Exception:
                amount = 0

            activities.append({
                "id": item.id,
                "title": item.action or "Budget Activity",
                "description": item.description or "",
                "amount": amount,
                "date": (
                    item.created_at.isoformat()
                    if item.created_at
                    else None
                ),
                "action": item.action or "",
                "status": item.status or "Success"
            })

    except Exception:
        activities = []

    # ---------------------------------------------------------
    # RESULT
    # ---------------------------------------------------------

    return {
        "year": year,

        "kpis": {
            "total_budget": round(
                total_budget,
                2
            ),

            "total_allocated": round(
                total_allocated,
                2
            ),

            "total_spent": round(
                total_spent,
                2
            ),

            "remaining_budget": round(
                remaining_budget,
                2
            ),

            "over_budget": round(
                over_budget,
                2
            ),

            "utilization": round(
                utilization,
                2
            )
        },

        "summary": {
            "total_departments":
                int(total_departments),

            "active_budgets":
                active_budgets,

            "completed_budgets":
                completed_budgets,

            "pending_approval":
                pending_approval
        },

        "departments": departments,

        "activities": activities
    }


# ============================================================
# ACCOUNTS PAYABLE - CREATE BILL
# ============================================================

def create_accounts_payable_bill(
    database: Session,
    bill
):
    """
    Create a new Accounts Payable bill.

    Uses:
        finance_payables
    """

    invoice_no = bill.invoice_no.strip()

    if not invoice_no:
        raise HTTPException(
            status_code=400,
            detail="Invoice number is required."
        )

    # --------------------------------------------------------
    # CHECK DUPLICATE INVOICE
    # --------------------------------------------------------

    existing = (
        database.query(db.FinancePayable)
        .filter(
            db.FinancePayable.invoice_no == invoice_no
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Invoice '{invoice_no}' already exists."
        )

    # --------------------------------------------------------
    # VALIDATE DATE
    # --------------------------------------------------------

    if bill.due_date < bill.bill_date:
        raise HTTPException(
            status_code=400,
            detail="Due date cannot be before bill date."
        )

    # --------------------------------------------------------
    # CREATE BILL
    # --------------------------------------------------------

    new_bill = db.FinancePayable(
        invoice_no=invoice_no,
        vendor=bill.vendor.strip(),
        amount=float(bill.amount),
        bill_date=bill.bill_date,
        due_date=bill.due_date,
        payment_status=(
            bill.payment_status
            or "Pending"
        )
    )

    database.add(new_bill)

    try:

        database.commit()

        database.refresh(new_bill)

    except IntegrityError:

        database.rollback()

        raise HTTPException(
            status_code=400,
            detail="Unable to create bill."
        )

    return {
        "success": True,
        "message": "Bill created successfully.",
        "bill": {
            "id": new_bill.id,
            "invoice_no": new_bill.invoice_no,
            "vendor": new_bill.vendor,
            "amount": float(new_bill.amount or 0),
            "bill_date": (
                new_bill.bill_date.isoformat()
                if new_bill.bill_date
                else None
            ),
            "due_date": (
                new_bill.due_date.isoformat()
                if new_bill.due_date
                else None
            ),
            "status": new_bill.payment_status
        }
    }


# ============================================================
# ACCOUNTS PAYABLE - GET BILL
# ============================================================

def get_accounts_payable_bill(
    database: Session,
    bill_id: int
):
    return (
        database.query(db.FinancePayable)
        .filter(
            db.FinancePayable.id == bill_id
        )
        .first()
    )


# ============================================================
# ACCOUNTS PAYABLE - RECORD PAYMENT
# ============================================================

def create_accounts_payable_payment(
    database: Session,
    payment
):
    """
    Record a payment against an Accounts Payable bill.

    Uses:
        finance_payables
        finance_payments
    """

    invoice_no = payment.invoice_no.strip()

    if not invoice_no:
        raise HTTPException(
            status_code=400,
            detail="Invoice number is required."
        )

    # --------------------------------------------------------
    # FIND BILL
    # --------------------------------------------------------

    bill = (
        database.query(db.FinancePayable)
        .filter(
            db.FinancePayable.invoice_no == invoice_no
        )
        .first()
    )

    if not bill:

        raise HTTPException(
            status_code=404,
            detail=f"Bill '{invoice_no}' not found."
        )

    # --------------------------------------------------------
    # VALIDATE PAYMENT
    # --------------------------------------------------------

    payment_amount = float(
        payment.amount
    )

    bill_amount = float(
        bill.amount or 0
    )

    if payment_amount <= 0:

        raise HTTPException(
            status_code=400,
            detail="Payment amount must be greater than zero."
        )

    # --------------------------------------------------------
    # GET EXISTING COMPLETED PAYMENTS
    # --------------------------------------------------------

    existing_payments = (
        database.query(
            db.FinancePayment
        )
        .filter(
            db.FinancePayment.invoice_no
            == invoice_no
        )
        .all()
    )

    paid_amount = 0.0

    for existing_payment in existing_payments:

        payment_status = (
            str(
                existing_payment.status or ""
            )
            .strip()
            .lower()
        )

        if payment_status in {
            "completed",
            "paid"
        }:

            paid_amount += float(
                existing_payment.amount or 0
            )

    # --------------------------------------------------------
    # REMAINING BALANCE
    # --------------------------------------------------------

    remaining_amount = max(
        bill_amount - paid_amount,
        0
    )

    if payment_amount > remaining_amount:

        raise HTTPException(
            status_code=400,
            detail=(
                f"Payment amount exceeds the "
                f"remaining bill balance of "
                f"{remaining_amount:.2f}."
            )
        )

    # --------------------------------------------------------
    # CREATE PAYMENT
    # --------------------------------------------------------

    new_payment = db.FinancePayment(
        invoice_no=invoice_no,
        vendor=payment.vendor.strip(),
        amount=payment_amount,
        payment_date=payment.payment_date,
        status=payment.status or "Completed",
        early_payment=payment.early_payment,
        discount_amount=payment.discount_amount or 0
    )

    database.add(new_payment)

    # --------------------------------------------------------
    # CALCULATE NEW BALANCE
    # --------------------------------------------------------

    new_paid_amount = (
        paid_amount
        + payment_amount
    )

    if new_paid_amount >= bill_amount:

        bill.payment_status = "Paid"

    elif new_paid_amount > 0:

        bill.payment_status = "Partially Paid"

    else:

        bill.payment_status = "Pending"

    try:

        database.commit()

        database.refresh(new_payment)

        database.refresh(bill)

    except IntegrityError:

        database.rollback()

        raise HTTPException(
            status_code=400,
            detail="Unable to record payment."
        )

    return {
        "success": True,
        "message": "Payment recorded successfully.",

        "payment": {
            "id": new_payment.id,
            "invoice_no": new_payment.invoice_no,
            "vendor": new_payment.vendor,
            "amount": float(
                new_payment.amount or 0
            ),
            "payment_date": (
                new_payment.payment_date.isoformat()
                if new_payment.payment_date
                else None
            ),
            "status": new_payment.status
        },

        "bill": {
            "id": bill.id,
            "invoice_no": bill.invoice_no,
            "amount": bill_amount,
            "paid_amount": new_paid_amount,
            "remaining_amount": max(
                bill_amount - new_paid_amount,
                0
            ),
            "status": bill.payment_status
        }
    }


# ============================================================
# ACCOUNTS PAYABLE - VENDOR PAYMENTS
# ============================================================

def get_accounts_payable_payments(
    database: Session,
    search: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20
):

    query = database.query(
        db.FinancePayment
    )

    # --------------------------------------------------------
    # SEARCH
    # --------------------------------------------------------

    if search:

        value = (
            f"%{search.strip()}%"
        )

        query = query.filter(
            or_(
                db.FinancePayment.invoice_no.ilike(
                    value
                ),

                db.FinancePayment.vendor.ilike(
                    value
                )
            )
        )

    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    if status and status.lower() != "all":

        query = query.filter(
            func.lower(
                db.FinancePayment.status
            )
            ==
            status.strip().lower()
        )

    # --------------------------------------------------------
    # TOTAL
    # --------------------------------------------------------

    total = query.count()

    # --------------------------------------------------------
    # PAGINATION
    # --------------------------------------------------------

    offset = (
        (page - 1)
        * page_size
    )

    payments = (
        query
        .order_by(
            db.FinancePayment.payment_date.desc(),
            db.FinancePayment.id.desc()
        )
        .offset(offset)
        .limit(page_size)
        .all()
    )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    items = []

    for payment in payments:

        items.append({

            "id": payment.id,

            "invoice_no":
                payment.invoice_no,

            "vendor":
                payment.vendor,

            "amount":
                float(payment.amount or 0),

            "payment_date": (
                payment.payment_date.isoformat()
                if payment.payment_date
                else None
            ),

            "status":
                payment.status,

            "early_payment":
                bool(
                    payment.early_payment
                ),

            "discount_amount":
                float(
                    payment.discount_amount or 0
                )
        })

    return {

        "items": items,

        "pagination": {

            "page": page,

            "page_size":
                page_size,

            "total":
                total,

            "pages": (
                (total + page_size - 1)
                // page_size
                if total
                else 1
            )
        }
    }


def create_budget(
    database: Session,
    current_user,
    request
):

    existing = (
        database.query(db.FinanceBudget)
        .filter(
            db.FinanceBudget.department
            == request.department,

            db.FinanceBudget.year
            == request.year
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Budget already exists for "
                f"{request.department} "
                f"in {request.year}."
            )
        )

    if request.allocated > request.budget:
        raise HTTPException(
            status_code=400,
            detail=(
                "Allocated amount cannot exceed "
                "the total budget."
            )
        )

    budget = db.FinanceBudget(
        department=request.department.strip(),
        budget=request.budget,
        allocated=request.allocated,
        actual=0,
        year=request.year,
        status=request.status
    )

    database.add(budget)
    database.flush()

    # Audit activity
    audit = db.AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.name,
        role=current_user.role,
        action="Budget Created",
        description=(
            f"Budget created for "
            f"{request.department}"
        ),
        resource="Budget",
        resource_id=str(request.budget),
        status="Success"
    )

    database.add(audit)

    database.commit()
    database.refresh(budget)

    return budget


def allocate_budget(
    database: Session,
    current_user,
    budget_id: int,
    amount: float
):

    budget = (
        database.query(db.FinanceBudget)
        .filter(
            db.FinanceBudget.id == budget_id
        )
        .first()
    )

    if budget is None:
        raise HTTPException(
            status_code=404,
            detail="Budget not found."
        )

    current_allocated = float(
        getattr(budget, "allocated", 0)
        or 0
    )

    total_budget = float(
        budget.budget or 0
    )

    new_allocated = (
        current_allocated + amount
    )

    if new_allocated > total_budget:
        raise HTTPException(
            status_code=400,
            detail=(
                "Allocation cannot exceed "
                "the total budget."
            )
        )

    budget.allocated = new_allocated

    audit = db.AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.name,
        role=current_user.role,
        action="Budget Allocated",
        description=(
            f"₹{amount:,.2f} allocated to "
            f"{budget.department}"
        ),
        resource="Budget",
        resource_id=str(amount),
        status="Success"
    )

    database.add(audit)

    database.commit()
    database.refresh(budget)

    return {
        "success": True,
        "message": "Budget allocated successfully.",
        "budget_id": budget.id,
        "allocated": float(
            budget.allocated or 0
        )
    }


def transfer_budget(
    database: Session,
    current_user,
    from_budget_id: int,
    to_budget_id: int,
    amount: float
):

    if from_budget_id == to_budget_id:
        raise HTTPException(
            status_code=400,
            detail=(
                "Source and destination "
                "budgets must be different."
            )
        )

    source = (
        database.query(db.FinanceBudget)
        .filter(
            db.FinanceBudget.id
            == from_budget_id
        )
        .first()
    )

    destination = (
        database.query(db.FinanceBudget)
        .filter(
            db.FinanceBudget.id
            == to_budget_id
        )
        .first()
    )

    if source is None:
        raise HTTPException(
            status_code=404,
            detail="Source budget not found."
        )

    if destination is None:
        raise HTTPException(
            status_code=404,
            detail="Destination budget not found."
        )

    source_allocated = float(
        getattr(source, "allocated", 0)
        or 0
    )

    destination_allocated = float(
        getattr(destination, "allocated", 0)
        or 0
    )

    if amount > source_allocated:
        raise HTTPException(
            status_code=400,
            detail=(
                "Transfer amount exceeds "
                "source allocated budget."
            )
        )

    if (
        destination_allocated + amount
        > float(destination.budget or 0)
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Transfer would exceed the "
                "destination budget."
            )
        )

    source.allocated = (
        source_allocated - amount
    )

    destination.allocated = (
        destination_allocated + amount
    )

    audit = db.AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.name,
        role=current_user.role,
        action="Budget Transfer",
        description=(
            f"Transferred ₹{amount:,.2f} "
            f"from {source.department} "
            f"to {destination.department}"
        ),
        resource="Budget",
        resource_id=str(amount),
        status="Success"
    )

    database.add(audit)

    database.commit()

    return {
        "success": True,
        "message": "Budget transferred successfully.",
        "from_department": source.department,
        "to_department": destination.department,
        "amount": amount
    }


# ============================================================
# FINANCE EXPENDITURES DASHBOARD
# ============================================================

def get_finance_expenditures(
    database: Session,
    current_user,
    year: int | None = None
):
    from datetime import date
    from calendar import month_name

    if year is None:
        year = date.today().year

    today = date.today()

    # --------------------------------------------------------
    # DATE RANGE
    # --------------------------------------------------------

    year_start = date(year, 1, 1)
    year_end = date(year, 12, 31)

    month_start = date(
        today.year,
        today.month,
        1
    )

    # --------------------------------------------------------
    # TOTAL EXPENDITURE
    # --------------------------------------------------------

    total_expenditure = (
        database.query(
            func.coalesce(
                func.sum(
                    db.FinanceTransaction.amount
                ),
                0
            )
        )
        .filter(
            db.FinanceTransaction.transaction_type == "expense"
        )
        .filter(
            db.FinanceTransaction.transaction_date >= year_start
        )
        .filter(
            db.FinanceTransaction.transaction_date <= year_end
        )
        .scalar()
        or 0
    )

    total_expenditure = float(
        total_expenditure
    )

    # --------------------------------------------------------
    # THIS MONTH
    # --------------------------------------------------------

    this_month = (
        database.query(
            func.coalesce(
                func.sum(
                    db.FinanceTransaction.amount
                ),
                0
            )
        )
        .filter(
            db.FinanceTransaction.transaction_type == "expense"
        )
        .filter(
            db.FinanceTransaction.transaction_date >= month_start
        )
        .filter(
            db.FinanceTransaction.transaction_date <= today
        )
        .scalar()
        or 0
    )

    this_month = float(this_month)

    # --------------------------------------------------------
    # TOTAL TRANSACTIONS THIS MONTH
    # --------------------------------------------------------

    total_transactions = (
        database.query(
            func.count(
                db.FinanceTransaction.id
            )
        )
        .filter(
            db.FinanceTransaction.transaction_type == "expense"
        )
        .filter(
            db.FinanceTransaction.transaction_date >= month_start
        )
        .filter(
            db.FinanceTransaction.transaction_date <= today
        )
        .scalar()
        or 0
    )

    # --------------------------------------------------------
    # LAST 6 MONTH AVERAGE
    # --------------------------------------------------------

    monthly_values = []

    for month in range(1, 13):

        monthly_total = (
            database.query(
                func.coalesce(
                    func.sum(
                        db.FinanceTransaction.amount
                    ),
                    0
                )
            )
            .filter(
                db.FinanceTransaction.transaction_type
                == "expense"
            )
            .filter(
                func.extract(
                    "year",
                    db.FinanceTransaction.transaction_date
                ) == year
            )
            .filter(
                func.extract(
                    "month",
                    db.FinanceTransaction.transaction_date
                ) == month
            )
            .scalar()
            or 0
        )

        monthly_values.append(
            float(monthly_total)
        )

    completed_months = min(
        today.month if year == today.year else 12,
        12
    )

    last_six = monthly_values[
        max(0, completed_months - 6):
        completed_months
    ]

    average_monthly_expense = (
        sum(last_six) / len(last_six)
        if last_six
        else 0
    )

    # --------------------------------------------------------
    # BUDGET
    # --------------------------------------------------------

    total_budget = (
        database.query(
            func.coalesce(
                func.sum(
                    db.FinanceBudget.budget
                ),
                0
            )
        )
        .filter(
            db.FinanceBudget.year == year
        )
        .scalar()
        or 0
    )

    total_budget = float(total_budget)

    budget_utilization = (
        (
            total_expenditure /
            total_budget
        ) * 100
        if total_budget > 0
        else 0
    )

    # --------------------------------------------------------
    # CURRENT YEAR TREND
    # --------------------------------------------------------

    this_year_trend = []

    for month in range(1, 13):

        value = (
            database.query(
                func.coalesce(
                    func.sum(
                        db.FinanceTransaction.amount
                    ),
                    0
                )
            )
            .filter(
                db.FinanceTransaction.transaction_type
                == "expense"
            )
            .filter(
                func.extract(
                    "year",
                    db.FinanceTransaction.transaction_date
                ) == year
            )
            .filter(
                func.extract(
                    "month",
                    db.FinanceTransaction.transaction_date
                ) == month
            )
            .scalar()
            or 0
        )

        this_year_trend.append(
            round(float(value), 2)
        )

    # --------------------------------------------------------
    # PREVIOUS YEAR TREND
    # --------------------------------------------------------

    last_year = year - 1
    last_year_trend = []

    for month in range(1, 13):

        value = (
            database.query(
                func.coalesce(
                    func.sum(
                        db.FinanceTransaction.amount
                    ),
                    0
                )
            )
            .filter(
                db.FinanceTransaction.transaction_type
                == "expense"
            )
            .filter(
                func.extract(
                    "year",
                    db.FinanceTransaction.transaction_date
                ) == last_year
            )
            .filter(
                func.extract(
                    "month",
                    db.FinanceTransaction.transaction_date
                ) == month
            )
            .scalar()
            or 0
        )

        last_year_trend.append(
            round(float(value), 2)
        )

    # --------------------------------------------------------
    # CATEGORY BREAKDOWN
    # --------------------------------------------------------

    category_rows = (
        database.query(
            db.FinanceTransaction.category,
            func.coalesce(
                func.sum(
                    db.FinanceTransaction.amount
                ),
                0
            ).label("amount")
        )
        .filter(
            db.FinanceTransaction.transaction_type
            == "expense"
        )
        .filter(
            db.FinanceTransaction.transaction_date
            >= year_start
        )
        .filter(
            db.FinanceTransaction.transaction_date
            <= year_end
        )
        .group_by(
            db.FinanceTransaction.category
        )
        .order_by(
            func.sum(
                db.FinanceTransaction.amount
            ).desc()
        )
        .all()
    )

    category_total = sum(
        float(row.amount or 0)
        for row in category_rows
    )

    categories = []

    for category, amount in category_rows:

        amount = float(amount or 0)

        percentage = (
            amount / category_total * 100
            if category_total
            else 0
        )

        categories.append({
            "category": category or "Others",
            "amount": round(amount, 2),
            "percentage": round(
                percentage,
                2
            )
        })

    # --------------------------------------------------------
    # TOP CATEGORIES
    # --------------------------------------------------------

    categories = categories[:10]

    # --------------------------------------------------------
    # EXPENDITURE OVERVIEW
    # --------------------------------------------------------

    overview = []

    for category in categories:

        category_name = category["category"]
        actual = category["amount"]

        budget_row = (
            database.query(
                db.FinanceBudget
            )
            .filter(
                db.FinanceBudget.department
                == category_name
            )
            .filter(
                db.FinanceBudget.year
                == year
            )
            .first()
        )

        budget = (
            float(budget_row.budget)
            if budget_row
            else 0
        )

        variance = budget - actual

        variance_percent = (
            (variance / budget) * 100
            if budget > 0
            else 0
        )

        status = (
            "Under Budget"
            if variance >= 0
            else "Over Budget"
        )

        overview.append({
            "category": category_name,
            "budget": round(budget, 2),
            "actual": round(actual, 2),
            "variance": round(
                variance,
                2
            ),
            "variance_percent": round(
                variance_percent,
                2
            ),
            "status": status
        })

    # --------------------------------------------------------
    # RECENT EXPENDITURES
    # --------------------------------------------------------

    recent_rows = (
        database.query(
            db.FinanceTransaction
        )
        .filter(
            db.FinanceTransaction.transaction_type
            == "expense"
        )
        .order_by(
            db.FinanceTransaction.transaction_date.desc(),
            db.FinanceTransaction.id.desc()
        )
        .limit(10)
        .all()
    )

    recent_expenditures = []

    for transaction in recent_rows:

        recent_expenditures.append({
            "id": transaction.id,
            "title": (
                transaction.category
                or "Expense"
            ),
            "category": (
                transaction.category
                or "Others"
            ),
            "department":
                transaction.department,
            "amount": round(
                float(
                    transaction.amount or 0
                ),
                2
            ),
            "status":
                transaction.status,
            "date": (
                transaction.transaction_date.isoformat()
                if transaction.transaction_date
                else None
            )
        })

    # --------------------------------------------------------
    # PENDING APPROVALS
    # --------------------------------------------------------

    pending_approvals = (
        database.query(
            func.count(
                db.FinanceTransaction.id
            )
        )
        .filter(
            db.FinanceTransaction.transaction_type
            == "expense"
        )
        .filter(
            db.FinanceTransaction.status
            == "Pending"
        )
        .scalar()
        or 0
    )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "total_expenditure":
            round(total_expenditure, 2),

        "this_month":
            round(this_month, 2),

        "average_monthly_expense":
            round(
                average_monthly_expense,
                2
            ),

        "total_transactions":
            int(total_transactions),

        "budget_utilization":
            round(
                budget_utilization,
                2
            ),

        "trend_months": [
            month_name[m][:3]
            for m in range(1, 13)
        ],

        "this_year_trend":
            this_year_trend,

        "last_year_trend":
            last_year_trend,

        "categories":
            categories,

        "overview":
            overview,

        "recent_expenditures":
            recent_expenditures,

        "pending_approvals":
            int(pending_approvals)
    }


# ============================================================
# REVENUE DASHBOARD
# ============================================================

def get_finance_revenue_dashboard(
    database: Session,
    current_user,
    year: int,
    month: int
):
    """
    Revenue dashboard for Finance Officer.

    Data sources:
        finance_transactions
        finance_revenue_plans
        invoices
    """

    income_types = [
        "income",
        "inflow",
        "revenue"
    ]

    # ---------------------------------------------------------
    # DATE RANGE
    # ---------------------------------------------------------

    start_year = date(year, 1, 1)
    next_year = date(year + 1, 1, 1)

    month_start = date(year, month, 1)

    if month == 12:
        next_month = date(year + 1, 1, 1)
    else:
        next_month = date(year, month + 1, 1)

    # Previous year
    previous_year = year - 1
    previous_year_start = date(previous_year, 1, 1)
    previous_year_end = date(year, 1, 1)

    # ---------------------------------------------------------
    # TOTAL REVENUE
    # ---------------------------------------------------------

    total_revenue = (
        database.query(
            func.coalesce(
                func.sum(db.FinanceTransaction.amount),
                0
            )
        )
        .filter(
            db.FinanceTransaction.transaction_type.in_(
                income_types
            ),
            db.FinanceTransaction.transaction_date >= start_year,
            db.FinanceTransaction.transaction_date < next_year
        )
        .scalar()
    ) or 0

    total_revenue = float(total_revenue)

    # ---------------------------------------------------------
    # THIS MONTH REVENUE
    # ---------------------------------------------------------

    this_month_revenue = (
        database.query(
            func.coalesce(
                func.sum(db.FinanceTransaction.amount),
                0
            )
        )
        .filter(
            db.FinanceTransaction.transaction_type.in_(
                income_types
            ),
            db.FinanceTransaction.transaction_date >= month_start,
            db.FinanceTransaction.transaction_date < next_month
        )
        .scalar()
    ) or 0

    this_month_revenue = float(this_month_revenue)

    # ---------------------------------------------------------
    # PREVIOUS MONTH
    # ---------------------------------------------------------

    if month == 1:
        previous_month_start = date(year - 1, 12, 1)
        previous_month_end = date(year, 1, 1)
    else:
        previous_month_start = date(year, month - 1, 1)
        previous_month_end = month_start

    previous_month_revenue = (
        database.query(
            func.coalesce(
                func.sum(db.FinanceTransaction.amount),
                0
            )
        )
        .filter(
            db.FinanceTransaction.transaction_type.in_(
                income_types
            ),
            db.FinanceTransaction.transaction_date >= previous_month_start,
            db.FinanceTransaction.transaction_date < previous_month_end
        )
        .scalar()
    ) or 0

    previous_month_revenue = float(previous_month_revenue)

    month_growth = (
        ((this_month_revenue - previous_month_revenue)
         / previous_month_revenue) * 100
        if previous_month_revenue
        else 0
    )

    # ---------------------------------------------------------
    # LAST 6 MONTHS AVERAGE
    # ---------------------------------------------------------

    six_month_revenues = []

    current_month = month
    current_year = year

    for _ in range(6):

        current_start = date(
            current_year,
            current_month,
            1
        )

        if current_month == 12:
            current_end = date(
                current_year + 1,
                1,
                1
            )
        else:
            current_end = date(
                current_year,
                current_month + 1,
                1
            )

        value = (
            database.query(
                func.coalesce(
                    func.sum(
                        db.FinanceTransaction.amount
                    ),
                    0
                )
            )
            .filter(
                db.FinanceTransaction.transaction_type.in_(
                    income_types
                ),
                db.FinanceTransaction.transaction_date >= current_start,
                db.FinanceTransaction.transaction_date < current_end
            )
            .scalar()
        ) or 0

        six_month_revenues.append(float(value))

        current_month -= 1

        if current_month == 0:
            current_month = 12
            current_year -= 1

    six_month_average = (
        sum(six_month_revenues) / len(six_month_revenues)
        if six_month_revenues
        else 0
    )

    # ---------------------------------------------------------
    # REVENUE TARGET
    # ---------------------------------------------------------

    target = (
        database.query(
            func.coalesce(
                func.sum(
                    db.FinanceRevenuePlan.annual_target
                ),
                0
            )
        )
        .filter(
            db.FinanceRevenuePlan.year == year
        )
        .scalar()
    ) or 0

    target = float(target)

    target_percentage = (
        (total_revenue / target) * 100
        if target > 0
        else 0
    )

    # ---------------------------------------------------------
    # INVOICE COUNT
    # ---------------------------------------------------------

    total_invoices = (
        database.query(
            func.count(db.Invoice.id)
        )
        .filter(
            db.Invoice.invoice_date >= start_year,
            db.Invoice.invoice_date < next_year
        )
        .scalar()
    ) or 0

    # ---------------------------------------------------------
    # MONTHLY TREND - CURRENT YEAR
    # ---------------------------------------------------------

    current_rows = (
        database.query(
            func.extract(
                "month",
                db.FinanceTransaction.transaction_date
            ).label("month"),
            func.coalesce(
                func.sum(
                    db.FinanceTransaction.amount
                ),
                0
            ).label("amount")
        )
        .filter(
            db.FinanceTransaction.transaction_type.in_(
                income_types
            ),
            db.FinanceTransaction.transaction_date >= start_year,
            db.FinanceTransaction.transaction_date < next_year
        )
        .group_by("month")
        .order_by("month")
        .all()
    )

    previous_rows = (
        database.query(
            func.extract(
                "month",
                db.FinanceTransaction.transaction_date
            ).label("month"),
            func.coalesce(
                func.sum(
                    db.FinanceTransaction.amount
                ),
                0
            ).label("amount")
        )
        .filter(
            db.FinanceTransaction.transaction_type.in_(
                income_types
            ),
            db.FinanceTransaction.transaction_date >= previous_year_start,
            db.FinanceTransaction.transaction_date < previous_year_end
        )
        .group_by("month")
        .order_by("month")
        .all()
    )

    current_map = {
        int(row.month): float(row.amount or 0)
        for row in current_rows
    }

    previous_map = {
        int(row.month): float(row.amount or 0)
        for row in previous_rows
    }

    labels = [
        "Jan", "Feb", "Mar", "Apr",
        "May", "Jun", "Jul", "Aug",
        "Sep", "Oct", "Nov", "Dec"
    ]

    current_values = [
        round(current_map.get(i, 0), 2)
        for i in range(1, 13)
    ]

    previous_values = [
        round(previous_map.get(i, 0), 2)
        for i in range(1, 13)
    ]

    # ---------------------------------------------------------
    # REVENUE BY SOURCE
    # ---------------------------------------------------------

    source_rows = (
        database.query(
            db.FinanceTransaction.category,
            func.coalesce(
                func.sum(
                    db.FinanceTransaction.amount
                ),
                0
            ).label("amount")
        )
        .filter(
            db.FinanceTransaction.transaction_type.in_(
                income_types
            ),
            db.FinanceTransaction.transaction_date >= start_year,
            db.FinanceTransaction.transaction_date < next_year
        )
        .group_by(
            db.FinanceTransaction.category
        )
        .order_by(
            func.sum(
                db.FinanceTransaction.amount
            ).desc()
        )
        .all()
    )

    sources = []

    for category, amount in source_rows:

        value = float(amount or 0)

        percentage = (
            (value / total_revenue) * 100
            if total_revenue
            else 0
        )

        sources.append({
            "source": category or "Other Income",
            "amount": round(value, 2),
            "percentage": round(percentage, 2)
        })

    # ---------------------------------------------------------
    # DEPARTMENT REVENUE
    # ---------------------------------------------------------

    department_rows = (
        database.query(
            db.FinanceTransaction.department,
            func.coalesce(
                func.sum(
                    db.FinanceTransaction.amount
                ),
                0
            ).label("amount")
        )
        .filter(
            db.FinanceTransaction.transaction_type.in_(
                income_types
            ),
            db.FinanceTransaction.transaction_date >= start_year,
            db.FinanceTransaction.transaction_date < next_year
        )
        .group_by(
            db.FinanceTransaction.department
        )
        .order_by(
            func.sum(
                db.FinanceTransaction.amount
            ).desc()
        )
        .all()
    )

    departments = []

    for position, (department, amount) in enumerate(
        department_rows[:10],
        start=1
    ):

        value = float(amount or 0)

        percentage = (
            (value / total_revenue) * 100
            if total_revenue
            else 0
        )

        departments.append({
            "rank": position,
            "department": department or "Other",
            "amount": round(value, 2),
            "percentage": round(percentage, 2)
        })

    # ---------------------------------------------------------
    # REVENUE OVERVIEW
    # ---------------------------------------------------------

    plans = (
        database.query(
            db.FinanceRevenuePlan
        )
        .filter(
            db.FinanceRevenuePlan.year == year
        )
        .order_by(
            db.FinanceRevenuePlan.source.asc()
        )
        .all()
    )

    overview = []

    for plan in plans:

        actual = (
            database.query(
                func.coalesce(
                    func.sum(
                        db.FinanceTransaction.amount
                    ),
                    0
                )
            )
            .filter(
                db.FinanceTransaction.transaction_type.in_(
                    income_types
                ),
                db.FinanceTransaction.category
                == plan.source,
                db.FinanceTransaction.transaction_date >= start_year,
                db.FinanceTransaction.transaction_date < next_year
            )
            .scalar()
        ) or 0

        actual = float(actual)

        variance = actual - float(plan.budget or 0)

        variance_percentage = (
            (variance / float(plan.budget)) * 100
            if plan.budget
            else 0
        )

        overview.append({
            "source": plan.source,
            "budget": round(float(plan.budget or 0), 2),
            "actual": round(actual, 2),
            "variance": round(variance, 2),
            "variance_percentage": round(
                variance_percentage,
                2
            ),
            "status": (
                "Over Target"
                if actual >= float(plan.budget or 0)
                else "Under Target"
            )
        })

    # ---------------------------------------------------------
    # RECENT REVENUE TRANSACTIONS
    # ---------------------------------------------------------

    recent_rows = (
        database.query(
            db.FinanceTransaction
        )
        .filter(
            db.FinanceTransaction.transaction_type.in_(
                income_types
            )
        )
        .order_by(
            db.FinanceTransaction.transaction_date.desc()
        )
        .limit(5)
        .all()
    )

    recent_transactions = []

    for transaction in recent_rows:

        recent_transactions.append({
            "id": transaction.id,
            "title": transaction.category or "Revenue Transaction",
            "category": transaction.category or "Other Income",
            "department": transaction.department or "",
            "amount": round(
                float(transaction.amount or 0),
                2
            ),
            "status": transaction.status or "Paid",
            "date": (
                transaction.transaction_date.isoformat()
                if transaction.transaction_date
                else None
            )
        })

    # ---------------------------------------------------------
    # INSIGHTS
    # ---------------------------------------------------------

    insights = []

    if sources:

        top_source = sources[0]

        insights.append({
            "type": "source",
            "text": (
                f"{top_source['source']} contributes "
                f"{top_source['percentage']}% of total revenue."
            )
        })

    if departments:

        top_department = departments[0]

        insights.append({
            "type": "department",
            "text": (
                f"{top_department['department']} is the "
                f"top revenue-generating department."
            )
        })

    insights.append({
        "type": "target",
        "text": (
            f"You are {round(target_percentage, 1)}% "
            f"towards the annual revenue target."
        )
    })

    if month_growth >= 0:

        insights.append({
            "type": "growth",
            "text": (
                f"Revenue increased {round(month_growth, 1)}% "
                f"compared with the previous month."
            )
        })

    else:

        insights.append({
            "type": "growth",
            "text": (
                f"Revenue decreased "
                f"{round(abs(month_growth), 1)}% "
                f"compared with the previous month."
            )
        })

    return {
        "year": year,
        "month": month,

        "kpis": {
            "total_revenue": round(total_revenue, 2),
            "this_month_revenue": round(
                this_month_revenue,
                2
            ),
            "average_monthly_revenue": round(
                six_month_average,
                2
            ),
            "total_invoices": int(total_invoices),
            "revenue_target": round(
                target_percentage,
                2
            ),
            "annual_target": round(
                target,
                2
            ),
            "month_growth": round(
                month_growth,
                2
            )
        },

        "trend": {
            "labels": labels,
            "this_year": current_values,
            "last_year": previous_values
        },

        "sources": sources,

        "departments": departments,

        "overview": overview,

        "recent_transactions": recent_transactions,

        "insights": insights
    }


# ============================================================
# ACCOUNTS PAYABLE DASHBOARD
# ============================================================

def get_accounts_payable_dashboard(
    database: Session,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    page: int = 1,
    page_size: int = 5,
    search: Optional[str] = None
):
    """
    Build Accounts Payable dashboard data.

    Uses:
        finance_payables
        finance_payments

    The dashboard is calculated from PostgreSQL data.
    """

    today = date.today()

    # --------------------------------------------------------
    # BASE PAYABLE QUERY
    # --------------------------------------------------------

    payable_query = database.query(
        db.FinancePayable
    )

    # --------------------------------------------------------
    # SEARCH
    # --------------------------------------------------------

    if search:
        value = f"%{search.strip()}%"

        payable_query = payable_query.filter(
            or_(
                db.FinancePayable.invoice_no.ilike(value),
                db.FinancePayable.vendor.ilike(value)
            )
        )

    # --------------------------------------------------------
    # DATE FILTER
    # --------------------------------------------------------

    if from_date:
        if hasattr(db.FinancePayable, "bill_date"):
            payable_query = payable_query.filter(
                db.FinancePayable.bill_date >= from_date
            )
        else:
            payable_query = payable_query.filter(
                db.FinancePayable.due_date >= from_date
            )

    if to_date:
        if hasattr(db.FinancePayable, "bill_date"):
            payable_query = payable_query.filter(
                db.FinancePayable.bill_date <= to_date
            )
        else:
            payable_query = payable_query.filter(
                db.FinancePayable.due_date <= to_date
            )

    payables = payable_query.all()

    # --------------------------------------------------------
    # OUTSTANDING PAYABLES
    # --------------------------------------------------------

    outstanding_statuses = {
        "pending",
        "open",
        "due soon",
        "overdue",
        "approved",
        "partially paid"
    }

    outstanding = []

    for bill in payables:

        status_value = (
            str(bill.payment_status or "Pending")
            .strip()
            .lower()
        )

        if status_value not in {
            "paid",
            "cancelled",
            "canceled"
        }:
            outstanding.append(bill)

    # --------------------------------------------------------
    # KPI 1 - TOTAL PAYABLE
    # --------------------------------------------------------

    total_payable = sum(
        float(b.amount or 0)
        for b in outstanding
    )

    # --------------------------------------------------------
    # KPI 2 - OVERDUE
    # --------------------------------------------------------

    overdue_bills = []

    for bill in outstanding:

        if bill.due_date and bill.due_date < today:
            overdue_bills.append(bill)

    overdue_amount = sum(
        float(b.amount or 0)
        for b in overdue_bills
    )

    overdue_count = len(overdue_bills)

    # --------------------------------------------------------
    # KPI 3 - DUE WITHIN 7 DAYS
    # --------------------------------------------------------

    seven_days = today + timedelta(days=7)

    due_soon = [
        bill
        for bill in outstanding
        if (
            bill.due_date
            and today <= bill.due_date <= seven_days
        )
    ]

    due_within_7_days = sum(
        float(b.amount or 0)
        for b in due_soon
    )

    # --------------------------------------------------------
    # KPI 4 - PAID THIS MONTH
    # --------------------------------------------------------

    month_start = today.replace(day=1)

    paid_query = database.query(
        db.FinancePayment
    ).filter(
        db.FinancePayment.payment_date >= month_start,
        db.FinancePayment.payment_date <= today
    )

    paid_rows = paid_query.all()

    paid_this_month = sum(
        float(p.amount or 0)
        for p in paid_rows
        if str(p.status or "Paid").lower()
        not in {"failed", "cancelled", "canceled"}
    )

    # --------------------------------------------------------
    # KPI 5 - PENDING BILLS
    # --------------------------------------------------------

    pending_bills = len(outstanding)

    # --------------------------------------------------------
    # AGEING
    # --------------------------------------------------------

    ageing = {
        "0 - 30 Days": 0.0,
        "31 - 60 Days": 0.0,
        "61 - 90 Days": 0.0,
        "91+ Days": 0.0
    }

    for bill in outstanding:

        # Prefer bill_date when available.
        bill_date = getattr(
            bill,
            "bill_date",
            None
        )

        # Existing database fallback.
        if bill_date is None:
            bill_date = bill.due_date

        if bill_date is None:
            continue

        age = max(
            0,
            (today - bill_date).days
        )

        amount = float(
            bill.amount or 0
        )

        if age <= 30:
            ageing["0 - 30 Days"] += amount

        elif age <= 60:
            ageing["31 - 60 Days"] += amount

        elif age <= 90:
            ageing["61 - 90 Days"] += amount

        else:
            ageing["91+ Days"] += amount

    aging_response = []

    for label, amount in ageing.items():

        percentage = (
            amount / total_payable * 100
            if total_payable > 0
            else 0
        )

        aging_response.append({
            "label": label,
            "amount": round(amount, 2),
            "percentage": round(percentage, 2)
        })

    # --------------------------------------------------------
    # TOP VENDORS
    # --------------------------------------------------------

    vendor_totals = defaultdict(float)

    for bill in outstanding:

        vendor = (
            bill.vendor
            or "Unknown Vendor"
        )

        vendor_totals[vendor] += float(
            bill.amount or 0
        )

    sorted_vendors = sorted(
        vendor_totals.items(),
        key=lambda item: item[1],
        reverse=True
    )[:5]

    top_vendors = []

    for index, (vendor, amount) in enumerate(
        sorted_vendors,
        start=1
    ):

        percentage = (
            amount / total_payable * 100
            if total_payable > 0
            else 0
        )

        top_vendors.append({
            "rank": index,
            "vendor": vendor,
            "amount": round(amount, 2),
            "percentage": round(percentage, 2)
        })

    # --------------------------------------------------------
    # TREND
    # --------------------------------------------------------

    trend_totals = defaultdict(float)
    trend_paid = defaultdict(float)

    for bill in payables:

        bill_date = getattr(
            bill,
            "bill_date",
            None
        )

        if bill_date is None:
            bill_date = bill.due_date

        if bill_date is None:
            continue

        key = bill_date.strftime("%b")

        status_value = (
            str(bill.payment_status or "")
            .lower()
        )

        if status_value not in {
            "paid",
            "cancelled",
            "canceled"
        }:
            trend_totals[key] += float(
                bill.amount or 0
            )

    for payment in paid_rows:

        if not payment.payment_date:
            continue

        key = payment.payment_date.strftime("%b")

        trend_paid[key] += float(
            payment.amount or 0
        )

    # Last 12 calendar months
    months = []

    for i in range(11, -1, -1):

        month_date = (
            today.replace(day=1)
            - timedelta(days=i * 30)
        )

        months.append(
            month_date.strftime("%b")
        )

    # Remove duplicates while preserving order
    months = list(
        dict.fromkeys(months)
    )

    trend = {
        "months": months,
        "total_payable": [
            round(
                trend_totals.get(month, 0),
                2
            )
            for month in months
        ],
        "paid_amount": [
            round(
                trend_paid.get(month, 0),
                2
            )
            for month in months
        ]
    }

    # --------------------------------------------------------
    # RECENT BILLS
    # --------------------------------------------------------

    total_records = payable_query.count()

    offset = (
        (page - 1) * page_size
    )

    recent_rows = (
        payable_query
        .order_by(
            db.FinancePayable.due_date.desc(),
            db.FinancePayable.id.desc()
        )
        .offset(offset)
        .limit(page_size)
        .all()
    )

    recent_bills = []

    for bill in recent_rows:

        status_value = (
            str(
                bill.payment_status
                or "Pending"
            ).strip()
        )

        if bill.due_date and bill.due_date < today:
            if status_value.lower() not in {
                "paid",
                "cancelled",
                "canceled"
            }:
                status_value = "Overdue"

        recent_bills.append({
            "id": bill.id,
            "invoice_no": bill.invoice_no,
            "vendor": bill.vendor,
            "bill_date": (
                bill.bill_date.isoformat()
                if getattr(
                    bill,
                    "bill_date",
                    None
                )
                else None
            ),
            "due_date": (
                bill.due_date.isoformat()
                if bill.due_date
                else None
            ),
            "amount": float(
                bill.amount or 0
            ),
            "status": status_value
        })

    # --------------------------------------------------------
    # PAYMENT SUMMARY
    # --------------------------------------------------------

    successful_payments = [
        p
        for p in paid_rows
        if str(
            p.status or "Paid"
        ).lower()
        not in {
            "failed",
            "cancelled",
            "canceled"
        }
    ]

    total_bills_paid = len(
        successful_payments
    )

    payment_days = []

    for payment in successful_payments:

        payable = (
            database.query(
                db.FinancePayable
            )
            .filter(
                db.FinancePayable.invoice_no
                == payment.invoice_no
            )
            .first()
        )

        if not payable:
            continue

        bill_date = getattr(
            payable,
            "bill_date",
            None
        )

        if bill_date and payment.payment_date:
            days = (
                payment.payment_date
                - bill_date
            ).days

            payment_days.append(
                max(0, days)
            )

    average_payment_days = (
        sum(payment_days) /
        len(payment_days)
        if payment_days
        else 0
    )

    # Your current model has no dedicated
    # early-payment or discount fields.
    early_payments = 0.0
    discounts_taken = 0.0

    # --------------------------------------------------------
    # PAGINATION
    # --------------------------------------------------------

    pages = (
        (total_records + page_size - 1)
        // page_size
        if total_records
        else 1
    )

    return {
        "kpis": {
            "total_payable": round(
                total_payable,
                2
            ),
            "overdue_amount": round(
                overdue_amount,
                2
            ),
            "due_within_7_days": round(
                due_within_7_days,
                2
            ),
            "paid_this_month": round(
                paid_this_month,
                2
            ),
            "pending_bills": pending_bills
        },

        "aging": aging_response,

        "top_vendors": top_vendors,

        "trend": trend,

        "recent_bills": recent_bills,

        "payment_summary": {
            "total_payments_made": round(
                paid_this_month,
                2
            ),
            "total_bills_paid":
                total_bills_paid,
            "average_payment_days":
                round(
                    average_payment_days,
                    2
                ),
            "early_payments":
                early_payments,
            "discounts_taken":
                discounts_taken
        },

        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total_records,
            "pages": pages
        },

        "overdue_count": overdue_count,
        "overdue_amount": round(
            overdue_amount,
            2
        )
    }


# ============================================================
# ACCOUNTS RECEIVABLE HELPERS
# ============================================================

from datetime import date, timedelta
from sqlalchemy.orm import joinedload


def ar_payment_total(invoice):
    """
    Return completed/paid payments for an invoice.
    """

    total = 0.0

    for payment in getattr(invoice, "payments", []):

        status = (
            str(payment.status or "")
            .strip()
            .lower()
        )

        if status in {"completed", "paid"}:
            total += float(payment.amount or 0)

    return total


def ar_balance_due(invoice):
    """
    Remaining amount for an invoice.
    """

    amount = float(invoice.amount or 0)

    paid = ar_payment_total(invoice)

    return max(
        amount - paid,
        0
    )


def ar_days_outstanding(invoice, today=None):

    today = today or date.today()

    if not invoice.due_date:
        return 0

    balance = ar_balance_due(invoice)

    if balance <= 0:
        return 0

    return max(
        (today - invoice.due_date).days,
        0
    )


def ar_invoice_status(invoice, today=None):

    today = today or date.today()

    balance = ar_balance_due(invoice)

    if balance <= 0:
        return "Paid"

    if invoice.due_date and invoice.due_date < today:
        return "Overdue"

    if invoice.due_date:
        days = (
            invoice.due_date - today
        ).days

        if days <= 30:
            return "Due Soon"

    return "Open"


def get_accounts_receivable_dashboard( database, year=None, from_date=None, to_date=None ):

    today = date.today()

    selected_year = (
        year
        if year
        else today.year
    )

    # --------------------------------------------------------
    # LOAD INVOICES
    # --------------------------------------------------------

    invoices = (
        database.query(db.Invoice)
        .options(
            joinedload(db.Invoice.customer),
            joinedload(db.Invoice.payments)
        )
        .order_by(
            db.Invoice.invoice_date.desc(),
            db.Invoice.id.desc()
        )
        .all()
    )

    # --------------------------------------------------------
    # DATE RANGE
    # --------------------------------------------------------

    if from_date:
        invoices = [
            invoice
            for invoice in invoices
            if invoice.invoice_date
            and invoice.invoice_date >= from_date
        ]

    if to_date:
        invoices = [
            invoice
            for invoice in invoices
            if invoice.invoice_date and invoice.invoice_date <= to_date
        ]

    # --------------------------------------------------------
    # ALL OUTSTANDING
    # --------------------------------------------------------

    total_receivables = 0.0
    overdue_amount = 0.0
    due_within_30 = 0.0
    outstanding_count = 0
    overdue_count = 0
    collected_this_month = 0.0

    month_start = date( today.year, today.month, 1 )

    # --------------------------------------------------------
    # AGING
    # --------------------------------------------------------

    aging = { "0_30": 0.0, "31_60": 0.0, "61_90": 0.0, "91_120": 0.0, "120_plus": 0.0 }

    # --------------------------------------------------------
    # CUSTOMER TOTALS
    # --------------------------------------------------------

    customer_totals = {}

    # --------------------------------------------------------
    # MONTHLY TREND
    # --------------------------------------------------------

    monthly = {}

    for month in range(1, 13):
        monthly[month] = { "receivables": 0.0, "collected": 0.0 }

    # --------------------------------------------------------
    # PROCESS INVOICES
    # --------------------------------------------------------

    for invoice in invoices:

        amount = float( invoice.amount or 0 )

        paid = ar_payment_total( invoice )

        balance = max( amount - paid, 0 )

        status = ar_invoice_status( invoice, today )

        # Outstanding

        if balance > 0:

            outstanding_count += 1

            total_receivables += balance

            if invoice.due_date:

                days = ( today - invoice.due_date ).days

                if days > 0:

                    overdue_count += 1
                    overdue_amount += balance

                    if days <= 30:
                        aging["0_30"] += balance

                    elif days <= 60:
                        aging["31_60"] += balance

                    elif days <= 90:
                        aging["61_90"] += balance

                    elif days <= 120:
                        aging["91_120"] += balance

                    else:
                        aging["120_plus"] += balance

                else:
                    days_to_due = ( invoice.due_date - today ).days

                    if days_to_due <= 30:
                        due_within_30 += balance

        # ----------------------------------------------------
        # CUSTOMER
        # ----------------------------------------------------

        customer_name = "Unknown Customer"
        customer_id = None

        if invoice.customer:
            customer_name = ( invoice.customer.customer_name or "Unknown Customer" )
            customer_id = ( invoice.customer.id )

        if balance > 0:
            if customer_id not in customer_totals:
                customer_totals[customer_id] = { "customer_id": customer_id, "customer_name": customer_name, "amount": 0.0 }
            customer_totals[ customer_id ]["amount"] += balance

        # ----------------------------------------------------
        # MONTHLY
        # ----------------------------------------------------

        if invoice.invoice_date:
            invoice_year = ( invoice.invoice_date.year )
            invoice_month = ( invoice.invoice_date.month )
            if invoice_year == selected_year:
                monthly[ invoice_month ]["receivables"] += amount

        # ----------------------------------------------------
        # PAYMENTS
        # ----------------------------------------------------

        for payment in getattr( invoice, "payments", [] ):
            payment_status = ( str(payment.status or "") .strip() .lower() )

            if payment_status not in { "completed", "paid" }:
                continue

            payment_amount = float( payment.amount or 0 )

            if payment.payment_date:
                if ( payment.payment_date.year == selected_year ):
                    monthly[ payment.payment_date.month ]["collected"] += ( payment_amount )

                if ( payment.payment_date >= month_start and payment.payment_date <= today ):
                    collected_this_month += ( payment_amount )

    # --------------------------------------------------------
    # TOP CUSTOMERS
    # --------------------------------------------------------

    top_customers = sorted( customer_totals.values(), key=lambda x: x["amount"], reverse=True )[:5]

    # --------------------------------------------------------
    # TREND
    # --------------------------------------------------------

    trend = []

    for month in range(1, 13):
        trend.append({
            "month": date( selected_year, month, 1 ).strftime("%b"),
            "receivables": round( monthly[month]["receivables"], 2 ),
            "collected": round( monthly[month]["collected"], 2 )
        })

    # --------------------------------------------------------
    # AGING TOTAL
    # --------------------------------------------------------

    aging_total = sum( aging.values() )

    # --------------------------------------------------------
    # RECENT INVOICES
    # --------------------------------------------------------

    recent = []

    for invoice in invoices[:5]:

        balance = ar_balance_due( invoice )

        recent.append({
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "customer_id": getattr( invoice, "customer_id", None ),
            "customer_name": ( invoice.customer.customer_name if invoice.customer else "Unknown Customer" ),
            "invoice_date": ( invoice.invoice_date.isoformat() if invoice.invoice_date else None ),
            "due_date": ( invoice.due_date.isoformat() if invoice.due_date else None ),
            "amount": round( float(invoice.amount or 0), 2 ),
            "balance_due": round( balance, 2 ),
            "status": ar_invoice_status( invoice, today ),
            "days_outstanding": ar_days_outstanding( invoice, today )
        })

    # --------------------------------------------------------
    # COLLECTION RATE
    # --------------------------------------------------------

    total_billed = sum( float(i.amount or 0) for i in invoices )
    total_collected = sum( ar_payment_total(i) for i in invoices )
    collection_rate = ( ( total_collected / total_billed ) * 100 if total_billed else 0 )

    # --------------------------------------------------------
    # RETURN
    # --------------------------------------------------------

    return {
        "year": selected_year,
        "total_receivables": round( total_receivables, 2 ),
        "overdue_amount": round( overdue_amount, 2 ),
        "due_within_30": round( due_within_30, 2 ),
        "collected_this_month": round( collected_this_month, 2 ),
        "outstanding_invoices": outstanding_count,
        "overdue_invoices": overdue_count,
        "total_invoices": len(invoices),
        "total_billed": round( total_billed, 2 ),
        "total_collected": round( total_collected, 2 ),
        "collection_rate": round( collection_rate, 2 ),
        "aging":
            {
                "0_30": round( aging["0_30"], 2 ),
                "31_60": round( aging["31_60"], 2 ),
                "61_90": round( aging["61_90"], 2 ),
                "91_120": round( aging["91_120"], 2 ),
                "120_plus": round( aging["120_plus"], 2 ),
                "total": round( aging_total, 2 )
            },
        "trend": trend,
        "top_customers": top_customers,
        "recent_invoices": recent
    }


# ============================================================
# HELPERS
# ============================================================

def decimal_value(value):
    return float(value or 0)


def get_customer_name(customer):
    if not customer:
        return "Unknown Customer"

    return (
        getattr(customer, "name", None)
        or getattr(customer, "customer_name", None)
        or getattr(customer, "company_name", None)
        or getattr(customer, "legal_entity_name", None)
        or f"Customer {getattr(customer, 'id', '')}"
    )


def invoice_total(invoice):
    return decimal_value(
        getattr(invoice, "total_amount", None)
        or getattr(invoice, "grand_total", None)
        or getattr(invoice, "amount", None)
        or 0
    )


def invoice_paid(invoice, database: Session):
    invoice_id = getattr(invoice, "id", None)

    if invoice_id is None:
        return 0

    try:
        result = (
            database.query(
                func.coalesce(func.sum(db.Payment.amount), 0)
            )
            .filter(
                db.Payment.invoice_id == invoice_id
            )
            .scalar()
        )

        return decimal_value(result)

    except Exception:
        return decimal_value(
            getattr(invoice, "paid_amount", None)
            or getattr(invoice, "amount_paid", None)
            or 0
        )


def invoice_outstanding(invoice, database: Session):

    total = invoice_total(invoice)
    paid = invoice_paid(invoice, database)

    return max(total - paid, 0)


def get_invoice_date(invoice):
    value = (
        getattr(invoice, "invoice_date", None)
        or getattr(invoice, "date", None)
        or getattr(invoice, "created_at", None)
    )

    if isinstance(value, datetime):
        return value.date()

    return value


def get_due_date(invoice):
    value = (
        getattr(invoice, "due_date", None)
        or getattr(invoice, "payment_due_date", None)
    )

    if isinstance(value, datetime):
        return value.date()

    return value


def serialize_date(value):
    if not value:
        return None

    if isinstance(value, datetime):
        return value.date().isoformat()

    if isinstance(value, date):
        return value.isoformat()

    return str(value)


# ============================================================
# BANKING & RECONCILIATION DASHBOARD
# ============================================================

def get_banking_reconciliation_dashboard(
    database,
    current_user,
    from_date=None,
    to_date=None
):

    today = date.today()

    if from_date is None:
        from_date = today.replace(day=1)

    if to_date is None:
        to_date = today

    # --------------------------------------------------------
    # BANK ACCOUNTS
    # --------------------------------------------------------

    accounts = (
        database.query(db.BankAccount)
        .filter(
            db.BankAccount.status == "Active"
        )
        .order_by(
            db.BankAccount.bank_name.asc()
        )
        .all()
    )

    total_balance = sum(
        float(account.balance or 0)
        for account in accounts
    )

    reconciled_balance = sum(
        float(account.reconciled_balance or 0)
        for account in accounts
    )

    unreconciled_balance = (
        total_balance - reconciled_balance
    )

    reconciliation_rate = (
        (
            reconciled_balance
            / total_balance
        ) * 100
        if total_balance
        else 0
    )

    # --------------------------------------------------------
    # BANK TRANSACTIONS
    # --------------------------------------------------------

    transactions = (
        database.query(
            db.BankTransaction
        )
        .filter(
            db.BankTransaction.transaction_date >= from_date,
            db.BankTransaction.transaction_date <= to_date
        )
        .all()
    )

    money_in = sum(
        float(t.amount or 0)
        for t in transactions
        if str(
            t.transaction_type
        ).lower() == "credit"
    )

    money_out = sum(
        float(t.amount or 0)
        for t in transactions
        if str(
            t.transaction_type
        ).lower() == "debit"
    )

    net_flow = money_in - money_out

    # --------------------------------------------------------
    # DAILY CASH FLOW
    # --------------------------------------------------------

    cash_flow_map = {}

    cursor = from_date

    while cursor <= to_date:

        cash_flow_map[cursor] = {
            "money_in": 0,
            "money_out": 0
        }

        cursor += timedelta(days=1)

    for transaction in transactions:

        transaction_day = (
            transaction.transaction_date
        )

        if transaction_day not in cash_flow_map:
            continue

        amount = float(
            transaction.amount or 0
        )

        if str(
            transaction.transaction_type
        ).lower() == "credit":

            cash_flow_map[
                transaction_day
            ]["money_in"] += amount

        else:

            cash_flow_map[
                transaction_day
            ]["money_out"] += amount

    flow_labels = []
    flow_in = []
    flow_out = []
    flow_net = []

    for day, values in cash_flow_map.items():

        flow_labels.append(
            day.strftime("%b %-d")
            if os.name != "nt"
            else day.strftime("%b %#d")
        )

        flow_in.append(
            round(
                values["money_in"],
                2
            )
        )

        flow_out.append(
            round(
                values["money_out"],
                2
            )
        )

        flow_net.append(
            round(
                values["money_in"]
                - values["money_out"],
                2
            )
        )

    # --------------------------------------------------------
    # STATEMENT STATUS
    # --------------------------------------------------------

    statements = (
        database.query(
            db.BankStatement
        )
        .all()
    )

    reconciled_count = sum(
        1
        for statement in statements
        if str(
            statement.status or ""
        ).lower() == "reconciled"
    )

    in_progress_count = sum(
        1
        for statement in statements
        if str(
            statement.status or ""
        ).lower()
        in {
            "in progress",
            "processing"
        }
    )

    pending_count = sum(
        1
        for statement in statements
        if str(
            statement.status or ""
        ).lower() == "pending"
    )

    failed_count = sum(
        1
        for statement in statements
        if str(
            statement.status or ""
        ).lower() == "failed"
    )

    # --------------------------------------------------------
    # RECENT RECONCILIATIONS
    # --------------------------------------------------------

    recent_statements = (
        database.query(
            db.BankStatement
        )
        .order_by(
            db.BankStatement.statement_date.desc()
        )
        .limit(5)
        .all()
    )

    recent_reconciliations = []

    for statement in recent_statements:

        account = (
            database.query(
                db.BankAccount
            )
            .filter(
                db.BankAccount.id
                == statement.bank_account_id
            )
            .first()
        )

        recent_reconciliations.append({

            "id": statement.id,

            "account": (
                account.account_name
                if account
                else "Unknown Account"
            ),

            "statement_date": (
                statement.statement_date.isoformat()
                if statement.statement_date
                else None
            ),

            "reconciled_on": (
                statement.reconciled_on.isoformat()
                if statement.reconciled_on
                else None
            ),

            "status":
                statement.status,

            "difference": round(
                float(
                    statement.difference or 0
                ),
                2
            )
        })

    # --------------------------------------------------------
    # RECONCILIATION OVERVIEW
    # --------------------------------------------------------

    total_statements = len(
        statements
    )

    # --------------------------------------------------------
    # RETURN
    # --------------------------------------------------------

    return {

        "kpis": {

            "total_bank_balance":
                round(
                    total_balance,
                    2
                ),

            "reconciled_balance":
                round(
                    reconciled_balance,
                    2
                ),

            "unreconciled_balance":
                round(
                    unreconciled_balance,
                    2
                ),

            "transactions_this_month":
                len(transactions),

            "reconciliation_rate":
                round(
                    reconciliation_rate,
                    2
                ),

            "account_count":
                len(accounts)
        },

        "cash_flow": {

            "labels":
                flow_labels,

            "money_in":
                flow_in,

            "money_out":
                flow_out,

            "net_flow":
                flow_net
        },

        "reconciliation_status": {

            "labels": [
                "Reconciled",
                "Unreconciled"
            ],

            "values": [
                round(
                    reconciled_balance,
                    2
                ),

                round(
                    unreconciled_balance,
                    2
                )
            ]
        },

        "reconciliation_overview": {

            "total_statements":
                total_statements,

            "reconciled":
                reconciled_count,

            "in_progress":
                in_progress_count,

            "pending":
                pending_count,

            "failed":
                failed_count
        },

        "bank_accounts": [

            {

                "id":
                    account.id,

                "account_name":
                    account.account_name,

                "account_number":
                    account.account_number,

                "bank_name":
                    account.bank_name,

                "account_type":
                    account.account_type,

                "balance":
                    round(
                        float(
                            account.balance or 0
                        ),
                        2
                    ),

                "reconciled_balance":
                    round(
                        float(
                            account.reconciled_balance
                            or 0
                        ),
                        2
                    ),

                "status":
                    account.status
            }

            for account in accounts
        ],

        "recent_reconciliations":
            recent_reconciliations,

        "reconciliation_summary": {

            "ending_balance":
                round(
                    total_balance,
                    2
                ),

            "ending_balance_books":
                round(
                    reconciled_balance,
                    2
                ),

            "difference":
                round(
                    unreconciled_balance,
                    2
                )
        }
    }


def get_financial_reports_page(
    database: Session,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 5,
):
    today = date.today()

    if from_date is None:
        from_date = date(today.year, 1, 1)

    if to_date is None:
        to_date = today

    start_dt = datetime.combine(
        from_date,
        datetime.min.time()
    )

    end_dt = datetime.combine(
        to_date + timedelta(days=1),
        datetime.min.time()
    )

    query = database.query(db.Report).filter(
        db.Report.generated_at >= start_dt,
        db.Report.generated_at < end_dt
    )

    if search:
        value = f"%{search.strip()}%"

        query = query.filter(
            or_(
                db.Report.report_name.ilike(value),
                db.Report.category.ilike(value),
                db.Report.report_type.ilike(value),
                db.Report.generated_by.ilike(value)
            )
        )

    total = query.count()

    reports_viewed = int(
        database.query(
            func.coalesce(
                func.sum(db.Report.view_count),
                0
            )
        )
        .filter(
            db.Report.generated_at >= start_dt,
            db.Report.generated_at < end_dt
        )
        .scalar()
        or 0
    )

    reports_downloaded = int(
        database.query(
            func.coalesce(
                func.sum(db.Report.download_count),
                0
            )
        )
        .filter(
            db.Report.generated_at >= start_dt,
            db.Report.generated_at < end_dt
        )
        .scalar()
        or 0
    )

    scheduled_count = (
        database.query(db.ScheduledReport)
        .filter(
            db.ScheduledReport.is_active == True
        )
        .count()
    )

    accuracy = (
        database.query(
            func.coalesce(
                func.avg(db.Report.accuracy_score),
                100
            )
        )
        .filter(
            db.Report.generated_at >= start_dt,
            db.Report.generated_at < end_dt
        )
        .scalar()
        or 100
    )

    failed_count = (
        query.filter(
            func.lower(db.Report.status).in_(
                ["failed", "error"]
            )
        ).count()
    )

    source_count = (
        database.query(
            db.FinancialDataSource
        )
        .filter(
            func.lower(
                db.FinancialDataSource.status
            ) == "connected"
        )
        .count()
    )

    # ----------------------------------------
    # MONTHLY TREND
    # ----------------------------------------

    trend_labels = []
    trend_generated = []
    trend_downloaded = []

    year = to_date.year

    for month in range(1, 13):

        month_start = date(
            year,
            month,
            1
        )

        if month == 12:
            month_end = date(
                year + 1,
                1,
                1
            )
        else:
            month_end = date(
                year,
                month + 1,
                1
            )

        ms = datetime.combine(
            month_start,
            datetime.min.time()
        )

        me = datetime.combine(
            month_end,
            datetime.min.time()
        )

        generated = (
            database.query(
                func.count(db.Report.id)
            )
            .filter(
                db.Report.generated_at >= ms,
                db.Report.generated_at < me
            )
            .scalar()
            or 0
        )

        downloaded = (
            database.query(
                func.coalesce(
                    func.sum(
                        db.Report.download_count
                    ),
                    0
                )
            )
            .filter(
                db.Report.generated_at >= ms,
                db.Report.generated_at < me
            )
            .scalar()
            or 0
        )

        trend_labels.append(
            month_start.strftime("%b")
        )

        trend_generated.append(
            int(generated)
        )

        trend_downloaded.append(
            int(downloaded)
        )

    # ----------------------------------------
    # CATEGORY DISTRIBUTION
    # ----------------------------------------

    category_rows = (
        query.with_entities(
            db.Report.category,
            func.count(
                db.Report.id
            ).label("count")
        )
        .group_by(
            db.Report.category
        )
        .order_by(
            func.count(
                db.Report.id
            ).desc()
        )
        .all()
    )

    category_total = sum(
        int(row.count or 0)
        for row in category_rows
    )

    categories = []

    for row in category_rows:

        count = int(
            row.count or 0
        )

        categories.append({
            "category":
                row.category
                or "Other Reports",

            "count":
                count,

            "percent":
                round(
                    (
                        count /
                        category_total *
                        100
                    )
                    if category_total
                    else 0,
                    1
                )
        })

    # ----------------------------------------
    # PAGINATION
    # ----------------------------------------

    pages = max(
        1,
        (total + limit - 1) // limit
    )

    reports = (
        query
        .order_by(
            db.Report.generated_at.desc()
        )
        .offset(
            (page - 1) * limit
        )
        .limit(limit)
        .all()
    )

    recent_reports = []

    for report in reports:

        recent_reports.append({

            "id":
                report.id,

            "report_name":
                report.report_name,

            "category":
                report.category,

            "generated_by":
                report.generated_by
                or "System",

            "generated_at":
                (
                    report.generated_at.isoformat()
                    if report.generated_at
                    else None
                ),

            "format":
                report.format,

            "status":
                getattr(
                    report,
                    "status",
                    None
                )
                or "Completed",

            "file_size":
                report.file_size,

            "view_count":
                getattr(
                    report,
                    "view_count",
                    0
                )
                or 0,

            "download_count":
                report.download_count
                or 0
        })

    # ----------------------------------------
    # DATA SOURCES
    # ----------------------------------------

    sources = []

    source_rows = (
        database.query(
            db.FinancialDataSource
        )
        .filter(
            func.lower(
                db.FinancialDataSource.status
            ) == "connected"
        )
        .order_by(
            db.FinancialDataSource.name.asc()
        )
        .all()
    )

    for source in source_rows:

        sources.append({

            "id":
                source.id,

            "name":
                source.name,

            "source_type":
                source.source_type,

            "status":
                source.status,

            "records_count":
                source.records_count,

            "accuracy_score":
                source.accuracy_score,

            "last_sync_at":
                (
                    source.last_sync_at.isoformat()
                    if source.last_sync_at
                    else None
                )
        })

    return {

        "success": True,

        "kpis": {

            "total_reports":
                total,

            "reports_viewed":
                reports_viewed,

            "reports_downloaded":
                reports_downloaded,

            "scheduled_reports":
                scheduled_count,

            "report_accuracy":
                round(
                    float(accuracy),
                    1
                ),

            "data_sources":
                source_count,

            "failed_reports":
                failed_count
        },

        "trend": {

            "labels":
                trend_labels,

            "generated":
                trend_generated,

            "downloaded":
                trend_downloaded
        },

        "categories":
            categories,

        "recent_reports":
            recent_reports,

        "pagination": {

            "page":
                page,

            "limit":
                limit,

            "total":
                total,

            "pages":
                pages
        },

        "data_sources":
            sources
    }


def mark_report_viewed(
    database: Session,
    report_id: int
):

    report = (
        database.query(db.Report)
        .filter(
            db.Report.id == report_id
        )
        .first()
    )

    if report is None:
        raise HTTPException(
            status_code=404,
            detail="Report not found"
        )

    report.view_count = (
        getattr(
            report,
            "view_count",
            0
        ) or 0
    ) + 1

    database.commit()
    database.refresh(report)

    return report


# ============================================================
# COMPLIANCE PAGE CRUD
# ============================================================

def get_compliance_areas(
    database: Session
):
    return (
        database.query(db.ComplianceArea)
        .filter(
            db.ComplianceArea.is_active == True
        )
        .order_by(
            db.ComplianceArea.category.asc(),
            db.ComplianceArea.name.asc()
        )
        .all()
    )


def get_compliance_activities(
    database: Session,
    limit: int = 5
):
    return (
        database.query(db.ComplianceActivity)
        .order_by(
            db.ComplianceActivity.activity_date.desc(),
            db.ComplianceActivity.id.desc()
        )
        .limit(limit)
        .all()
    )


def get_compliance_deadlines(
    database: Session,
    limit: int = 5
):
    today = date.today()

    return (
        database.query(db.ComplianceDeadline)
        .filter(
            db.ComplianceDeadline.due_date >= today
        )
        .order_by(
            db.ComplianceDeadline.due_date.asc()
        )
        .limit(limit)
        .all()
    )


def get_compliance_alerts(
    database: Session,
    limit: int = 5
):
    return (
        database.query(db.ComplianceAlert)
        .filter(
            db.ComplianceAlert.is_resolved == False
        )
        .order_by(
            db.ComplianceAlert.created_at.desc()
        )
        .limit(limit)
        .all()
    )


# ============================================================
# COMPLIANCE KPI
# ============================================================

def get_compliance_page_kpis(
    database: Session
):

    areas = (
        database.query(db.ComplianceArea)
        .filter(
            db.ComplianceArea.is_active == True
        )
        .all()
    )

    total_areas = len(areas)

    if total_areas:

        overall_score = (
            sum(
                float(area.score or 0)
                for area in areas
            )
            / total_areas
        )

    else:

        # Fallback to existing contract-based score
        overall_score = compliance_score(database)

    compliant = sum(
        1
        for area in areas
        if str(area.status).lower() == "compliant"
    )

    at_risk = sum(
        1
        for area in areas
        if str(area.status).lower() in {
            "at risk",
            "at-risk",
            "risk"
        }
    )

    non_compliant = sum(
        1
        for area in areas
        if str(area.status).lower() in {
            "non-compliant",
            "non compliant",
            "noncompliant"
        }
    )

    pending_tasks = (
        database.query(
            db.ComplianceActivity
        )
        .filter(
            db.ComplianceActivity.status.in_([
                "Pending",
                "In Progress",
                "Overdue"
            ])
        )
        .count()
    )

    return {
        "overall_score": round(
            overall_score,
            1
        ),
        "total_areas": total_areas,
        "compliant_areas": compliant,
        "at_risk_areas": at_risk,
        "non_compliant_areas": non_compliant,
        "pending_tasks": pending_tasks
    }


# ============================================================
# STATUS OVERVIEW
# ============================================================

def get_compliance_status_overview(
    database: Session
):

    areas = (
        database.query(db.ComplianceArea)
        .filter(
            db.ComplianceArea.is_active == True
        )
        .all()
    )

    compliant = 0
    at_risk = 0
    non_compliant = 0

    for area in areas:

        status = str(
            area.status or ""
        ).lower()

        if status == "compliant":
            compliant += 1

        elif status in {
            "at risk",
            "at-risk",
            "risk"
        }:
            at_risk += 1

        elif status in {
            "non-compliant",
            "non compliant",
            "noncompliant"
        }:
            non_compliant += 1

    total = (
        compliant
        + at_risk
        + non_compliant
    )

    return {
        "compliant": compliant,
        "at_risk": at_risk,
        "non_compliant": non_compliant,
        "total": total
    }


# ============================================================
# CATEGORY SCORES
# ============================================================

def get_compliance_categories(
    database: Session
):

    rows = (
        database.query(
            db.ComplianceArea.category,
            func.avg(
                db.ComplianceArea.score
            ).label("score")
        )
        .filter(
            db.ComplianceArea.is_active == True
        )
        .group_by(
            db.ComplianceArea.category
        )
        .order_by(
            db.ComplianceArea.category.asc()
        )
        .all()
    )

    result = []

    for category, score in rows:

        result.append({
            "category": category,
            "score": round(
                float(score or 0),
                1
            )
        })

    return result


# ============================================================
# COMPLIANCE TREND
# ============================================================

def get_compliance_trend(
    database: Session,
    year: Optional[int] = None
):

    if year is None:
        year = date.today().year

    rows = (
        database.query(
            db.ComplianceReportHistory
        )
        .filter(
            db.ComplianceReportHistory.year == year
        )
        .order_by(
            db.ComplianceReportHistory.id.asc()
        )
        .all()
    )

    result = []

    for row in rows:

        result.append({
            "month": row.month,
            "year": row.year,
            "score": round(
                float(
                    row.compliance_score or 0
                ),
                1
            )
        })

    # If no historical rows exist,
    # generate a current snapshot from areas.
    if not result:

        score = get_compliance_page_kpis(
            database
        )["overall_score"]

        months = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec"
        ]

        current_month = date.today().month

        for index in range(
            current_month
        ):

            result.append({
                "month": months[index],
                "year": year,
                "score": score
            })

    return result


# ============================================================
# COMPLETE COMPLIANCE PAGE
# ============================================================

def get_compliance_page(
    database: Session
):

    kpis = get_compliance_page_kpis(
        database
    )

    status_overview = (
        get_compliance_status_overview(
            database
        )
    )

    categories = (
        get_compliance_categories(
            database
        )
    )

    trend = get_compliance_trend(
        database
    )

    activities = (
        get_compliance_activities(
            database,
            limit=5
        )
    )

    deadlines = (
        get_compliance_deadlines(
            database,
            limit=5
        )
    )

    alerts = (
        get_compliance_alerts(
            database,
            limit=5
        )
    )

    return {

        "success": True,

        "kpis": kpis,

        "trend": trend,

        "status_overview":
            status_overview,

        "categories": [
            {
                "category":
                    item["category"],
                "score":
                    item["score"]
            }
            for item in categories
        ],

        "activities": [

            {
                "id": item.id,
                "activity": item.activity,
                "category": item.category,
                "date": (
                    item.activity_date.isoformat()
                    if item.activity_date
                    else None
                ),
                "status": item.status,
                "assigned_to": item.assigned_to
            }

            for item in activities
        ],

        "deadlines": [

            {
                "id": item.id,
                "title": item.title,
                "category": item.category,
                "due_date": (
                    item.due_date.isoformat()
                    if item.due_date
                    else None
                ),
                "status": item.status,
                "assigned_to": item.assigned_to
            }

            for item in deadlines
        ],

        "alerts": [

            {
                "id": item.id,
                "title": item.title,
                "message": item.message,
                "category": item.category,
                "severity": item.severity,
                "created_at": (
                    item.created_at.isoformat()
                    if item.created_at
                    else None
                )
            }

            for item in alerts
        ]
    }


def require_approval_user(
    current_user=Depends(get_current_user)
):
    """
    Users allowed to access the Approval page.
    """

    allowed_roles = {
        "Finance Officer",
        "Procurement Manager",
        "Admin"
    }

    user_role = str(
        getattr(current_user, "role", "")
    ).strip()

    if user_role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Approval access is required."
        )

    return current_user


def get_finance_approval_dashboard(
    database: Session,
    current_user,
    start_date=None,
    end_date=None,
    page=1,
    page_size=5,
    search=None
):
    """
    Complete Finance Officer Approval dashboard.

    Data comes primarily from:
        approval_workflows
        approval_steps
        users
        system_activity
    """

    # =========================================================
    # BASE USER STEP QUERY
    # =========================================================

    step_query = (
        database.query(db.ApprovalStep)
        .filter(
            db.ApprovalStep.approver_user_id
            == current_user.id
        )
    )

    # =========================================================
    # DATE FILTER
    # =========================================================

    if start_date:
        step_query = step_query.filter(
            func.date(
                db.ApprovalStep.acted_at
            ) >= start_date
        )

    if end_date:
        step_query = step_query.filter(
            func.date(
                db.ApprovalStep.acted_at
            ) <= end_date
        )

    # =========================================================
    # KPI 1 - PENDING
    # =========================================================

    pending_count = (
        database.query(db.ApprovalStep)
        .filter(
            db.ApprovalStep.approver_user_id
            == current_user.id,

            db.ApprovalStep.status
            == "Pending"
        )
        .count()
    )

    # =========================================================
    # KPI 2 - APPROVED
    # =========================================================

    approved_count = (
        step_query
        .filter(
            db.ApprovalStep.status
            == "Approved"
        )
        .count()
    )

    # =========================================================
    # KPI 3 - REJECTED
    # =========================================================

    rejected_count = (
        step_query
        .filter(
            db.ApprovalStep.status
            == "Rejected"
        )
        .count()
    )

    # =========================================================
    # KPI 4 - CANCELLED
    # =========================================================

    cancelled_count = (
        database.query(db.ApprovalWorkflow)
        .join(
            db.ApprovalStep,
            db.ApprovalStep.workflow_id
            == db.ApprovalWorkflow.id
        )
        .filter(
            db.ApprovalStep.approver_user_id
            == current_user.id,

            db.ApprovalWorkflow.status
            == "Cancelled"
        )
        .count()
    )

    # =========================================================
    # TOTAL APPROVAL ACTIONS
    # =========================================================

    total_actions = (
        approved_count
        + rejected_count
    )

    # =========================================================
    # APPROVAL RATE
    # =========================================================

    approval_rate = (
        (approved_count / total_actions) * 100
        if total_actions > 0
        else 0
    )

    # =========================================================
    # AVERAGE APPROVAL TIME
    # =========================================================

    acted_steps = (
        step_query
        .filter(
            db.ApprovalStep.acted_at.isnot(None)
        )
        .order_by(
            db.ApprovalStep.acted_at.desc()
        )
        .all()
    )

    durations = []

    for step in acted_steps:

        if (
            step.created_at
            and step.acted_at
        ):

            seconds = (
                step.acted_at
                - step.created_at
            ).total_seconds()

            if seconds >= 0:
                durations.append(
                    seconds / 86400
                )

    average_approval_time = (
        sum(durations) / len(durations)
        if durations
        else 0
    )

    # =========================================================
    # IN PROGRESS
    #
    # Finance Officer has already approved their step,
    # but workflow has not completed yet.
    # =========================================================

    in_progress_count = (
        database.query(
            db.ApprovalWorkflow.id
        )
        .join(
            db.ApprovalStep,
            db.ApprovalStep.workflow_id
            == db.ApprovalWorkflow.id
        )
        .filter(
            db.ApprovalStep.approver_user_id
            == current_user.id,

            db.ApprovalStep.status
            == "Approved",

            ~db.ApprovalWorkflow.status.in_([
                "Completed",
                "Rejected",
                "Cancelled"
            ])
        )
        .distinct()
        .count()
    )

    # =========================================================
    # REQUESTS BY TYPE
    # =========================================================

    type_steps = (
        database.query(
            db.ApprovalWorkflow.reference_type,
            func.count(
                func.distinct(
                    db.ApprovalWorkflow.id
                )
            )
        )
        .join(
            db.ApprovalStep,
            db.ApprovalStep.workflow_id
            == db.ApprovalWorkflow.id
        )
        .filter(
            db.ApprovalStep.approver_user_id
            == current_user.id
        )
    )

    if start_date:
        type_steps = type_steps.filter(
            func.date(
                db.ApprovalWorkflow.created_at
            ) >= start_date
        )

    if end_date:
        type_steps = type_steps.filter(
            func.date(
                db.ApprovalWorkflow.created_at
            ) <= end_date
        )

    type_steps = (
        type_steps
        .group_by(
            db.ApprovalWorkflow.reference_type
        )
        .all()
    )

    type_labels = {
        "PO": "Purchase Order",
        "PR": "Purchase Order",
        "Expense": "Expense Claim",
        "Expense Claim": "Expense Claim",
        "Payment": "Payment",
        "Budget Transfer": "Budget Transfer"
    }

    requests_by_type = []

    for reference_type, count in type_steps:

        label = type_labels.get(
            reference_type,
            reference_type or "Other"
        )

        requests_by_type.append({
            "type": label,
            "count": int(count)
        })

    # Keep chart order stable
    desired_order = [
        "Purchase Order",
        "Expense Claim",
        "Payment",
        "Budget Transfer"
    ]

    requests_by_type.sort(
        key=lambda x: (
            desired_order.index(x["type"])
            if x["type"] in desired_order
            else 99
        )
    )

    # =========================================================
    # APPROVAL STATUS
    # =========================================================

    approval_status = [
        {
            "status": "Pending",
            "count": pending_count
        },
        {
            "status": "In Progress",
            "count": in_progress_count
        },
        {
            "status": "Approved",
            "count": approved_count
        },
        {
            "status": "Rejected",
            "count": rejected_count
        },
        {
            "status": "Cancelled",
            "count": cancelled_count
        }
    ]

    # =========================================================
    # APPROVAL SUMMARY
    # =========================================================

    approval_summary = {
        "approved": approved_count,
        "pending": pending_count,
        "rejected": rejected_count,
        "cancelled": cancelled_count,

        "total_requests": (
            approved_count
            + pending_count
            + rejected_count
            + cancelled_count
        )
    }

    # =========================================================
    # APPROVAL REQUEST LIST
    # =========================================================

    workflow_query = (
        database.query(db.ApprovalWorkflow)
        .join(
            db.ApprovalStep,
            db.ApprovalStep.workflow_id
            == db.ApprovalWorkflow.id
        )
        .filter(
            db.ApprovalStep.approver_user_id
            == current_user.id
        )
        .distinct()
    )

    if start_date:
        workflow_query = workflow_query.filter(
            func.date(
                db.ApprovalWorkflow.created_at
            ) >= start_date
        )

    if end_date:
        workflow_query = workflow_query.filter(
            func.date(
                db.ApprovalWorkflow.created_at
            ) <= end_date
        )

    if search:

        value = f"%{search}%"

        workflow_query = workflow_query.filter(
            db.ApprovalWorkflow.reference_number.ilike(value)
            |
            db.ApprovalWorkflow.title.ilike(value)
            |
            db.ApprovalWorkflow.department.ilike(value)
        )

    total = workflow_query.count()

    offset = (page - 1) * page_size

    workflows = (
        workflow_query
        .order_by(
            db.ApprovalWorkflow.created_at.desc()
        )
        .offset(offset)
        .limit(page_size)
        .all()
    )

    approval_rows = []

    for workflow in workflows:

        requester_name = None

        if workflow.requested_by:
            requester_name = (
                workflow.requested_by.name
            )

        # Find current user's step
        user_step = (
            database.query(db.ApprovalStep)
            .filter(
                db.ApprovalStep.workflow_id
                == workflow.id,

                db.ApprovalStep.approver_user_id
                == current_user.id
            )
            .order_by(
                db.ApprovalStep.step_order.desc()
            )
            .first()
        )

        can_decide = False

        if user_step:

            can_decide = (
                user_step.status == "Pending"
                and
                workflow.current_step
                == user_step.step_order
            )

        approval_rows.append({

            "id": workflow.id,

            "request_id":
                workflow.reference_number,

            "type":
                type_labels.get(
                    workflow.reference_type,
                    workflow.reference_type
                ),

            "reference_type":
                workflow.reference_type,

            "reference_id":
                workflow.reference_id,

            "description":
                workflow.title or "",

            "requested_by":
                requester_name,

            "department":
                workflow.department,

            "amount":
                float(workflow.amount or 0),

            "request_date":
                (
                    workflow.created_at.isoformat()
                    if workflow.created_at
                    else None
                ),

            "priority":
                workflow.priority or "Medium",

            "status":
                workflow.status,

            "current_step":
                workflow.current_step,

            "user_step_status":
                (
                    user_step.status
                    if user_step
                    else None
                ),

            "can_decide":
                can_decide
        })

    # =========================================================
    # RECENT ACTIVITY
    # =========================================================

    recent_steps = (
        database.query(db.ApprovalStep)
        .filter(
            db.ApprovalStep.approver_user_id
            == current_user.id,

            db.ApprovalStep.acted_at.isnot(None)
        )
        .order_by(
            db.ApprovalStep.acted_at.desc()
        )
        .limit(5)
        .all()
    )

    recent_activity = []

    for step in recent_steps:

        workflow = (
            database.query(
                db.ApprovalWorkflow
            )
            .filter(
                db.ApprovalWorkflow.id
                == step.workflow_id
            )
            .first()
        )

        if not workflow:
            continue

        action = (
            "approved"
            if step.status == "Approved"
            else
            "rejected"
            if step.status == "Rejected"
            else
            step.status.lower()
        )

        recent_activity.append({

            "workflow_id":
                workflow.id,

            "reference_number":
                workflow.reference_number,

            "message":
                f"{workflow.reference_type} "
                f"{workflow.reference_number} "
                f"{action}",

            "status":
                step.status,

            "acted_at":
                (
                    step.acted_at.isoformat()
                    if step.acted_at
                    else None
                )
        })

    # =========================================================
    # RETURN
    # =========================================================

    return {

        "profile": {
            "id": current_user.id,
            "name": getattr(
                current_user,
                "name",
                ""
            ),
            "email": getattr(
                current_user,
                "email",
                ""
            ),
            "role": getattr(
                current_user,
                "role",
                ""
            )
        },

        "kpis": {

            "pending_approvals":
                pending_count,

            "approved_this_month":
                approved_count,

            "rejected_this_month":
                rejected_count,

            "average_approval_days":
                round(
                    average_approval_time,
                    1
                ),

            "approval_rate":
                round(
                    approval_rate,
                    1
                ),

            "total_approvals":
                total_actions
        },

        "approval_summary":
            approval_summary,

        "requests_by_type":
            requests_by_type,

        "approval_status":
            approval_status,

        "pending_approvals": {

            "items":
                approval_rows,

            "total":
                total,

            "page":
                page,

            "page_size":
                page_size,

            "total_pages":
                (
                    (total + page_size - 1)
                    // page_size
                    if total
                    else 1
                )
        },

        "recent_activity":
            recent_activity
    }


# ============================================================
# APPROVAL DELEGATION CRUD
# ============================================================

def get_approval_delegations(
    database: Session,
    current_user
):
    """
    Get all approval delegations created by the
    currently authenticated user.
    """

    today = date.today()

    delegations = (
        database.query(db.ApprovalDelegation)
        .filter(
            db.ApprovalDelegation.delegator_user_id
            == current_user.id
        )
        .order_by(
            db.ApprovalDelegation.start_date.desc(),
            db.ApprovalDelegation.id.desc()
        )
        .all()
    )

    results = []

    for delegation in delegations:

        # ----------------------------------------------------
        # Automatically determine status
        # ----------------------------------------------------

        if delegation.status != "Revoked":

            if today < delegation.start_date:
                display_status = "Scheduled"

            elif today > delegation.end_date:
                display_status = "Expired"

            else:
                display_status = "Active"

        else:
            display_status = "Revoked"

        results.append(
            {
                "id": delegation.id,

                "delegator_user_id":
                    delegation.delegator_user_id,

                "delegate_user_id":
                    delegation.delegate_user_id,

                "delegate_name":
                    delegation.delegate.name
                    if delegation.delegate
                    else "-",

                "delegate_email":
                    delegation.delegate.email
                    if delegation.delegate
                    else None,

                "delegate_role":
                    delegation.delegate.role
                    if delegation.delegate
                    else None,

                "approval_type":
                    delegation.approval_type,

                "start_date":
                    delegation.start_date.isoformat()
                    if delegation.start_date
                    else None,

                "end_date":
                    delegation.end_date.isoformat()
                    if delegation.end_date
                    else None,

                "status":
                    display_status,

                "created_at":
                    delegation.created_at.isoformat()
                    if delegation.created_at
                    else None
            }
        )

    return results


def get_delegation_users(
    database: Session,
    current_user
):
    """
    Return active users who can receive delegated
    approval authority.
    """

    users = (
        database.query(db.User)
        .filter(
            db.User.active == True,
            db.User.id != current_user.id
        )
        .order_by(
            db.User.name.asc()
        )
        .all()
    )

    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
        for user in users
    ]


def create_approval_delegation(
    database: Session,
    current_user,
    delegation_data: db.ApprovalDelegationCreate
):
    """
    Create a new approval delegation.
    """

    # --------------------------------------------------------
    # VALIDATE DELEGATE
    # --------------------------------------------------------

    delegate = (
        database.query(db.User)
        .filter(
            db.User.id
            == delegation_data.delegate_user_id
        )
        .first()
    )

    if not delegate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delegate user not found."
        )

    # --------------------------------------------------------
    # ACTIVE USER CHECK
    # --------------------------------------------------------

    if not delegate.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The selected delegate user is inactive."
        )

    # --------------------------------------------------------
    # CANNOT DELEGATE TO YOURSELF
    # --------------------------------------------------------

    if delegate.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delegate approval authority to yourself."
        )

    # --------------------------------------------------------
    # DATE VALIDATION
    # --------------------------------------------------------

    if delegation_data.end_date < delegation_data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date cannot be earlier than start date."
        )

    # --------------------------------------------------------
    # CHECK OVERLAPPING ACTIVE DELEGATION
    # --------------------------------------------------------

    overlapping = (
        database.query(db.ApprovalDelegation)
        .filter(
            db.ApprovalDelegation.delegator_user_id
            == current_user.id,

            db.ApprovalDelegation.delegate_user_id
            == delegation_data.delegate_user_id,

            db.ApprovalDelegation.approval_type
            == delegation_data.approval_type,

            db.ApprovalDelegation.status
            != "Revoked",

            db.ApprovalDelegation.start_date
            <= delegation_data.end_date,

            db.ApprovalDelegation.end_date
            >= delegation_data.start_date
        )
        .first()
    )

    if overlapping:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "An overlapping delegation already exists "
                "for this user and approval type."
            )
        )

    # --------------------------------------------------------
    # CREATE
    # --------------------------------------------------------

    delegation = db.ApprovalDelegation(
        delegator_user_id=current_user.id,

        delegate_user_id=
            delegation_data.delegate_user_id,

        approval_type=
            delegation_data.approval_type,

        start_date=
            delegation_data.start_date,

        end_date=
            delegation_data.end_date,

        status="Active",

        created_at=datetime.utcnow(),

        updated_at=datetime.utcnow()
    )

    database.add(delegation)

    try:

        database.commit()

        database.refresh(delegation)

    except IntegrityError:

        database.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unable to create approval delegation."
        )

    return {
        "success": True,
        "message": "Approval delegation created successfully.",

        "delegation": {
            "id": delegation.id,

            "delegate_user_id":
                delegation.delegate_user_id,

            "approval_type":
                delegation.approval_type,

            "start_date":
                delegation.start_date.isoformat(),

            "end_date":
                delegation.end_date.isoformat(),

            "status":
                delegation.status
        }
    }


def revoke_approval_delegation(
    database: Session,
    current_user,
    delegation_id: int
):
    """
    Revoke an approval delegation belonging to
    the currently authenticated user.
    """

    delegation = (
        database.query(db.ApprovalDelegation)
        .filter(
            db.ApprovalDelegation.id
            == delegation_id,

            db.ApprovalDelegation.delegator_user_id
            == current_user.id
        )
        .first()
    )

    if not delegation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Approval delegation not found."
        )

    if delegation.status == "Revoked":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This delegation has already been revoked."
        )

    delegation.status = "Revoked"
    delegation.updated_at = datetime.utcnow()

    database.commit()

    database.refresh(delegation)

    return {
        "success": True,
        "message": "Approval delegation revoked successfully.",
        "id": delegation.id
    }


# ============================================================
# FINANCE ALERTS & NOTIFICATIONS DASHBOARD
# ============================================================

def get_finance_alerts_notifications(
    database,
    current_user,
    from_date=None,
    to_date=None,
    search=None,
    category=None,
    priority=None
):
    """
    Data provider for Finance Officer
    Alerts & Notifications page.
    """

    # ========================================================
    # NOTIFICATIONS
    # ========================================================

    notification_query = database.query(
        db.Notification
    )

    # User-specific + global notifications
    if hasattr(db.Notification, "recipient_user_id"):
        notification_query = notification_query.filter(
            or_(
                db.Notification.recipient_user_id == current_user.id,
                db.Notification.recipient_user_id.is_(None)
            )
        )

    if from_date:
        notification_query = notification_query.filter(
            func.date(
                db.Notification.created_at
            ) >= from_date
        )

    if to_date:
        notification_query = notification_query.filter(
            func.date(
                db.Notification.created_at
            ) <= to_date
        )

    if search:
        value = f"%{search.strip()}%"

        notification_query = notification_query.filter(
            or_(
                db.Notification.title.ilike(value),
                db.Notification.message.ilike(value),
                db.Notification.reference_id.ilike(value)
            )
        )

    # ========================================================
    # CATEGORY MAPPING
    # ========================================================

    category_map = {
        "Budget Alerts": [
            "Budget",
            "Budget Alert",
            "Budget Alerts"
        ],
        "Payment Alerts": [
            "Payment",
            "Payment Alert",
            "Payment Alerts",
            "Invoice",
            "Invoices & Payments"
        ],
        "Approval Alerts": [
            "Approval",
            "Approval Alert",
            "Approval Alerts",
            "Approvals",
            "Vendor"
        ],
        "Compliance Alerts": [
            "Compliance",
            "Compliance Alert",
            "Compliance Alerts"
        ],
        "System Alerts": [
            "System",
            "System Alert",
            "System Alerts",
            "System Updates"
        ]
    }

    if category and category != "All":
        allowed_categories = category_map.get(
            category,
            [category]
        )

        notification_query = notification_query.filter(
            db.Notification.category.in_(
                allowed_categories
            )
        )

    if priority and priority != "All":
        notification_query = notification_query.filter(
            db.Notification.priority == priority
        )

    # ========================================================
    # COUNTS
    # ========================================================

    total_notifications = notification_query.count()

    unread_notifications = (
        notification_query
        .filter(
            db.Notification.status == "Unread"
        )
        .count()
    )

    # ========================================================
    # HIGH PRIORITY ALERTS
    # ========================================================

    alert_query = database.query(
        db.Alert
    )

    if hasattr(db.Alert, "assigned_to"):
        alert_query = alert_query.filter(
            or_(
                db.Alert.assigned_to == current_user.id,
                db.Alert.assigned_to.is_(None)
            )
        )

    if from_date:
        alert_query = alert_query.filter(
            func.date(db.Alert.created_at) >= from_date
        )

    if to_date:
        alert_query = alert_query.filter(
            func.date(db.Alert.created_at) <= to_date
        )

    if search:
        value = f"%{search.strip()}%"

        alert_query = alert_query.filter(
            or_(
                db.Alert.title.ilike(value),
                db.Alert.message.ilike(value),
                db.Alert.reference_id.ilike(value)
            )
        )

    if category and category != "All":
        allowed_categories = category_map.get(
            category,
            [category]
        )

        alert_query = alert_query.filter(
            db.Alert.category.in_(
                allowed_categories
            )
        )

    if priority and priority != "All":
        alert_query = alert_query.filter(
            db.Alert.priority == priority
        )

    high_priority_alerts = (
        alert_query
        .filter(
            db.Alert.priority == "High",
            db.Alert.status.notin_(
                ["Resolved", "Dismissed"]
            )
        )
        .count()
    )

    # ========================================================
    # RESOLVED TODAY
    # ========================================================

    today = date.today()

    resolved_today = (
        database.query(
            db.Alert
        )
        .filter(
            db.Alert.resolved_at.isnot(None),
            func.date(
                db.Alert.resolved_at
            ) == today
        )
        .count()
    )

    # ========================================================
    # UNREAD MESSAGES
    # ========================================================

    unread_messages = 0

    if hasattr(db.Message, "is_read"):
        unread_messages = (
            database.query(
                db.Message
            )
            .filter(
                db.Message.is_read == 0
            )
            .count()
        )

    # ========================================================
    # RECENT ALERTS
    # ========================================================

    alerts = (
        alert_query
        .order_by(
            db.Alert.created_at.desc()
        )
        .limit(10)
        .all()
    )

    recent_alerts = []

    for alert in alerts:

        recent_alerts.append({
            "id": alert.id,
            "title": alert.title,
            "message": alert.message or "",
            "category": alert.category,
            "priority": alert.priority,
            "status": alert.status,
            "created_at": (
                alert.created_at.isoformat()
                if alert.created_at
                else None
            ),
            "resolved_at": (
                alert.resolved_at.isoformat()
                if alert.resolved_at
                else None
            )
        })

    # ========================================================
    # RECENT NOTIFICATIONS
    # ========================================================

    notifications = (
        notification_query
        .order_by(
            db.Notification.created_at.desc()
        )
        .limit(10)
        .all()
    )

    recent_notifications = []

    for notification in notifications:

        recent_notifications.append({
            "id": notification.id,
            "title": notification.title,
            "message": notification.message or "",
            "notification_type":
                notification.notification_type,
            "category":
                notification.category,
            "priority":
                notification.priority,
            "status":
                notification.status,
            "reference_id":
                notification.reference_id,
            "created_at": (
                notification.created_at.isoformat()
                if notification.created_at
                else None
            )
        })

    # ========================================================
    # CATEGORY COUNTS
    # ========================================================

    category_counts = {}

    for display_name, allowed in category_map.items():

        category_counts[display_name] = (
            notification_query
            .filter(
                db.Notification.category.in_(
                    allowed
                )
            )
            .count()
        )

    categorized_total = sum(
        category_counts.values()
    )

    others = max(
        0,
        total_notifications - categorized_total
    )

    category_counts["Others"] = others

    # ========================================================
    # ANNOUNCEMENTS
    # ========================================================

    announcements = []

    if hasattr(db, "SystemAnnouncement"):

        announcement_query = ( database.query( db.SystemAnnouncement ) .filter( db.SystemAnnouncement.is_active == True ) )

        announcement_query = announcement_query.filter(
            or_(
                db.SystemAnnouncement.expires_at.is_(None),
                db.SystemAnnouncement.expires_at >= datetime.utcnow()
            )
        )

        announcement_rows = ( announcement_query .order_by( db.SystemAnnouncement.published_at.desc() ) .limit(5) .all() )

        for item in announcement_rows:

            announcements.append({
                "id": item.id,
                "title": item.title,
                "message": item.message,
                "category": item.category,
                "priority": item.priority,
                "published_at": (
                    item.published_at.isoformat()
                    if item.published_at
                    else None
                )
            })

    # ========================================================
    # PREFERENCES
    # ========================================================

    preferences = ( database.query( db.FinanceNotificationPreference )
        .filter( db.FinanceNotificationPreference.user_id == current_user.id ) .first()
    )

    if not preferences:
        preferences = db.FinanceNotificationPreference( user_id=current_user.id )
        database.add(preferences)
        database.commit()
        database.refresh(preferences)

    return {
        "summary": {
            "high_priority_alerts": high_priority_alerts,
            "pending_notifications": unread_notifications,
            "resolved_today": resolved_today,
            "unread_messages": unread_messages,
            "system_announcements": len(announcements)
        },
        "category_counts": category_counts,
        "alerts": recent_alerts,
        "notifications": recent_notifications,
        "announcements": announcements,
        "preferences": {
            "budget_alerts": preferences.budget_alerts,
            "payment_alerts": preferences.payment_alerts,
            "approval_alerts": preferences.approval_alerts,
            "compliance_alerts": preferences.compliance_alerts,
            "system_notifications": preferences.system_notifications,
            "email_notifications": preferences.email_notifications,
            "sms_notifications": preferences.sms_notifications
        }
    }


# ============================================================
# GET FINANCE NOTIFICATION PREFERENCES
# ============================================================

def get_finance_notification_preferences( database, current_user ):

    settings = ( database.query( db.FinanceNotificationPreference )
        .filter( db.FinanceNotificationPreference.user_id == current_user.id ) .first()
    )

    if not settings:
        settings = db.FinanceNotificationPreference( user_id=current_user.id )
        database.add(settings)
        database.commit()
        database.refresh(settings)

    return settings


# ============================================================
# UPDATE FINANCE NOTIFICATION PREFERENCES
# ============================================================

def update_finance_notification_preferences( database, current_user, payload ):

    settings = get_finance_notification_preferences( database, current_user )

    settings.budget_alerts = payload.budget_alerts
    settings.payment_alerts = payload.payment_alerts
    settings.approval_alerts = payload.approval_alerts
    settings.compliance_alerts = payload.compliance_alerts
    settings.system_notifications = payload.system_notifications
    settings.email_notifications = payload.email_notifications
    settings.sms_notifications = payload.sms_notifications

    database.commit()
    database.refresh(settings)

    return settings


# ============================================================
# FINANCE OFFICER - HELP & SUPPORT
# ============================================================

def get_finance_support_dashboard( database: Session, current_user ):
    """
    Returns all data required by the Finance Officer
    Help & Support page.
    """

    categories = ( database.query(db.SupportCategory) .filter( db.SupportCategory.is_active == True )
        .order_by( db.SupportCategory.display_order.asc() ) .all()
    )

    # Recent articles
    articles = ( database.query(db.SupportArticle) .filter( db.SupportArticle.is_active == True )
        .order_by( db.SupportArticle.created_at.desc() ) .limit(5) .all()
    )

    # FAQs
    faqs = ( database.query(db.SupportFAQ) .filter( db.SupportFAQ.is_active == True )
        .order_by( db.SupportFAQ.display_order.asc() ) .limit(5) .all()
    )

    # Contacts
    contacts = ( database.query(db.SupportContact)
        .filter( db.SupportContact.is_active == True ) .all()
    )

    # System status
    services = ( database.query(db.SupportServiceStatus)
        .order_by( db.SupportServiceStatus.service_name.asc() ) .all()
    )

    # Quick links
    quick_links = ( database.query(db.SupportQuickLink)
        .filter( db.SupportQuickLink.is_active == True )
        .order_by( db.SupportQuickLink.display_order.asc() ) .all()
    )

    overall_status = ( "Operational"
        if services and all(
            str(service.status).strip().lower() == "operational"
            for service in services
        )
        else "Degraded"
    )

    return {
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": current_user.role,
            "profile_image": getattr( current_user, "profile_image", None )
        },
        "categories": [
            {
                "id": item.id,
                "name": item.name,
                "description": item.description,
                "icon": item.icon,
                "color": item.color
            }
            for item in categories
        ],
        "faqs": [
            {
                "id": item.id,
                "question": item.question,
                "answer": item.answer,
                "category": item.category
            }
            for item in faqs
        ],
        "articles": [
            {
                "id": item.id,
                "title": item.title,
                "slug": item.slug,
                "summary": item.summary,
                "category": item.category,
                "icon": item.icon,
                "views": item.views,
                "is_popular": item.is_popular,
                "created_at": ( item.created_at.isoformat()
                    if item.created_at else None )
            }
            for item in articles
        ],
        "contacts": [
            {
                "id": item.id,
                "contact_type": item.contact_type,
                "title": item.title,
                "value": item.value,
                "description": item.description
            }
            for item in contacts
        ],
        "services": [
            {
                "id": item.id,
                "name": item.service_name,
                "status": item.status,
                "message": item.message,
                "checked_at": ( item.checked_at.isoformat()
                    if item.checked_at else None )
            }
            for item in services
        ],
        "quick_links": [
            {
                "id": item.id,
                "title": item.title,
                "description": item.description,
                "icon": item.icon,
                "url": item.url
            }
            for item in quick_links
        ],
        "system_status": { "overall_status": overall_status }
    }


def create_finance_support_ticket(
    database: Session,
    ticket_data: db.SupportTicketCreate,
    current_user
):
    ticket = db.SupportTicket(
        ticket_id=generate_ticket_id(database),
        subject=ticket_data.subject.strip(),
        description=ticket_data.description.strip(),
        category=ticket_data.category.strip(),
        priority=ticket_data.priority or "Medium",
        status="Open",
        created_by=(
            current_user.name
            if getattr(current_user, "name", None)
            else current_user.email
        ),
        vendor_id=None
    )

    database.add(ticket)
    database.commit()
    database.refresh(ticket)

    return ticket


def require_auditor( current_user=Depends(get_current_user) ):
    if not _is_role(current_user, "Auditor"):
        raise HTTPException( status_code=status.HTTP_403_FORBIDDEN, detail="Auditor privileges are required." )

    return current_user


def get_auditor_dashboard( database: Session, current_user ):
    today = date.today()

    # ========================================================
    # AUDITOR ASSIGNMENTS
    # ========================================================

    assignments = ( database.query(db.AuditAssignment) .filter( db.AuditAssignment.auditor_id == current_user.id ) .all() )

    total_assignments = len(assignments)

    # ========================================================
    # STATUS COUNTS
    # ========================================================

    not_started = 0
    in_progress = 0
    under_review = 0
    completed = 0

    for assignment in assignments:

        status_value = ( str(assignment.status or "") .strip() .lower() )

        if status_value in { "not started", "not_started" }:
            not_started += 1

        elif status_value in { "in progress", "in_progress" }:
            in_progress += 1

        elif status_value in { "under review", "under_review" }:
            under_review += 1

        elif status_value in { "completed", "complete" }:
            completed += 1

    # ========================================================
    # FINDINGS
    # ========================================================

    assignment_audit_ids = [
        assignment.audit_id
        for assignment in assignments
    ]

    findings_query = database.query(db.AuditFinding)

    if assignment_audit_ids:
        findings_query = findings_query.filter( db.AuditFinding.audit_id.in_(assignment_audit_ids) )
    else:
        findings_query = findings_query.filter( db.AuditFinding.id == -1 )

    findings = findings_query.all()

    total_findings = len(findings)

    # ========================================================
    # REPORTS COMPLETED
    # ========================================================

    auditor_name = ( current_user.name or current_user.email )

    reports_completed = (
        database.query(db.Report)
        .filter( func.lower( func.coalesce( db.Report.report_type, "" ) ) == "audit" )
        .filter( func.lower( func.coalesce( db.Report.status, "" ) ).in_( [ "completed", "complete" ] ) )
        .filter( or_( db.Report.generated_by == auditor_name, db.Report.generated_by == current_user.email ) )
        .count()
    )

    # ========================================================
    # COMPLIANCE
    # ========================================================

    compliance_score = ( database.query( func.avg(db.Audit.compliance_score) )
        .filter( db.Audit.id.in_(assignment_audit_ids) ) .scalar()
        if assignment_audit_ids
        else None
    )

    compliance_score = float( compliance_score or 0 )

    # ========================================================
    # DOCUMENTS UPLOADED THIS MONTH
    # ========================================================

    month_start = today.replace(day=1)

    documents_uploaded = ( database.query( func.count(db.Document.id) )
        .filter( db.Document.uploaded_by == current_user.id )
        .filter( db.Document.uploaded_on >= month_start ) .scalar() or 0
    )

    # ========================================================
    # UPCOMING AUDITS
    # ========================================================

    upcoming = ( database.query( db.AuditAssignment, db.Audit )
        .join( db.Audit, db.AuditAssignment.audit_id == db.Audit.id )
        .filter( db.AuditAssignment.auditor_id == current_user.id )
        .filter( db.Audit.scheduled_date.isnot(None) )
        .filter( db.Audit.scheduled_date >= datetime.utcnow() )
        .order_by( db.Audit.scheduled_date.asc() ) .limit(5) .all()
    )

    upcoming_activities = []

    for assignment, audit in upcoming:

        upcoming_activities.append({
            "id": audit.id,
            "audit_number": audit.audit_number,
            "title": audit.title,
            "audit_type": audit.audit_type,
            "entity_name": audit.entity_name,
            "date": (
                audit.scheduled_date.isoformat()
                if audit.scheduled_date
                else None
            ),
            "status": audit.status
        })

    # ========================================================
    # RECENT FINDINGS
    # ========================================================

    recent_findings = (
        database.query(
            db.AuditFinding,
            db.Audit
        )
        .join(
            db.Audit,
            db.AuditFinding.audit_id == db.Audit.id
        )
        .filter(
            db.AuditFinding.audit_id.in_(
                assignment_audit_ids
            )
            if assignment_audit_ids
            else db.AuditFinding.id == -1
        )
        .order_by(
            db.AuditFinding.created_at.desc()
        )
        .limit(5)
        .all()
    )

    recent_issues = []

    for finding, audit in recent_findings:

        recent_issues.append({
            "id": finding.id,
            "issue": finding.title,
            "audit": audit.title,
            "severity": finding.severity,
            "status": finding.status,
            "identified_date": (
                finding.identified_date.isoformat()
                if finding.identified_date
                else None
            )
        })

    # ========================================================
    # RETURN
    # ========================================================

    return {
        "success": True,

        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": current_user.role
        },

        "kpis": {
            "total_assignments": total_assignments,
            "in_progress": in_progress,
            "issues_found": total_findings,
            "reports_completed": reports_completed,
            "compliance_score": round(
                compliance_score,
                2
            ),
            "documents_uploaded": int(
                documents_uploaded
            )
        },

        "audit_progress": {
            "not_started": not_started,
            "in_progress": in_progress,
            "under_review": under_review,
            "completed": completed,
            "total": total_assignments
        },

        "upcoming_activities":
            upcoming_activities,

        "recent_issues":
            recent_issues
    }


# ============================================================
# AUDITOR - AUDIT ASSIGNMENTS
# ============================================================

def get_audit_assignment_list(
    database: Session,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    priority: Optional[str] = None,
    auditor_id: Optional[int] = None,
    due_date_from: Optional[date] = None,
    due_date_to: Optional[date] = None,
    page: int = 1,
    limit: int = 10,
):
    """
    Return paginated audit assignments.
    """

    query = (
        database.query(db.AuditAssignment)
        .join(
            db.Audit,
            db.Audit.id == db.AuditAssignment.audit_id
        )
        .join(
            db.User,
            db.User.id == db.AuditAssignment.auditor_id
        )
    )

    # --------------------------------------------------------
    # SEARCH
    # --------------------------------------------------------

    if search:
        value = f"%{search.strip()}%"

        query = query.filter(
            or_(
                db.Audit.title.ilike(value),
                db.Audit.audit_number.ilike(value),
                db.Audit.audit_type.ilike(value),
                db.Audit.entity_name.ilike(value),
                db.User.name.ilike(value),
                db.User.email.ilike(value),
                db.User.department.ilike(value),
            )
        )

    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    if status_filter and status_filter != "All Statuses":
        query = query.filter(
            db.AuditAssignment.status == status_filter
        )

    # --------------------------------------------------------
    # PRIORITY
    # --------------------------------------------------------

    if priority and priority != "All Priorities":
        query = query.filter(
            db.AuditAssignment.priority == priority
        )

    # --------------------------------------------------------
    # AUDITOR
    # --------------------------------------------------------

    if auditor_id:
        query = query.filter(
            db.AuditAssignment.auditor_id == auditor_id
        )

    # --------------------------------------------------------
    # DUE DATE
    # --------------------------------------------------------

    if due_date_from:
        query = query.filter(
            db.AuditAssignment.due_date >= due_date_from
        )

    if due_date_to:
        query = query.filter(
            db.AuditAssignment.due_date <= due_date_to
        )

    # --------------------------------------------------------
    # TOTAL
    # --------------------------------------------------------

    total = query.count()

    pages = (
        (total + limit - 1) // limit
        if total
        else 1
    )

    if page > pages:
        page = pages

    offset = (page - 1) * limit

    assignments = (
        query
        .order_by(
            db.AuditAssignment.due_date.asc().nullslast(),
            db.AuditAssignment.id.desc()
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    result = []

    for assignment in assignments:

        audit = assignment.audit

        auditor = (
            database.query(db.User)
            .filter(db.User.id == assignment.auditor_id)
            .first()
        )

        result.append({
            "id": assignment.id,

            "audit_id": audit.id,
            "audit_number": audit.audit_number,
            "audit_title": audit.title,
            "audit_type": audit.audit_type,

            "entity_name": audit.entity_name,
            "entity_type": audit.entity_type,

            "auditor_id": assignment.auditor_id,
            "auditor_name": (
                auditor.name
                if auditor
                else None
            ),
            "auditor_email": (
                auditor.email
                if auditor
                else None
            ),

            "department": (
                auditor.department
                if auditor
                else None
            ),

            "assigned_date": assignment.assigned_date,
            "due_date": assignment.due_date,

            "priority": assignment.priority,
            "status": assignment.status,
            "progress": float(
                assignment.progress or 0
            ),

            "scheduled_date": audit.scheduled_date,

            "risk_level": audit.risk_level,
            "compliance_score": float(
                audit.compliance_score or 0
            ),

            "created_at": assignment.created_at,
            "updated_at": assignment.updated_at,
        })

    return {
        "items": result,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages
    }


def get_audit_assignment(
    database: Session,
    assignment_id: int
):

    assignment = (
        database.query(db.AuditAssignment)
        .filter(
            db.AuditAssignment.id == assignment_id
        )
        .first()
    )

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Audit assignment not found."
        )

    audit = assignment.audit

    auditor = (
        database.query(db.User)
        .filter(
            db.User.id == assignment.auditor_id
        )
        .first()
    )

    return {
        "id": assignment.id,

        "audit_id": audit.id,
        "audit_number": audit.audit_number,
        "audit_title": audit.title,
        "audit_type": audit.audit_type,

        "entity_name": audit.entity_name,
        "entity_type": audit.entity_type,
        "description": audit.description,

        "auditor_id": assignment.auditor_id,
        "auditor_name": (
            auditor.name
            if auditor
            else None
        ),
        "auditor_email": (
            auditor.email
            if auditor
            else None
        ),

        "department": (
            auditor.department
            if auditor
            else None
        ),

        "assigned_date": assignment.assigned_date,
        "due_date": assignment.due_date,

        "priority": assignment.priority,
        "status": assignment.status,
        "progress": float(
            assignment.progress or 0
        ),

        "scheduled_date": audit.scheduled_date,
        "start_date": audit.start_date,
        "end_date": audit.end_date,

        "risk_level": audit.risk_level,
        "compliance_score": float(
            audit.compliance_score or 0
        ),

        "created_at": assignment.created_at,
        "updated_at": assignment.updated_at,
    }


def create_audit_assignment(
    database: Session,
    request,
    current_user
):

    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    auditor = (
        database.query(db.User)
        .filter(
            db.User.id == request.auditor_id
        )
        .first()
    )

    if not auditor:
        raise HTTPException(
            status_code=404,
            detail="Auditor not found."
        )

    if str(auditor.role) != "Auditor":
        raise HTTPException(
            status_code=400,
            detail="Selected user is not an Auditor."
        )

    # --------------------------------------------------------
    # EXISTING AUDIT
    # --------------------------------------------------------

    if request.audit_id:

        audit = (
            database.query(db.Audit)
            .filter(
                db.Audit.id == request.audit_id
            )
            .first()
        )

        if not audit:
            raise HTTPException(
                status_code=404,
                detail="Audit not found."
            )

    # --------------------------------------------------------
    # CREATE NEW AUDIT
    # --------------------------------------------------------

    else:

        if not request.title:
            raise HTTPException(
                status_code=400,
                detail="Audit title is required."
            )

        if not request.audit_type:
            raise HTTPException(
                status_code=400,
                detail="Audit type is required."
            )

        audit = db.Audit(
            audit_number=generate_audit_number(
                database
            ),

            title=request.title.strip(),

            audit_type=request.audit_type.strip(),

            entity_name=(
                request.entity_name.strip()
                if request.entity_name
                else None
            ),

            entity_type=(
                request.entity_type.strip()
                if request.entity_type
                else None
            ),

            description=request.description,

            scheduled_date=request.scheduled_date,

            start_date=request.start_date,

            end_date=request.end_date,

            status=request.status or "Not Started",

            progress=request.progress or 0,

            risk_level=(
                request.risk_level
                or "Medium"
            ),

            compliance_score=(
                request.compliance_score
                or 0
            ),

            created_by=current_user.id
        )

        database.add(audit)

        database.flush()

    # --------------------------------------------------------
    # CREATE ASSIGNMENT
    # --------------------------------------------------------

    assignment = db.AuditAssignment(
        audit_id=audit.id,

        auditor_id=request.auditor_id,

        assigned_date=(
            request.assigned_date
            or date.today()
        ),

        due_date=request.due_date,

        status=(
            request.status
            or "Not Started"
        ),

        progress=(
            request.progress
            or 0
        ),

        priority=(
            request.priority
            or "Medium"
        )
    )

    database.add(assignment)

    database.flush()

    # --------------------------------------------------------
    # AUDIT LOG
    # --------------------------------------------------------

    activity = db.AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.name,
        role=current_user.role,

        action="Audit Assignment Created",

        description=(
            f"Audit {audit.audit_number} "
            f"assigned to {auditor.name}"
        ),

        resource="AuditAssignment",

        resource_id=str(assignment.id),

        status="Success"
    )

    database.add(activity)

    database.commit()

    database.refresh(assignment)

    return assignment


def update_audit_assignment(
    database: Session,
    assignment_id: int,
    request,
    current_user
):

    assignment = (
        database.query(db.AuditAssignment)
        .filter(
            db.AuditAssignment.id == assignment_id
        )
        .first()
    )

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Audit assignment not found."
        )

    if request.auditor_id is not None:

        auditor = (
            database.query(db.User)
            .filter(
                db.User.id == request.auditor_id
            )
            .first()
        )

        if not auditor:
            raise HTTPException(
                status_code=404,
                detail="Auditor not found."
            )

        if str(auditor.role) != "Auditor":
            raise HTTPException(
                status_code=400,
                detail="Selected user is not an Auditor."
            )

        assignment.auditor_id = request.auditor_id

    if request.due_date is not None:
        assignment.due_date = request.due_date

    if request.priority is not None:
        assignment.priority = request.priority

    if request.status is not None:
        assignment.status = request.status

    if request.progress is not None:

        if request.progress < 0 or request.progress > 100:
            raise HTTPException(
                status_code=400,
                detail="Progress must be between 0 and 100."
            )

        assignment.progress = request.progress

        # Keep Audit progress synchronized.
        assignment.audit.progress = request.progress

    database.commit()

    database.refresh(assignment)

    return assignment


def delete_audit_assignment(
    database: Session,
    assignment_id: int,
    current_user
):

    assignment = (
        database.query(db.AuditAssignment)
        .filter(
            db.AuditAssignment.id == assignment_id
        )
        .first()
    )

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Audit assignment not found."
        )

    audit_number = assignment.audit.audit_number

    database.delete(assignment)

    database.add(
        db.AuditLog(
            user_id=current_user.id,
            user_email=current_user.email,
            user_name=current_user.name,
            role=current_user.role,
            action="Audit Assignment Deleted",
            description=(
                f"Assignment for {audit_number} deleted."
            ),
            resource="AuditAssignment",
            resource_id=str(assignment_id),
            status="Success"
        )
    )

    database.commit()

    return {
        "success": True,
        "message": "Audit assignment deleted successfully."
    }


def get_audit_assignment_dashboard( database: Session ):

    total = ( database.query( func.count( db.AuditAssignment.id ) ) .scalar() or 0 )

    in_progress = ( database.query( func.count( db.AuditAssignment.id ) )
        .filter( db.AuditAssignment.status == "In Progress" ) .scalar() or 0
    )

    pending_review = ( database.query( func.count( db.AuditAssignment.id ) )
        .filter( db.AuditAssignment.status == "Pending Review" ) .scalar() or 0
    )

    completed = ( database.query( func.count( db.AuditAssignment.id ) )
        .filter( db.AuditAssignment.status == "Completed" ) .scalar() or 0
    )

    not_started = ( database.query( func.count( db.AuditAssignment.id ) )
        .filter( db.AuditAssignment.status == "Not Started" ) .scalar() or 0
    )

    return {
        "total_assignments": total,
        "in_progress": in_progress,
        "pending_review": pending_review,
        "completed": completed,
        "not_started": not_started
    }


# ============================================================
# PLANNING & RISK MANAGEMENT
# ============================================================

def generate_audit_number(database: Session) -> str:

    year = datetime.utcnow().year

    prefix = f"AUD-{year}-"

    existing = (
        database.query(db.Audit.audit_number)
        .filter(
            db.Audit.audit_number.like(f"{prefix}%")
        )
        .all()
    )

    numbers = []

    for row in existing:

        value = row[0]

        try:
            number = int(
                value.replace(prefix, "")
            )

            numbers.append(number)

        except (ValueError, AttributeError):
            continue

    next_number = (
        max(numbers) + 1
        if numbers
        else 1
    )

    return (
        f"{prefix}{next_number:03d}"
    )


def create_audit_plan(
    database: Session,
    plan,
    current_user
):

    audit_number = generate_audit_number(
        database
    )

    audit = db.Audit(
        audit_number=audit_number,

        title=plan.title,

        audit_type=plan.audit_type,

        entity_name=plan.entity_name,

        entity_type=plan.entity_type,

        description=plan.description,

        scheduled_date=plan.scheduled_date,

        start_date=plan.start_date,

        end_date=plan.end_date,

        status=plan.status,

        progress=plan.progress,

        risk_level=plan.risk_level,

        compliance_score=plan.compliance_score,

        created_by=getattr(
            current_user,
            "id",
            None
        )
    )

    database.add(audit)

    database.commit()

    database.refresh(audit)

    return audit


def get_audit_plans(
    database: Session,
    search: Optional[str] = None,
    status: Optional[str] = None,
    audit_type: Optional[str] = None,
    risk_level: Optional[str] = None
):

    query = database.query(db.Audit)

    if search:
        value = f"%{search.strip()}%"
        query = query.filter(
            or_(
                db.Audit.audit_number.ilike(value),
                db.Audit.title.ilike(value),
                db.Audit.audit_type.ilike(value),
                db.Audit.entity_name.ilike(value)
            )
        )

    if status and status != "All":
        query = query.filter( db.Audit.status == status )

    if audit_type and audit_type != "All":
        query = query.filter( db.Audit.audit_type == audit_type )

    if risk_level and risk_level != "All":
        query = query.filter( db.Audit.risk_level == risk_level )

    return ( query .order_by( db.Audit.start_date.desc().nullslast(), db.Audit.id.desc() ) .all() )


def get_audit_plan( database: Session, audit_id: int ):

    return ( database.query(db.Audit) .filter( db.Audit.id == audit_id ) .first() )


def calculate_risk_score( impact: str, likelihood: str ):

    impact_values = { "Low": 1, "Medium": 2, "High": 3 }

    likelihood_values = { "Low": 1,  "Medium": 2, "High": 3 }

    impact_value = impact_values.get( impact, 2 )

    likelihood_value = likelihood_values.get( likelihood, 2 )

    return ( impact_value * likelihood_value )


def create_audit_risk( database: Session, risk, current_user ):

    risk_score = calculate_risk_score( risk.impact, risk.likelihood )

    owner_id = (
        risk.owner_id
        if risk.owner_id is not None
        else getattr( current_user, "id", None )
    )

    record = db.AuditRisk(

        audit_id=risk.audit_id,

        risk_title=risk.risk_title,

        category=risk.category,

        description=risk.description,

        impact=risk.impact,

        likelihood=risk.likelihood,

        risk_score=risk_score,

        status=risk.status,

        treatment=risk.treatment,

        owner_id=owner_id,

        due_date=risk.due_date
    )

    database.add(record)

    database.commit()

    database.refresh(record)

    return record


def get_audit_risk( database: Session, risk_id: int ):

    return ( database.query(db.AuditRisk) .filter( db.AuditRisk.id == risk_id ) .first() )


def update_audit_risk( database: Session, risk_id: int, risk_update ):

    risk = get_audit_risk( database, risk_id )

    if not risk:
        return None

    update_data = ( risk_update.model_dump( exclude_unset=True ) )

    for field, value in update_data.items():
        if hasattr( risk, field ):
            setattr( risk, field, value )

    if ( "impact" in update_data or "likelihood" in update_data ):
        risk.risk_score = calculate_risk_score( risk.impact, risk.likelihood )

    database.commit()

    database.refresh(risk)

    return risk


def delete_audit_risk( database: Session, risk_id: int ):

    risk = get_audit_risk( database, risk_id )

    if not risk:
        return None

    database.delete(risk)

    database.commit()

    return risk


def get_planning_risk_dashboard(
    database: Session
):

    # ========================================================
    # AUDIT PLAN KPIs
    # ========================================================

    total_plans = (
        database.query(
            func.count(db.Audit.id)
        ).scalar()
        or 0
    )

    plan_status_rows = (
        database.query(
            db.Audit.status,
            func.count(db.Audit.id)
        )
        .group_by(
            db.Audit.status
        )
        .all()
    )

    status_counts = {
        "Completed": 0,
        "In Progress": 0,
        "Not Started": 0,
        "On Hold": 0
    }

    for status_value, count in plan_status_rows:

        normalized = str(
            status_value or ""
        ).strip()

        if normalized in status_counts:
            status_counts[normalized] = count

    # ========================================================
    # RISKS
    # ========================================================

    total_risks = (
        database.query(
            func.count(db.AuditRisk.id)
        ).scalar()
        or 0
    )

    high_risks = (
        database.query(
            func.count(db.AuditRisk.id)
        )
        .filter(
            db.AuditRisk.risk_score >= 7
        )
        .scalar()
        or 0
    )

    # ========================================================
    # TREATMENTS
    # ========================================================

    treatment_rows = (
        database.query(
            db.AuditRisk.treatment,
            func.count(db.AuditRisk.id)
        )
        .group_by(
            db.AuditRisk.treatment
        )
        .all()
    )

    treatment_counts = {
        "Avoid": 0,
        "Reduce": 0,
        "Transfer": 0,
        "Accept": 0,
        "Pending Decision": 0
    }

    for treatment, count in treatment_rows:

        treatment = str(
            treatment or ""
        )

        if treatment in treatment_counts:

            treatment_counts[treatment] = count

    risk_treatments = (
        treatment_counts["Avoid"]
        +
        treatment_counts["Reduce"]
        +
        treatment_counts["Transfer"]
        +
        treatment_counts["Accept"]
    )

    risk_acceptance = (
        treatment_counts["Accept"]
    )

    # ========================================================
    # HEAT MAP
    # ========================================================

    heat_map = []

    for impact in [
        "High",
        "Medium",
        "Low"
    ]:

        row = []

        for likelihood in [
            "Low",
            "Medium",
            "High"
        ]:

            count = (
                database.query(
                    func.count(
                        db.AuditRisk.id
                    )
                )
                .filter(
                    db.AuditRisk.impact == impact,
                    db.AuditRisk.likelihood == likelihood
                )
                .scalar()
                or 0
            )

            row.append(count)

        heat_map.append(row)

    # ========================================================
    # RISK CATEGORIES
    # ========================================================

    category_rows = (
        database.query(
            db.AuditRisk.category,
            func.count(db.AuditRisk.id)
        )
        .group_by(
            db.AuditRisk.category
        )
        .order_by(
            func.count(
                db.AuditRisk.id
            ).desc()
        )
        .all()
    )

    risk_categories = []

    for category, count in category_rows:

        percentage = (
            (count / total_risks) * 100
            if total_risks
            else 0
        )

        risk_categories.append({

            "category": category,

            "count": count,

            "percentage": round(
                percentage,
                1
            )
        })

    # ========================================================
    # AUDIT PLANS TABLE
    # ========================================================

    audits = (
        database.query(db.Audit)
        .order_by(
            db.Audit.start_date.desc().nullslast(),
            db.Audit.id.desc()
        )
        .limit(5)
        .all()
    )

    audit_plans = []

    for audit in audits:

        owner_name = "Unassigned"

        if audit.created_by:

            owner = (
                database.query(db.User)
                .filter(
                    db.User.id ==
                    audit.created_by
                )
                .first()
            )

            if owner:

                owner_name = (
                    getattr(
                        owner,
                        "name",
                        None
                    )
                    or
                    getattr(
                        owner,
                        "full_name",
                        None
                    )
                    or
                    getattr(
                        owner,
                        "username",
                        None
                    )
                    or
                    "Unassigned"
                )

        audit_plans.append({

            "id": audit.id,

            "audit_number":
                audit.audit_number,

            "title":
                audit.title,

            "audit_type":
                audit.audit_type,

            "period": (
                (
                    audit.start_date.strftime(
                        "%b %Y"
                    )
                    if audit.start_date
                    else "-"
                )
            ),

            "owner":
                owner_name,

            "status":
                audit.status,

            "progress":
                float(
                    audit.progress or 0
                ),

            "due_date": (
                audit.end_date.isoformat()
                if audit.end_date
                else None
            )
        })

    # ========================================================
    # TOP RISKS
    # ========================================================

    risks = (
        database.query(
            db.AuditRisk
        )
        .order_by(
            db.AuditRisk.risk_score.desc(),
            db.AuditRisk.id.desc()
        )
        .limit(5)
        .all()
    )

    top_risks = []

    for risk in risks:

        owner_name = "-"

        if risk.owner:

            owner_name = (
                getattr(
                    risk.owner,
                    "name",
                    None
                ) or
                getattr( risk.owner, "full_name", None ) or getattr( risk.owner, "username", None ) or "-"
            )

        top_risks.append({
            "id": risk.id,
            "risk_title": risk.risk_title,
            "category": risk.category,
            "impact": risk.impact,
            "likelihood": risk.likelihood,
            "risk_score": risk.risk_score,
            "status": risk.status,
            "treatment": risk.treatment,
            "owner": owner_name
        })

    return {
        "kpis": {
            "audit_plans": total_plans,
            "identified_risks": total_risks,
            "high_risks": high_risks,
            "risk_treatments": risk_treatments,
            "risk_acceptance": risk_acceptance
        },
        "audit_plan_overview": {
            "completed": status_counts["Completed"],
            "in_progress": status_counts["In Progress"],
            "not_started": status_counts["Not Started"],
            "on_hold": status_counts["On Hold"]
        },
        "risk_heat_map": heat_map,
        "risk_categories": risk_categories,
        "audit_plans": audit_plans,
        "top_risks": top_risks,
        "risk_treatments": treatment_counts
    }


# ============================================================
# AUDITS IN PROGRESS DASHBOARD
# ============================================================

def get_audits_in_progress_dashboard(
    database: Session,
    current_user,
    search: Optional[str] = None,
    status: Optional[str] = None,
    audit_type: Optional[str] = None,
    department: Optional[str] = None
):
    today = date.today()

    # --------------------------------------------------------
    # BASE QUERY
    # --------------------------------------------------------

    query = (
        database.query( db.AuditAssignment, db.Audit, db.User )
        .join( db.Audit, db.AuditAssignment.audit_id == db.Audit.id )
        .join( db.User, db.AuditAssignment.auditor_id == db.User.id )
    )

    # --------------------------------------------------------
    # ONLY AUDITS IN PROGRESS
    # --------------------------------------------------------

    query = query.filter(
        or_( db.Audit.status == "In Progress", db.AuditAssignment.status == "In Progress" )
    )

    # --------------------------------------------------------
    # SEARCH
    # --------------------------------------------------------

    if search:
        value = f"%{search.strip()}%"
        query = query.filter(
            or_(
                db.Audit.title.ilike(value),
                db.Audit.audit_number.ilike(value),
                db.Audit.audit_type.ilike(value),
                db.Audit.entity_name.ilike(value),
                db.User.name.ilike(value),
                db.User.department.ilike(value)
            )
        )

    # --------------------------------------------------------
    # AUDIT TYPE
    # --------------------------------------------------------

    if audit_type and audit_type != "All":
        query = query.filter( db.Audit.audit_type == audit_type )

    # --------------------------------------------------------
    # DEPARTMENT
    # --------------------------------------------------------

    if department and department != "All":
        query = query.filter( db.User.department == department )

    rows = (
        query .order_by( db.AuditAssignment.due_date.asc().nullslast(), db.Audit.id.desc() ) .all()
    )

    # --------------------------------------------------------
    # REMOVE DUPLICATE AUDITS
    # --------------------------------------------------------

    audit_rows = {}

    for assignment, audit, auditor in rows:
        if audit.id not in audit_rows:
            audit_rows[audit.id] = ( assignment, audit, auditor )

    rows = list(audit_rows.values())

    # --------------------------------------------------------
    # BUILD AUDIT DATA
    # --------------------------------------------------------

    audits = []

    for assignment, audit, auditor in rows:

        progress = float(
            assignment.progress
            if assignment.progress is not None
            else audit.progress or 0
        )

        start_date = audit.start_date
        target_date = ( assignment.due_date or audit.end_date )

        days_elapsed = 0
        days_remaining = 0

        if start_date:
            days_elapsed = max( 0, (today - start_date).days )

        if target_date:
            days_remaining = ( target_date - today ).days

        # ----------------------------------------------------
        # CALCULATE EXPECTED PROGRESS
        # ----------------------------------------------------

        expected_progress = 0

        if start_date and target_date:
            total_days = ( target_date - start_date ).days

            if total_days > 0:
                elapsed_days = ( today - start_date ).days
                expected_progress = min( 100, max( 0, (elapsed_days / total_days) * 100 ) )

        # ----------------------------------------------------
        # STATUS
        # ----------------------------------------------------

        if progress >= 100:
            progress_status = "On Track"

        elif days_remaining < 0:
            progress_status = "Delayed"

        elif progress >= expected_progress - 10:
            progress_status = "On Track"

        else:
            progress_status = "At Risk"

        audits.append({
            "id": assignment.id,
            "audit_id": audit.id,
            "audit_number": audit.audit_number,
            "audit_name": audit.title,
            "audit_type": audit.audit_type,
            "department": ( auditor.department or audit.entity_name or "-" ),
            "entity_name": audit.entity_name,
            "entity_type": audit.entity_type,
            "owner_id": auditor.id,
            "owner": auditor.name,
            "start_date": (
                audit.start_date.isoformat()
                if audit.start_date
                else None
            ),
            "target_date": (
                target_date.isoformat()
                if target_date
                else None
            ),
            "progress": round( progress, 1 ),
            "status": progress_status,
            "database_status": ( assignment.status ),
            "risk_level": audit.risk_level,
            "days_elapsed": days_elapsed,
            "days_remaining": days_remaining,
            "compliance_score": float( audit.compliance_score or 0 )
        })

    # --------------------------------------------------------
    # STATUS FILTER
    # --------------------------------------------------------

    if status and status != "All":
        audits = [
            item
            for item in audits
            if item["status"].lower() == status.lower()
        ]

    # --------------------------------------------------------
    # KPI CALCULATIONS
    # --------------------------------------------------------

    total = len(audits)

    overall_progress = (
        sum( item["progress"] for item in audits ) / total
        if total
        else 0
    )

    avg_elapsed = (
        sum( item["days_elapsed"] for item in audits ) / total
        if total
        else 0
    )

    avg_remaining = (
        sum( max(0, item["days_remaining"]) for item in audits ) / total
        if total
        else 0
    )

    on_track = sum(
        1
        for item in audits
        if item["status"] == "On Track"
    )

    at_risk = sum(
        1
        for item in audits
        if item["status"] == "At Risk"
    )

    delayed = sum(
        1
        for item in audits
        if item["status"] == "Delayed"
    )

    # --------------------------------------------------------
    # PROGRESS HISTORY
    # --------------------------------------------------------

    audit_ids = [
        item["audit_id"]
        for item in audits
    ]

    history_rows = []

    if audit_ids:
        history_rows = (
            database.query( db.AuditProgressHistory )
            .filter( db.AuditProgressHistory.audit_id.in_( audit_ids ) )
            .order_by( db.AuditProgressHistory.recorded_at.asc() ) .all()
        )

    # Group by date
    history_map = defaultdict(list)

    for record in history_rows:
        history_map[ record.recorded_at.date() ].append( float(record.progress) )

    trend = []

    for history_date, values in history_map.items():
        trend.append({
            "date": history_date.isoformat(),
            "progress": round( sum(values) / len(values), 1 )
        })

    # If history doesn't exist, at least show
    # the current overall progress.

    if not trend and total:
        trend = [{
            "date": today.isoformat(),
            "progress": round( overall_progress, 1 )
        }]

    # --------------------------------------------------------
    # UPCOMING MILESTONES
    # --------------------------------------------------------

    milestones = (
        database.query( db.AuditMilestone, db.Audit, db.User )
        .join( db.Audit, db.AuditMilestone.audit_id == db.Audit.id )
        .outerjoin( db.User, db.AuditMilestone.owner_id == db.User.id )
        .filter( db.AuditMilestone.due_date >= today )
        .filter( db.AuditMilestone.status != "Completed" )
        .order_by( db.AuditMilestone.due_date.asc() ) .limit(5) .all()
    )

    milestone_rows = []

    for milestone, audit, owner in milestones:
        days_left = ( milestone.due_date - today ).days
        milestone_rows.append({
            "id": milestone.id,
            "audit_id": audit.id,
            "audit_name": audit.title,
            "milestone": milestone.milestone,
            "due_date": milestone.due_date.isoformat(),
            "days_left": days_left,
            "owner": (
                owner.name
                if owner
                else "-"
            )
        })

    # --------------------------------------------------------
    # RECENT ACTIVITIES
    # --------------------------------------------------------

    activity_rows = ( database.query( db.AuditLog ) .order_by( db.AuditLog.created_at.desc() ) .limit(20) .all() )

    activities = []

    for activity in activity_rows:
        resource = ( activity.resource or "" ).lower()

        if resource not in { "audit", "auditassignment", "auditfinding" }:
            continue
        activities.append({
            "id": activity.id,
            "action": activity.action,
            "description": ( activity.description or activity.action ),
            "user_name": ( activity.user_name or "System" ),
            "status": activity.status,
            "created_at": (
                activity.created_at.isoformat()
                if activity.created_at
                else None
            )
        })

        if len(activities) >= 5:
            break

    # --------------------------------------------------------
    # RETURN
    # --------------------------------------------------------

    return {
        "success": True,
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": current_user.role
        },
        "kpis": {
            "total_in_progress": total,
            "overall_progress": round( overall_progress, 1 ),
            "avg_days_elapsed": round( avg_elapsed, 1 ),
            "avg_days_remaining": round( avg_remaining, 1 ),
            "on_track": on_track,
            "at_risk": at_risk,
            "delayed": delayed
        },
        "audits": audits,
        "trend": trend,
        "milestones": milestone_rows,
        "activities": activities
    }


# ============================================================
# EVIDENCE & DOCUMENTS PAGE
# ============================================================

def _normalize_document_status(status):
    """
    Convert database statuses into the labels used by
    the Evidence & Documents UI.
    """

    value = str(status or "").strip().lower()

    if value in { "approved", "verified", "compliant" }:
        return "Verified"

    if value in { "pending", "pending review", "under review", "review" }:
        return "Under Review"

    if value in { "missing", "missing evidence" }:
        return "Missing Evidence"

    if value in { "rejected", "failed" }:
        return "Rejected"

    return str(status or "Under Review")


def get_evidence_documents_dashboard(
    database,
    search=None,
    audit=None,
    document_type=None,
    category=None,
    status=None,
    page=1,
    page_size=10
):
    """
    Data source for the Auditor Evidence & Documents page.
    """

    page = max(int(page or 1), 1)
    page_size = min(max(int(page_size or 10), 1), 100)
    query = database.query( db.Document, db.User.name ).outerjoin( db.User, db.User.id == db.Document.uploaded_by )

    # --------------------------------------------------------
    # SEARCH
    # --------------------------------------------------------

    if search:
        value = f"%{search.strip()}%"
        query = query.filter( or_(
                db.Document.document_name.ilike(value),
                db.Document.related_id.ilike(value),
                db.Document.category.ilike(value),
                db.Document.document_type.ilike(value),
                db.Document.business_unit.ilike(value)
            )
        )

    # --------------------------------------------------------
    # AUDIT FILTER
    # Document.related_id stores the related record/reference.
    # We also support audit number.
    # --------------------------------------------------------

    if audit and audit != "All Audits":
        query = query.filter( db.Document.related_id == audit )

    # --------------------------------------------------------
    # DOCUMENT TYPE
    # --------------------------------------------------------

    if document_type and document_type != "All Types":
        query = query.filter( db.Document.document_type == document_type )

    # --------------------------------------------------------
    # CATEGORY
    # --------------------------------------------------------

    if category and category != "All Categories":
        query = query.filter( db.Document.category == category )

    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    if status and status != "All Statuses":

        if status == "Verified":
            query = query.filter( func.lower(db.Document.status).in_( [ "approved", "verified", "compliant" ] ) )

        elif status == "Under Review":
            query = query.filter( func.lower(db.Document.status).in_( [ "pending", "pending review", "under review", "review" ] ) )

        elif status == "Missing Evidence":
            query = query.filter( func.lower(db.Document.status).in_( [ "missing", "missing evidence" ] ) )

        else:
            query = query.filter( db.Document.status == status )

    # --------------------------------------------------------
    # TOTAL
    # --------------------------------------------------------

    total = query.count()

    # --------------------------------------------------------
    # PAGINATION
    # --------------------------------------------------------

    offset = (page - 1) * page_size

    rows = ( query .order_by( db.Document.uploaded_on.desc() ) .offset(offset) .limit(page_size) .all() )

    # --------------------------------------------------------
    # AUDIT LOOKUP
    # --------------------------------------------------------

    audits = database.query(db.Audit).all()

    audit_map = {}

    for item in audits:
        audit_map[str(item.id)] = item

        if item.audit_number:
            audit_map[str(item.audit_number)] = item

    # --------------------------------------------------------
    # DOCUMENT ROWS
    # --------------------------------------------------------

    documents = []

    for document, user_name in rows:

        audit_record = None
        if document.related_id:
            audit_record = audit_map.get( str(document.related_id) )

        normalized_status = _normalize_document_status( document.status )

        documents.append(
            {
                "id": document.id,
                "document_name": document.document_name,
                "audit_id": audit_record.id
                    if audit_record
                    else None,
                "audit_number": audit_record.audit_number
                    if audit_record
                    else document.related_id,
                "audit_name": audit_record.title
                    if audit_record
                    else ( document.related_id
                        if document.related_id
                        else "—"
                    ),
                "audit_type": audit_record.audit_type
                    if audit_record
                    else "—",
                "category": document.category or "Other",
                "document_type": document.document_type or "Other",
                "uploaded_by": document.uploaded_by,
                "uploaded_by_name": user_name or "Unknown",
                "uploaded_on":
                    ( document.uploaded_on.isoformat()
                        if document.uploaded_on
                        else None
                    ),
                "status": normalized_status,
                "original_status": document.status,
                "file_type": document.file_type,
                "mime_type": document.mime_type,
                "file_size": document.file_size or 0,
                "file_size_mb": round( (document.file_size or 0) / (1024 * 1024), 2 ),
                "expiry_date":
                    ( document.expiry_date.isoformat()
                        if document.expiry_date
                        else None
                    ),
                "description": document.description
            }
        )

    # ========================================================
    # SUMMARY COUNTS
    # ========================================================

    all_documents = database.query( db.Document )

    total_documents = ( all_documents.count() )

    verified_documents = ( all_documents .filter(
            func.lower( db.Document.status ).in_( [ "approved", "verified", "compliant" ] )
        ) .count()
    )

    under_review = ( all_documents .filter(
            func.lower( db.Document.status ).in_( [ "pending", "pending review", "under review", "review" ] )
        ) .count()
    )

    missing_evidence = ( all_documents .filter( func.lower( db.Document.status ).in_( [ "missing", "missing evidence" ] ) ) .count() )

    storage_used = ( database.query( func.coalesce( func.sum( db.Document.file_size ), 0 ) ).scalar() or 0 )

    storage_limit = ( 10 * 1024 * 1024 * 1024 )

    storage_available = max( storage_limit - storage_used, 0 )

    # ========================================================
    # DOCUMENT TYPE DISTRIBUTION
    # ========================================================

    type_rows = (
        database.query( db.Document.document_type, func.count(db.Document.id) )
        .group_by( db.Document.document_type )
        .order_by( func.count(db.Document.id).desc() ) .all()
    )

    document_types = []

    for doc_type, count in type_rows:
        document_types.append( { "type": doc_type or "Other", "count": count } )

    # ========================================================
    # CATEGORY DISTRIBUTION
    # ========================================================

    category_rows = (
        database.query( db.Document.category, func.count(db.Document.id) )
        .group_by( db.Document.category ) .order_by( func.count(db.Document.id).desc() ) .all()
    )

    categories = []

    for category_name, count in category_rows:
        categories.append(
            {
                "category": category_name or "Other",
                "count": count
            }
        )

    # ========================================================
    # AUDIT OPTIONS
    # ========================================================

    audit_options = []

    for item in audits:
        audit_options.append(
            {
                "id": item.id,
                "audit_number": item.audit_number,
                "title": item.title,
                "label": f"{item.audit_number} - {item.title}"
            }
        )

    # ========================================================
    # RECENT UPLOADS
    # ========================================================

    recent_rows = (
        database.query( db.Document, db.User.name )
        .outerjoin( db.User, db.User.id == db.Document.uploaded_by )
        .order_by( db.Document.uploaded_on.desc() ) .limit(5) .all()
    )

    recent_uploads = []

    for document, user_name in recent_rows:
        recent_uploads.append(
            {
                "id": document.id,
                "document_name": document.document_name,
                "uploaded_by": user_name or "Unknown",
                "uploaded_on":
                    (
                        document.uploaded_on.isoformat()
                        if document.uploaded_on
                        else None
                    ),
                "category": document.category,
                "status": _normalize_document_status( document.status )
            }
        )

    # ========================================================
    # PAGINATION
    # ========================================================

    total_pages = (
        (total + page_size - 1) // page_size
        if total
        else 1
    )

    return {
        "summary": {
            "total_documents": total_documents,
            "verified_documents": verified_documents,
            "under_review": under_review,
            "missing_evidence": missing_evidence,
            "storage_used": storage_used,
            "storage_limit": storage_limit,
            "storage_available": storage_available
        },
        "documents": documents,
        "document_types": document_types,
        "categories": categories,
        "audit_options": audit_options,
        "recent_uploads": recent_uploads,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages
        }
    }


# ============================================================
# AUDITOR - ISSUES & FINDINGS
# ============================================================

def _finding_display_id(finding_id: int, finding_date=None):
    year = ( finding_date.year
        if finding_date
        else datetime.utcnow().year )

    return f"ISS-{year}-{finding_id:03d}"


def _finding_to_dict(database, finding):
    audit = ( database.query(db.Audit) .filter(db.Audit.id == finding.audit_id) .first() )

    assigned_user = None

    if finding.assigned_to:
        assigned_user = ( database.query(db.User) .filter(db.User.id == finding.assigned_to) .first() )

    return {
        "id": finding.id,
        "issue_id": _finding_display_id( finding.id, finding.identified_date ),
        "audit_id": finding.audit_id,
        "audit_number": ( audit.audit_number
            if audit
            else None ),
        "audit_title": ( audit.title
            if audit
            else "Unknown Audit" ),
        "audit_type": ( audit.audit_type
            if audit
            else None ),
        "entity_name": ( audit.entity_name
            if audit
            else None ),
        "title": finding.title,
        "description": finding.description,
        "category": ( getattr( finding, "category", None ) or "Operational" ),
        "severity": finding.severity,
        "status": finding.status,
        "identified_date": ( finding.identified_date.isoformat()
            if finding.identified_date
            else None ),
        "due_date": ( finding.due_date.isoformat()
            if finding.due_date
            else None ),
        "resolved_date": ( finding.resolved_date.isoformat()
            if finding.resolved_date
            else None ),
        "assigned_to": finding.assigned_to,
        "assigned_to_name": ( assigned_user.name
            if assigned_user
            else "Unassigned" ),
        "created_at": ( finding.created_at.isoformat()
            if finding.created_at
            else None )
    }


def get_issues_findings_dashboard(
    database: Session,
    current_user,
    search: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    page: int = 1,
    limit: int = 5
):

    today = date.today()

    # --------------------------------------------------------
    # AUDITS ASSIGNED TO CURRENT AUDITOR
    # --------------------------------------------------------

    assignment_rows = ( database.query(db.AuditAssignment.audit_id)
        .filter( db.AuditAssignment.auditor_id == current_user.id ) .all()
    )

    audit_ids = [ row[0]
        for row in assignment_rows
    ]

    # --------------------------------------------------------
    # BASE QUERY
    # --------------------------------------------------------

    query = database.query(db.AuditFinding)

    if audit_ids:
        query = query.filter( db.AuditFinding.audit_id.in_(audit_ids) )
    else:
        query = query.filter( db.AuditFinding.id == -1 )

    # --------------------------------------------------------
    # SEARCH
    # --------------------------------------------------------

    if search:
        value = f"%{search.strip()}%"
        audit_ids_search = (
            database.query(db.Audit.id) .filter( or_(
                    db.Audit.title.ilike(value),
                    db.Audit.audit_number.ilike(value),
                    db.Audit.entity_name.ilike(value)
                ) ) .all()
        )

        matching_audit_ids = [ row[0]
            for row in audit_ids_search
        ]

        query = query.filter( or_(
                db.AuditFinding.title.ilike(value),
                db.AuditFinding.description.ilike(value),
                db.AuditFinding.audit_id.in_( matching_audit_ids )
                if matching_audit_ids
                else db.AuditFinding.id == -1
            )
        )

    # --------------------------------------------------------
    # FILTERS
    # --------------------------------------------------------

    if severity and severity != "All":
        query = query.filter( db.AuditFinding.severity == severity )

    if status and status != "All":
        query = query.filter( db.AuditFinding.status == status )

    if category and category != "All":
        query = query.filter( db.AuditFinding.category == category )

    # --------------------------------------------------------
    # TOTAL
    # --------------------------------------------------------

    total = query.count()

    # --------------------------------------------------------
    # KPI COUNTS
    # --------------------------------------------------------

    all_findings = ( database.query(db.AuditFinding) .filter( db.AuditFinding.audit_id.in_(audit_ids) ) .all()
        if audit_ids
        else []
    )

    total_issues = len(all_findings)

    high = sum(
        1 for x in all_findings
        if str(x.severity).lower() == "high"
    )

    medium = sum(
        1 for x in all_findings
        if str(x.severity).lower() == "medium"
    )

    low = sum(
        1 for x in all_findings
        if str(x.severity).lower() == "low"
    )

    closed = sum(
        1 for x in all_findings
        if str(x.status).lower() in {"closed", "resolved", "complete"}
    )

    # --------------------------------------------------------
    # STATUS COUNTS
    # --------------------------------------------------------

    status_names = [ "Open", "In Progress", "Pending Review", "Closed" ]

    status_counts = {}

    for item in status_names:
        status_counts[item] = sum( 1
            for x in all_findings
            if str(x.status).strip().lower() == item.lower()
        )

    # --------------------------------------------------------
    # CATEGORY COUNTS
    # --------------------------------------------------------

    category_counts = {}

    for finding in all_findings:
        value = ( getattr( finding, "category", None ) or "Operational" )
        category_counts[value] = ( category_counts.get(value, 0) + 1 )

    categories = sorted(
        [ { "category": key, "count": value }
            for key, value in category_counts.items()
        ], key=lambda x: x["count"], reverse=True
    )

    # --------------------------------------------------------
    # OVERDUE
    # --------------------------------------------------------

    overdue = []

    for finding in all_findings:
        if ( finding.due_date and finding.due_date < today
            and str(finding.status).lower() not in { "closed", "resolved", "complete" } ):

            days_overdue = ( today - finding.due_date ).days

            item = _finding_to_dict( database, finding )

            item["days_overdue"] = days_overdue

            overdue.append(item)

    overdue.sort( key=lambda x: x["days_overdue"], reverse=True )

    # --------------------------------------------------------
    # RESOLUTION TIME
    # --------------------------------------------------------

    resolved_items = [
        x for x in all_findings
        if x.resolved_date
        and x.identified_date
    ]

    if resolved_items:

        resolution_days = sum(
            ( x.resolved_date - x.identified_date ).days
            for x in resolved_items
        ) / len(resolved_items)

    else:
        resolution_days = 0

    # --------------------------------------------------------
    # CLOSED THIS MONTH
    # --------------------------------------------------------

    month_start = today.replace(day=1)

    closed_this_month = sum( 1
        for x in all_findings
        if ( x.resolved_date and x.resolved_date >= month_start )
    )

    # --------------------------------------------------------
    # PENDING REVIEW
    # --------------------------------------------------------

    pending_review = sum( 1
        for x in all_findings
        if str(x.status).lower() in { "pending review", "under review" }
    )

    # --------------------------------------------------------
    # RECENT ISSUES
    # --------------------------------------------------------

    offset = ( (page - 1) * limit )

    rows = ( query .order_by( db.AuditFinding.created_at.desc() ) .offset(offset) .limit(limit) .all() )

    recent = [ _finding_to_dict( database, finding )
        for finding in rows
    ]

    # --------------------------------------------------------
    # MONTHLY TREND - LAST 6 MONTHS
    # --------------------------------------------------------

    trend = []

    for i in range(5, -1, -1):
        first_day = ( today.replace(day=1) )
        month_offset = i
        year = ( first_day.year - ( month_offset // 12 ) )
        month = ( first_day.month - ( month_offset % 12 ) )

        if month <= 0:
            month += 12
            year -= 1
        start = date( year, month, 1 )

        if month == 12:
            end = date( year + 1, 1, 1 )
        else:
            end = date( year, month + 1, 1 )

        count = sum( 1
            for x in all_findings
            if ( x.identified_date and start <= x.identified_date < end )
        )

        trend.append({ "month": start.strftime("%b %Y"), "count": count })

    # --------------------------------------------------------
    # RETURN
    # --------------------------------------------------------

    return {
        "success": True,
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": current_user.role,
            "profile_image": getattr( current_user, "profile_image", None )
        },
        "kpis": {
            "total": total_issues,
            "high": high,
            "medium": medium,
            "low": low,
            "closed": closed
        },
        "status_counts": status_counts,
        "categories": categories,
        "overdue": overdue[:7],
        "trend": trend,
        "resolution": {
            "average_days": round( resolution_days, 1 ),
            "closed_this_month": closed_this_month,
            "pending_review": pending_review
        },
        "items": recent,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": max( 1, ( total + limit - 1 ) // limit )
        }
    }


def create_audit_finding( database: Session, data, current_user ):

    audit = ( database.query(db.Audit) .join(
            db.AuditAssignment, db.AuditAssignment.audit_id == db.Audit.id
        ) .filter(
            db.Audit.id == data.audit_id, db.AuditAssignment.auditor_id == current_user.id
        ) .first()
    )

    if not audit:
        raise HTTPException(
            status_code=403,
            detail=( "You can only create findings for audits assigned to you." )
        )

    finding = db.AuditFinding(
        audit_id=data.audit_id,
        title=data.title.strip(),
        description=data.description,
        category=data.category or "Operational",
        severity=data.severity or "Medium",
        status=data.status or "Open",
        identified_date=( data.identified_date or date.today() ),
        due_date=data.due_date,
        assigned_to=( data.assigned_to or current_user.id )
    )

    database.add(finding)

    database.flush()

    # History
    history = db.IssueFindingHistory(
        finding_id=finding.id,
        old_status=None,
        new_status=finding.status,
        changed_by=current_user.id,
        comments="Issue created"
    )

    database.add(history)

    database.commit()

    database.refresh(finding)

    return _finding_to_dict( database, finding )


def update_audit_finding(
    database: Session,
    finding_id: int,
    data,
    current_user
):

    finding = (
        database.query(db.AuditFinding)
        .filter(
            db.AuditFinding.id ==
            finding_id
        )
        .first()
    )

    if not finding:
        raise HTTPException(
            status_code=404,
            detail="Issue / Finding not found."
        )

    # Make sure current auditor owns the audit
    assignment = (
        database.query(db.AuditAssignment)
        .filter(
            db.AuditAssignment.audit_id ==
            finding.audit_id,
            db.AuditAssignment.auditor_id ==
            current_user.id
        )
        .first()
    )

    if not assignment:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this finding."
        )

    old_status = finding.status

    fields = [
        "title",
        "description",
        "category",
        "severity",
        "status",
        "due_date",
        "resolved_date",
        "assigned_to"
    ]

    for field in fields:

        value = getattr(
            data,
            field,
            None
        )

        if value is not None:
            setattr(
                finding,
                field,
                value
            )

    if (
        finding.status in
        {"Closed", "Resolved"}
        and finding.resolved_date is None
    ):
        finding.resolved_date = date.today()

    if finding.status != old_status:

        history = db.IssueFindingHistory(
            finding_id=finding.id,
            old_status=old_status,
            new_status=finding.status,
            changed_by=current_user.id
        )

        database.add(history)

    database.commit()

    database.refresh(finding)

    return _finding_to_dict(
        database,
        finding
    )


def delete_audit_finding( database: Session, finding_id: int, current_user ):

    finding = ( database.query(db.AuditFinding) .filter( db.AuditFinding.id == finding_id ) .first() )

    if not finding:
        raise HTTPException( status_code=404, detail="Issue / Finding not found." )

    assignment = ( database.query(db.AuditAssignment) .filter(
            db.AuditAssignment.audit_id == finding.audit_id,
            db.AuditAssignment.auditor_id == current_user.id
        ) .first()
    )

    if not assignment:
        raise HTTPException( status_code=403, detail="You cannot delete this finding." )

    database.delete(finding)

    database.commit()

    return { "success": True, "message": "Issue / Finding deleted successfully." }


def get_issue_reopen_rate( database: Session, current_user ):

    assignment_rows = ( database.query( db.AuditAssignment.audit_id )
        .filter( db.AuditAssignment.auditor_id == current_user.id ) .all()
    )

    audit_ids = [ row[0]
        for row in assignment_rows
    ]

    if not audit_ids:
        return { "reopen_rate": 0 }

    finding_ids = [ row[0]
        for row in ( database.query( db.AuditFinding.id ) .filter( db.AuditFinding.audit_id.in_( audit_ids ) ) .all() )
    ]

    if not finding_ids:
        return { "reopen_rate": 0 }

    total_closed = ( database.query( db.IssueFindingHistory.finding_id ) .filter(
            db.IssueFindingHistory.finding_id.in_( finding_ids ),
            db.IssueFindingHistory.new_status.in_( ["Closed", "Resolved"] )
        ) .distinct() .count()
    )

    reopened = ( database.query( db.IssueFindingHistory.finding_id ) .filter(
            db.IssueFindingHistory.finding_id.in_( finding_ids ),
            db.IssueFindingHistory.new_status.in_( ["Open", "In Progress"] ),
            db.IssueFindingHistory.old_status.in_( ["Closed", "Resolved"] )
        ) .distinct() .count()
    )

    rate = ( (reopened / total_closed) * 100
        if total_closed
        else 0 )

    return { "reopen_rate": round( rate, 1 ) }


# ============================================================
# AUDITOR REPORTS OVERVIEW
# ============================================================

def _report_display_type(report):
    """
    Convert database report_type/category/name into
    the labels displayed by the Auditor Reports UI.
    """

    value = str( report.report_type or report.category or "" ).strip().lower()

    name = str( report.report_name  or "" ).strip().lower()

    if ( "audit" in value or "audit" in name ):
        return "Audit Report"

    if ( "compliance" in value or "compliance" in name ):
        return "Compliance Report"

    if ( "summary" in value or "summary" in name or "procurement" in value ):
        return "Summary Report"

    if ( "exception" in value or "exception" in name ):
        return "Exception Report"

    return "Other Reports"


def _report_display_status(status):
    """
    Normalize database report status to the labels
    used by the Auditor Reports UI.
    """

    value = str( status or "" ).strip().lower()

    if value in { "completed", "complete", "published" }:
        return "Published"

    if value in { "draft", "in draft" }:
        return "Draft"

    if value in { "pending", "pending approval", "under review" }:
        return "Pending Approval"

    if value in { "archived", "archive" }:
        return "Archived"

    return str( status or "Draft" ).strip()


def get_auditor_reports_overview(
    database,
    search=None,
    report_type=None,
    audit=None,
    prepared_by=None,
    from_date=None,
    to_date=None,
    trend_months=6
):
    """
    Complete data source for Auditor Reports page.
    """

    trend_months = max( min(int(trend_months or 6), 12), 1 )

    query = database.query(db.Report)

    # --------------------------------------------------------
    # SEARCH
    # --------------------------------------------------------

    if search:
        value = f"%{search.strip()}%"
        query = query.filter( or_(
                db.Report.report_name.ilike(value),
                db.Report.category.ilike(value),
                db.Report.report_type.ilike(value),
                db.Report.generated_by.ilike(value),
                db.Report.description.ilike(value),
            )
        )

    # --------------------------------------------------------
    # REPORT TYPE
    # --------------------------------------------------------

    if report_type and report_type != "All Types":

        if report_type == "Audit Report":
            query = query.filter( or_(
                    db.Report.report_type.ilike("%audit%"),
                    db.Report.category.ilike("%audit%"),
                    db.Report.report_name.ilike("%audit%")
                )
            )

        elif report_type == "Compliance Report":
            query = query.filter( or_(
                    db.Report.report_type.ilike("%compliance%"),
                    db.Report.category.ilike("%compliance%"),
                    db.Report.report_name.ilike("%compliance%")
                )
            )

        elif report_type == "Summary Report":
            query = query.filter( or_(
                    db.Report.report_type.ilike("%summary%"),
                    db.Report.category.ilike("%summary%"),
                    db.Report.report_name.ilike("%summary%"),
                    db.Report.report_type.ilike("%procurement%")
                )
            )

        elif report_type == "Exception Report":
            query = query.filter( or_(
                    db.Report.report_type.ilike("%exception%"),
                    db.Report.category.ilike("%exception%"),
                    db.Report.report_name.ilike("%exception%")
                )
            )

    # --------------------------------------------------------
    # AUDIT / ASSIGNMENT
    # --------------------------------------------------------

    if audit and audit != "All Audits":
        value = f"%{audit.strip()}%"
        query = query.filter( or_(
                db.Report.description.ilike(value),
                db.Report.report_name.ilike(value)
            )
        )

    # --------------------------------------------------------
    # PREPARED BY
    # --------------------------------------------------------

    if prepared_by and prepared_by != "All Auditors":
        query = query.filter( db.Report.generated_by == prepared_by )

    # --------------------------------------------------------
    # DATE RANGE
    # --------------------------------------------------------

    if from_date:
        start_datetime = datetime.combine( from_date, datetime.min.time() )
        query = query.filter( db.Report.generated_at >= start_datetime )

    if to_date:
        end_datetime = datetime.combine( to_date + timedelta(days=1), datetime.min.time() )
        query = query.filter( db.Report.generated_at < end_datetime )

    reports = ( query .order_by( db.Report.generated_at.desc() ) .all() )

    # ========================================================
    # KPI COUNTS
    # ========================================================

    total_reports = len(reports)

    published = 0
    drafts = 0
    pending = 0
    archived = 0

    for report in reports:

        status = _report_display_status( report.status )

        if status == "Published":
            published += 1

        elif status == "Draft":
            drafts += 1

        elif status == "Pending Approval":
            pending += 1

        elif status == "Archived":
            archived += 1

    total_downloads = sum( int(report.download_count or 0) for report in reports )

    # --------------------------------------------------------
    # PREVIOUS MONTH COMPARISON
    # --------------------------------------------------------

    now = datetime.now()
    current_month_start = datetime( now.year, now.month, 1 )

    current_month_reports = sum( 1
        for report in reports
        if report.generated_at and report.generated_at >= current_month_start
    )

    # ========================================================
    # REPORT TYPE BREAKDOWN
    # ========================================================

    type_counts = {
        "Audit Report": 0,
        "Compliance Report": 0,
        "Summary Report": 0,
        "Exception Report": 0,
        "Other Reports": 0
    }

    for report in reports:
        display_type = _report_display_type( report )
        type_counts[ display_type ] += 1

    type_breakdown = []

    for label, count in type_counts.items():
        percentage = ( (count / total_reports) * 100
            if total_reports
            else 0 )
        type_breakdown.append({
            "type": label,
            "count": count,
            "percentage": round( percentage, 1 )
        })

    # ========================================================
    # STATUS BREAKDOWN
    # ========================================================

    status_counts = { "Published": published, "Draft": drafts, "Pending Approval": pending, "Archived": archived }

    status_breakdown = []

    for label, count in status_counts.items():
        percentage = ( (count / total_reports) * 100
            if total_reports
            else 0 )
        status_breakdown.append({ "status": label, "count": count, "percentage": round( percentage, 1 ) })

    # ========================================================
    # SIX-MONTH TREND
    # ========================================================

    trend = []

    # First day of current month
    month_cursor = datetime( now.year, now.month, 1 )

    months = []

    for i in range(trend_months - 1, -1, -1):

        month_number = month_cursor.month - i
        year = month_cursor.year

        while month_number <= 0:
            month_number += 12
            year -= 1

        months.append( (year, month_number) )

    for year, month in months:

        count = 0

        for report in reports:

            if not report.generated_at:
                continue

            if ( report.generated_at.year == year and report.generated_at.month == month ):
                count += 1

        label = datetime( year, month, 1 ).strftime("%b %Y")

        trend.append({ "month": label, "count": count })

    # ========================================================
    # RECENT REPORTS
    # ========================================================

    recent_reports = []

    for report in reports[:5]:
        recent_reports.append({
            "id": report.id,
            "report_name": report.report_name,
            "report_type": _report_display_type( report ),
            "audit_assignment": report.description or report.category or "General Report",
            "prepared_by": report.generated_by or "System",
            "generated_at": ( report.generated_at.isoformat()
                if report.generated_at
                else None ),
            "status": _report_display_status( report.status ),
            "format": report.format or "",
            "file_size": report.file_size or "",
            "download_count": int( report.download_count or 0 )
        })

    # ========================================================
    # TOP REPORTS BY DOWNLOADS
    # ========================================================

    top_downloaded = sorted( reports, key=lambda report: int( report.download_count or 0 ), reverse=True )[:5]

    top_reports = []

    for report in top_downloaded:
        top_reports.append({
            "id": report.id,
            "report_name": report.report_name,
            "report_type": _report_display_type( report ),
            "download_count": int( report.download_count or 0 ),
            "format": report.format or ""
        })

    # ========================================================
    # RETURN
    # ========================================================

    return {
        "success": True,
        "kpis": {
            "total_reports": total_reports,
            "published_reports": published,
            "draft_reports": drafts,
            "pending_approval": pending,
            "archived_reports": archived,
            "downloads_this_month": total_downloads
        },
        "current_month_reports": current_month_reports,
        "type_breakdown": type_breakdown,
        "status_breakdown": status_breakdown,
        "trend": trend,
        "recent_reports": recent_reports,
        "top_reports": top_reports
    }


# ============================================================
# AUDITOR COMPLIANCE TRACKER
# ============================================================

def get_auditor_compliance_requirements(
    database: Session,
    search: Optional[str] = None,
    status: Optional[str] = None,
    framework: Optional[str] = None,
    page: int = 1,
    limit: int = 10,
):
    page = max(int(page or 1), 1)
    limit = min(max(int(limit or 10), 1), 100)

    query = ( database.query( db.ComplianceRequirement, db.ComplianceFramework, db.Audit ) .join(
            db.ComplianceFramework,
            db.ComplianceRequirement.framework_id == db.ComplianceFramework.id
        ) .outerjoin( db.Audit, db.ComplianceRequirement.audit_id == db.Audit.id )
        .filter( db.ComplianceRequirement.is_active == True ) )

    if search:
        value = f"%{search.strip()}%"
        query = query.filter( or_(
                db.ComplianceRequirement.requirement_id.ilike(value),
                db.ComplianceRequirement.requirement.ilike(value),
                db.ComplianceRequirement.entity_department.ilike(value),
                db.ComplianceFramework.name.ilike(value),
            )
        )

    if status and status != "All":
        if status == "Compliant":
            query = query.filter( func.lower( db.ComplianceRequirement.status ) == "compliant" )

        elif status == "Partially Compliant":
            query = query.filter( func.lower( db.ComplianceRequirement.status
                ).in_([ "partial", "partially compliant", "partially_compliant" ]) )

        elif status == "Non-Compliant":
            query = query.filter( func.lower( db.ComplianceRequirement.status
                ).in_([ "non-compliant", "non compliant", "noncompliant" ]) )

        elif status == "Not Assessed":
            query = query.filter( func.lower( db.ComplianceRequirement.status ) == "not assessed" )

    if framework and framework != "All":
        query = query.filter( db.ComplianceFramework.name == framework )

    total = query.count()

    rows = ( query .order_by( db.ComplianceRequirement.next_review.asc().nullslast(),
            db.ComplianceRequirement.id.desc()
        ) .offset((page - 1) * limit) .limit(limit) .all()
    )

    requirements = []

    for requirement, framework_obj, audit in rows:
        requirements.append({
            "id": requirement.id,
            "requirement_id": requirement.requirement_id,
            "requirement": requirement.requirement,
            "framework": ( framework_obj.name
                if framework_obj
                else "—" ),
            "framework_id": ( framework_obj.id
                if framework_obj
                else None ),
            "audit_id": ( audit.id
                if audit
                else None ),
            "audit_assignment": ( audit.title
                if audit
                else "—" ),
            "entity_department": ( requirement.entity_department or "—" ),
            "status": ( requirement.status or "Not Assessed" ),
            "compliance_score": round( float( requirement.compliance_score or 0 ), 1 ),
            "last_assessed": ( requirement.last_assessed.isoformat()
                if requirement.last_assessed
                else None ),
            "next_review": ( requirement.next_review.isoformat()
                if requirement.next_review
                else None ),
            "gap_area": requirement.gap_area,
            "description": requirement.description,
        })

    return {
        "requirements": requirements,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": max( 1, (total + limit - 1) // limit ),
        }
    }


def get_auditor_compliance_dashboard( database: Session, current_user=None, trend_months: int = 6, ):
    requirements = ( database.query(db.ComplianceRequirement) .filter( db.ComplianceRequirement.is_active == True ) .all() )

    total = len(requirements)

    compliant = sum( 1 for item in requirements
        if str(item.status or "").lower() == "compliant"
    )

    partial = sum( 1 for item in requirements
        if str(item.status or "").lower() in { "partial", "partially compliant", "partially_compliant" }
    )

    non_compliant = sum( 1 for item in requirements
        if str(item.status or "").lower() in { "non-compliant", "non compliant", "noncompliant" }
    )

    not_assessed = total - ( compliant + partial + non_compliant )

    overall_score = ( sum( float(item.compliance_score or 0)
            for item in requirements
        ) / total
        if total
        else 0
    )

    # --------------------------------------------------------
    # FRAMEWORK BREAKDOWN
    # --------------------------------------------------------

    framework_rows = ( database.query( db.ComplianceFramework.name,
            func.avg( db.ComplianceRequirement.compliance_score ).label("score")
        ) .join(
            db.ComplianceRequirement,
            db.ComplianceRequirement.framework_id == db.ComplianceFramework.id
        ) .filter( db.ComplianceRequirement.is_active == True )
        .group_by( db.ComplianceFramework.name )
        .order_by( func.avg( db.ComplianceRequirement.compliance_score ).desc() ) .all()
    )

    frameworks = [
        { "name": name, "score": round( float(score or 0), 1 ) }
        for name, score in framework_rows
    ]

    # --------------------------------------------------------
    # TREND
    # --------------------------------------------------------

    history = ( database.query( db.ComplianceRequirementHistory ) .order_by(
            db.ComplianceRequirementHistory.year.asc(),
            db.ComplianceRequirementHistory.id.asc()
        ) .limit(max(trend_months, 1)) .all()
    )

    trend = [
        {
            "month": row.month,
            "year": row.year,
            "score": round( float(row.compliance_score or 0), 1 )
        }
        for row in history
    ]

    # Fallback if no history exists
    if not trend:
        today = date.today()
        for i in range( min(trend_months, today.month) ):
            trend.append({
                "month": today.strftime("%b"),
                "year": today.year,
                "score": round( overall_score, 1 )
            })

    # --------------------------------------------------------
    # UPCOMING REVIEWS
    # --------------------------------------------------------

    upcoming = ( database.query( db.ComplianceRequirement, db.ComplianceFramework ) .join(
            db.ComplianceFramework,
            db.ComplianceRequirement.framework_id == db.ComplianceFramework.id
        ) .filter(
            db.ComplianceRequirement.is_active == True,
            db.ComplianceRequirement.next_review != None
        ) .order_by( db.ComplianceRequirement.next_review.asc() ) .limit(5) .all()
    )

    upcoming_reviews = []

    today = date.today()

    for requirement, framework in upcoming:
        days_left = ( requirement.next_review - today ).days
        upcoming_reviews.append({
            "id": requirement.id,
            "title": ( f"{framework.name} Review" ),
            "framework": framework.name,
            "department": ( requirement.entity_department or "—" ),
            "review_date": ( requirement.next_review.isoformat() ),
            "days_left": days_left
        })

    # --------------------------------------------------------
    # GAPS
    # --------------------------------------------------------

    gap_rows = ( database.query(
            db.ComplianceRequirement.gap_area,
            func.count( db.ComplianceRequirement.id ) )
        .filter(
            db.ComplianceRequirement.is_active == True,
            db.ComplianceRequirement.status.in_([
                "Non-Compliant", "Non compliant", "Partially Compliant", "Partial"
            ])
        )
        .group_by( db.ComplianceRequirement.gap_area )
        .order_by( func.count( db.ComplianceRequirement.id ).desc() ) .limit(5) .all()
    )

    gaps = [ { "area": area or "Other", "count": count } for area, count in gap_rows ]

    # --------------------------------------------------------
    # RECENT ACTIVITIES
    # --------------------------------------------------------

    activity_rows = ( database.query( db.ComplianceActivity )
        .order_by( db.ComplianceActivity.activity_date.desc(), db.ComplianceActivity.id.desc() )
        .limit(5) .all()
    )

    activities = [
        {
            "id": item.id,
            "activity": item.activity,
            "category": item.category,
            "status": item.status,
            "date": ( item.activity_date.isoformat()
                if item.activity_date
                else None ),
            "assigned_to": item.assigned_to
        }
        for item in activity_rows
    ]

    return {
        "success": True,
        "user": (
            {
                "id": current_user.id,
                "name": current_user.name,
                "role": current_user.role,
            }
            if current_user
            else None
        ),
        "kpis": {
            "overall_score": round( overall_score, 1 ),
            "compliant": compliant,
            "partially_compliant": partial,
            "non_compliant": non_compliant,
            "total_requirements": total,
            "not_assessed": not_assessed,
        },
        "status_overview": {
            "compliant": compliant,
            "partially_compliant": partial,
            "non_compliant": non_compliant,
            "not_applicable": 0,
            "not_assessed": not_assessed,
            "total": total,
        },
        "frameworks": frameworks,
        "trend": trend,
        "requirements": ( get_auditor_compliance_requirements( database, page=1, limit=5 ) ),
        "upcoming_reviews": upcoming_reviews,
        "gaps": gaps,
        "activities": activities,
    }


# ============================================================
# AUDITOR - RECOMMENDATIONS
# ============================================================

def _recommendation_display_id(
    recommendation_id: int,
    created_at=None
):
    year = (
        created_at.year
        if created_at
        else datetime.utcnow().year
    )

    return f"REC-{year}-{recommendation_id:03d}"


def _recommendation_status(
    recommendation,
    today=None
):
    """
    Overdue is derived from due_date.
    We do not need to permanently store 'Overdue'.
    """

    today = today or date.today()

    status = str(
        recommendation.status or "Pending"
    ).strip()

    if (
        recommendation.due_date
        and recommendation.due_date < today
        and status.lower() not in {
            "implemented",
            "completed",
            "closed"
        }
    ):
        return "Overdue"

    if status.lower() in {"implemented", "completed"}:
        return "Implemented"

    if status.lower() in {
        "in progress",
        "in_progress"
    }:
        return "In Progress"

    return "Pending"


def _recommendation_to_dict(
    database,
    recommendation
):

    audit = (
        database.query(db.Audit)
        .filter(
            db.Audit.id ==
            recommendation.audit_id
        )
        .first()
    )

    assigned_user = None

    if recommendation.assigned_to:

        assigned_user = (
            database.query(db.User)
            .filter(
                db.User.id ==
                recommendation.assigned_to
            )
            .first()
        )

    return {
        "id": recommendation.id,

        "recommendation_id":
            _recommendation_display_id(
                recommendation.id,
                recommendation.created_at
            ),

        "audit_id":
            recommendation.audit_id,

        "audit_number":
            audit.audit_number
            if audit
            else None,

        "audit_title": audit.title
            if audit
            else "Unknown Audit",

        "title": recommendation.title,

        "description": recommendation.description,

        "category": recommendation.category,

        "priority": recommendation.priority,

        "status": _recommendation_status( recommendation ),

        "assigned_to": recommendation.assigned_to,

        "assigned_to_name": assigned_user.name
            if assigned_user
            else "Unassigned",

        "due_date": recommendation.due_date.isoformat()
            if recommendation.due_date
            else None,

        "implemented_date": recommendation.implemented_date.isoformat()
            if recommendation.implemented_date
            else None,

        "impact": recommendation.impact,

        "risk_reduction": float( recommendation.risk_reduction or 0 ),

        "control_improvement": float( recommendation.control_improvement or 0 ),

        "cost_savings": float( recommendation.cost_savings or 0 ),

        "created_at":
            recommendation.created_at.isoformat()
            if recommendation.created_at
            else None,

        "updated_at":
            recommendation.updated_at.isoformat()
            if recommendation.updated_at
            else None
    }


def get_recommendations_dashboard(
    database: Session,
    current_user,
    search=None,
    priority=None,
    status=None,
    category=None,
    page=1,
    limit=5
):

    today = date.today()

    page = max( int(page or 1), 1 )

    limit = min( max(int(limit or 5), 1), 100 )

    # ---------------------------------------------------------
    # AUDITS ASSIGNED TO CURRENT AUDITOR
    # ---------------------------------------------------------

    assignment_rows = ( database.query( db.AuditAssignment.audit_id )
        .filter( db.AuditAssignment.auditor_id == current_user.id ) .all()
    )

    audit_ids = [ row[0]
        for row in assignment_rows
    ]

    # ---------------------------------------------------------
    # BASE QUERY
    # ---------------------------------------------------------

    query = database.query( db.AuditRecommendation )

    if audit_ids:
        query = query.filter( db.AuditRecommendation.audit_id.in_( audit_ids ) )

    else:
        query = query.filter( db.AuditRecommendation.id == -1 )

    # ---------------------------------------------------------
    # SEARCH
    # ---------------------------------------------------------

    if search:
        value = ( f"%{search.strip()}%" )
        matching_audits = ( database.query(db.Audit.id) .filter( or_(
                    db.Audit.title.ilike(value),
                    db.Audit.audit_number.ilike(value),
                    db.Audit.entity_name.ilike(value)
                ) ) .all()
        )
        matching_audit_ids = [ row[0]
            for row in matching_audits
        ]
        conditions = [
            db.AuditRecommendation.title.ilike( value ),
            db.AuditRecommendation.description.ilike( value ),
            db.AuditRecommendation.category.ilike( value )
        ]
        if matching_audit_ids:
            conditions.append( db.AuditRecommendation.audit_id.in_( matching_audit_ids ) )
        query = query.filter( or_(*conditions) )

    # ---------------------------------------------------------
    # PRIORITY
    # ---------------------------------------------------------

    if priority and priority != "All":
        query = query.filter( db.AuditRecommendation.priority == priority )

    # ---------------------------------------------------------
    # CATEGORY
    # ---------------------------------------------------------

    if category and category != "All":
        query = query.filter( db.AuditRecommendation.category == category )

    # ---------------------------------------------------------
    # STATUS
    # ---------------------------------------------------------

    all_rows = query.all()

    filtered_rows = []

    for recommendation in all_rows:

        display_status = _recommendation_status( recommendation, today )

        if status and status != "All":

            if display_status != status:
                continue

        filtered_rows.append( recommendation )

    # ---------------------------------------------------------
    # TOTAL
    # ---------------------------------------------------------

    total = len(filtered_rows)

    total_pages = max( 1, (total + limit - 1) // limit )

    if page > total_pages:
        page = total_pages

    offset = ( (page - 1) * limit )

    rows = (
        sorted( filtered_rows, key=lambda x: x.created_at or datetime.min, reverse=True )
        [offset:offset + limit]
    )

    items = [ _recommendation_to_dict( database, recommendation )
        for recommendation in rows ]

    # =========================================================
    # KPI
    # =========================================================

    total_recommendations = len( all_rows )

    implemented = 0
    in_progress = 0
    pending = 0
    overdue = 0

    for recommendation in all_rows:

        display_status = _recommendation_status( recommendation, today )

        if display_status == "Implemented":
            implemented += 1

        elif display_status == "In Progress":
            in_progress += 1

        elif display_status == "Overdue":
            overdue += 1

        else:
            pending += 1

    # =========================================================
    # PRIORITY DISTRIBUTION
    # =========================================================

    priority_names = [ "High", "Medium", "Low", "Informational" ]

    priority_breakdown = []

    for priority_name in priority_names:

        count = sum( 1
            for x in all_rows
            if str( x.priority or "" ).strip().lower() == priority_name.lower() )

        percentage = ( (count / total_recommendations) * 100
            if total_recommendations
            else 0
        )

        priority_breakdown.append({
            "priority": priority_name, "count": count, "percentage": round( percentage, 1 )
        })

    # =========================================================
    # IMPLEMENTATION STATUS
    # =========================================================

    status_counts = { "Implemented": implemented, "In Progress": in_progress, "Pending": pending, "Overdue": overdue }

    implementation_breakdown = []

    for label, count in status_counts.items():
        percentage = ( (count / total_recommendations) * 100
            if total_recommendations
            else 0 )
        implementation_breakdown.append({
            "status": label, "count": count, "percentage": round( percentage, 1 )
        })

    # =========================================================
    # SIX MONTH TREND
    # =========================================================

    trend = []

    current_month = date( today.year, today.month, 1  )

    for i in range(5, -1, -1):
        month = current_month.month - i
        year = current_month.year

        while month <= 0:
            month += 12
            year -= 1
        start = date( year, month, 1 )

        if month == 12:
            end = date( year + 1, 1, 1 )

        else:
            end = date( year, month + 1, 1 )

        count = sum( 1
            for recommendation in all_rows
            if ( recommendation.created_at and start <= recommendation.created_at.date() < end ) )

        trend.append({ "month": start.strftime("%b %Y"), "count": count })

    # =========================================================
    # OVERDUE
    # =========================================================

    overdue_items = []

    for recommendation in all_rows:

        display_status = _recommendation_status( recommendation,  today )

        if display_status != "Overdue":
            continue

        item = _recommendation_to_dict( database, recommendation )

        days_overdue = ( today - recommendation.due_date ).days

        item["days_overdue"] = ( days_overdue )

        overdue_items.append( item )

    overdue_items.sort( key=lambda x: x["days_overdue"], reverse=True )

    # =========================================================
    # IMPACT DISTRIBUTION
    # =========================================================

    impact_names = [ "High", "Medium", "Low", "Informational" ]

    impact_breakdown = []

    for impact_name in impact_names:

        count = sum( 1
            for x in all_rows
            if str( x.impact or "" ).lower() == impact_name.lower() )

        percentage = ( (count / total_recommendations) * 100
            if total_recommendations
            else 0 )

        impact_breakdown.append({
            "impact": impact_name, "count": count, "percentage": round( percentage, 1 )
        })

    # =========================================================
    # POTENTIAL IMPACT
    # =========================================================

    risk_reduction_values = [ float( x.risk_reduction or 0 )
        for x in all_rows
    ]

    control_improvement_values = [ float( x.control_improvement or 0 )
        for x in all_rows
    ]

    current_year = today.year

    cost_savings_this_year = sum( float( x.cost_savings or 0 )
        for x in all_rows
        if ( x.created_at and x.created_at.year == current_year )
    )

    average_risk_reduction = (
        sum(risk_reduction_values) / len(risk_reduction_values)
        if risk_reduction_values
        else 0
    )

    average_control_improvement = (
        sum(control_improvement_values) / len(control_improvement_values)
        if control_improvement_values
        else 0
    )

    # =========================================================
    # RETURN
    # =========================================================

    return {
        "success": True,
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": current_user.role,
            "profile_image": getattr( current_user, "profile_image", None )
        },
        "kpis": {
            "total": total_recommendations,
            "implemented": implemented,
            "in_progress": in_progress,
            "pending": pending,
            "overdue": overdue
        },
        "priority_breakdown": priority_breakdown,
        "implementation_breakdown": implementation_breakdown,
        "impact_breakdown": impact_breakdown,
        "trend": trend,
        "items": items,
        "overdue_items": overdue_items[:5],
        "potential_impact": {
            "risk_reduction": round( average_risk_reduction, 1 ),
            "control_improvement": round( average_control_improvement, 1 ),
            "cost_savings": round( cost_savings_this_year, 2 )
        },
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": total_pages
        }
    }


def create_audit_recommendation( database: Session, data, current_user ):

    # Auditor can create recommendation
    # only against an audit assigned to them.

    assignment = ( database.query( db.AuditAssignment ) .filter(
            db.AuditAssignment.audit_id == data.audit_id,
            db.AuditAssignment.auditor_id == current_user.id
        ) .first()
    )

    if not assignment:
        raise HTTPException( status_code=403,
            detail=( "You can only create recommendations for audits assigned to you." ) )

    recommendation = db.AuditRecommendation(
        audit_id=data.audit_id,
        title=data.title.strip(),
        description=data.description,
        category=data.category or "Operational",
        priority=data.priority or "Medium",
        status=data.status or "Pending",
        assigned_to=data.assigned_to,
        due_date=data.due_date,
        impact=data.impact or "Medium",
        risk_reduction=data.risk_reduction or 0,
        control_improvement= data.control_improvement or 0,
        cost_savings= data.cost_savings or 0,
        created_by=current_user.id
    )

    database.add( recommendation )

    database.commit()

    database.refresh( recommendation )

    return _recommendation_to_dict( database, recommendation )


def get_audit_recommendation( database: Session, recommendation_id: int, current_user ):

    recommendation = ( database.query(db.AuditRecommendation ) .filter( db.AuditRecommendation.id == recommendation_id ) .first() )

    if not recommendation:
        raise HTTPException( status_code=404, detail="Recommendation not found." )

    assignment = ( database.query( db.AuditAssignment ) .filter(
            db.AuditAssignment.audit_id == recommendation.audit_id,
            db.AuditAssignment.auditor_id == current_user.id
        ) .first()
    )

    if not assignment:
        raise HTTPException( status_code=403, detail="Access denied." )

    return _recommendation_to_dict( database, recommendation )


def update_audit_recommendation( database: Session, recommendation_id: int, data, current_user ):

    recommendation = ( database.query( db.AuditRecommendation ) .filter( db.AuditRecommendation.id == recommendation_id ) .first() )

    if not recommendation:
        raise HTTPException( status_code=404, detail="Recommendation not found." )

    assignment = ( database.query( db.AuditAssignment ) .filter(
            db.AuditAssignment.audit_id == recommendation.audit_id,
            db.AuditAssignment.auditor_id == current_user.id
        ) .first()
    )

    if not assignment:
        raise HTTPException( status_code=403, detail="Access denied." )

    update_data = data.model_dump( exclude_unset=True )

    for field, value in update_data.items():
        if ( field == "title" and value ):
            value = value.strip()
        setattr( recommendation, field, value )

    if ( "status" in update_data and update_data["status"] in { "Implemented", "Completed" } ):

        recommendation.status = "Implemented"

        if not recommendation.implemented_date:
            recommendation.implemented_date = ( date.today() )

    database.commit()

    database.refresh( recommendation )

    return _recommendation_to_dict( database, recommendation )


def delete_audit_recommendation( database: Session, recommendation_id: int, current_user ):

    recommendation = ( database.query( db.AuditRecommendation ) .filter( db.AuditRecommendation.id == recommendation_id ) .first() )

    if not recommendation:
        raise HTTPException( status_code=404, detail="Recommendation not found." )

    assignment = ( database.query( db.AuditAssignment ) .filter(
            db.AuditAssignment.audit_id == recommendation.audit_id,
            db.AuditAssignment.auditor_id == current_user.id
        ) .first()
    )

    if not assignment:
        raise HTTPException( status_code=403, detail="Access denied." )

    database.delete( recommendation )

    database.commit()

    return { "success": True, "message": "Recommendation deleted successfully." }


# ============================================================
# AUDITOR ANALYTICS DASHBOARD
# ============================================================

def get_auditor_analytics_dashboard(
    database: Session,
    current_user,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    trend_months: int = 6,
):
    """
    Complete data source for Auditor Analytics page.

    Uses existing:
        Audit
        AuditAssignment
        AuditFinding
        AuditRecommendation
        ComplianceRequirementHistory
        User

    No additional database table is required.
    """

    today = date.today()

    # ---------------------------------------------------------
    # DATE RANGE
    # ---------------------------------------------------------

    if end_date is None:
        end_date = today

    if start_date is None:
        start_date = end_date.replace(day=1)

    if start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be greater than end_date."
        )

    trend_months = max(
        min(int(trend_months or 6), 12),
        1
    )

    start_datetime = datetime.combine(
        start_date,
        datetime.min.time()
    )

    end_datetime = datetime.combine(
        end_date,
        datetime.max.time()
    )

    # ---------------------------------------------------------
    # PREVIOUS PERIOD
    # ---------------------------------------------------------

    period_days = (
        end_date - start_date
    ).days + 1

    previous_end = start_date - timedelta(days=1)

    previous_start = (
        previous_end -
        timedelta(days=period_days - 1)
    )

    previous_start_datetime = datetime.combine(
        previous_start,
        datetime.min.time()
    )

    previous_end_datetime = datetime.combine(
        previous_end,
        datetime.max.time()
    )

    # ---------------------------------------------------------
    # HELPERS
    # ---------------------------------------------------------

    def normalize_status(value):
        value = str(value or "").strip().lower()

        if value in {
            "completed",
            "complete",
            "closed",
            "published"
        }:
            return "Completed"

        if value in {
            "in progress",
            "in_progress",
            "active"
        }:
            return "In Progress"

        if value in {
            "planned",
            "scheduled"
        }:
            return "Planned"

        if value in {
            "not started",
            "not_started"
        }:
            return "Not Started"

        if value in {
            "under review",
            "under_review",
            "pending review"
        }:
            return "In Progress"

        return str(value or "Not Started").title()

    def completion_date(audit):
        status = normalize_status(audit.status)

        if status != "Completed":
            return None

        if audit.end_date:
            return audit.end_date

        if audit.updated_at:
            return audit.updated_at.date()

        return None

    def in_range(value, range_start, range_end):
        if value is None:
            return False

        return (
            value >= range_start
            and value <= range_end
        )

    # ---------------------------------------------------------
    # ALL AUDITS
    # ---------------------------------------------------------

    audits = (
        database.query(db.Audit)
        .order_by(db.Audit.created_at.desc())
        .all()
    )

    current_audits = [
        audit
        for audit in audits
        if audit.created_at
        and in_range(
            audit.created_at.date(),
            start_date,
            end_date
        )
    ]

    previous_audits = [
        audit
        for audit in audits
        if audit.created_at
        and in_range(
            audit.created_at.date(),
            previous_start,
            previous_end
        )
    ]

    total_audits = len(current_audits)

    # ---------------------------------------------------------
    # COMPLETED AUDITS
    # ---------------------------------------------------------

    completed_audits = [
        audit
        for audit in audits
        if completion_date(audit)
        and in_range(
            completion_date(audit),
            start_date,
            end_date
        )
    ]

    previous_completed_audits = [
        audit
        for audit in audits
        if completion_date(audit)
        and in_range(
            completion_date(audit),
            previous_start,
            previous_end
        )
    ]

    completed_count = len(completed_audits)

    # ---------------------------------------------------------
    # FINDINGS
    # ---------------------------------------------------------

    findings = (
        database.query(db.AuditFinding)
        .order_by(db.AuditFinding.created_at.desc())
        .all()
    )

    current_findings = [
        finding
        for finding in findings
        if finding.identified_date
        and in_range(
            finding.identified_date,
            start_date,
            end_date
        )
    ]

    previous_findings = [
        finding
        for finding in findings
        if finding.identified_date
        and in_range(
            finding.identified_date,
            previous_start,
            previous_end
        )
    ]

    issues_identified = len(current_findings)

    previous_issues = len(previous_findings)

    # ---------------------------------------------------------
    # OPEN ISSUES
    # ---------------------------------------------------------

    open_statuses = {
        "open",
        "in progress",
        "in_progress",
        "pending",
        "reopened"
    }

    open_issues = sum(
        1
        for finding in findings
        if str(finding.status or "")
        .strip()
        .lower()
        in open_statuses
    )

    previous_open_issues = sum(
        1
        for finding in previous_findings
        if str(finding.status or "")
        .strip()
        .lower()
        in open_statuses
    )

    # ---------------------------------------------------------
    # COMPLIANCE
    # ---------------------------------------------------------

    compliance_values = [
        float(audit.compliance_score or 0)
        for audit in current_audits
        if audit.compliance_score is not None
    ]

    if compliance_values:
        avg_compliance = (
            sum(compliance_values)
            / len(compliance_values)
        )
    else:
        avg_compliance = 0

    previous_compliance_values = [ float(audit.compliance_score or 0)
        for audit in previous_audits
        if audit.compliance_score is not None
    ]

    previous_avg_compliance = ( sum(previous_compliance_values) / len(previous_compliance_values)
        if previous_compliance_values
        else 0
    )

    compliance_change = ( avg_compliance - previous_avg_compliance )

    # ---------------------------------------------------------
    # RECOMMENDATIONS
    # ---------------------------------------------------------

    recommendations = ( database.query(db.AuditRecommendation) .order_by( db.AuditRecommendation.created_at.desc() ) .all() )

    current_recommendations = [
        item
        for item in recommendations
        if item.created_at
        and in_range( item.created_at.date(), start_date, end_date )
    ]

    recommendations_count = len( current_recommendations )

    previous_recommendations = [
        item
        for item in recommendations
        if item.created_at
        and in_range( item.created_at.date(), previous_start, previous_end )
    ]

    # ---------------------------------------------------------
    # MONTH GENERATOR
    # ---------------------------------------------------------

    month_starts = []

    cursor = end_date.replace(day=1)

    for _ in range(trend_months):
        month_starts.append(cursor)

        cursor = ( cursor - timedelta(days=1) ).replace(day=1)

    month_starts.reverse()

    def month_end(month_start):
        if month_start.month == 12:
            next_month = date( month_start.year + 1, 1, 1 )
        else:
            next_month = date( month_start.year, month_start.month + 1, 1 )

        return next_month - timedelta(days=1)

    # ---------------------------------------------------------
    # AUDIT ACTIVITY TREND
    # ---------------------------------------------------------

    audit_activity = []

    for month_start in month_starts:

        month_last = month_end( month_start )

        initiated = sum( 1
            for audit in audits
            if audit.created_at
            and in_range( audit.created_at.date(), month_start, month_last )
        )

        completed = sum( 1
            for audit in audits
            if completion_date(audit)
            and in_range( completion_date(audit), month_start, month_last )
        )

        audit_activity.append({
            "month": month_start.strftime("%b %Y"),
            "short_month": month_start.strftime("%b"),
            "initiated": initiated,
            "completed": completed
        })

    # ---------------------------------------------------------
    # ISSUE TREND BY SEVERITY
    # ---------------------------------------------------------

    severity_names = [ "High", "Medium", "Low", "Informational" ]

    issues_trend = []

    for month_start in month_starts:

        month_last = month_end( month_start )

        monthly_findings = [ finding
            for finding in findings
            if finding.identified_date
            and in_range( finding.identified_date, month_start, month_last )
        ]

        severity_data = {}

        for severity in severity_names:
            severity_data[severity] = sum( 1
                for finding in monthly_findings
                if str( finding.severity or "" ).strip().lower() == severity.lower()
            )

        issues_trend.append({
            "month": month_start.strftime("%b %Y"),
            "short_month": month_start.strftime("%b"),
            "high": severity_data["High"],
            "medium": severity_data["Medium"],
            "low": severity_data["Low"],
            "informational": severity_data["Informational"],
            "total": len(monthly_findings)
        })

    # ---------------------------------------------------------
    # COMPLIANCE TREND
    # ---------------------------------------------------------

    compliance_history = ( database.query( db.ComplianceRequirementHistory ) .order_by(
            db.ComplianceRequirementHistory.year.asc(),
            db.ComplianceRequirementHistory.id.asc()
        ) .all()
    )

    history_map = {}

    for row in compliance_history:
        month_key = str( row.month or "" ).strip()[:3].lower()
        history_map[ (row.year, month_key) ] = float( row.compliance_score or 0 )

    compliance_trend = []

    for month_start in month_starts:

        key = ( month_start.year, month_start.strftime("%b").lower() )

        score = history_map.get(key)

        # Fallback to audit compliance score
        # when history is unavailable.
        if score is None:

            monthly_audits = [ audit
                for audit in audits
                if audit.created_at
                and audit.created_at.date() >= month_start
                and audit.created_at.date() <= month_end(month_start)
            ]

            monthly_scores = [
                float(audit.compliance_score or 0)
                for audit in monthly_audits
                if audit.compliance_score is not None
            ]

            score = (
                sum(monthly_scores) / len(monthly_scores)
                if monthly_scores
                else 0
            )

        compliance_trend.append({
            "month": month_start.strftime("%b %Y"),
            "short_month": month_start.strftime("%b"),
            "score": round(score, 1)
        })

    # ---------------------------------------------------------
    # FINDINGS BY CATEGORY
    # ---------------------------------------------------------

    category_counts = defaultdict(int)

    for finding in current_findings:

        category = ( str(finding.category or "") .strip() or "Other" )

        category_counts[category] += 1

    findings_by_category = [
        { "category": category, "count": count }
        for category, count in sorted( category_counts.items(), key=lambda item: item[1], reverse=True )
    ]

    # ---------------------------------------------------------
    # TOP AUDITED AREAS
    # ---------------------------------------------------------

    area_counts = defaultdict(int)

    for audit in current_audits:

        area = ( str(audit.entity_name or "") .strip() )

        if not area:
            area = ( str(audit.audit_type or "") .strip() )

        if not area:
            area = "Other"

        area_counts[area] += 1

    top_areas = [
        { "area": area, "count": count }
        for area, count
        in sorted( area_counts.items(), key=lambda item: item[1], reverse=True )[:5]
    ]

    # ---------------------------------------------------------
    # AUDIT STATUS DISTRIBUTION
    # ---------------------------------------------------------

    status_counts = defaultdict(int)

    for audit in current_audits:
        normalized = normalize_status( audit.status )
        status_counts[normalized] += 1

    status_distribution = [
        { "status": status, "count": count }
        for status, count
        in status_counts.items()
    ]

    # Ensure common statuses exist
    common_statuses = [ "Completed", "In Progress", "Planned", "Not Started" ]

    for status in common_statuses:

        if not any( item["status"] == status for item in status_distribution ):
            status_distribution.append({ "status": status, "count": 0 })

    status_distribution.sort( key=lambda item: item["count"], reverse=True )

    # ---------------------------------------------------------
    # FINDINGS BY AUDIT
    # ---------------------------------------------------------

    finding_count_by_audit = defaultdict(int)

    for finding in findings:
        finding_count_by_audit[ finding.audit_id ] += 1

    # ---------------------------------------------------------
    # ASSIGNMENTS
    # ---------------------------------------------------------

    current_audit_ids = [
        audit.id
        for audit in current_audits
    ]

    assignment_map = {}

    if current_audit_ids:

        assignments = ( database.query(db.AuditAssignment)
            .filter( db.AuditAssignment.audit_id.in_( current_audit_ids ) )
            .order_by( db.AuditAssignment.id.desc() ) .all()
        )

        for assignment in assignments:

            if assignment.audit_id not in assignment_map:
                assignment_map[ assignment.audit_id ] = assignment

    auditor_ids = {
        assignment.auditor_id
        for assignment in assignment_map.values()
        if assignment.auditor_id
    }

    user_map = {}

    if auditor_ids:
        users = ( database.query(db.User) .filter( db.User.id.in_(auditor_ids) ) .all() )
        user_map = {
            user.id: user
            for user in users
        }

    # ---------------------------------------------------------
    # RECENT AUDIT PERFORMANCE
    # ---------------------------------------------------------

    recent_performance = []

    for audit in current_audits[:10]:

        assignment = assignment_map.get( audit.id )

        auditor = (
            user_map.get( assignment.auditor_id )
            if assignment
            else None
        )

        audit_completion = ( completion_date(audit) )

        recent_performance.append({
            "audit_id": audit.id,
            "audit_number": audit.audit_number,
            "audit_title": audit.title,
            "audit_type": audit.audit_type,
            "entity_name": audit.entity_name,
            "status": normalize_status( audit.status ),
            "auditor": (
                auditor.name
                if auditor
                else "Unassigned"
            ),
            "auditor_id": (
                assignment.auditor_id
                if assignment
                else None
            ),
            "start_date": (
                audit.start_date.isoformat()
                if audit.start_date
                else None
            ),
            "completion_date": (
                audit_completion.isoformat()
                if audit_completion
                else None
            ),
            "issues_found": finding_count_by_audit.get( audit.id, 0 ),
            "compliance_score": (
                float( audit.compliance_score or 0 )
                if audit.compliance_score is not None
                else None
            ),
            "progress": float( audit.progress or 0 )
        })

    # ---------------------------------------------------------
    # INSIGHTS
    # ---------------------------------------------------------

    insights = []

    if compliance_change > 0:
        insights.append({
            "icon": "fa-shield-halved",
            "type": "success",
            "title": "Compliance score improved",
            "description": (
                f"Average compliance score increased "
                f"by {abs(compliance_change):.1f}% "
                f"compared with the previous period."
            )
        })
    elif compliance_change < 0:
        insights.append({
            "icon": "fa-triangle-exclamation",
            "type": "warning",
            "title": "Compliance score declined",
            "description": (
                f"Average compliance score decreased "
                f"by {abs(compliance_change):.1f}% "
                f"compared with the previous period."
            )
        })
    else:
        insights.append({
            "icon": "fa-shield-halved",
            "type": "info",
            "title": "Compliance score stable",
            "description": ( "No material change in the average compliance score was detected." )
        })

    high_current = sum( 1
        for finding in current_findings
        if str(finding.severity or "") .strip() .lower() == "high"
    )

    high_previous = sum( 1
        for finding in previous_findings
        if str(finding.severity or "") .strip() .lower() == "high"
    )

    if high_current > high_previous:
        insights.append({
            "icon": "fa-triangle-exclamation",
            "type": "warning",
            "title": "High severity issues increased",
            "description": (
                f"{high_current} high-severity "
                f"findings were identified in the "
                f"selected period."
            )
        })
    else:
        insights.append({
            "icon": "fa-circle-check",
            "type": "success",
            "title": "High severity issues controlled",
            "description": (
                "High-severity findings did not increase compared with the previous period."
            )
        })

    if top_areas:

        insights.append({
            "icon": "fa-chart-column",
            "type": "info",
            "title": "Most audited area",
            "description": (
                f"{top_areas[0]['area']} has the highest "
                f"number of audits in the selected period."
            )
        })

    completion_rate = (
        completed_count / total_audits * 100
        if total_audits
        else 0
    )

    insights.append({
        "icon": "fa-arrow-trend-up",
        "type": "success",
        "title": "Audit completion trend",
        "description": (
            f"{completion_rate:.1f}% of audits in the "
            f"selected period have been completed."
        )
    })

    # ---------------------------------------------------------
    # DELTA HELPER
    # ---------------------------------------------------------

    def delta(current, previous):
        return current - previous

    # ---------------------------------------------------------
    # RETURN
    # ---------------------------------------------------------

    return {
        "success": True,
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": current_user.role
        },
        "filters": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "trend_months": trend_months
        },
        "kpis": {
            "total_audits": total_audits,
            "completed_audits": completed_count,
            "issues_identified": issues_identified,
            "avg_compliance_score": round( avg_compliance, 1 ),
            "open_issues": open_issues,
            "recommendations": recommendations_count,
            "total_audits_change": delta( total_audits, len(previous_audits) ),
            "completed_audits_change": delta( completed_count, len(previous_completed_audits) ),
            "issues_identified_change": delta( issues_identified, previous_issues ),
            "compliance_change": round( compliance_change, 1 ),
            "open_issues_change": delta( open_issues, previous_open_issues ),
            "recommendations_change": delta( recommendations_count, len(previous_recommendations) )
        },
        "audit_activity": audit_activity,
        "issues_trend": issues_trend,
        "compliance_trend": compliance_trend,
        "findings_by_category": findings_by_category,
        "top_areas": top_areas,
        "status_distribution": status_distribution,
        "recent_performance": recent_performance,
        "insights": insights
    }


# ============================================================
# AUDITOR CALENDAR
# ============================================================

def _calendar_event_dict(event):
    return {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "event_type": event.event_type,
        "start_datetime": (
            event.start_datetime.isoformat()
            if event.start_datetime
            else None
        ),
        "end_datetime": (
            event.end_datetime.isoformat()
            if event.end_datetime
            else None
        ),
        "all_day": event.all_day,
        "location": event.location,
        "status": event.status,
        "audit_id": event.audit_id,
        "assignment_id": event.assignment_id,
        "created_by": event.created_by,
        "created_at": (
            event.created_at.isoformat()
            if event.created_at
            else None
        ),
        "updated_at": (
            event.updated_at.isoformat()
            if event.updated_at
            else None
        ),
        "source": "calendar"
    }


def _verify_auditor_audit_access(
    database,
    audit_id,
    current_user
):
    assignment = (
        database.query(db.AuditAssignment)
        .filter(
            db.AuditAssignment.audit_id == audit_id,
            db.AuditAssignment.auditor_id == current_user.id
        )
        .first()
    )

    if not assignment:
        raise HTTPException(
            status_code=403,
            detail="You are not assigned to this audit."
        )

    return assignment


def get_calendar_events(
    database,
    current_user,
    start_date=None,
    end_date=None,
    event_type=None,
    audit_id=None,
    include_completed=False
):
    """
    Return:
      1. Custom CalendarEvent records
      2. AuditAssignment/Audit scheduled events
      3. Audit due-date events
    """

    events = []

    # ========================================================
    # CUSTOM CALENDAR EVENTS
    # ========================================================

    query = (
        database.query(db.CalendarEvent)
        .filter(
            db.CalendarEvent.created_by == current_user.id
        )
    )

    if start_date:
        query = query.filter(
            db.CalendarEvent.start_datetime >= start_date
        )

    if end_date:
        query = query.filter(
            db.CalendarEvent.start_datetime <= end_date
        )

    if event_type and event_type != "All Event Types":
        query = query.filter(
            db.CalendarEvent.event_type == event_type
        )

    if audit_id:
        query = query.filter(
            db.CalendarEvent.audit_id == audit_id
        )

    if not include_completed:
        query = query.filter(
            db.CalendarEvent.status != "Completed"
        )

    custom_events = (
        query
        .order_by(
            db.CalendarEvent.start_datetime.asc()
        )
        .all()
    )

    for event in custom_events:
        item = _calendar_event_dict(event)
        events.append(item)

    # ========================================================
    # AUDIT ASSIGNMENTS
    # ========================================================

    assignment_query = (
        database.query(db.AuditAssignment)
        .join(
            db.Audit,
            db.Audit.id == db.AuditAssignment.audit_id
        )
        .filter(
            db.AuditAssignment.auditor_id == current_user.id
        )
    )

    if audit_id:
        assignment_query = assignment_query.filter(
            db.AuditAssignment.audit_id == audit_id
        )

    assignments = assignment_query.all()

    for assignment in assignments:

        audit = assignment.audit

        if not audit:
            continue

        # ----------------------------------------------------
        # Scheduled audit event
        # ----------------------------------------------------

        if audit.scheduled_date:

            start = audit.scheduled_date

            # Default duration = 2 hours
            end = start + timedelta(hours=2)

            if start_date and end < start_date:
                continue

            if end_date and start > end_date:
                continue

            events.append({
                "id": f"audit-{assignment.id}",
                "title": audit.title,
                "description": audit.description,
                "event_type": "Audit",
                "start_datetime": start.isoformat(),
                "end_datetime": end.isoformat(),
                "all_day": False,
                "location": audit.entity_name,
                "status": assignment.status,
                "audit_id": audit.id,
                "assignment_id": assignment.id,
                "created_by": audit.created_by,
                "created_at": (
                    audit.created_at.isoformat()
                    if audit.created_at
                    else None
                ),
                "updated_at": (
                    audit.updated_at.isoformat()
                    if audit.updated_at
                    else None
                ),
                "source": "audit"
            })

        # ----------------------------------------------------
        # Assignment due date
        # ----------------------------------------------------

        if assignment.due_date:

            due_datetime = datetime.combine(
                assignment.due_date,
                datetime.min.time()
            )

            if start_date and due_datetime < start_date:
                continue

            if end_date and due_datetime > end_date:
                continue

            events.append({
                "id": f"due-{assignment.id}",
                "title": f"{audit.title} - Due",
                "description": (
                    f"Audit assignment due for {audit.title}"
                ),
                "event_type": "Audit",
                "start_datetime": due_datetime.isoformat(),
                "end_datetime": due_datetime.isoformat(),
                "all_day": True,
                "location": audit.entity_name,
                "status": assignment.status,
                "audit_id": audit.id,
                "assignment_id": assignment.id,
                "created_by": audit.created_by,
                "created_at": (
                    audit.created_at.isoformat()
                    if audit.created_at
                    else None
                ),
                "updated_at": (
                    audit.updated_at.isoformat()
                    if audit.updated_at
                    else None
                ),
                "source": "assignment"
            })

    # ========================================================
    # SORT
    # ========================================================

    events.sort(
        key=lambda x: x.get("start_datetime") or ""
    )

    return {
        "success": True,
        "items": events,
        "total": len(events)
    }


def create_calendar_event(
    database,
    data,
    current_user
):

    # --------------------------------------------------------
    # VALIDATE EVENT TYPE
    # --------------------------------------------------------

    allowed_types = {
        "Audit",
        "Meeting",
        "Planning",
        "Review",
        "Compliance",
        "Reporting",
        "Other"
    }

    if data.event_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Invalid calendar event type."
        )

    # --------------------------------------------------------
    # VALIDATE DATES
    # --------------------------------------------------------

    if (
        data.end_datetime
        and data.end_datetime < data.start_datetime
    ):
        raise HTTPException(
            status_code=400,
            detail="End time cannot be before start time."
        )

    # --------------------------------------------------------
    # AUDIT ACCESS
    # --------------------------------------------------------

    assignment = None

    if data.audit_id:

        assignment = _verify_auditor_audit_access(
            database,
            data.audit_id,
            current_user
        )

    # --------------------------------------------------------
    # ASSIGNMENT ACCESS
    # --------------------------------------------------------

    if data.assignment_id:

        assignment = (
            database.query(db.AuditAssignment)
            .filter(
                db.AuditAssignment.id == data.assignment_id,
                db.AuditAssignment.auditor_id == current_user.id
            )
            .first()
        )

        if not assignment:
            raise HTTPException(
                status_code=403,
                detail="Invalid audit assignment."
            )

    event = db.CalendarEvent(
        title=data.title.strip(),
        description=data.description,
        event_type=data.event_type,
        start_datetime=data.start_datetime,
        end_datetime=data.end_datetime,
        all_day=data.all_day,
        location=data.location,
        status=data.status or "Scheduled",
        audit_id=data.audit_id,
        assignment_id=(
            data.assignment_id
            if data.assignment_id
            else (
                assignment.id
                if assignment and data.audit_id
                else None
            )
        ),
        created_by=current_user.id
    )

    database.add(event)

    # --------------------------------------------------------
    # AUDIT LOG
    # --------------------------------------------------------

    activity = db.AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.name,
        role=current_user.role,
        action="Calendar Event Created",
        description=(
            f"Calendar event '{event.title}' created."
        ),
        resource="CalendarEvent",
        resource_id="new",
        status="Success"
    )

    database.add(activity)

    database.commit()
    database.refresh(event)

    return _calendar_event_dict(event)


def update_calendar_event(
    database,
    event_id,
    data,
    current_user
):

    event = (
        database.query(db.CalendarEvent)
        .filter(
            db.CalendarEvent.id == event_id,
            db.CalendarEvent.created_by == current_user.id
        )
        .first()
    )

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Calendar event not found."
        )

    if data.title is not None:
        event.title = data.title.strip()

    if data.description is not None:
        event.description = data.description

    if data.event_type is not None:
        event.event_type = data.event_type

    if data.start_datetime is not None:
        event.start_datetime = data.start_datetime

    if data.end_datetime is not None:
        event.end_datetime = data.end_datetime

    if data.all_day is not None:
        event.all_day = data.all_day

    if data.location is not None:
        event.location = data.location

    if data.status is not None:
        event.status = data.status

    if data.audit_id is not None:

        _verify_auditor_audit_access(
            database,
            data.audit_id,
            current_user
        )

        event.audit_id = data.audit_id

    if data.assignment_id is not None:

        assignment = (
            database.query(db.AuditAssignment)
            .filter(
                db.AuditAssignment.id == data.assignment_id,
                db.AuditAssignment.auditor_id == current_user.id
            )
            .first()
        )

        if not assignment:
            raise HTTPException(
                status_code=403,
                detail="Invalid audit assignment."
            )

        event.assignment_id = data.assignment_id

    if (
        event.end_datetime
        and event.end_datetime < event.start_datetime
    ):
        raise HTTPException(
            status_code=400,
            detail="End time cannot be before start time."
        )

    database.commit()
    database.refresh(event)

    return _calendar_event_dict(event)


def delete_calendar_event(
    database,
    event_id,
    current_user
):

    event = (
        database.query(db.CalendarEvent)
        .filter(
            db.CalendarEvent.id == event_id,
            db.CalendarEvent.created_by == current_user.id
        )
        .first()
    )

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Calendar event not found."
        )

    database.delete(event)
    database.commit()

    return {
        "success": True,
        "message": "Calendar event deleted successfully."
    }


def get_calendar_audits(
    database,
    current_user
):

    rows = (
        database.query(
            db.Audit,
            db.AuditAssignment
        )
        .join(
            db.AuditAssignment,
            db.AuditAssignment.audit_id == db.Audit.id
        )
        .filter(
            db.AuditAssignment.auditor_id == current_user.id
        )
        .order_by(
            db.Audit.title.asc()
        )
        .all()
    )

    return {
        "success": True,
        "items": [
            {
                "id": audit.id,
                "audit_number": audit.audit_number,
                "title": audit.title,
                "assignment_id": assignment.id
            }
            for audit, assignment in rows
        ]
    }


# ============================================================
# AUDITOR NOTIFICATIONS
# ============================================================

def get_auditor_notifications_dashboard(
    database: Session,
    current_user,
    tab: str = "All",
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 10
):

    query = ( database.query(db.Notification) .filter( or_(
                db.Notification.recipient_user_id == current_user.id,
                db.Notification.recipient_user_id.is_(None)
            )
        )
    )

    # ========================================================
    # SEARCH
    # ========================================================

    if search and search.strip():
        value = f"%{search.strip()}%"
        query = query.filter( or_(
                db.Notification.title.ilike(value),
                db.Notification.message.ilike(value),
                db.Notification.category.ilike(value),
                db.Notification.notification_type.ilike(value)
            )
        )

    # ========================================================
    # TABS
    # ========================================================

    if tab == "Unread":
        query = query.filter( db.Notification.status == "Unread" )

    elif tab == "Important":
        query = query.filter( db.Notification.priority.in_( ["High", "Critical"] ) )

    elif tab == "Mentions":
        query = query.filter( or_(
                db.Notification.category.ilike("%Mention%"),
                db.Notification.notification_type.ilike("%Mention%")
            )
        )

    # ========================================================
    # TOTAL
    # ========================================================

    total = query.count()

    # ========================================================
    # PAGINATION
    # ========================================================

    offset = (page - 1) * limit

    notifications = ( query .order_by( db.Notification.created_at.desc() ) .offset(offset) .limit(limit) .all() )

    # ========================================================
    # SERIALIZE
    # ========================================================

    items = []

    for notification in notifications:
        items.append({
            "id": notification.id,
            "title": notification.title,
            "message": notification.message or "",
            "category": notification.category,
            "notification_type": notification.notification_type,
            "priority": notification.priority,
            "status": notification.status,
            "reference_id": notification.reference_id,
            "related_type": notification.related_type,
            "created_at": (
                notification.created_at.isoformat()
                if notification.created_at
                else None
            )
        })

    # ========================================================
    # TOTAL PAGES
    # ========================================================

    total_pages = (
        (total + limit - 1) // limit
        if total > 0
        else 1
    )

    return {
        "items": items,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": total_pages
        }
    }


# ============================================================
# AUDITOR NOTIFICATION SUMMARY
# ============================================================

def get_auditor_notification_summary( database: Session, current_user ):

    base_query = ( database.query(db.Notification) .filter( or_(
                db.Notification.recipient_user_id == current_user.id,
                db.Notification.recipient_user_id.is_(None)
            )
        )
    )

    all_notifications = base_query.count()

    unread = ( base_query .filter( db.Notification.status == "Unread" ) .count() )

    important = ( base_query .filter( db.Notification.priority.in_( ["High", "Critical"] ) ) .count() )

    mentions = ( base_query .filter( or_(
                db.Notification.category.ilike("%Mention%"),
                db.Notification.notification_type.ilike("%Mention%")
            ) ) .count()
    )

    return {
        "all": all_notifications,
        "unread": unread,
        "important": important,
        "mentions": mentions
    }


# ============================================================
# AUDITOR NOTIFICATION CATEGORY COUNTS
# ============================================================

def get_auditor_notification_category_counts( database: Session, current_user ):

    base_query = ( database.query(db.Notification) .filter( or_(
                db.Notification.recipient_user_id == current_user.id,
                db.Notification.recipient_user_id.is_(None)
            )
        )
    )

    categories = [ "Assignment","Issue","Completion", "Document", "Reminder", "Mention", "Compliance", "Report", "Planning" ]

    results = []

    known_total = 0

    for category in categories:
        count = ( base_query .filter( db.Notification.category == category ) .count() )

        known_total += count
        results.append({
            "category": category,
            "count": count
        })

    total = base_query.count()

    others = max( total - known_total, 0 )

    if others > 0:
        results.append({
            "category": "Others",
            "count": others
        })

    return results


# ============================================================
# MARK ALL AUDITOR NOTIFICATIONS AS READ
# ============================================================

def mark_all_auditor_notifications_read( database: Session, current_user ):

    updated = ( database.query(db.Notification) .filter( db.Notification.recipient_user_id == current_user.id )
        .filter( db.Notification.status == "Unread" ) .update(
            {
                db.Notification.status: "Read",
                db.Notification.read_at: datetime.now(timezone.utc)
            }, synchronize_session=False
        )
    )

    database.commit()

    return updated


# ============================================================
# MARK SINGLE AUDITOR NOTIFICATION AS READ
# ============================================================

def mark_auditor_notification_read( database: Session, current_user, notification_id: int ):

    notification = ( database.query(db.Notification) .filter( db.Notification.id == notification_id ) 
        .filter( or_(
                db.Notification.recipient_user_id == current_user.id,
                db.Notification.recipient_user_id.is_(None)
            ) ) .first()
    )

    if not notification:
        raise HTTPException( status_code=404, detail="Notification not found." )

    notification.status = "Read"

    notification.read_at = datetime.now( timezone.utc )

    database.commit()

    database.refresh(notification)

    return notification


# ============================================================
# GET AUDITOR NOTIFICATION PREFERENCES
# ============================================================

def get_auditor_notification_preferences( database: Session, current_user ):

    preferences = ( database.query( db.AuditorNotificationPreference )
        .filter( db.AuditorNotificationPreference.user_id == current_user.id ) .first() )

    if not preferences:

        preferences = db.AuditorNotificationPreference(
            user_id=current_user.id,
            email_notifications=True,
            in_app_notifications=True,
            sms_notifications=False,
            important_alerts=True,
            audit_reminders=True
        )

        database.add(preferences)

        database.commit()

        database.refresh(preferences)

    return preferences


# ============================================================
# UPDATE AUDITOR NOTIFICATION PREFERENCES
# ============================================================

def update_auditor_notification_preferences( database: Session, current_user, payload):

    preferences = get_auditor_notification_preferences( database, current_user )

    preferences.email_notifications = ( payload.email_notifications )

    preferences.in_app_notifications = ( payload.in_app_notifications )

    preferences.sms_notifications = (  payload.sms_notifications )

    preferences.important_alerts = ( payload.important_alerts )

    preferences.audit_reminders = ( payload.audit_reminders )

    database.commit()

    database.refresh(preferences)

    return preferences


# ==========================================================
# GET OR CREATE DIRECT CONVERSATION
# ==========================================================

def get_or_create_direct_conversation(
    database,
    current_user_id: int,
    other_user_id: int
):

    conversations = (
        database.query(db.Conversation)
        .filter(
            db.Conversation.conversation_type == "direct"
        )
        .all()
    )

    for conversation in conversations:

        participants = (
            database.query(db.ConversationParticipant)
            .filter(
                db.ConversationParticipant.conversation_id
                == conversation.id
            )
            .all()
        )

        participant_ids = {
            participant.user_id
            for participant in participants
        }

        if participant_ids == {
            current_user_id,
            other_user_id
        }:

            return conversation

    conversation = db.Conversation(
        conversation_type="direct",
        created_by=current_user_id
    )

    database.add(conversation)

    database.flush()

    database.add_all([
        db.ConversationParticipant(
            conversation_id=conversation.id,
            user_id=current_user_id
        ),
        db.ConversationParticipant(
            conversation_id=conversation.id,
            user_id=other_user_id
        )
    ])

    database.commit()

    database.refresh(conversation)

    return conversation


# ==========================================================
# GET USER CONVERSATIONS
# ==========================================================

def get_user_conversations(
    database,
    current_user,
    search=None,
    filter_type="all"
):

    participant_rows = (
        database.query(
            db.ConversationParticipant.conversation_id
        )
        .filter(
            db.ConversationParticipant.user_id
            == current_user.id
        )
        .filter(
            db.ConversationParticipant.is_archived == False
        )
        .all()
    )

    conversation_ids = [
        row[0]
        for row in participant_rows
    ]

    if not conversation_ids:
        return []

    conversations = (
        database.query(db.Conversation)
        .filter(
            db.Conversation.id.in_(conversation_ids)
        )
        .order_by(
            db.Conversation.updated_at.desc()
        )
        .all()
    )

    results = []

    for conversation in conversations:

        last_message = (
            database.query(db.DirectMessage)
            .filter(
                db.DirectMessage.conversation_id
                == conversation.id
            )
            .filter(
                db.DirectMessage.is_deleted == False
            )
            .order_by(
                db.DirectMessage.created_at.desc()
            )
            .first()
        )

        participants = (
            database.query(
                db.ConversationParticipant,
                db.User
            )
            .join(
                db.User,
                db.User.id
                == db.ConversationParticipant.user_id
            )
            .filter(
                db.ConversationParticipant.conversation_id
                == conversation.id
            )
            .all()
        )

        other_users = []

        for participant, user in participants:

            if user.id != current_user.id:

                other_users.append({
                    "id": user.id,
                    "name": user.name,
                    "role": user.role
                })

        unread_count = (
            database.query(db.DirectMessage)
            .filter(
                db.DirectMessage.conversation_id
                == conversation.id
            )
            .filter(
                db.DirectMessage.sender_id
                != current_user.id
            )
            .filter(
                db.DirectMessage.created_at
                > func.coalesce(
                    (
                        database.query(
                            db.ConversationParticipant.last_read_at
                        )
                        .filter(
                            db.ConversationParticipant.conversation_id
                            == conversation.id
                        )
                        .filter(
                            db.ConversationParticipant.user_id
                            == current_user.id
                        )
                        .scalar_subquery()
                    ),
                    datetime(1970, 1, 1)
                )
            )
            .count()
        )

        display_name = (
            conversation.title
            if conversation.conversation_type == "group"
            else (
                other_users[0]["name"]
                if other_users
                else "Unknown User"
            )
        )

        display_role = (
            "Group"
            if conversation.conversation_type == "group"
            else (
                other_users[0]["role"]
                if other_users
                else ""
            )
        )

        if search:

            search_text = search.lower()

            if (
                search_text not in display_name.lower()
                and (
                    not last_message
                    or search_text
                    not in (last_message.message or "").lower()
                )
            ):
                continue

        if filter_type == "unread" and unread_count == 0:
            continue

        results.append({

            "id": conversation.id,

            "type": conversation.conversation_type,

            "name": display_name,

            "role": display_role,

            "last_message": (
                last_message.message
                if last_message
                else ""
            ),

            "last_message_time": (
                last_message.created_at.isoformat()
                if last_message
                else None
            ),

            "unread_count": unread_count
        })

    results.sort(
        key=lambda item:
        item["last_message_time"] or "",
        reverse=True
    )

    return results


# ==========================================================
# GET CONVERSATION MESSAGES
# ==========================================================

def get_conversation_messages(
    database,
    conversation_id: int,
    current_user
):

    participant = (
        database.query(db.ConversationParticipant)
        .filter(
            db.ConversationParticipant.conversation_id
            == conversation_id
        )
        .filter(
            db.ConversationParticipant.user_id
            == current_user.id
        )
        .first()
    )

    if not participant:

        raise HTTPException(
            status_code=403,
            detail="You do not have access to this conversation."
        )

    messages = (
        database.query(
            db.DirectMessage,
            db.User
        )
        .outerjoin(
            db.User,
            db.User.id
            == db.DirectMessage.sender_id
        )
        .filter(
            db.DirectMessage.conversation_id
            == conversation_id
        )
        .filter(
            db.DirectMessage.is_deleted == False
        )
        .order_by(
            db.DirectMessage.created_at.asc()
        )
        .all()
    )

    result = []

    for message, sender in messages:

        attachments = (
            database.query(db.MessageAttachment)
            .filter(
                db.MessageAttachment.message_id
                == message.id
            )
            .all()
        )

        result.append({

            "id": message.id,

            "sender_id": message.sender_id,

            "sender_name": (
                sender.name
                if sender
                else "Unknown User"
            ),

            "message": message.message,

            "message_type": message.message_type,

            "created_at": (
                message.created_at.isoformat()
                if message.created_at
                else None
            ),

            "attachments": [

                {
                    "id": file.id,
                    "file_name": file.file_name,
                    "file_path": file.file_path,
                    "file_type": file.file_type,
                    "file_size": file.file_size
                }

                for file in attachments
            ]
        })

    participant.last_read_at = datetime.utcnow()

    database.commit()

    return result


# ==========================================================
# SEND MESSAGE
# ==========================================================

def send_direct_message( database, conversation_id: int, current_user, message_text: str ):

    participant = ( database.query(db.ConversationParticipant)
        .filter( db.ConversationParticipant.conversation_id == conversation_id )
        .filter( db.ConversationParticipant.user_id == current_user.id ) .first()
    )

    if not participant:
        raise HTTPException( status_code=403, detail="You do not have access to this conversation." )

    message = db.DirectMessage(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        message=message_text.strip(),
        message_type="text"
    )

    database.add(message)

    conversation = (database.query(db.Conversation) .filter( db.Conversation.id == conversation_id ) .first() )

    if conversation:
        conversation.updated_at = datetime.utcnow()

    database.commit()

    database.refresh(message)

    return {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "sender_id": message.sender_id,
        "message": message.message,
        "created_at": message.created_at.isoformat()
    }


# ==========================================================
# GET CONTACTS
# ==========================================================

def get_message_contacts( database, current_user, search=None ):

    query = ( database.query(db.User) .filter( db.User.id != current_user.id ) .filter( db.User.active == True ) )

    if search:
        value = f"%{search.strip()}%"
        query = query.filter( or_(
                db.User.name.ilike(value),
                db.User.email.ilike(value),
                db.User.role.ilike(value)
            )
        )

    users = query.order_by( db.User.name.asc() ).all()

    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "online": False
        }
        for user in users
    ]


# ==========================================================
# CREATE GROUP
# ==========================================================

def create_chat_group( database, current_user, group_data ):

    conversation = db.Conversation(
        conversation_type="group",
        title=group_data.name,
        created_by=current_user.id
    )

    database.add(conversation)

    database.flush()

    group = db.ChatGroup(
        name=group_data.name,
        description=group_data.description,
        created_by=current_user.id,
        conversation_id=conversation.id
    )

    database.add(group)

    member_ids = set(group_data.member_ids)

    member_ids.add(current_user.id)

    for user_id in member_ids:
        database.add( db.ConversationParticipant( conversation_id=conversation.id, user_id=user_id ) )

    database.commit()

    database.refresh(group)

    return {
        "success": True,
        "group_id": group.id,
        "conversation_id": conversation.id,
        "name": group.name
    }


# ==========================================================
# GET GROUPS
# ==========================================================

def get_chat_groups( database, current_user ):

    groups = ( database.query( db.ChatGroup, db.ConversationParticipant ) .join(
            db.Conversation,
            db.Conversation.id == db.ChatGroup.conversation_id
        ) .join(
            db.ConversationParticipant,
            db.ConversationParticipant.conversation_id == db.Conversation.id
        ) .filter(
            db.ConversationParticipant.user_id == current_user.id
        ) .all()
    )

    results = []

    for group, participant in groups:

        member_count = (
            database.query(db.ConversationParticipant) .filter(
                db.ConversationParticipant.conversation_id == group.conversation_id
            ) .count()
        )

        results.append({
            "id": group.id,
            "conversation_id": group.conversation_id,
            "name": group.name,
            "description": group.description,
            "members": member_count
        })

    return results


# ============================================================
# AUDITOR SETTINGS PAGE
# ============================================================

def get_auditor_settings_dashboard( database: Session, current_user ):

    # --------------------------------------------------------
    # REPORTING MANAGER
    # --------------------------------------------------------

    manager_name = None

    if current_user.reporting_manager_id:
        manager = ( database.query(db.User) .filter( db.User.id == current_user.reporting_manager_id ) .first() )

        if manager:
            manager_name = manager.name


    # --------------------------------------------------------
    # USER PREFERENCES
    # --------------------------------------------------------

    preferences = ( database.query(db.UserPreferences)
        .filter( db.UserPreferences.user_id == current_user.id ) .first()
    )

    # Create default preferences if missing

    if not preferences:

        preferences = db.UserPreferences( user_id=current_user.id )

        database.add(preferences)

        database.commit()

        database.refresh(preferences)


    # --------------------------------------------------------
    # ACTIVE SESSIONS
    # --------------------------------------------------------

    active_sessions = ( database.query(db.UserSession).filter( db.UserSession.user_id == current_user.id ) .count() )


    # --------------------------------------------------------
    # RECENT ACCOUNT ACTIVITY
    # --------------------------------------------------------

    activities = ( database.query(db.AuditLog) .filter( db.AuditLog.user_id == current_user.id )
        .order_by( db.AuditLog.created_at.desc() ) .limit(10) .all()
    )


    activity_data = []

    for activity in activities:
        activity_data.append({
            "id": activity.id,
            "activity": ( activity.action or "Account Activity" ),
            "description": ( activity.description or "" ),
            "location": ( activity.ip_address or "-" ),
            "device": ( activity.user_agent or "-" ),
            "date_time": (
                activity.created_at.isoformat()
                if activity.created_at
                else None
            ),
            "status": ( activity.status or "Success" )
        })


    # --------------------------------------------------------
    # RETURN
    # --------------------------------------------------------

    return {
        "success": True,
        "profile": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "mobile": current_user.mobile,
            "employee_id": current_user.employee_id,
            "job_title": current_user.job_title,
            "department": current_user.department,
            "manager": manager_name,
            "date_of_joining": (
                current_user.date_of_joining.isoformat()
                if current_user.date_of_joining
                else None
            ),
            "about_me": getattr( current_user, "about_me", "" ),
            "profile_image": current_user.profile_image,
            "role": current_user.role,
            "two_factor_enabled": current_user.two_factor_enabled,
            "password_changed_at": (
                current_user.password_changed_at.isoformat()
                if getattr( current_user, "password_changed_at", None )
                else None
            )
        },
        "preferences": {
            "timezone": preferences.timezone,
            "language": preferences.language,
            "theme": preferences.theme,
            "date_format": preferences.date_format,
            "time_format": preferences.time_format
        },
        "security": {
            "two_factor_enabled": current_user.two_factor_enabled,
            "active_sessions": active_sessions,
            "password_changed_at": (
                current_user.password_changed_at.isoformat()
                if getattr( current_user, "password_changed_at", None )
                else None
            )
        },
        "activities": activity_data
    }


def update_auditor_settings_profile(
    database: Session,
    current_user,
    payload
):

    # --------------------------------------------------------
    # EMAIL DUPLICATE CHECK
    # --------------------------------------------------------

    existing_email = (
        database.query(db.User)
        .filter(
            db.User.email == payload.email,
            db.User.id != current_user.id
        )
        .first()
    )

    if existing_email:

        raise HTTPException(
            status_code=400,
            detail="Email address already exists"
        )


    # --------------------------------------------------------
    # EMPLOYEE ID DUPLICATE CHECK
    # --------------------------------------------------------

    if payload.employee_id:

        existing_employee = (
            database.query(db.User)
            .filter(
                db.User.employee_id ==
                payload.employee_id,

                db.User.id !=
                current_user.id
            )
            .first()
        )

        if existing_employee:

            raise HTTPException(
                status_code=400,
                detail="Employee ID already exists"
            )


    # --------------------------------------------------------
    # UPDATE USER
    # --------------------------------------------------------

    current_user.name = payload.name

    current_user.email = payload.email

    current_user.mobile = payload.mobile

    current_user.employee_id = (
        payload.employee_id
    )

    current_user.job_title = (
        payload.job_title
    )

    current_user.department = (
        payload.department
    )

    current_user.reporting_manager_id = (
        payload.reporting_manager_id
    )

    current_user.date_of_joining = (
        payload.date_of_joining
    )

    current_user.about_me = (
        payload.about_me
    )


    # --------------------------------------------------------
    # PREFERENCES
    # --------------------------------------------------------

    preferences = (
        database.query(db.UserPreferences)
        .filter(
            db.UserPreferences.user_id ==
            current_user.id
        )
        .first()
    )


    if not preferences:

        preferences = db.UserPreferences(
            user_id=current_user.id
        )

        database.add(preferences)


    if payload.timezone:

        preferences.timezone = (
            payload.timezone
        )


    if payload.language:

        preferences.language = (
            payload.language
        )


    database.commit()

    database.refresh(current_user)


    # --------------------------------------------------------
    # AUDIT LOG
    # --------------------------------------------------------

    create_audit_log(

        database=database,

        user=current_user,

        action="UPDATE_PROFILE",

        description=(
            "Auditor profile settings updated"
        ),

        resource="users",

        resource_id=str(current_user.id)
    )


    return { "success": True, "message": "Profile updated successfully" }


def update_auditor_system_preferences(
    database: Session,
    current_user,
    payload
):

    preferences = (
        database.query(db.UserPreferences)
        .filter(
            db.UserPreferences.user_id ==
            current_user.id
        )
        .first()
    )


    if not preferences:

        preferences = db.UserPreferences(
            user_id=current_user.id
        )

        database.add(preferences)


    if payload.theme is not None:

        preferences.theme = payload.theme


    if payload.date_format is not None:

        preferences.date_format = (
            payload.date_format
        )


    if payload.time_format is not None:

        preferences.time_format = (
            payload.time_format
        )


    if payload.language is not None:

        preferences.language = (
            payload.language
        )


    if payload.timezone is not None:

        preferences.timezone = (
            payload.timezone
        )


    database.commit()

    database.refresh(preferences)


    create_audit_log(

        database=database,

        user=current_user,

        action="UPDATE_PREFERENCES",

        description=(
            "Auditor system preferences updated"
        ),

        resource="user_preferences",

        resource_id=str(preferences.id)
    )


    return { "success": True, "message": "Preferences saved successfully" }


def change_auditor_password(
    database: Session,
    current_user,
    payload
):

    # --------------------------------------------------------
    # VALIDATE CURRENT PASSWORD
    # --------------------------------------------------------

    if not db.verify_password( payload.current_password, current_user.hashed_password ):
        raise HTTPException( status_code=400, detail="Current password is incorrect" )


    # --------------------------------------------------------
    # CONFIRM PASSWORD
    # --------------------------------------------------------

    if ( payload.new_password != payload.confirm_password ):
        raise HTTPException( status_code=400, detail="Passwords do not match" )


    # --------------------------------------------------------
    # UPDATE PASSWORD
    # --------------------------------------------------------

    current_user.hashed_password = ( db.hash_password( payload.new_password ) )


    current_user.password_changed_at = ( datetime.utcnow() )

    database.commit()


    # --------------------------------------------------------
    # AUDIT LOG
    # --------------------------------------------------------

    create_audit_log(
        database=database,
        user=current_user,
        action="PASSWORD_CHANGED",
        description=( "Account password changed" ),
        resource="users",
        resource_id=str(current_user.id)
    )


    return { "success": True, "message": "Password changed successfully" }


def update_auditor_two_factor( database: Session, current_user, enabled: bool ):

    current_user.two_factor_enabled = enabled

    database.commit()

    create_audit_log(
        database=database,
        user=current_user,
        action="TWO_FACTOR_UPDATED",
        description=( "Two-factor authentication " + ( "enabled" if enabled else "disabled" ) ),
        resource="users",
        resource_id=str(current_user.id)
    )


    return { "success": True, "message": ( "Two-factor authentication updated" ), "enabled": enabled }


# ============================================================ 
# AUDITOR NOTIFICATION SETTINGS 
# ============================================================ 
def get_or_create_auditor_notification_settings( database: Session, user_id: int ): 
    settings = ( database.query(db.AuditorNotificationPreference) 
                .filter( db.AuditorNotificationPreference.user_id == user_id ) .first() ) 
    if not settings: 
        settings = db.AuditorNotificationPreference( 
            user_id=user_id, email_notifications=True, 
            in_app_notifications=True, 
            sms_notifications=False, 
            important_alerts=True, 
            audit_reminders=True 
            ) 
        database.add(settings) 
        database.commit() 
        database.refresh(settings) 
        return settings 


def update_auditor_notification_settings( 
    database: Session, user_id: int, data 
): 
    current_user = ( database.query(db.User) .filter(db.User.id == user_id) .first() ) 
    if not current_user: 
        raise HTTPException( status_code=404, detail="User not found" ) 
    # Use the existing auditor notification preference function 
    settings = get_auditor_notification_preferences( database, current_user ) 
    if settings is None: 
        raise HTTPException( status_code=500, detail="Unable to create auditor notification preferences" ) 
    # -------------------------------------------------------- 
    # UPDATE SETTINGS 
    # -------------------------------------------------------- 
    settings.audit_reminders = data.audit_assignments 
    settings.in_app_notifications = data.findings 
    settings.important_alerts = data.compliance 
    settings.email_notifications = data.system 
    database.commit() 
    database.refresh(settings) 
    return settings


def update_auditor_email_preferences(
    database: Session,
    user_id: int,
    data
):
    preferences = get_or_create_auditor_notification_settings(
        database,
        user_id
    )

    preferences.audit_reminders = data.audit_reminders
    preferences.audit_assignments = data.audit_assignments
    preferences.finding_notifications = data.finding_notifications
    preferences.report_notifications = data.report_notifications

    database.commit()
    database.refresh(preferences)

    return preferences


# ============================================================
# AUDITOR - HELP & SUPPORT
# ============================================================

def get_auditor_support_dashboard( database: Session, current_user ):

    # ========================================================
    # SUPPORT CATEGORIES
    # ========================================================

    categories = ( database.query(db.SupportCategory) .filter( db.SupportCategory.is_active == True )
        .order_by( db.SupportCategory.display_order.asc() ) .all()
    )


    # ========================================================
    # FAQs
    # ========================================================

    faqs = ( database.query(db.SupportFAQ) .filter( db.SupportFAQ.is_active == True )
        .order_by( db.SupportFAQ.display_order.asc() ) .limit(10) .all()
    )


    # ========================================================
    # POPULAR ARTICLES
    # ========================================================

    articles = (
        database.query(db.SupportArticle) .filter( db.SupportArticle.is_active == True ) .order_by(
            db.SupportArticle.is_popular.desc(),
            db.SupportArticle.views.desc(),
            db.SupportArticle.display_order.asc()
        ) .limit(8) .all()
    )


    # ========================================================
    # CONTACT SUPPORT
    # ========================================================

    contacts = ( database.query(db.SupportContact) .filter( db.SupportContact.is_active == True ) .all() )


    # ========================================================
    # SYSTEM SERVICES
    # ========================================================

    services = ( database.query(db.SupportServiceStatus) .order_by( db.SupportServiceStatus.service_name.asc() ) .all() )


    # ========================================================
    # QUICK LINKS
    # ========================================================

    quick_links = (
        database.query(db.SupportQuickLink) .filter( db.SupportQuickLink.is_active == True )
        .order_by( db.SupportQuickLink.display_order.asc() ) .all()
    )


    # ========================================================
    # AUDITOR TICKETS
    # ========================================================

    user_name = (
        current_user.name
        if getattr(current_user, "name", None)
        else current_user.email
    )

    ticket_query = ( database.query(db.SupportTicket) .filter( db.SupportTicket.created_by == user_name ) )


    # Open tickets

    open_tickets = ( ticket_query .filter( db.SupportTicket.status == "Open" ) .count() )


    # In Progress tickets

    in_progress_tickets = ( ticket_query .filter( db.SupportTicket.status.in_([ "In Progress", "Pending" ]) ) .count() )


    # Resolved tickets

    resolved_tickets = ( ticket_query .filter( db.SupportTicket.status.in_([ "Resolved", "Closed" ]) ) .count() )


    # Recent tickets

    recent_tickets = ( ticket_query .order_by( db.SupportTicket.created_on.desc() ) .limit(5) .all() )


    # ========================================================
    # SYSTEM STATUS
    # ========================================================

    operational_services = [
        service
        for service in services
        if str(service.status).lower() in ["operational", "online", "active"]
    ]

    if services and len(operational_services) == len(services):
        overall_status = "Operational"

    elif services:
        overall_status = "Partial Outage"

    else:
        overall_status = "Unknown"


    # ========================================================
    # RESPONSE
    # ========================================================

    return {
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": current_user.role,
            "profile_image": getattr( current_user, "profile_image", None )
        },
        "categories": [
            {
                "id": category.id,
                "name": category.name,
                "description": category.description,
                "icon": category.icon,
                "color": category.color
            }
            for category in categories
        ],
        "faqs": [
            {
                "id": faq.id,
                "question": faq.question,
                "answer": faq.answer,
                "category": faq.category
            }
            for faq in faqs
        ],
        "articles": [
            {
                "id": article.id,
                "title": article.title,
                "slug": article.slug,
                "summary": article.summary,
                "content": article.content,
                "category": article.category,
                "icon": article.icon,
                "views": article.views,
                "is_popular": article.is_popular
            }
            for article in articles
        ],
        "contacts": [
            {
                "id": contact.id,
                "contact_type": contact.contact_type,
                "title": contact.title,
                "value": contact.value,
                "description": contact.description
            }
            for contact in contacts
        ],
        "quick_links": [
            {
                "id": link.id,
                "title": link.title,
                "description": link.description,
                "icon": link.icon,
                "url": link.url
            }
            for link in quick_links
        ],
        "services": [
            {
                "id": service.id,
                "service_name": service.service_name,
                "status": service.status,
                "message": service.message,
                "checked_at": (
                    service.checked_at.isoformat()
                    if service.checked_at
                    else None
                )
            }
            for service in services
        ],
        "tickets": {
            "open": open_tickets,
            "in_progress": in_progress_tickets,
            "resolved": resolved_tickets,
            "recent": [
                {
                    "id": ticket.id,
                    "ticket_id": ticket.ticket_id,
                    "subject": ticket.subject,
                    "description": ticket.description,
                    "category": ticket.category,
                    "priority": ticket.priority,
                    "status": ticket.status,
                    "created_on": (
                        ticket.created_on.isoformat()
                        if ticket.created_on
                        else None
                    )
                }
                for ticket in recent_tickets
            ]
        },
        "system_status": { "overall_status": overall_status }
    }


# ============================================================
# CREATE AUDITOR SUPPORT TICKET
# ============================================================

def create_auditor_support_ticket( database: Session, ticket_data, current_user ):

    user_name = (
        current_user.name
        if getattr(current_user, "name", None)
        else current_user.email
    )

    ticket = db.SupportTicket(
        ticket_id=generate_ticket_id( database ),
        subject=ticket_data.subject.strip(),
        description=ticket_data.description.strip(),
        category=ticket_data.category.strip(),
        priority=(
            ticket_data.priority
            if ticket_data.priority
            else "Medium"
        ),
        status="Open",
        created_by=user_name,
        vendor_id=None
    )

    database.add(ticket)

    database.commit()

    database.refresh(ticket)

    return ticket


# ============================================================
# NORMALIZE ACCOUNT TYPE
# ============================================================

def normalize_reset_account_type(account_type: str) -> str:

    value = (account_type or "").strip().lower()

    if value in {"user", "users"}:
        return "user"

    if value in {"vendor", "vendors"}:
        return "vendor"

    raise HTTPException(
        status_code=400,
        detail="Invalid account type. Use user or vendor."
    )


# ============================================================
# NORMALIZE IDENTIFIER
# ============================================================

def normalize_reset_identifier(
    account_type: str,
    identifier: str
) -> str:

    value = (identifier or "").strip()

    if not value:
        raise HTTPException(
            status_code=400,
            detail="Account identifier is required."
        )

    if account_type == "user":
        return value.lower()

    return value.upper()


# ============================================================
# FIND RESET ACCOUNT
# ============================================================

def get_reset_account(
    account_type: str,
    identifier: str,
    mobile: str,
    database: Session
):
    """
    Find and validate either a User or Vendor.

    USER:
        identifier = users.email
        mobile     = users.mobile

    VENDOR:
        identifier = vendors.vendor_id
        mobile     = vendors.phone
    """

    account_type = normalize_reset_account_type(
        account_type
    )

    identifier = normalize_reset_identifier(
        account_type,
        identifier
    )

    mobile = normalize_mobile(mobile)

    if account_type == "user":

        user = (
            database.query(db.User)
            .filter(
                db.User.email == identifier,
                db.User.mobile == mobile
            )
            .first()
        )

        if not user:
            raise HTTPException(
                status_code=404,
                detail=(
                    "No user account was found with "
                    "the supplied email and mobile number."
                )
            )

        if not user.active:
            raise HTTPException(
                status_code=403,
                detail="This user account is inactive."
            )

        return {
            "account_type": "user",
            "account": user,
            "mobile": mobile
        }

    # --------------------------------------------------------
    # VENDOR
    # --------------------------------------------------------

    vendor = (
        database.query(db.Vendor)
        .filter(
            db.Vendor.vendor_id == identifier,
            db.Vendor.phone == mobile
        )
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail=(
                "No vendor account was found with "
                "the supplied Vendor ID and mobile number."
            )
        )

    vendor_status = (
        str(vendor.status or "")
        .strip()
        .lower()
    )

    if vendor_status not in {
        "approved",
        "active"
    }:
        raise HTTPException(
            status_code=403,
            detail=(
                "This vendor account is not currently active."
            )
        )

    return {
        "account_type": "vendor",
        "account": vendor,
        "mobile": mobile
    }


# ============================================================
# GET OTP FIELD FILTER
# ============================================================

def get_otp_identity_filter(
    account_type: str,
    mobile: str
):
    """
    Return the SQLAlchemy filter used by PasswordResetOTP.
    """

    if account_type == "user":

        return db.PasswordResetOTP.user_mobile == mobile

    return db.PasswordResetOTP.vendor_phone == mobile


# ==========================================================
# NORMALIZE STATUS
# ==========================================================

def normalize_status(status):
    """
    Safely normalize a database status value.

    Returns a trimmed string.
    None / empty values return an empty string.
    """

    if status is None:
        return ""

    try:
        return str(status).strip()
    except Exception:
        return ""


# ============================================================
# ADMIN COMMUNICATION - CONTACTS
# ============================================================

ADMIN_COMMUNICATION_ROLES = {
    "procurement": "Procurement Manager",
    "supply_chain": "Supply Chain Manager",
    "finance": "Finance Officer",
    "audit": "Auditor",
}


def get_admin_communication_contacts(
    database,
    current_user,
    target_type: str = "all",
    search: str = ""
):
    """
    Return all people that an Admin can communicate with.

    Vendors:
        communication_messages

    Internal users:
        conversations + direct_messages
    """

    target_type = (target_type or "all").strip().lower()
    search = (search or "").strip().lower()

    result = []

    # ========================================================
    # VENDORS
    # ========================================================

    if target_type in {"all", "vendor", "vendors"}:

        vendors = (
            database.query(db.Vendor)
            .order_by(db.Vendor.vendor_name.asc())
            .all()
        )

        for vendor in vendors:

            # -----------------------------------------------
            # SEARCH
            # -----------------------------------------------

            searchable = " ".join([
                str(vendor.vendor_id or ""),
                str(vendor.vendor_name or ""),
                str(vendor.contact_person or ""),
                str(vendor.email or ""),
                str(vendor.category or ""),
            ]).lower()

            if search and search not in searchable:
                continue

            # -----------------------------------------------
            # LAST MESSAGE
            # -----------------------------------------------

            last_message = (
                database.query(db.CommunicationMessage)
                .filter(
                    db.CommunicationMessage.vendor_id
                    == vendor.vendor_id
                )
                .order_by(
                    db.CommunicationMessage.created_at.desc()
                )
                .first()
            )

            # -----------------------------------------------
            # UNREAD VENDOR MESSAGES
            # -----------------------------------------------

            unread = (
                database.query(db.CommunicationMessage)
                .filter(
                    db.CommunicationMessage.vendor_id
                    == vendor.vendor_id
                )
                .filter(
                    db.CommunicationMessage.sender_type == "vendor"
                )
                .filter(
                    db.CommunicationMessage.is_read == False
                )
                .count()
            )

            result.append({
                "target_type": "vendor",
                "target_id": vendor.vendor_id,

                "name": vendor.vendor_name,
                "display_name": vendor.vendor_name,

                "role": "Vendor",
                "department": vendor.category or "Vendor",

                "email": vendor.email,
                "phone": vendor.phone,

                "company": vendor.vendor_name,
                "category": vendor.category,

                "contact_person": vendor.contact_person,

                "status": vendor.status,
                "online": False,

                "last_message": (
                    last_message.message
                    if last_message
                    else ""
                ),

                "last_message_time": (
                    last_message.created_at.isoformat()
                    if last_message
                    and last_message.created_at
                    else None
                ),

                "unread": unread
            })

    # ========================================================
    # INTERNAL USERS
    # ========================================================

    internal_roles = []

    if target_type == "all":
        internal_roles = list(
            ADMIN_COMMUNICATION_ROLES.values()
        )

    elif target_type in ADMIN_COMMUNICATION_ROLES:
        internal_roles = [
            ADMIN_COMMUNICATION_ROLES[target_type]
        ]

    elif target_type in ADMIN_COMMUNICATION_ROLES.values():
        internal_roles = [target_type]

    # ========================================================
    # BUILD ADMIN'S EXISTING CONVERSATION MAP
    # ========================================================

    admin_conversation_rows = (
        database.query(
            db.ConversationParticipant
        )
        .filter(
            db.ConversationParticipant.user_id
            == current_user.id
        )
        .filter(
            db.ConversationParticipant.is_archived == False
        )
        .all()
    )

    user_conversations = {}

    for admin_participant in admin_conversation_rows:

        conversation_id = (
            admin_participant.conversation_id
        )

        participants = (
            database.query(
                db.ConversationParticipant,
                db.User
            )
            .join(
                db.User,
                db.User.id
                == db.ConversationParticipant.user_id
            )
            .filter(
                db.ConversationParticipant.conversation_id
                == conversation_id
            )
            .all()
        )

        for participant, user in participants:

            if user.id == current_user.id:
                continue

            user_conversations[user.id] = {
                "conversation": (
                    database.query(db.Conversation)
                    .filter(
                        db.Conversation.id
                        == conversation_id
                    )
                    .first()
                ),
                "participant": participant
            }

    # ========================================================
    # USERS
    # ========================================================

    if internal_roles:

        users = (
            database.query(db.User)
            .filter(
                db.User.id != current_user.id
            )
            .filter(
                db.User.active == True
            )
            .filter(
                db.User.role.in_(internal_roles)
            )
            .order_by(
                db.User.name.asc()
            )
            .all()
        )

        for user in users:

            searchable = " ".join([
                str(user.name or ""),
                str(user.email or ""),
                str(user.role or ""),
                str(user.department or ""),
                str(user.employee_id or ""),
            ]).lower()

            if search and search not in searchable:
                continue

            conversation_info = user_conversations.get(
                user.id
            )

            last_message = None
            unread = 0

            if conversation_info:

                conversation = (
                    conversation_info["conversation"]
                )

                participant = (
                    conversation_info["participant"]
                )

                last_message = (
                    database.query(db.DirectMessage)
                    .filter(
                        db.DirectMessage.conversation_id
                        == conversation.id
                    )
                    .filter(
                        db.DirectMessage.is_deleted == False
                    )
                    .order_by(
                        db.DirectMessage.created_at.desc()
                    )
                    .first()
                )

                # -------------------------------------------
                # UNREAD
                # -------------------------------------------

                if participant.last_read_at:

                    unread = (
                        database.query(db.DirectMessage)
                        .filter(
                            db.DirectMessage.conversation_id
                            == conversation.id
                        )
                        .filter(
                            db.DirectMessage.sender_id
                            != current_user.id
                        )
                        .filter(
                            db.DirectMessage.created_at
                            > participant.last_read_at
                        )
                        .count()
                    )

                else:

                    unread = (
                        database.query(db.DirectMessage)
                        .filter(
                            db.DirectMessage.conversation_id
                            == conversation.id
                        )
                        .filter(
                            db.DirectMessage.sender_id
                            != current_user.id
                        )
                        .count()
                    )

            result.append({
                "target_type": _admin_role_to_target_type(
                    user.role
                ),

                "target_id": str(user.id),

                "name": user.name,
                "display_name": user.name,

                "role": user.role,
                "department": user.department,

                "email": user.email,
                "phone": (
                    user.mobile
                    or user.work_phone
                ),

                "company": None,
                "category": None,
                "contact_person": None,

                "status": (
                    "Active"
                    if user.active
                    else "Inactive"
                ),

                "online": False,

                "last_message": (
                    last_message.message
                    if last_message
                    else ""
                ),

                "last_message_time": (
                    last_message.created_at.isoformat()
                    if last_message
                    and last_message.created_at
                    else None
                ),

                "unread": unread
            })

    # ========================================================
    # SORT
    # ========================================================

    result.sort(
        key=lambda item: (
            item.get("last_message_time")
            or ""
        ),
        reverse=True
    )

    return result


def _admin_role_to_target_type(role: str) -> str:

    mapping = {
        "Procurement Manager": "procurement",
        "Supply Chain Manager": "supply_chain",
        "Finance Officer": "finance",
        "Auditor": "audit",
    }

    return mapping.get(
        role,
        "user"
    )


# ============================================================
# FIND ADMIN ↔ USER CONVERSATION
# ============================================================

def find_admin_user_conversation(
    database,
    admin_id: int,
    other_user_id: int
):
    """
    Find an existing direct conversation between
    the Admin and another internal user.

    Does NOT create a conversation.
    """

    admin_rows = (
        database.query(
            db.ConversationParticipant.conversation_id
        )
        .filter(
            db.ConversationParticipant.user_id
            == admin_id
        )
        .all()
    )

    conversation_ids = [
        row[0]
        for row in admin_rows
    ]

    if not conversation_ids:
        return None

    conversations = (
        database.query(db.Conversation)
        .filter(
            db.Conversation.id.in_(
                conversation_ids
            )
        )
        .filter(
            db.Conversation.conversation_type
            == "direct"
        )
        .all()
    )

    for conversation in conversations:

        participant_ids = {
            row[0]
            for row in (
                database.query(
                    db.ConversationParticipant.user_id
                )
                .filter(
                    db.ConversationParticipant.conversation_id
                    == conversation.id
                )
                .all()
            )
        }

        if participant_ids == {
            admin_id,
            other_user_id
        }:
            return conversation

    return None


# ============================================================
# ADMIN GET CONVERSATION
# ============================================================

def get_admin_target_messages(
    database,
    current_user,
    target_type: str,
    target_id: str
):

    target_type = target_type.lower().strip()

    # ========================================================
    # VENDOR
    # ========================================================

    if target_type == "vendor":

        vendor = (
            database.query(db.Vendor)
            .filter(
                db.Vendor.vendor_id == target_id
            )
            .first()
        )

        if not vendor:
            raise HTTPException(
                status_code=404,
                detail="Vendor not found."
            )

        messages = (
            database.query(
                db.CommunicationMessage
            )
            .filter(
                db.CommunicationMessage.vendor_id
                == vendor.vendor_id
            )
            .order_by(
                db.CommunicationMessage.created_at.asc()
            )
            .all()
        )

        # Mark vendor messages as read
        changed = False

        for message in messages:

            if (
                message.sender_type == "vendor"
                and not message.is_read
            ):
                message.is_read = True
                changed = True

        if changed:
            database.commit()

        return {
            "target": {
                "target_type": "vendor",
                "target_id": vendor.vendor_id,
                "name": vendor.vendor_name,
                "role": "Vendor",
                "department": vendor.category,
                "email": vendor.email,
                "phone": vendor.phone,
                "company": vendor.vendor_name
            },

            "conversation_id": None,

            "messages": [
                {
                    "id": message.id,

                    "sender_id": (
                        message.sender_user_id
                    ),

                    "sender_type": (
                        message.sender_type
                    ),

                    "sender_name": (
                        (
                            message.sender.name
                            if message.sender
                            else "Admin"
                        )
                        if message.sender_type == "admin"
                        else vendor.vendor_name
                    ),

                    "message": (
                        message.message
                        or ""
                    ),

                    "message_type": (
                        message.message_type
                        or "Message"
                    ),

                    "created_at": (
                        message.created_at.isoformat()
                        if message.created_at
                        else None
                    )
                }
                for message in messages
            ]
        }

    # ========================================================
    # INTERNAL USER
    # ========================================================

    try:
        user_id = int(target_id)
    except (TypeError, ValueError):

        raise HTTPException(
            status_code=400,
            detail="Invalid user ID."
        )

    user = (
        database.query(db.User)
        .filter(
            db.User.id == user_id
        )
        .filter(
            db.User.active == True
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    allowed_roles = set(
        ADMIN_COMMUNICATION_ROLES.values()
    )

    if user.role not in allowed_roles:

        raise HTTPException(
            status_code=403,
            detail="This user cannot be contacted from Admin Communication."
        )

    conversation = find_admin_user_conversation(
        database,
        current_user.id,
        user.id
    )

    if not conversation:

        return {
            "target": {
                "target_type": _admin_role_to_target_type(
                    user.role
                ),
                "target_id": str(user.id),
                "name": user.name,
                "role": user.role,
                "department": user.department,
                "email": user.email,
                "phone": (
                    user.mobile
                    or user.work_phone
                ),
                "company": None
            },

            "conversation_id": None,
            "messages": []
        }

    messages = (
        database.query(
            db.DirectMessage,
            db.User
        )
        .outerjoin(
            db.User,
            db.User.id
            == db.DirectMessage.sender_id
        )
        .filter(
            db.DirectMessage.conversation_id
            == conversation.id
        )
        .filter(
            db.DirectMessage.is_deleted == False
        )
        .order_by(
            db.DirectMessage.created_at.asc()
        )
        .all()
    )

    participant = (
        database.query(
            db.ConversationParticipant
        )
        .filter(
            db.ConversationParticipant.conversation_id
            == conversation.id
        )
        .filter(
            db.ConversationParticipant.user_id
            == current_user.id
        )
        .first()
    )

    if participant:

        participant.last_read_at = datetime.utcnow()
        database.commit()

    return {
        "target": {
            "target_type": _admin_role_to_target_type(
                user.role
            ),
            "target_id": str(user.id),
            "name": user.name,
            "role": user.role,
            "department": user.department,
            "email": user.email,
            "phone": (
                user.mobile
                or user.work_phone
            ),
            "company": None
        },

        "conversation_id": conversation.id,

        "messages": [
            {
                "id": message.id,

                "sender_id": message.sender_id,

                "sender_type": (
                    "admin"
                    if message.sender_id
                    == current_user.id
                    else "user"
                ),

                "sender_name": (
                    sender.name
                    if sender
                    else "Unknown User"
                ),

                "message": (
                    message.message
                    or ""
                ),

                "message_type": (
                    message.message_type
                    or "text"
                ),

                "created_at": (
                    message.created_at.isoformat()
                    if message.created_at
                    else None
                )
            }
            for message, sender in messages
        ]
    }


# ============================================================
# ADMIN SEND MESSAGE
# ============================================================

def send_admin_target_message(
    database,
    current_user,
    target_type: str,
    target_id: str,
    message_text: str
):

    message_text = (message_text or "").strip()

    if not message_text:

        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty."
        )

    target_type = target_type.lower().strip()

    # ========================================================
    # VENDOR
    # ========================================================

    if target_type == "vendor":

        vendor = (
            database.query(db.Vendor)
            .filter(
                db.Vendor.vendor_id == target_id
            )
            .first()
        )

        if not vendor:

            raise HTTPException(
                status_code=404,
                detail="Vendor not found."
            )

        message = db.CommunicationMessage(
            vendor_id=vendor.vendor_id,
            sender_user_id=current_user.id,
            sender_type="admin",
            message=message_text,
            message_type="Message",
            is_read=True
        )

        database.add(message)

        activity = db.CommunicationActivity(
            vendor_id=vendor.vendor_id,
            user_id=current_user.id,
            activity_type="Message",
            subject=f"Message to {vendor.vendor_name}",
            description=message_text,
            status="Delivered"
        )

        database.add(activity)

        database.commit()
        database.refresh(message)

        return {
            "success": True,
            "id": message.id,
            "conversation_id": None,
            "sender_type": "admin",
            "message": message.message,
            "created_at": (
                message.created_at.isoformat()
                if message.created_at
                else None
            )
        }

    # ========================================================
    # INTERNAL USER
    # ========================================================

    try:
        user_id = int(target_id)
    except (TypeError, ValueError):

        raise HTTPException(
            status_code=400,
            detail="Invalid user ID."
        )

    target_user = (
        database.query(db.User)
        .filter(
            db.User.id == user_id
        )
        .filter(
            db.User.active == True
        )
        .first()
    )

    if not target_user:

        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    allowed_roles = set(
        ADMIN_COMMUNICATION_ROLES.values()
    )

    if target_user.role not in allowed_roles:

        raise HTTPException(
            status_code=403,
            detail="This user role is not available."
        )

    # -----------------------------------------------
    # GET OR CREATE CONVERSATION
    # -----------------------------------------------

    conversation = get_or_create_direct_conversation(
        database=database,
        current_user_id=current_user.id,
        other_user_id=target_user.id
    )

    # -----------------------------------------------
    # SEND MESSAGE
    # -----------------------------------------------

    result = send_direct_message(
        database=database,
        conversation_id=conversation.id,
        current_user=current_user,
        message_text=message_text
    )

    return {
        "success": True,
        "id": result["id"],
        "conversation_id": conversation.id,
        "sender_type": "admin",
        "message": result["message"],
        "created_at": result["created_at"]
    }


# ============================================================
# PROCUREMENT COMMUNICATION CENTER
# ============================================================

PROCUREMENT_COMMUNICATION_ROLES = {
    "admin": {"admin"},
    "supply_chain": {"supply chain manager"},
    "finance": {"finance officer"},
    "audit": {"auditor", "audit"},
}


def find_direct_conversation(
    database,
    user1_id: int,
    user2_id: int
):
    """
    Find an existing direct conversation between exactly
    two internal users.

    Does NOT create a conversation.
    """

    conversations = (
        database.query(db.Conversation)
        .filter(
            db.Conversation.conversation_type == "direct"
        )
        .all()
    )

    wanted_users = {
        int(user1_id),
        int(user2_id)
    }

    for conversation in conversations:

        participants = (
            database.query(db.ConversationParticipant)
            .filter(
                db.ConversationParticipant.conversation_id
                == conversation.id
            )
            .all()
        )

        participant_ids = {
            int(p.user_id)
            for p in participants
            if p.user_id is not None
        }

        if participant_ids == wanted_users:
            return conversation

    return None


def get_procurement_communication_contacts(
    database,
    current_user,
    search=None,
    target_type="all"
):
    """
    Returns Procurement Manager communication contacts.

    Supported categories:
        vendor
        admin
        supply_chain
        finance
        audit
        all

    Notes:
        - Vendors are loaded from the Vendor table.
        - Internal contacts are loaded from the User table.
        - The current logged-in user is excluded.
        - Only active internal users are returned.
        - Search works across name, ID, role, email, phone, company/category.
        - Direct-message unread counts are calculated per conversation.
    """

    # ========================================================
    # CURRENT USER
    # ========================================================

    if not current_user:
        raise HTTPException(
            status_code=401,
            detail="Authenticated user is required."
        )

    current_user_id = current_user.id

    # ========================================================
    # NORMALIZE TARGET TYPE
    # ========================================================

    target_type = (
        target_type or "all"
    ).strip().lower()

    allowed_types = {
        "vendor",
        "admin",
        "supply_chain",
        "finance",
        "audit",
        "all"
    }

    if target_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid communication target type: "
                f"{target_type}"
            )
        )

    # ========================================================
    # NORMALIZE SEARCH
    # ========================================================

    search_text = (
        search.strip().lower()
        if search
        else ""
    )

    contacts = []

    # ========================================================
    # 1. VENDORS
    # ========================================================

    if target_type in {"all", "vendor"}:

        vendors = (
            database.query(db.Vendor)
            .order_by(
                db.Vendor.vendor_name.asc()
            )
            .all()
        )

        for vendor in vendors:

            # ------------------------------------------------
            # SEARCH
            # ------------------------------------------------

            searchable = " ".join([
                str(vendor.vendor_name or ""),
                str(vendor.vendor_id or ""),
                str(vendor.email or ""),
                str(vendor.phone or ""),
                str(vendor.contact_person or ""),
                str(vendor.category or ""),
                str(vendor.business_type or ""),
                str(vendor.country or "")
            ]).lower()

            if (
                search_text
                and search_text not in searchable
            ):
                continue

            # ------------------------------------------------
            # LAST VENDOR MESSAGE
            # ------------------------------------------------

            last_message = (
                database.query(
                    db.CommunicationMessage
                )
                .filter(
                    db.CommunicationMessage.vendor_id
                    == vendor.vendor_id
                )
                .order_by(
                    db.CommunicationMessage.created_at.desc()
                )
                .first()
            )

            # ------------------------------------------------
            # UNREAD VENDOR MESSAGES
            # ------------------------------------------------

            unread_count = (
                database.query(
                    db.CommunicationMessage
                )
                .filter(
                    db.CommunicationMessage.vendor_id
                    == vendor.vendor_id
                )
                .filter(
                    db.CommunicationMessage.sender_type
                    == "vendor"
                )
                .filter(
                    db.CommunicationMessage.is_read
                    == False
                )
                .count()
            )

            # ------------------------------------------------
            # VENDOR CONTACT
            # ------------------------------------------------

            contacts.append({
                "target_type": "vendor",

                "target_id": vendor.vendor_id,

                "name": (
                    vendor.vendor_name
                    or vendor.contact_person
                    or vendor.vendor_id
                ),

                "display_id": vendor.vendor_id,

                "role": "Vendor",

                "department": (
                    vendor.category
                    or "Vendor"
                ),

                "email": vendor.email,

                "phone": vendor.phone,

                "company": (
                    vendor.vendor_name
                    or "Vendor"
                ),

                "status": (
                    vendor.status
                    or "Active"
                ),

                "last_message": (
                    last_message.message
                    if last_message
                    else ""
                ),

                "last_message_time": (
                    last_message.created_at.isoformat()
                    if (
                        last_message
                        and last_message.created_at
                    )
                    else None
                ),

                "unread": unread_count
            })

    # ========================================================
    # 2. INTERNAL USER ROLE MAPPING
    # ========================================================
    #
    # IMPORTANT:
    #
    # The API target types are:
    #
    #   admin
    #   finance
    #   audit
    #   supply_chain
    #
    # Therefore the dictionary MUST use those exact keys.
    #
    # We also include normalized role names because the
    # function uses _normalize_role(user.role).
    #
    # ========================================================

    internal_type_to_roles = {

        # ----------------------------------------------------
        # ADMIN
        # ----------------------------------------------------

        "admin": {
            "admin",
            "super_admin",
            "administrator"
        },

        # ----------------------------------------------------
        # FINANCE
        # ----------------------------------------------------

        "finance": {
            "finance_officer",
            "finance officer",
            "finance"
        },

        # ----------------------------------------------------
        # AUDIT
        # ----------------------------------------------------

        "audit": {
            "auditor",
            "audit"
        },

        # ----------------------------------------------------
        # SUPPLY CHAIN
        # ----------------------------------------------------

        "supply_chain": {
            "supply_chain_manager",
            "supply chain manager",
            "supply_chain",
            "supply chain"
        },

        # ----------------------------------------------------
        # PROCUREMENT / MANAGER
        #
        # Not directly requested by the current endpoint,
        # but kept here so "all" can safely include procurement
        # contacts if needed by the communication page.
        # ----------------------------------------------------

        "procurement": {
            "procurement_manager",
            "procurement manager",
            "manager"
        },

        # ----------------------------------------------------
        # INTERNAL VENDOR ROLE
        #
        # Vendors are already handled separately above.
        # This mapping is retained only for compatibility.
        # ----------------------------------------------------

        "vendor": {
            "vendor"
        }
    }

    # ========================================================
    # 3. DETERMINE INTERNAL CONTACT TYPES
    # ========================================================

    if target_type == "all":

        internal_types = [
            "admin",
            "procurement",
            "supply_chain",
            "finance",
            "audit"
        ]

    elif target_type == "vendor":

        # Vendor contacts were already processed above.
        internal_types = []

    else:

        internal_types = [
            target_type
        ]

    # ========================================================
    # 4. LOAD INTERNAL USERS
    # ========================================================

    for communication_type in internal_types:

        # ----------------------------------------------------
        # SAFE ROLE LOOKUP
        # ----------------------------------------------------
        #
        # This prevents KeyError if a new target type is ever
        # added without a role mapping.
        # ----------------------------------------------------

        roles = internal_type_to_roles.get(
            communication_type
        )

        if not roles:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Unsupported communication type: "
                    f"{communication_type}"
                )
            )

        # ----------------------------------------------------
        # GET ACTIVE INTERNAL USERS
        # ----------------------------------------------------

        users = (
            database.query(db.User)
            .filter(
                db.User.id != current_user_id
            )
            .filter(
                db.User.active == True
            )
            .all()
        )

        # ----------------------------------------------------
        # PROCESS USERS
        # ----------------------------------------------------

        for user in users:

            # ------------------------------------------------
            # NORMALIZE ROLE
            # ------------------------------------------------

            raw_role = (
                str(user.role or "")
                .strip()
                .lower()
            )

            try:
                normalized_role = _normalize_role(
                    user.role
                )

                normalized_role = (
                    str(normalized_role or "")
                    .strip()
                    .lower()
                )

            except Exception:
                normalized_role = raw_role

            # ------------------------------------------------
            # ROLE MATCH
            #
            # Check both the normalized role and raw role.
            # This makes the function tolerant of role formats
            # such as:
            #
            # "Auditor"
            # "AUDITOR"
            # "auditor"
            # "Supply Chain Manager"
            # "SUPPLY_CHAIN_MANAGER"
            # ------------------------------------------------

            if (
                normalized_role not in roles
                and raw_role not in roles
            ):
                continue

            # ------------------------------------------------
            # SEARCH
            # ------------------------------------------------

            searchable = " ".join([
                str(user.name or ""),
                str(user.email or ""),
                str(user.role or ""),
                str(user.mobile or ""),
                str(user.id or "")
            ]).lower()

            if (
                search_text
                and search_text not in searchable
            ):
                continue

            # ------------------------------------------------
            # FIND DIRECT CONVERSATION
            # ------------------------------------------------

            conversation = find_direct_conversation(
                database,
                current_user_id,
                user.id
            )

            last_message = None
            unread_count = 0

            # ------------------------------------------------
            # EXISTING CONVERSATION
            # ------------------------------------------------

            if conversation:

                # ------------------------------------------------
                # LAST MESSAGE
                # ------------------------------------------------

                last_message = (
                    database.query(
                        db.DirectMessage
                    )
                    .filter(
                        db.DirectMessage.conversation_id
                        == conversation.id
                    )
                    .filter(
                        db.DirectMessage.is_deleted
                        == False
                    )
                    .order_by(
                        db.DirectMessage.created_at.desc()
                    )
                    .first()
                )

                # ------------------------------------------------
                # CURRENT USER PARTICIPANT
                # ------------------------------------------------

                participant = (
                    database.query(
                        db.ConversationParticipant
                    )
                    .filter(
                        db.ConversationParticipant.conversation_id
                        == conversation.id
                    )
                    .filter(
                        db.ConversationParticipant.user_id
                        == current_user_id
                    )
                    .first()
                )

                if participant:

                    # ------------------------------------------------
                    # UNREAD MESSAGES
                    # ------------------------------------------------

                    unread_query = (
                        database.query(
                            db.DirectMessage
                        )
                        .filter(
                            db.DirectMessage.conversation_id
                            == conversation.id
                        )
                        .filter(
                            db.DirectMessage.sender_id
                            != current_user_id
                        )
                        .filter(
                            db.DirectMessage.is_deleted
                            == False
                        )
                    )

                    if participant.last_read_at:

                        unread_query = unread_query.filter(
                            db.DirectMessage.created_at
                            > participant.last_read_at
                        )

                    unread_count = (
                        unread_query.count()
                    )

            # ====================================================
            # DEPARTMENT LABEL
            # ====================================================

            department_map = {
                "admin": "Administration",
                "procurement": "Procurement",
                "supply_chain": "Supply Chain",
                "finance": "Finance",
                "audit": "Audit"
            }

            department = department_map.get(
                communication_type,
                communication_type.replace(
                    "_",
                    " "
                ).title()
            )

            # ====================================================
            # INTERNAL CONTACT
            # ====================================================

            contacts.append({
                "target_type": communication_type,

                "target_id": user.id,

                "name": (
                    user.name
                    or user.email
                    or f"User {user.id}"
                ),

                "display_id": str(user.id),

                "role": (
                    user.role
                    or communication_type.replace(
                        "_",
                        " "
                    ).title()
                ),

                "department": department,

                "email": user.email,

                "phone": user.mobile,

                "company": "VendorIQ",

                "status": (
                    "Active"
                    if user.active
                    else "Inactive"
                ),

                "last_message": (
                    last_message.message
                    if last_message
                    else ""
                ),

                "last_message_time": (
                    last_message.created_at.isoformat()
                    if (
                        last_message
                        and last_message.created_at
                    )
                    else None
                ),

                "unread": unread_count
            })

    # ========================================================
    # 5. REMOVE DUPLICATE INTERNAL CONTACTS
    # ========================================================
    #
    # A user can potentially have role aliases that appear
    # under more than one category in future changes.
    # Deduplicate using target_type + target_id.
    #
    # ========================================================

    unique_contacts = {}

    for contact in contacts:

        key = (
            contact.get("target_type"),
            contact.get("target_id")
        )

        unique_contacts[key] = contact

    contacts = list(
        unique_contacts.values()
    )

    # ========================================================
    # 6. SORT
    # ========================================================
    #
    # Contacts with recent messages appear first.
    # Contacts without messages appear afterward.
    #
    # ========================================================

    contacts.sort(
        key=lambda item: (
            item.get("last_message_time")
            or ""
        ),
        reverse=True
    )

    # ========================================================
    # 7. RETURN
    # ========================================================

    return contacts


def get_procurement_conversation(
    database,
    current_user,
    target_type: str,
    target_id: str
):
    """
    Get complete conversation with one target.
    """

    target_type = (
        target_type or ""
    ).strip().lower()

    # ========================================================
    # VENDOR
    # ========================================================

    if target_type == "vendor":

        vendor = (
            database.query(db.Vendor)
            .filter(
                db.Vendor.vendor_id
                == target_id
            )
            .first()
        )

        if not vendor:
            raise HTTPException(
                status_code=404,
                detail="Vendor not found."
            )

        messages = (
            database.query(
                db.CommunicationMessage
            )
            .filter(
                db.CommunicationMessage.vendor_id
                == vendor.vendor_id
            )
            .order_by(
                db.CommunicationMessage.created_at.asc()
            )
            .all()
        )

        # Mark vendor replies as read
        for message in messages:

            if (
                message.sender_type == "vendor"
                and not message.is_read
            ):
                message.is_read = True

        database.commit()

        return {
            "target": {
                "target_type": "vendor",
                "target_id": vendor.vendor_id,
                "name": vendor.vendor_name,
                "role": "Vendor",
                "email": vendor.email,
                "company": vendor.vendor_name
            },

            "messages": [
                {
                    "id": message.id,

                    "sender_id": message.sender_user_id,

                    "sender_type": message.sender_type,

                    "sender_name": (
                        vendor.vendor_name
                        if message.sender_type == "vendor"
                        else current_user.name
                    ),

                    "message": message.message or "",

                    "created_at": (
                        message.created_at.isoformat()
                        if message.created_at
                        else None
                    )
                }

                for message in messages
            ]
        }

    # ========================================================
    # INTERNAL USER
    # ========================================================

    if target_type not in {
        "admin",
        "supply_chain",
        "finance",
        "audit"
    }:
        raise HTTPException(
            status_code=400,
            detail="Invalid communication target."
        )

    try:
        target_user_id = int(target_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="Invalid user ID."
        )

    target_user = (
        database.query(db.User)
        .filter(
            db.User.id == target_user_id
        )
        .filter(
            db.User.active == True
        )
        .first()
    )

    if not target_user:
        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    conversation = find_direct_conversation(
        database,
        current_user.id,
        target_user.id
    )

    if not conversation:

        return {
            "target": {
                "target_type": target_type,
                "target_id": target_user.id,
                "name": target_user.name,
                "role": target_user.role,
                "email": target_user.email,
                "company": "VendorIQ"
            },
            "messages": []
        }

    messages = (
        database.query(
            db.DirectMessage,
            db.User
        )
        .outerjoin(
            db.User,
            db.User.id
            == db.DirectMessage.sender_id
        )
        .filter(
            db.DirectMessage.conversation_id
            == conversation.id
        )
        .filter(
            db.DirectMessage.is_deleted == False
        )
        .order_by(
            db.DirectMessage.created_at.asc()
        )
        .all()
    )

    result = []

    for message, sender in messages:

        result.append({
            "id": message.id,

            "sender_id": message.sender_id,

            "sender_type": (
                "procurement"
                if message.sender_id
                == current_user.id
                else "recipient"
            ),

            "sender_name": (
                sender.name
                if sender
                else "Unknown User"
            ),

            "message": message.message or "",

            "created_at": (
                message.created_at.isoformat()
                if message.created_at
                else None
            )
        })

    participant = (
        database.query(
            db.ConversationParticipant
        )
        .filter(
            db.ConversationParticipant.conversation_id
            == conversation.id
        )
        .filter(
            db.ConversationParticipant.user_id
            == current_user.id
        )
        .first()
    )

    if participant:
        participant.last_read_at = datetime.utcnow()
        database.commit()

    return {
        "target": {
            "target_type": target_type,
            "target_id": target_user.id,
            "name": target_user.name,
            "role": target_user.role,
            "email": target_user.email,
            "company": "VendorIQ"
        },

        "messages": result
    }


def send_procurement_message(
    database,
    current_user,
    target_type: str,
    target_id: str,
    message_text: str
):
    """
    Send a message from Procurement Manager.
    """

    message_text = (
        message_text or ""
    ).strip()

    if not message_text:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty."
        )

    target_type = (
        target_type or ""
    ).strip().lower()

    # ========================================================
    # VENDOR
    # ========================================================

    if target_type == "vendor":

        vendor = (
            database.query(db.Vendor)
            .filter(
                db.Vendor.vendor_id
                == target_id
            )
            .first()
        )

        if not vendor:
            raise HTTPException(
                status_code=404,
                detail="Vendor not found."
            )

        message = db.CommunicationMessage(
            vendor_id=vendor.vendor_id,

            sender_user_id=current_user.id,

            sender_type="procurement",

            message=message_text,

            message_type="Message",

            is_read=True
        )

        database.add(message)

        activity = db.CommunicationActivity(
            vendor_id=vendor.vendor_id,

            user_id=current_user.id,

            activity_type="Message",

            subject=f"Message to {vendor.vendor_name}",

            description=message_text,

            status="Delivered"
        )

        database.add(activity)

        database.commit()
        database.refresh(message)

        return {
            "success": True,

            "message": {
                "id": message.id,

                "sender_id": current_user.id,

                "sender_type": "procurement",

                "sender_name": current_user.name,

                "message": message.message,

                "created_at": (
                    message.created_at.isoformat()
                    if message.created_at
                    else None
                )
            }
        }

    # ========================================================
    # INTERNAL USER
    # ========================================================

    allowed_roles = {
        "admin": {"admin"},
        "supply_chain": {"supply chain manager"},
        "finance": {"finance officer"},
        "audit": {"auditor", "audit"}
    }

    if target_type not in allowed_roles:
        raise HTTPException(
            status_code=400,
            detail="Invalid communication target."
        )

    try:
        target_user_id = int(target_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="Invalid target user ID."
        )

    target_user = (
        database.query(db.User)
        .filter(
            db.User.id == target_user_id
        )
        .filter(
            db.User.active == True
        )
        .first()
    )

    if not target_user:
        raise HTTPException(
            status_code=404,
            detail="Target user not found."
        )

    if (
        _normalize_role(target_user.role)
        not in allowed_roles[target_type]
    ):
        raise HTTPException(
            status_code=403,
            detail="User does not belong to the selected communication category."
        )

    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot message yourself."
        )

    conversation = get_or_create_direct_conversation(
        database,
        current_user.id,
        target_user.id
    )

    sent = send_direct_message(
        database,
        conversation.id,
        current_user,
        message_text
    )

    return {
        "success": True,
        "message": {
            "id": sent["id"],
            "conversation_id": conversation.id,
            "sender_id": current_user.id,
            "sender_type": "procurement",
            "sender_name": current_user.name,
            "message": sent["message"],
            "created_at": sent["created_at"]
        }
    }


# ============================================================
# FINANCE COMMUNICATION
# ============================================================

from sqlalchemy import or_, and_, func


FINANCE_COMMUNICATION_TYPES = {
    "vendor",
    "admin",
    "supply_chain",
    "procurement",
    "audit"
}


FINANCE_ROLE_MAP = {
    "admin": {
        "admin",
        "administrator"
    },
    "supply_chain": {
        "supply chain manager",
        "supply chain"
    },
    "procurement": {
        "procurement manager",
        "procurement"
    },
    "audit": {
        "auditor",
        "audit"
    }
}


def _normalize_role(role):
    if not role:
        return ""

    return role.strip().lower()


def _finance_target_type(user_role):
    """
    Convert database user role into communication target type.
    """

    normalized = _normalize_role(user_role)

    for target_type, roles in FINANCE_ROLE_MAP.items():

        if normalized in roles:
            return target_type

    return None


# ============================================================
# FINANCE COMMUNICATION CONTACTS
# ============================================================

def get_finance_communication_contacts(
    database,
    finance_user_id: int,
    search: str = None,
    target_type: str = "all"
):
    """
    Return all communication targets available to Finance.

    Targets:
        vendor
        admin
        supply_chain
        procurement
        audit
    """

    contacts = []

    # ========================================================
    # VENDORS
    # ========================================================

    if target_type in ("all", "vendor"):

        vendors = database.query(db.Vendor).all()

        for vendor in vendors:

            # ----------------------------------------------
            # Latest vendor communication
            # ----------------------------------------------

            latest_message = (
                database.query(db.CommunicationMessage)
                .filter(
                    db.CommunicationMessage.vendor_id == vendor.vendor_id
                )
                .order_by(
                    db.CommunicationMessage.created_at.desc()
                )
                .first()
            )

            unread_count = (
                database.query(func.count(db.CommunicationMessage.id))
                .filter(
                    db.CommunicationMessage.vendor_id == vendor.vendor_id,
                    db.CommunicationMessage.sender_type != "finance",
                    db.CommunicationMessage.is_read == False
                )
                .scalar()
                or 0
            )

            vendor_name = getattr(
                vendor,
                "contact_person",
                None
            ) or getattr(
                vendor,
                "name",
                None
            ) or vendor.vendor_id

            company_name = getattr(
                vendor,
                "company_name",
                None
            ) or getattr(
                vendor,
                "company",
                None
            ) or ""

            email = getattr(vendor, "email", None)

            phone = getattr(
                vendor,
                "phone",
                None
            ) or getattr(
                vendor,
                "mobile",
                None
            )

            category = getattr(
                vendor,
                "category",
                None
            ) or ""

            contact = {
                "target_type": "vendor",
                "target_id": str(vendor.vendor_id),
                "name": vendor_name,
                "role": "Vendor",
                "department": category,
                "company": company_name,
                "email": email,
                "phone": phone,
                "last_message": (
                    latest_message.message
                    if latest_message
                    else None
                ),
                "last_message_time": (
                    latest_message.created_at
                    if latest_message
                    else None
                ),
                "unread": unread_count
            }

            contacts.append(contact)

    # ========================================================
    # INTERNAL USERS
    # ========================================================

    internal_types = [
        "admin",
        "supply_chain",
        "procurement",
        "audit"
    ]

    selected_types = (
        internal_types
        if target_type == "all"
        else [target_type]
        if target_type in internal_types
        else []
    )

    if selected_types:

        users = database.query(db.User).filter(
            db.User.id != finance_user_id
        ).all()

        for user in users:

            current_type = _finance_target_type(user.role)

            if current_type not in selected_types:
                continue

            # ----------------------------------------------
            # Find existing conversation
            # ----------------------------------------------

            conversation = find_direct_conversation(
                database,
                finance_user_id,
                user.id
            )

            latest_message = None

            if conversation:

                latest_message = (
                    database.query(db.DirectMessage)
                    .filter(
                        db.DirectMessage.conversation_id
                        == conversation.id
                    )
                    .order_by(
                        db.DirectMessage.created_at.desc()
                    )
                    .first()
                )

            unread_count = 0

            if conversation:

                unread_count = (
                    database.query(func.count(db.DirectMessage.id))
                    .filter(
                        db.DirectMessage.conversation_id
                        == conversation.id,
                        db.DirectMessage.sender_id != finance_user_id,
                        db.DirectMessage.is_read == False
                    )
                    .scalar()
                    or 0
                )

            contact = {
                "target_type": current_type,
                "target_id": user.id,
                "name": getattr(
                    user,
                    "name",
                    None
                ) or getattr(
                    user,
                    "full_name",
                    None
                ) or f"User {user.id}",

                "role": user.role,

                "department": (
                    "Administration"
                    if current_type == "admin"
                    else
                    "Supply Chain"
                    if current_type == "supply_chain"
                    else
                    "Procurement"
                    if current_type == "procurement"
                    else
                    "Audit"
                ),

                "company": "",

                "email": getattr(
                    user,
                    "email",
                    None
                ),

                "phone": getattr(
                    user,
                    "mobile",
                    None
                ),

                "last_message": (
                    latest_message.message
                    if latest_message
                    else None
                ),

                "last_message_time": (
                    latest_message.created_at
                    if latest_message
                    else None
                ),

                "unread": unread_count
            }

            contacts.append(contact)

    # ========================================================
    # SEARCH
    # ========================================================

    if search:

        search_value = search.strip().lower()

        contacts = [
            contact
            for contact in contacts
            if search_value in str(
                contact.get("name") or ""
            ).lower()
            or search_value in str(
                contact.get("company") or ""
            ).lower()
            or search_value in str(
                contact.get("email") or ""
            ).lower()
            or search_value in str(
                contact.get("role") or ""
            ).lower()
            or search_value in str(
                contact.get("target_id") or ""
            ).lower()
        ]

    # ========================================================
    # SORT
    # ========================================================

    contacts.sort(
        key=lambda item: (
            item.get("last_message_time") is not None,
            item.get("last_message_time")
        ),
        reverse=True
    )

    return contacts


# ============================================================
# GET FINANCE CONVERSATION
# ============================================================

def get_finance_conversation(
    database,
    finance_user_id: int,
    target_type: str,
    target_id
):
    """
    Return complete conversation between Finance and target.
    """

    target_type = target_type.strip().lower()

    if target_type not in FINANCE_COMMUNICATION_TYPES:
        raise ValueError("Invalid communication target")

    # ========================================================
    # VENDOR
    # ========================================================

    if target_type == "vendor":

        vendor = (
            database.query(db.Vendor)
            .filter(
                db.Vendor.vendor_id == str(target_id)
            )
            .first()
        )

        if not vendor:
            raise ValueError("Vendor not found")

        messages = (
            database.query(db.CommunicationMessage)
            .filter(
                db.CommunicationMessage.vendor_id
                == vendor.vendor_id
            )
            .order_by(
                db.CommunicationMessage.created_at.asc()
            )
            .all()
        )

        # Mark incoming vendor messages as read
        for message in messages:

            if (
                message.sender_type != "finance"
                and not message.is_read
            ):
                message.is_read = True

        database.commit()

        result = []

        for message in messages:

            result.append({
                "id": message.id,

                "sender_id": message.sender_id,

                "sender_type": message.sender_type,

                "message": message.message,

                "attachment_url": message.attachment_url,

                "is_mine": (
                    message.sender_type == "finance"
                    and message.sender_id == finance_user_id
                ),

                "created_at": message.created_at
            })

        return {
            "target_type": "vendor",
            "target_id": str(vendor.vendor_id),
            "target_name": (
                getattr(vendor, "contact_person", None)
                or getattr(vendor, "name", None)
                or vendor.vendor_id
            ),
            "messages": result
        }

    # ========================================================
    # INTERNAL USER
    # ========================================================

    try:
        target_user_id = int(target_id)
    except (ValueError, TypeError):
        raise ValueError("Invalid user ID")

    target_user = (
        database.query(db.User)
        .filter(db.User.id == target_user_id)
        .first()
    )

    if not target_user:
        raise ValueError("User not found")

    expected_type = _finance_target_type(target_user.role)

    if expected_type != target_type:
        raise ValueError(
            "Selected user does not belong to this communication category"
        )

    conversation = find_direct_conversation(
        database,
        finance_user_id,
        target_user_id
    )

    if not conversation:

        return {
            "target_type": target_type,
            "target_id": target_user.id,
            "target_name": (
                getattr(target_user, "name", None)
                or getattr(target_user, "full_name", None)
                or f"User {target_user.id}"
            ),
            "target_role": target_user.role,
            "conversation_id": None,
            "messages": []
        }

    messages = (
        database.query(db.DirectMessage)
        .filter(
            db.DirectMessage.conversation_id
            == conversation.id
        )
        .order_by(
            db.DirectMessage.created_at.asc()
        )
        .all()
    )

    # Mark incoming messages as read
    for message in messages:

        if (
            message.sender_id != finance_user_id
            and not message.is_read
        ):
            message.is_read = True

    database.commit()

    result = []

    for message in messages:

        result.append({
            "id": message.id,

            "sender_id": message.sender_id,

            "sender_type": (
                "finance"
                if message.sender_id == finance_user_id
                else "user"
            ),

            "message": message.message,

            "attachment_url": message.attachment_url,

            "is_mine": (
                message.sender_id == finance_user_id
            ),

            "created_at": message.created_at
        })

    return {
        "target_type": target_type,
        "target_id": target_user.id,
        "target_name": (
            getattr(target_user, "name", None)
            or getattr(target_user, "full_name", None)
            or f"User {target_user.id}"
        ),
        "target_role": target_user.role,
        "conversation_id": conversation.id,
        "messages": result
    }


# ============================================================
# SEND FINANCE MESSAGE
# ============================================================

def send_finance_message(
    database,
    finance_user_id: int,
    target_type: str,
    target_id,
    message_text: str
):
    """
    Send a message from Finance to a Vendor or internal user.
    """

    target_type = target_type.strip().lower()

    if target_type not in FINANCE_COMMUNICATION_TYPES:
        raise ValueError("Invalid communication target")

    message_text = message_text.strip()

    if not message_text:
        raise ValueError("Message cannot be empty")

    # ========================================================
    # VENDOR
    # ========================================================

    if target_type == "vendor":

        vendor = (
            database.query(db.Vendor)
            .filter(
                db.Vendor.vendor_id == str(target_id)
            )
            .first()
        )

        if not vendor:
            raise ValueError("Vendor not found")

        new_message = db.CommunicationMessage(
            vendor_id=vendor.vendor_id,
            sender_type="finance",
            sender_id=finance_user_id,
            message=message_text,
            is_read=False
        )

        database.add(new_message)

        # Communication activity
        activity = db.CommunicationActivity(
            vendor_id=vendor.vendor_id,
            user_id=finance_user_id,
            activity_type="message",
            description=message_text,
            status="Completed"
        )

        database.add(activity)

        database.commit()
        database.refresh(new_message)

        return {
            "success": True,
            "message_id": new_message.id,
            "target_type": "vendor",
            "target_id": str(vendor.vendor_id),
            "message": new_message.message,
            "created_at": new_message.created_at
        }

    # ========================================================
    # INTERNAL USER
    # ========================================================

    try:
        target_user_id = int(target_id)
    except (ValueError, TypeError):
        raise ValueError("Invalid user ID")

    target_user = (
        database.query(db.User)
        .filter(db.User.id == target_user_id)
        .first()
    )

    if not target_user:
        raise ValueError("User not found")

    expected_type = _finance_target_type(target_user.role)

    if expected_type != target_type:
        raise ValueError(
            "Selected user does not belong to this category"
        )

    # ----------------------------------------------
    # Get or create direct conversation
    # ----------------------------------------------

    conversation = get_or_create_direct_conversation(
        database,
        finance_user_id,
        target_user_id,
        subject="Finance Communication"
    )

    # ----------------------------------------------
    # Existing helper
    # ----------------------------------------------

    new_message = send_direct_message(
        database,
        conversation.id,
        finance_user_id,
        message_text
    )

    return {
        "success": True,
        "message_id": new_message.id,
        "conversation_id": conversation.id,
        "target_type": target_type,
        "target_id": target_user_id,
        "message": new_message.message,
        "created_at": new_message.created_at
    }


# ============================================================
# SUPPLY CHAIN COMMUNICATION
# ============================================================

SUPPLY_CHAIN_COMMUNICATION_TYPES = {
    "vendor",
    "admin",
    "procurement",
    "finance",
    "audit",
}


SUPPLY_CHAIN_ROLE_MAP = {
    "admin": {
        "admin",
        "administrator",
    },

    "procurement": {
        "procurement manager",
        "procurement",
    },

    "finance": {
        "finance officer",
        "finance",
    },

    "audit": {
        "auditor",
        "audit",
    },
}


def _normalized_role(role):
    return (role or "").strip().lower()


# ============================================================
# GET SUPPLY CHAIN COMMUNICATION CONTACTS
# ============================================================

def get_supply_chain_communication_contacts(
    database,
    current_user
):

    result = {
        "vendors": [],
        "admin": [],
        "procurement": [],
        "finance": [],
        "audit": [],
    }

    # --------------------------------------------------------
    # VENDORS
    # --------------------------------------------------------

    vendors = (
        database.query(db.Vendor)
        .filter(
            db.Vendor.status.notin_(
                ["Rejected", "Inactive"]
            )
        )
        .order_by(
            db.Vendor.vendor_name.asc()
        )
        .all()
    )

    for vendor in vendors:

        result["vendors"].append({
            "vendor_id": vendor.vendor_id,
            "name": vendor.vendor_name,
            "email": vendor.email,
            "phone": vendor.phone,
            "category": vendor.category,
            "contact_person": vendor.contact_person,
            "business_type": vendor.business_type,
            "status": vendor.status,
        })


    # --------------------------------------------------------
    # INTERNAL USERS
    # --------------------------------------------------------

    users = (
        database.query(db.User)
        .filter(
            db.User.active == True,
            db.User.id != current_user.id
        )
        .order_by(
            db.User.name.asc()
        )
        .all()
    )


    for user in users:

        role = _normalized_role(user.role)

        user_data = {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "mobile": user.mobile,
            "role": user.role,
            "active": user.active,
        }


        if role in SUPPLY_CHAIN_ROLE_MAP["admin"]:

            result["admin"].append(user_data)

        elif role in SUPPLY_CHAIN_ROLE_MAP["procurement"]:

            result["procurement"].append(user_data)

        elif role in SUPPLY_CHAIN_ROLE_MAP["finance"]:

            result["finance"].append(user_data)

        elif role in SUPPLY_CHAIN_ROLE_MAP["audit"]:

            result["audit"].append(user_data)


    return result


# ============================================================
# FIND INTERNAL DIRECT CONVERSATION
# ============================================================

def find_supply_chain_direct_conversation(
    database,
    current_user_id,
    other_user_id
):

    conversations = (
        database.query(db.Conversation)
        .filter(
            db.Conversation.conversation_type == "direct"
        )
        .all()
    )


    for conversation in conversations:

        participants = (
            database.query(
                db.ConversationParticipant
            )
            .filter(
                db.ConversationParticipant.conversation_id
                == conversation.id
            )
            .all()
        )


        user_ids = {
            participant.user_id
            for participant in participants
            if participant.user_id is not None
        }


        if user_ids == {
            current_user_id,
            other_user_id
        }:

            return conversation


    return None


# ============================================================
# GET / CREATE INTERNAL CONVERSATION
# ============================================================

def get_or_create_supply_chain_direct_conversation(
    database,
    current_user_id,
    other_user_id
):

    conversation = find_supply_chain_direct_conversation(
        database,
        current_user_id,
        other_user_id
    )


    if conversation:

        return conversation


    conversation = db.Conversation(
        conversation_type="direct",
        created_by=current_user_id
    )

    database.add(conversation)

    database.flush()


    database.add_all([

        db.ConversationParticipant(
            conversation_id=conversation.id,
            user_id=current_user_id,
            role="Supply Chain Manager",
            is_active=True
        ),

        db.ConversationParticipant(
            conversation_id=conversation.id,
            user_id=other_user_id,
            is_active=True
        )

    ])


    database.commit()

    database.refresh(conversation)

    return conversation


# ============================================================
# GET INTERNAL CONVERSATION
# ============================================================

def get_supply_chain_internal_conversation(
    database,
    current_user_id,
    other_user_id
):

    conversation = find_supply_chain_direct_conversation(
        database,
        current_user_id,
        other_user_id
    )


    if not conversation:

        return {
            "conversation_id": None,
            "messages": []
        }


    messages = (
        database.query(db.DirectMessage)
        .filter(
            db.DirectMessage.conversation_id
            == conversation.id,
            db.DirectMessage.is_deleted == False
        )
        .order_by(
            db.DirectMessage.created_at.asc()
        )
        .all()
    )


    return {
        "conversation_id": conversation.id,
        "messages": [
            {
                "id": message.id,

                "message": message.message,

                "sender_id": message.sender_id,

                "sender_name": (
                    message.sender.name
                    if message.sender
                    else "Unknown"
                ),

                "is_mine": (
                    message.sender_id
                    == current_user_id
                ),

                "created_at": (
                    message.created_at.isoformat()
                    if message.created_at
                    else None
                )
            }

            for message in messages
        ]
    }


# ============================================================
# SEND INTERNAL SUPPLY CHAIN MESSAGE
# ============================================================

def send_supply_chain_internal_message(
    database,
    current_user_id,
    other_user_id,
    message_text
):

    conversation = (
        get_or_create_supply_chain_direct_conversation(
            database,
            current_user_id,
            other_user_id
        )
    )


    message = db.DirectMessage(
        conversation_id=conversation.id,
        sender_id=current_user_id,
        message=message_text,
        message_type="text",
        is_deleted=False
    )


    database.add(message)


    conversation.updated_at = datetime.utcnow()

    database.commit()

    database.refresh(message)


    return {
        "id": message.id,
        "message": message.message,
        "sender_id": message.sender_id,
        "is_mine": True,
        "created_at": (
            message.created_at.isoformat()
            if message.created_at
            else None
        )
    }


# ============================================================
# GET VENDOR CONVERSATION
# ============================================================

def get_supply_chain_vendor_conversation(
    database,
    current_user_id,
    vendor_id
):

    vendor = (
        database.query(db.Vendor)
        .filter(
            db.Vendor.vendor_id == vendor_id
        )
        .first()
    )


    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found."
        )


    messages = (
        database.query(
            db.CommunicationMessage
        )
        .filter(
            db.CommunicationMessage.vendor_id
            == vendor_id
        )
        .order_by(
            db.CommunicationMessage.created_at.asc()
        )
        .all()
    )


    # --------------------------------------------------------
    # Mark vendor messages from the other side as read
    # --------------------------------------------------------

    changed = False


    for message in messages:

        if (
            message.sender_user_id != current_user_id
            and message.sender_type != "supply_chain"
            and not message.is_read
        ):

            message.is_read = True

            changed = True


    if changed:

        database.commit()


    return {
        "conversation_id": vendor_id,

        "vendor": {
            "vendor_id": vendor.vendor_id,
            "name": vendor.vendor_name,
            "email": vendor.email,
            "category": vendor.category,
            "contact_person": vendor.contact_person,
        },

        "messages": [

            {
                "id": message.id,

                "message": message.message,

                "sender_id": message.sender_user_id,

                "sender_name": (
                    message.sender.name
                    if message.sender
                    else vendor.contact_person or vendor.vendor_name
                ),

                "sender_type": message.sender_type,

                "is_mine": (
                    message.sender_user_id
                    == current_user_id
                    and message.sender_type
                    == "supply_chain"
                ),

                "created_at": (
                    message.created_at.isoformat()
                    if message.created_at
                    else None
                )
            }

            for message in messages
        ]
    }


# ============================================================
# SEND VENDOR MESSAGE FROM SUPPLY CHAIN
# ============================================================

def send_supply_chain_vendor_message(
    database,
    current_user_id,
    vendor_id,
    message_text
):

    vendor = (
        database.query(db.Vendor)
        .filter(
            db.Vendor.vendor_id == vendor_id
        )
        .first()
    )


    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found."
        )


    message = db.CommunicationMessage(

        vendor_id=vendor_id,

        sender_user_id=current_user_id,

        sender_type="supply_chain",

        message=message_text,

        message_type="Message",

        is_read=False,

        created_at=datetime.utcnow()
    )


    database.add(message)

    database.commit()

    database.refresh(message)


    return {
        "id": message.id,
        "message": message.message,
        "sender_id": current_user_id,
        "sender_type": "supply_chain",
        "is_mine": True,
        "created_at": (
            message.created_at.isoformat()
            if message.created_at
            else None
        )
    }


# ============================================================
# GET COMPLETE SUPPLY CHAIN CONVERSATION
# ============================================================

def get_supply_chain_conversation(
    database,
    current_user,
    target_type,
    target_id
):

    target_type = target_type.lower()


    if target_type not in SUPPLY_CHAIN_COMMUNICATION_TYPES:

        raise HTTPException(
            status_code=400,
            detail="Invalid communication target."
        )


    # --------------------------------------------------------
    # VENDOR
    # --------------------------------------------------------

    if target_type == "vendor":

        return get_supply_chain_vendor_conversation(
            database,
            current_user.id,
            target_id
        )


    # --------------------------------------------------------
    # INTERNAL USER
    # --------------------------------------------------------

    try:
        other_user_id = int(target_id)
    except (TypeError, ValueError):

        raise HTTPException(
            status_code=400,
            detail="Invalid user ID."
        )


    other_user = (
        database.query(db.User)
        .filter(
            db.User.id == other_user_id,
            db.User.active == True
        )
        .first()
    )


    if not other_user:

        raise HTTPException(
            status_code=404,
            detail="User not found."
        )


    role = _normalized_role(other_user.role)


    # Verify that this user belongs to an allowed category

    allowed = False


    for role_set in SUPPLY_CHAIN_ROLE_MAP.values():

        if role in role_set:

            allowed = True
            break


    if not allowed:

        raise HTTPException(
            status_code=403,
            detail="This user is not an allowed communication target."
        )


    conversation = (
        get_supply_chain_internal_conversation(
            database,
            current_user.id,
            other_user.id
        )
    )


    return {
        "target_type": target_type,

        "target": {
            "id": other_user.id,
            "name": other_user.name,
            "email": other_user.email,
            "role": other_user.role,
        },

        "conversation_id":
            conversation["conversation_id"],

        "messages":
            conversation["messages"]
    }


# ============================================================
# SEND SUPPLY CHAIN CONVERSATION MESSAGE
# ============================================================

def send_supply_chain_conversation_message(
    database,
    current_user,
    target_type,
    target_id,
    message_text
):

    target_type = target_type.lower()


    if not message_text or not message_text.strip():

        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty."
        )


    message_text = message_text.strip()


    # --------------------------------------------------------
    # VENDOR
    # --------------------------------------------------------

    if target_type == "vendor":

        return send_supply_chain_vendor_message(
            database,
            current_user.id,
            target_id,
            message_text
        )


    # --------------------------------------------------------
    # INTERNAL USER
    # --------------------------------------------------------

    try:
        other_user_id = int(target_id)
    except (TypeError, ValueError):

        raise HTTPException(
            status_code=400,
            detail="Invalid user ID."
        )


    other_user = (
        database.query(db.User)
        .filter(
            db.User.id == other_user_id,
            db.User.active == True
        )
        .first()
    )


    if not other_user:

        raise HTTPException(
            status_code=404,
            detail="User not found."
        )


    role = _normalized_role(other_user.role)


    allowed = any(
        role in role_set
        for role_set in SUPPLY_CHAIN_ROLE_MAP.values()
    )


    if not allowed:

        raise HTTPException(
            status_code=403,
            detail="This user is not an allowed communication target."
        )


    return send_supply_chain_internal_message(
        database,
        current_user.id,
        other_user.id,
        message_text
    )


# ============================================================
# AUDITOR COMMUNICATION
# ============================================================

AUDITOR_COMMUNICATION_TYPES = {
    "vendor",
    "admin",
    "supply_chain",
    "finance",
    "procurement",
}


AUDITOR_ROLE_MAP = {

    "admin": {
        "admin",
        "administrator",
    },

    "supply_chain": {
        "supply chain manager",
        "supply chain",
    },

    "finance": {
        "finance officer",
        "finance",
    },

    "procurement": {
        "procurement manager",
        "procurement",
    },

}


def _normalize_role(role):

    if not role:
        return ""

    return str(role).strip().lower()


def get_auditor_communication_contacts(
    database,
    auditor_user_id: int
):

    contacts = []


    # ========================================================
    # VENDORS
    # ========================================================

    vendors = (
        database.query(db.Vendor)
        .order_by(db.Vendor.id.asc())
        .all()
    )


    for vendor in vendors:

        vendor_name = (
            getattr(vendor, "company_name", None)
            or getattr(vendor, "company", None)
            or getattr(vendor, "name", None)
            or getattr(vendor, "contact_person", None)
            or "Vendor"
        )


        vendor_email = (
            getattr(vendor, "email", None)
            or ""
        )


        contacts.append({

            "target_type": "vendor",

            "target_id": str(
                getattr(
                    vendor,
                    "vendor_id",
                    vendor.id
                )
            ),

            "name": vendor_name,

            "email": vendor_email,

            "company": vendor_name,

            "department": "Vendor",

            "unread_count": 0,

        })


    # ========================================================
    # INTERNAL USERS
    # ========================================================

    users = (
        database.query(db.User)
        .filter(
            db.User.id != auditor_user_id
        )
        .order_by(db.User.id.asc())
        .all()
    )


    for user in users:

        role = _normalize_role(
            getattr(
                user,
                "role",
                None
            )
        )


        target_type = None


        for communication_type, roles in AUDITOR_ROLE_MAP.items():

            if role in roles:

                target_type = communication_type

                break


        if not target_type:
            continue


        contacts.append({

            "target_type": target_type,

            "target_id": str(user.id),

            "name": (
                getattr(
                    user,
                    "name",
                    None
                )
                or getattr(
                    user,
                    "full_name",
                    None
                )
                or "User"
            ),

            "email": (
                getattr(
                    user,
                    "email",
                    None
                )
                or ""
            ),

            "company": "",

            "department": getattr(
                user,
                "role",
                None
            ) or target_type,

            "unread_count": 0,

        })


    return contacts


# ============================================================
# FIND INTERNAL CONVERSATION
# ============================================================

def find_auditor_direct_conversation(
    database,
    auditor_user_id: int,
    target_user_id: int
):

    conversations = (
        database.query(db.Conversation)
        .join(
            db.ConversationParticipant,
            db.ConversationParticipant.conversation_id
            == db.Conversation.id
        )
        .filter(
            db.ConversationParticipant.user_id
            == auditor_user_id
        )
        .all()
    )


    for conversation in conversations:

        participant = (
            database.query(
                db.ConversationParticipant
            )
            .filter(
                db.ConversationParticipant.conversation_id
                == conversation.id,

                db.ConversationParticipant.user_id
                == target_user_id
            )
            .first()
        )


        if participant:

            return conversation


    return None


# ============================================================
# GET AUDITOR CONVERSATION
# ============================================================

def get_auditor_communication_conversation(
    database,
    auditor_user_id: int,
    target_type: str,
    target_id: str
):

    target_type = (
        target_type or ""
    ).strip().lower()


    if target_type not in AUDITOR_COMMUNICATION_TYPES:

        raise ValueError(
            "Invalid communication target"
        )


    # ========================================================
    # VENDOR CONVERSATION
    # ========================================================

    if target_type == "vendor":

        messages = (
            database.query(
                db.CommunicationMessage
            )
            .filter(
                db.CommunicationMessage.vendor_id
                == target_id
            )
            .order_by(
                db.CommunicationMessage.created_at.asc()
            )
            .all()
        )


        result = []


        for message in messages:

            sender_id = getattr(
                message,
                "sender_id",
                None
            )


            sender_type = (
                getattr(
                    message,
                    "sender_type",
                    ""
                ) or ""
            ).lower()


            is_mine = (
                sender_type == "audit"
                and
                str(sender_id)
                == str(auditor_user_id)
            )


            sender_name = "Vendor"


            if is_mine:

                auditor = (
                    database.query(db.User)
                    .filter(
                        db.User.id
                        == auditor_user_id
                    )
                    .first()
                )

                sender_name = (
                    getattr(
                        auditor,
                        "name",
                        None
                    )
                    or "Auditor"
                )


            result.append({

                "id": message.id,

                "message": message.message,

                "sender_name": sender_name,

                "is_mine": is_mine,

                "created_at": message.created_at,

            })


        return {

            "target_type": "vendor",

            "target_id": str(target_id),

            "messages": result,

        }


    # ========================================================
    # INTERNAL USER CONVERSATION
    # ========================================================

    target_user_id = int(target_id)


    conversation = (
        find_auditor_direct_conversation(
            database,
            auditor_user_id,
            target_user_id
        )
    )


    if not conversation:

        return {

            "target_type": target_type,

            "target_id": str(target_user_id),

            "messages": [],

        }


    messages = (
        database.query(
            db.DirectMessage
        )
        .filter(
            db.DirectMessage.conversation_id
            == conversation.id
        )
        .order_by(
            db.DirectMessage.created_at.asc()
        )
        .all()
    )


    result = []


    for message in messages:

        sender = (
            database.query(db.User)
            .filter(
                db.User.id
                == message.sender_id
            )
            .first()
        )


        result.append({

            "id": message.id,

            "message": message.message,

            "sender_name": (
                getattr(
                    sender,
                    "name",
                    None
                )
                or "User"
            ),

            "is_mine": (
                message.sender_id
                == auditor_user_id
            ),

            "created_at":
                message.created_at,

        })


    return {

        "target_type": target_type,

        "target_id": str(target_user_id),

        "conversation_id":
            conversation.id,

        "messages": result,

    }


# ============================================================
# SEND AUDITOR MESSAGE
# ============================================================

def send_auditor_communication_message(
    database,
    auditor_user_id: int,
    target_type: str,
    target_id: str,
    message: str
):

    target_type = (
        target_type or ""
    ).strip().lower()


    message = (
        message or ""
    ).strip()


    if not message:

        raise ValueError(
            "Message cannot be empty"
        )


    if target_type not in AUDITOR_COMMUNICATION_TYPES:

        raise ValueError(
            "Invalid communication target"
        )


    # ========================================================
    # VENDOR
    # ========================================================

    if target_type == "vendor":

        vendor = (
            database.query(db.Vendor)
            .filter(
                db.Vendor.vendor_id
                == target_id
            )
            .first()
        )


        if not vendor:

            raise ValueError(
                "Vendor not found"
            )


        new_message = (
            db.CommunicationMessage(

                vendor_id=target_id,

                sender_type="audit",

                sender_id=auditor_user_id,

                message=message,

                is_read=False,

            )
        )


        database.add(new_message)


        # Communication activity

        try:

            activity = (
                db.CommunicationActivity(

                    vendor_id=target_id,

                    user_id=auditor_user_id,

                    activity_type="message",

                    description=message,

                    status="Completed",

                )
            )

            database.add(activity)

        except Exception:

            pass


        database.commit()

        database.refresh(new_message)


        return new_message


    # ========================================================
    # INTERNAL USER
    # ========================================================

    target_user_id = int(target_id)


    target_user = (
        database.query(db.User)
        .filter(
            db.User.id
            == target_user_id
        )
        .first()
    )


    if not target_user:

        raise ValueError(
            "Target user not found"
        )


    conversation = (
        find_auditor_direct_conversation(
            database,
            auditor_user_id,
            target_user_id
        )
    )


    # Create conversation if necessary

    if not conversation:

        conversation = (
            get_or_create_direct_conversation(
                database,
                auditor_user_id,
                target_user_id,
                subject="Auditor Communication"
            )
        )


    new_message = send_direct_message(

        database=database,

        conversation_id=conversation.id,

        sender_id=auditor_user_id,

        message=message,

        attachment_url=None,

    )


    return new_message


# ============================================================
# VENDOR COMMUNICATION
# CONTACT ROLE CONFIGURATION
# ============================================================

VENDOR_COMMUNICATION_ROLES = {

    "Procurement": [
        "Procurement Manager",
        "Procurement Officer",
        "Procurement"
    ],

    "Admin": [
        "Admin",
        "Administrator"
    ],

    "Supply Chain": [
        "Supply Chain Manager",
        "Supply Chain Officer",
        "Supply Chain"
    ],

    "Finance": [
        "Finance Officer",
        "Finance Manager",
        "Finance"
    ],

    "Audit": [
        "Auditor",
        "Audit",
        "Audit Officer"
    ]
}


# ============================================================
# COMMUNICATION SENDER TYPES
# ============================================================

COMMUNICATION_INTERNAL_SENDER_TYPES = [
    "user",
    "admin",
    "procurement",
    "supply_chain",
    "finance",
    "audit"
]


# ============================================================
# NORMALIZE COMMUNICATION TYPE
# ============================================================

def normalize_communication_type(
    value: str
) -> str:

    value = (
        str(value or "")
        .strip()
        .lower()
        .replace("-", "_")
        .replace(" ", "_")
    )

    mapping = {

        "vendor": "vendor",

        "admin": "admin",
        "administrator": "admin",

        "procurement": "procurement",
        "procurement_manager": "procurement",
        "procurement_officer": "procurement",

        "supply_chain": "supply_chain",
        "supply_chain_manager": "supply_chain",
        "supply_chain_officer": "supply_chain",

        "finance": "finance",
        "finance_manager": "finance",
        "finance_officer": "finance",

        "audit": "audit",
        "auditor": "audit",
        "audit_officer": "audit",

        "user": "user"
    }

    return mapping.get(
        value,
        value
    )


# ============================================================
# DEPARTMENT NAME
# ============================================================

def _communication_department_name(
    target_type: str
) -> str:

    normalized = normalize_communication_type(
        target_type
    )

    mapping = {

        "procurement":
            "Procurement",

        "admin":
            "Admin",

        "supply_chain":
            "Supply Chain",

        "finance":
            "Finance",

        "audit":
            "Audit"
    }

    return mapping.get(
        normalized,
        ""
    )


# ============================================================
# VERIFY COMMUNICATION RECIPIENT
# ============================================================

def verify_vendor_communication_recipient(
    database: Session,
    target_type: str,
    target_id: int
):

    normalized_type = normalize_communication_type(
        target_type
    )

    department = (
        _communication_department_name(
            normalized_type
        )
    )

    if not department:

        raise HTTPException(
            status_code=400,
            detail="Invalid communication department."
        )

    allowed_roles = (
        VENDOR_COMMUNICATION_ROLES.get(
            department,
            []
        )
    )

    recipient = (
        database.query(db.User)
        .filter(
            db.User.id == target_id,
            db.User.active == True
        )
        .first()
    )

    if recipient is None:

        raise HTTPException(
            status_code=404,
            detail="Communication contact not found."
        )

    if recipient.role not in allowed_roles:

        raise HTTPException(
            status_code=403,
            detail=(
                "This user does not belong "
                "to the selected communication department."
            )
        )

    return recipient


# ============================================================
# VENDOR COMMUNICATION PROFILE
# ============================================================

def get_vendor_communication_profile(
    database: Session,
    vendor: db.Vendor
):

    return {

        "vendor_id":
            vendor.vendor_id,

        "vendor_name":
            vendor.vendor_name,

        "company_name":
            vendor.vendor_name,

        "email":
            vendor.email
    }


# ============================================================
# VENDOR COMMUNICATION CONTACTS
# ============================================================

def get_vendor_communication_contacts(
    database: Session,
    vendor: db.Vendor
):

    contacts = []

    for department, allowed_roles in (
        VENDOR_COMMUNICATION_ROLES.items()
    ):

        users = (
            database.query(db.User)
            .filter(
                db.User.role.in_(
                    allowed_roles
                ),
                db.User.active == True
            )
            .order_by(
                db.User.name.asc()
            )
            .all()
        )

        for user in users:

            # ------------------------------------------------
            # COUNT ALL INTERNAL MESSAGE TYPES
            # ------------------------------------------------

            unread_count = (
                database.query(
                    db.CommunicationMessage
                )
                .filter(
                    db.CommunicationMessage.vendor_id
                    == vendor.vendor_id,

                    db.CommunicationMessage.sender_user_id
                    == user.id,

                    db.CommunicationMessage.sender_type.in_(
                        COMMUNICATION_INTERNAL_SENDER_TYPES
                    ),

                    db.CommunicationMessage.is_read
                    == False
                )
                .count()
            )

            # ------------------------------------------------
            # NORMALIZED FRONTEND TYPE
            # ------------------------------------------------

            department_type = (
                normalize_communication_type(
                    department
                )
            )

            contacts.append({

                "user_id":
                    user.id,

                "id":
                    user.id,

                "name":
                    user.name,

                "email":
                    user.email,

                "role":
                    user.role,

                "department":
                    department,

                "type":
                    department_type,

                "status":
                    (
                        "Active"
                        if user.active
                        else "Inactive"
                    ),

                "unread_count":
                    unread_count
            })

    return contacts


# ============================================================
# GET VENDOR <-> USER CONVERSATION
# ============================================================

def get_vendor_user_conversation(
    database: Session,
    vendor: db.Vendor,
    recipient_user_id: int
):

    # --------------------------------------------------------
    # VERIFY RECIPIENT
    # --------------------------------------------------------

    recipient = (
        database.query(db.User)
        .filter(
            db.User.id == recipient_user_id,
            db.User.active == True
        )
        .first()
    )

    if recipient is None:

        raise HTTPException(
            status_code=404,
            detail="Communication recipient not found."
        )

    # --------------------------------------------------------
    # GET BOTH SIDES
    #
    # Vendor -> Employee:
    #
    # sender_type = vendor
    # recipient_user_id = employee
    #
    # Employee -> Vendor:
    #
    # sender_type = procurement/admin/
    #               supply_chain/finance/audit/user
    # sender_user_id = employee
    # --------------------------------------------------------

    messages = (
        database.query(
            db.CommunicationMessage
        )
        .filter(

            db.CommunicationMessage.vendor_id
            == vendor.vendor_id,

            or_(

                # --------------------------------------------
                # VENDOR -> INTERNAL USER
                # --------------------------------------------

                (
                    db.CommunicationMessage.sender_type
                    == "vendor"
                )
                &
                (
                    db.CommunicationMessage.recipient_user_id
                    == recipient_user_id
                ),

                # --------------------------------------------
                # INTERNAL USER -> VENDOR
                # --------------------------------------------

                (
                    db.CommunicationMessage.sender_user_id
                    == recipient_user_id
                )
                &
                (
                    db.CommunicationMessage.sender_type.in_(
                        COMMUNICATION_INTERNAL_SENDER_TYPES
                    )
                )
            )
        )
        .order_by(
            db.CommunicationMessage.created_at.asc(),
            db.CommunicationMessage.id.asc()
        )
        .all()
    )

    # --------------------------------------------------------
    # MARK INTERNAL -> VENDOR MESSAGES AS READ
    # --------------------------------------------------------

    database.query(
        db.CommunicationMessage
    ).filter(

        db.CommunicationMessage.vendor_id
        == vendor.vendor_id,

        db.CommunicationMessage.sender_user_id
        == recipient_user_id,

        db.CommunicationMessage.sender_type.in_(
            COMMUNICATION_INTERNAL_SENDER_TYPES
        ),

        db.CommunicationMessage.is_read
        == False

    ).update(

        {
            db.CommunicationMessage.is_read:
                True
        },

        synchronize_session=False
    )

    database.commit()

    # --------------------------------------------------------
    # BUILD RESPONSE
    # --------------------------------------------------------

    result = []

    for message in messages:

        # --------------------------------------------
        # SENDER NAME
        # --------------------------------------------

        if message.sender_type == "vendor":

            sender_name = (
                vendor.contact_person
                or vendor.vendor_name
                or "Vendor"
            )

        else:

            sender_name = (
                message.sender.name
                if message.sender
                else recipient.name
            )

        # --------------------------------------------
        # OWNERSHIP
        # --------------------------------------------

        is_mine = (
            message.sender_type
            == "vendor"
        )

        result.append({

            "id":
                message.id,

            "vendor_id":
                message.vendor_id,

            "sender_user_id":
                message.sender_user_id,

            "recipient_user_id":
                message.recipient_user_id,

            "sender_id":
                message.sender_user_id,

            "sender_type":
                message.sender_type,

            "sender_name":
                sender_name,

            "message":
                message.message,

            "content":
                message.message,

            "message_type":
                message.message_type
                or "Message",

            "is_read":
                bool(message.is_read),

            "is_mine":
                is_mine,

            "created_at": (
                message.created_at.isoformat()
                if message.created_at
                else None
            )
        })

    return {

        "success":
            True,

        "vendor_id":
            vendor.vendor_id,

        "recipient_user_id":
            recipient.id,

        "recipient_name":
            recipient.name,

        "recipient_role":
            recipient.role,

        "messages":
            result
    }


# ============================================================
# SEND VENDOR MESSAGE TO SPECIFIC USER
# ============================================================

def send_vendor_message_to_user(
    database: Session,
    vendor: db.Vendor,
    recipient_user_id: int,
    message_text: str
):

    text_message = (
        message_text or ""
    ).strip()

    if not text_message:

        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty."
        )

    # --------------------------------------------------------
    # RECIPIENT
    # --------------------------------------------------------

    recipient = (
        database.query(db.User)
        .filter(
            db.User.id == recipient_user_id,
            db.User.active == True
        )
        .first()
    )

    if recipient is None:

        raise HTTPException(
            status_code=404,
            detail="Recipient not found or inactive."
        )

    # --------------------------------------------------------
    # CREATE MESSAGE
    # --------------------------------------------------------

    new_message = db.CommunicationMessage(

        vendor_id=
            vendor.vendor_id,

        sender_user_id=
            None,

        recipient_user_id=
            recipient.id,

        sender_type=
            "vendor",

        message=
            text_message,

        message_type=
            "Message",

        is_read=
            False,

        created_at=
            datetime.utcnow()
    )

    database.add(
        new_message
    )

    database.flush()

    # --------------------------------------------------------
    # ACTIVITY
    # --------------------------------------------------------

    activity = db.CommunicationActivity(

        vendor_id=
            vendor.vendor_id,

        user_id=
            recipient.id,

        activity_type=
            "Message",

        subject=
            f"Message to {recipient.name}",

        description=
            text_message[:255],

        status=
            "Delivered",

        created_at=
            datetime.utcnow()
    )

    database.add(
        activity
    )

    database.commit()

    database.refresh(
        new_message
    )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {

        "id":
            new_message.id,

        "vendor_id":
            new_message.vendor_id,

        "sender_user_id":
            None,

        "recipient_user_id":
            new_message.recipient_user_id,

        "sender_id":
            None,

        "sender_type":
            "vendor",

        "sender_name":
            (
                vendor.contact_person
                or vendor.vendor_name
                or "Vendor"
            ),

        "message":
            new_message.message,

        "content":
            new_message.message,

        "message_type":
            new_message.message_type,

        "is_read":
            False,

        "is_mine":
            True,

        "created_at": (
            new_message.created_at.isoformat()
            if new_message.created_at
            else None
        )
    }


# ============================================================
# COMMUNICATION DEPARTMENT NORMALIZATION
# ============================================================

def _communication_department_name(
    target_type: str
) -> str:

    mapping = {

        "procurement":
            "Procurement",

        "admin":
            "Admin",

        "supply-chain":
            "Supply Chain",

        "supply_chain":
            "Supply Chain",

        "finance":
            "Finance",

        "audit":
            "Audit"
    }

    return mapping.get(
        target_type,
        ""
    )


def update_vendor_profile(
    database,
    vendor_id: str,
    profile_data
):
    """
    Update vendor profile by vendor_id.

    Only profile fields supplied by the request are updated.
    """

    vendor = (
        database.query(db.Vendor)
        .filter(db.Vendor.vendor_id == vendor_id)
        .first()
    )

    if not vendor:
        return None

    # Convert Pydantic model to dictionary
    if hasattr(profile_data, "model_dump"):
        update_data = profile_data.model_dump(exclude_unset=True)
    elif hasattr(profile_data, "dict"):
        update_data = profile_data.dict(exclude_unset=True)
    else:
        update_data = dict(profile_data)

    # Fields allowed to be edited from Vendor Profile
    allowed_fields = {
        "vendor_name",
        "country",
        "email",
        "phone",
        "business_type",
        "category",
        "address",
        "contact_person",
        "website",
        "gst_vat_number",
        "tax_id_ein",
        "pan_number",
        "primary_contact",
    }

    for field, value in update_data.items():

        if field not in allowed_fields:
            continue

        # Don't overwrite values with None unless explicitly intended
        if value is not None:
            setattr(vendor, field, value)

    database.commit()
    database.refresh(vendor)

    return vendor