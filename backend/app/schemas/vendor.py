from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

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
    rejection_reason: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in VALID_VENDOR_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(sorted(VALID_VENDOR_STATUSES))}")
        return value

    @model_validator(mode="after")
    def validate_rejection_reason(self) -> "VendorStatusUpdate":
        if self.status == "Rejected" and not (self.rejection_reason and self.rejection_reason.strip()):
            raise ValueError("Rejection reason is required when rejecting a vendor")
        return self


class VendorStatusHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    from_status: Optional[str]
    to_status: str
    changed_by: Optional[int]
    rejection_reason: Optional[str]
    changed_at: datetime


class ComplianceDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vendor_id: int
    vendor_name: Optional[str] = None
    document_type: str
    document_name: str
    file_url: Optional[str]
    status: str
    uploaded_at: datetime
    expires_at: Optional[datetime]
    notes: Optional[str]


class ComplianceDocumentUpdate(BaseModel):
    status: Optional[str] = Field(default=None, min_length=1, max_length=50)
    expires_at: Optional[datetime] = None
    notes: Optional[str] = None


class VendorDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vendor_id: int
    doc_type: str
    file_url: str
    uploaded_at: datetime

    @model_validator(mode="after")
    def serve_file_url(self):
        self.file_url = f"/vendors/{self.vendor_id}/documents/{self.id}/file"
        return self


class VendorDocumentCreate(BaseModel):
    doc_type: str = Field(min_length=1, max_length=100)


class VendorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: VendorCategoryResponse
    contact_email: str
    contact_phone: str
    address: str
    status: str
    rejection_reason: Optional[str] = None
    user_id: Optional[int] = None
    created_by: Optional[int]
    created_at: datetime
    contacts: list[VendorContactResponse] = []


class VendorDetailResponse(VendorResponse):
    status_history: list[VendorStatusHistoryResponse] = []
    documents: list[VendorDocumentResponse] = []
