from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str = "Vendor"

class UserLogin(BaseModel):
    email: EmailStr
    password: str