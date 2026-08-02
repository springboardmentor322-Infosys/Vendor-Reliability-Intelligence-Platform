from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

VALID_VENDOR_STATUSES = {
    "Pending",
    "Under Review",
    "Approved",
    "Rejected",
}


class VendorCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class VendorContactBase(BaseModel):
    contact_name: str = Field(min_length=1, max_length=255)
    designation: Optional[str] = Field(default=None, max_length=255)
    email: EmailStr
    phone: str = Field(min_length=5, max_length=50)


class VendorContactCreate(VendorContactBase):
    pass


class VendorContactResponse(VendorContactBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class VendorCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category_id: int
    contact_email: EmailStr
    contact_phone: str = Field(min_length=5, max_length=50)
    address: str = Field(min_length=1, max_length=1024)
    contacts: Optional[List[VendorContactCreate]] = None


class VendorUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    category_id: Optional[int] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(default=None, min_length=5, max_length=50)
    address: Optional[str] = Field(default=None, min_length=1, max_length=1024)
    contacts: Optional[List[VendorContactCreate]] = None


class VendorStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in VALID_VENDOR_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(sorted(VALID_VENDOR_STATUSES))}")
        return value


class VendorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: VendorCategoryResponse
    contact_email: EmailStr
    contact_phone: str
    address: str
    status: str
    created_by: Optional[int]
    created_at: datetime
    contacts: list[VendorContactResponse] = []
