"""Password reset API endpoints for VendorIQ."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.services.milestone_two import commit, fail
from app.services.password_reset_service import (
    apply_password_reset,
    generate_reset_token,
    validate_reset_token,
)

router = APIRouter(prefix="/api/v1/auth", tags=["Password Reset"])

DatabaseSession = Annotated[Session, Depends(get_db)]


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/forgot-password", summary="Request password reset email")
def forgot_password(body: ForgotPasswordRequest, db: DatabaseSession):
    """Initiate password reset.

    Always returns 200 to prevent user-enumeration attacks.
    The token would be sent via email in production; here we return it
    in the response for development convenience.
    """
    token = generate_reset_token(db, body.email)
    commit(db)

    # In production: send email here
    # For now: return token for development / testing
    response = {
        "message": "If this email address is registered, a reset link has been generated.",
    }
    if token:
        response["reset_token"] = token  # Remove in production
        response["expires_in_hours"] = 2
    return response


@router.get("/reset-password/validate", summary="Validate a reset token")
def validate_token(token: str, db: DatabaseSession):
    """Check if a reset token is still valid without consuming it."""
    user = validate_reset_token(db, token)
    if user is None:
        fail(400, "This reset token is invalid or has expired.")
    return {"valid": True, "email": user.email}


@router.post("/reset-password", summary="Apply password reset")
def reset_password(body: ResetPasswordRequest, db: DatabaseSession):
    """Consume the reset token and update the user's password."""
    success = apply_password_reset(db, body.token, body.new_password)
    if not success:
        fail(400, "This reset token is invalid, expired, or has already been used.")
    commit(db)
    return {"message": "Password has been reset successfully. You may now sign in."}
