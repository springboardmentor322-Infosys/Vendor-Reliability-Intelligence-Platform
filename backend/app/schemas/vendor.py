from pydantic import BaseModel, EmailStr
from typing import Optional


class VendorBase(BaseModel):
    vendor_name: str
    category: str
    email: EmailStr
    phone: str
    address: Optional[str] = None
    reliability_score: float = 0
    compliance_score: float = 0
    status: str = "Active"


class VendorCreate(VendorBase):
    pass


class VendorUpdate(BaseModel):
    vendor_name: Optional[str] = None
    category: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    reliability_score: Optional[float] = None
    compliance_score: Optional[float] = None
    status: Optional[str] = None


class VendorResponse(VendorBase):
    id: int

    class Config:
        from_attributes = True