"""Authentication request and response schemas."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.user import UserRead


class LoginRequest(BaseModel):
    """Credentials submitted to sign in."""

    email: EmailStr
    password: str = Field(min_length=1)

    @field_validator("email")
    @classmethod
    def normalise_email(cls, value: EmailStr) -> str:
        return value.strip().lower()


class RefreshTokenRequest(BaseModel):
    """Refresh token used to issue a new token pair."""

    refresh_token: str = Field(min_length=1)


class TokenResponse(BaseModel):
    """Token pair and the current user profile returned after authentication."""

    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserRead
