from pydantic import BaseModel, EmailStr, Field


ROLES = [
    "Administrator",
    "Procurement Manager",
    "Supply Chain Manager",
    "Vendor",
    "Finance Officer",
    "Auditor"
]


class UserCreate(BaseModel):

    full_name: str = Field(
        min_length=2,
        max_length=100
    )

    email: EmailStr

    password: str = Field(
        min_length=8,
        max_length=128
    )

    role: str = "Vendor"


class UserLogin(BaseModel):

    email: EmailStr

    password: str


class UserProfileUpdate(BaseModel):

    full_name: str = Field(
        min_length=2,
        max_length=100
    )


class PasswordChange(BaseModel):

    current_password: str

    new_password: str = Field(
        min_length=8,
        max_length=128
    )


class ForgotPasswordRequest(BaseModel):

    email: EmailStr


class ResetPasswordRequest(BaseModel):

    token: str

    new_password: str = Field(
        min_length=8,
        max_length=128
    )