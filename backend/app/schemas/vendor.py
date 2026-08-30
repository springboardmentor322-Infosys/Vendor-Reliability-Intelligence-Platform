import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, ConfigDict

from app.models.vendor import VendorCategory, VendorStatus


class VendorCreate(BaseModel):
    company_name: str
    category: VendorCategory
    contact_name: str | None = None
    contact_email: EmailStr | None = None
    contact_phone: str | None = None
    address: str | None = None


class VendorUpdateStatus(BaseModel):
    status: VendorStatus


class VendorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company_name: str
    category: VendorCategory
    status: VendorStatus
    contact_name: str | None
    contact_email: str | None
    contact_phone: str | None
    address: str | None
    reliability_score: float
    created_at: datetime
    updated_at: datetime
