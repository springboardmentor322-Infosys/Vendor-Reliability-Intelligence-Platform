from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User

# IMPORTANT:
# Import these from the same location where your existing
# authentication dependency is defined.

from app.services.dependencies import get_current_user

# IMPORTANT:
# Use the password hashing functions already used by your
# existing /auth/register and /auth/login implementation.
from app.utils.security import verify_password, hash_password


router = APIRouter(
    prefix="/settings",
    tags=["Settings"]
)


# =====================================
# SCHEMAS
# =====================================

class ProfileUpdateRequest(BaseModel):

    full_name: str = Field(
        ...,
        min_length=2,
        max_length=100
    )


class PasswordChangeRequest(BaseModel):

    current_password: str = Field(
        ...,
        min_length=1
    )

    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128
    )


# =====================================
# GET SETTINGS / PROFILE
# =====================================

@router.get("")
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = (
        db.query(User)
        .filter(
            User.id == current_user.id
        )
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )


    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at
    }


# =====================================
# UPDATE PROFILE
# =====================================

@router.patch("/profile")
def update_profile(
    payload: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    user = (
        db.query(User)
        .filter(
            User.id == current_user.id
        )
        .first()
    )


    if not user:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )


    full_name =payload.full_name.strip()


    if len(full_name) < 2:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name must contain at least 2 characters."
        )


    user.full_name =full_name


    db.commit()

    db.refresh(user)


    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at
    }


# =====================================
# CHANGE PASSWORD
# =====================================

@router.post("/change-password")
def change_password(
    payload: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    user = (
        db.query(User)
        .filter(
            User.id == current_user.id
        )
        .first()
    )


    if not user:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )


    # Verify current password

    if not verify_password(
        payload.current_password,
        user.password
    ):

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )


    # Prevent same password

    if verify_password(
        payload.new_password,
        user.password
    ):

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current password."
        )


    # Hash new password

    user.password =hash_password(
            payload.new_password
        )


    db.commit()


    return {
        "message":
            "Password changed successfully."
    }