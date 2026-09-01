from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta
import secrets
from app.models.password_reset_token import PasswordResetToken
from app.database import get_db
from app.models.user import User

from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserProfileUpdate,
    PasswordChange,
    ForgotPasswordRequest,
    ResetPasswordRequest
)

from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_email
)

from app.utils.roles import (
    ALLOWED_ROLES,
    VENDOR
)


router = APIRouter()


# ==========================================
# REGISTER
# ==========================================

@router.post("/register")
def register(
    user: UserCreate,
    db: Session = Depends(get_db)
):

    # ======================================
    # CHECK EMAIL
    # ======================================

    existing_user = db.query(
        User
    ).filter(
        User.email == user.email
    ).first()

    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )


    # ======================================
    # VALIDATE ROLE
    # ======================================

    requested_role = user.role or VENDOR

    if requested_role not in ALLOWED_ROLES:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid role. Allowed roles: "
                + ", ".join(ALLOWED_ROLES)
            )
        )


    # ======================================
    # SECURITY
    #
    # Public registration cannot create
    # Administrator accounts.
    # ======================================

    if requested_role == "Administrator":

        raise HTTPException(
            status_code=403,
            detail=(
                "Administrator accounts cannot "
                "be created through public registration"
            )
        )


    # ======================================
    # CREATE USER
    # ======================================

    new_user = User(

        full_name=user.full_name,

        email=user.email,

        password=hash_password(
            user.password
        ),

        role=requested_role

    )

    db.add(new_user)

    db.commit()

    db.refresh(new_user)


    # ======================================
    # RESPONSE
    # ======================================

    return {

        "message":
            "User Registered Successfully",

        "user": {

            "id":
                new_user.id,

            "full_name":
                new_user.full_name,

            "email":
                new_user.email,

            "role":
                new_user.role

        }

    }


# ==========================================
# LOGIN
# ==========================================

@router.post("/login")
def login(
    user: UserLogin,
    db: Session = Depends(get_db)
):

    # ======================================
    # FIND USER
    # ======================================

    db_user = db.query(
        User
    ).filter(
        User.email == user.email
    ).first()


    if not db_user:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )


    # ======================================
    # VERIFY PASSWORD
    # ======================================

    if not verify_password(
        user.password,
        db_user.password
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )


    # ======================================
    # CREATE JWT
    #
    # Role is included in the token so
    # RBAC can use it later.
    # ======================================

    access_token = create_access_token(
        {
            "sub": db_user.email,

            "role": db_user.role
        }
    )


    # ======================================
    # RESPONSE
    # ======================================

    return {

        "access_token":
            access_token,

        "token_type":
            "bearer",

        "user": {

            "id":
                db_user.id,

            "full_name":
                db_user.full_name,

            "email":
                db_user.email,

            "role":
                db_user.role

        }

    }


# ==========================================
# TOKEN
#
# OAuth2 / Swagger login endpoint
# ==========================================

@router.post("/token")
def token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):

    # ======================================
    # FIND USER
    # ======================================

    db_user = db.query(
        User
    ).filter(
        User.email == form_data.username
    ).first()


    if not db_user:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )


    # ======================================
    # VERIFY PASSWORD
    # ======================================

    if not verify_password(
        form_data.password,
        db_user.password
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )


    # ======================================
    # CREATE JWT
    # ======================================

    access_token = create_access_token(
        {
            "sub": db_user.email,

            "role": db_user.role
        }
    )


    return {

        "access_token":
            access_token,

        "token_type":
            "bearer"

    }


# ==========================================
# GET PROFILE
# ==========================================

@router.get("/profile")
def profile(
    email: str = Depends(get_current_email),
    db: Session = Depends(get_db)
):

    # ======================================
    # FIND CURRENT USER
    # ======================================

    user = db.query(
        User
    ).filter(
        User.email == email
    ).first()


    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )


    # ======================================
    # RESPONSE
    # ======================================

    return {

        "id":
            user.id,

        "full_name":
            user.full_name,

        "email":
            user.email,

        "role":
            user.role

    }


# ==========================================
# UPDATE PROFILE
# ==========================================

@router.put("/profile")
def update_profile(
    data: UserProfileUpdate,
    email: str = Depends(get_current_email),
    db: Session = Depends(get_db)
):

    # ======================================
    # FIND CURRENT USER
    # ======================================

    user = db.query(
        User
    ).filter(
        User.email == email
    ).first()


    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )


    # ======================================
    # UPDATE PROFILE
    # ======================================

    user.full_name = data.full_name


    db.commit()

    db.refresh(user)


    # ======================================
    # RESPONSE
    # ======================================

    return {

        "message":
            "Profile updated successfully",

        "user": {

            "id":
                user.id,

            "full_name":
                user.full_name,

            "email":
                user.email,

            "role":
                user.role

        }

    }


# ==========================================
# CHANGE PASSWORD
# ==========================================

@router.put("/change-password")
def change_password(
    data: PasswordChange,
    email: str = Depends(get_current_email),
    db: Session = Depends(get_db)
):

    # ======================================
    # FIND CURRENT USER
    # ======================================

    user = db.query(
        User
    ).filter(
        User.email == email
    ).first()


    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )


    # ======================================
    # VERIFY CURRENT PASSWORD
    # ======================================

    if not verify_password(
        data.current_password,
        user.password
    ):

        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )


    # ======================================
    # PREVENT SAME PASSWORD
    # ======================================

    if verify_password(
        data.new_password,
        user.password
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "New password must be different "
                "from the current password"
            )
        )


    # ======================================
    # HASH NEW PASSWORD
    # ======================================

    user.password = hash_password(
        data.new_password
    )


    # ======================================
    # SAVE
    # ======================================

    db.commit()


    # ======================================
    # RESPONSE
    # ======================================

    return {

        "message":
            "Password changed successfully"

    }

# ==========================================
# FORGOT PASSWORD
# ==========================================

@router.post("/forgot-password")
def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):

    user = db.query(
        User
    ).filter(
        User.email == data.email
    ).first()


    # Always return the same response.
    # This prevents revealing whether an
    # email exists in the system.

    if not user:

        return {
            "message":
                "If the email exists, a password reset request has been created."
        }


    # ======================================
    # INVALIDATE OLD TOKENS
    # ======================================

    old_tokens = db.query(
        PasswordResetToken
    ).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == 0
    ).all()


    for old_token in old_tokens:

        old_token.used = 1


    # ======================================
    # CREATE TOKEN
    # ======================================

    reset_token = secrets.token_urlsafe(32)


    token_record = PasswordResetToken(

        user_id=user.id,

        token=reset_token,

        expires_at=
            datetime.utcnow()
            + timedelta(minutes=30),

        used=0

    )


    db.add(token_record)

    db.commit()


    # ======================================
    # TEMPORARY RESPONSE
    #
    # Later this token will be sent through
    # email when SMTP is implemented.
    # ======================================

    return {

        "message":
            "Password reset token created.",

        "reset_token":
            reset_token,

        "expires_in_minutes":
            30

    }


# ==========================================
# RESET PASSWORD
# ==========================================

@router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db)
):

    token_record = db.query(
        PasswordResetToken
    ).filter(
        PasswordResetToken.token == data.token
    ).first()


    # ======================================
    # VALIDATE TOKEN
    # ======================================

    if not token_record:

        raise HTTPException(
            status_code=400,
            detail="Invalid password reset token."
        )


    if token_record.used:

        raise HTTPException(
            status_code=400,
            detail="Password reset token has already been used."
        )


    if datetime.utcnow() > token_record.expires_at:

        token_record.used = 1

        db.commit()

        raise HTTPException(
            status_code=400,
            detail="Password reset token has expired."
        )


    # ======================================
    # FIND USER
    # ======================================

    user = db.query(
        User
    ).filter(
        User.id == token_record.user_id
    ).first()


    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found."
        )


    # ======================================
    # UPDATE PASSWORD
    # ======================================

    if verify_password(
        data.new_password,
        user.password
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "New password must be different "
                "from the current password."
            )
        )


    user.password = hash_password(
        data.new_password
    )


    # ======================================
    # MARK TOKEN USED
    # ======================================

    token_record.used = 1


    db.commit()


    return {

        "message":
            "Password reset successfully."

    }