from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.user import REGISTERABLE_ROLES, Role


class UserRegister(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Role = Role.VENDOR

    @field_validator("role")
    @classmethod
    def role_must_be_registerable(cls, value: Role) -> Role:
        if value not in REGISTERABLE_ROLES:
            raise ValueError("Administrator role cannot be assigned during registration")
        return value


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class MessageResponse(BaseModel):
    message: str


class UserProfileUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: Role
    is_active: bool
    created_at: datetime
