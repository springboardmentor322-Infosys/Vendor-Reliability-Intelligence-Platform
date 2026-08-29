from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    role_name: str

class RoleResponse(BaseModel):
    id: int
    name: str
    permissions: str

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    role_id: Optional[int]
    is_active: bool
    role: Optional[RoleResponse] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    token: str
    new_password: str
