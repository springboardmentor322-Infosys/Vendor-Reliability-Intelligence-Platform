"""User validation and response schemas."""

from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.schemas.role import RoleRead


PHONE_PATTERN = re.compile(r"^\+?[0-9().\-\s]{7,30}$")


class UserRegister(BaseModel):
    """Validated registration payload for a new account."""

    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=30)
    password: str
    role_name: str = Field(min_length=2, max_length=100)

    @field_validator("first_name", "last_name", "role_name", mode="before")
    @classmethod
    def strip_required_text(cls, value: object) -> object:
        """Reject whitespace-only identity and role fields."""

        if isinstance(value, str):
            value = value.strip()
            if not value:
                raise ValueError("This field cannot be blank.")
        return value

    @field_validator("email")
    @classmethod
    def normalise_email(cls, value: EmailStr) -> str:
        """Store email addresses consistently for uniqueness checks."""

        return value.strip().lower()

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, value: object) -> object:
        """Allow an optional, human-readable international phone number."""

        if value is None:
            return None
        if not isinstance(value, str):
            raise ValueError("Phone must be a text value.")
        phone = value.strip()
        if not phone:
            return None
        if not PHONE_PATTERN.fullmatch(phone):
            raise ValueError("Phone must contain a valid phone number.")
        return phone

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        """Enforce the stated password policy before bcrypt hashes it."""

        failures: list[str] = []
        if len(value) < 8:
            failures.append("be at least 8 characters long")
        if len(value.encode("utf-8")) > 72:
            failures.append("not exceed 72 UTF-8 bytes")
        if not any(character.isupper() for character in value):
            failures.append("include an uppercase letter")
        if not any(character.islower() for character in value):
            failures.append("include a lowercase letter")
        if not any(character.isdigit() for character in value):
            failures.append("include a number")
        if not any(not character.isalnum() for character in value):
            failures.append("include a special character")

        if failures:
            raise ValueError("Password must " + ", ".join(failures) + ".")
        return value


class UserRead(BaseModel):
    """Safe authenticated-user response without password material."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None
    vendor_id: int | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    roles: list[RoleRead]


class ManagedUserCreate(UserRegister):
    """Account provisioning payload used by administrators and vendor onboarding."""

    vendor_id: int | None = Field(default=None, gt=0)


class VendorAccountLink(BaseModel):
    """Bind an existing Vendor-role account to its supplier company."""

    vendor_id: int = Field(gt=0)
