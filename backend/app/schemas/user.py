"""
Pydantic schemas define what JSON shape the API expects/returns.
This is different from the SQLAlchemy models (those define DB tables).
Keeping them separate means we never accidentally leak fields like
`hashed_password` back to the frontend.
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, ConfigDict, Field

from app.models.user import RoleEnum


class UserPublicRegistration(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=12)


class UserCreate(UserPublicRegistration):
    """Administrator-only staff/user provisioning payload."""
    role: RoleEnum
    vendor_id: uuid.UUID | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    email: EmailStr
    role: RoleEnum
    vendor_id: uuid.UUID | None
    is_active: bool
    created_at: datetime


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
