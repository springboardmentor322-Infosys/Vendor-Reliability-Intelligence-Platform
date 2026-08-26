import datetime as dt
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from models import (
    RoleEnum, VendorCategoryEnum, VendorStatusEnum, ProcurementStatusEnum,
    RiskLevelEnum, ComplianceStatusEnum
)


# ---------- Auth ----------

class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: RoleEnum = RoleEnum.PROCUREMENT_MANAGER
    company_name: Optional[str] = None  # only used when role == Vendor


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    full_name: str
    email: str
    role: RoleEnum
    is_active: bool
    vendor_id: Optional[int] = None

    class Config:
        from_attributes = True


class UserAdminOut(BaseModel):
    id: int
    full_name: str
    email: str
    role: RoleEnum
    is_active: bool
    created_at: dt.datetime
    vendor_id: Optional[int] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None


# ---------- Vendor ----------

class VendorCreate(BaseModel):
    name: str
    category: VendorCategoryEnum
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[VendorCategoryEnum] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    status: Optional[VendorStatusEnum] = None


class VendorOut(BaseModel):
    id: int
    name: str
    category: VendorCategoryEnum
    contact_person: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    status: VendorStatusEnum
    reliability_score: float
    risk_level: RiskLevelEnum
    created_at: dt.datetime

    class Config:
        from_attributes = True


# ---------- Purchase Orders ----------

class PurchaseOrderCreate(BaseModel):
    vendor_id: int
    item_description: str
    quantity: int = 1
    unit_price: float = 0.0
    requested_by: Optional[str] = None
    expected_delivery: Optional[dt.datetime] = None


class PurchaseOrderUpdate(BaseModel):
    status: Optional[ProcurementStatusEnum] = None
    actual_delivery: Optional[dt.datetime] = None
    invoice_number: Optional[str] = None
    invoice_paid: Optional[bool] = None


class PurchaseOrderOut(BaseModel):
    id: int
    po_number: str
    vendor_id: int
    item_description: str
    quantity: int
    unit_price: float
    total_amount: float
    status: ProcurementStatusEnum
    requested_by: Optional[str]
    order_date: dt.datetime
    expected_delivery: Optional[dt.datetime]
    actual_delivery: Optional[dt.datetime]
    invoice_number: Optional[str]
    invoice_paid: bool

    class Config:
        from_attributes = True


# ---------- Performance ----------

class PerformanceCreate(BaseModel):
    vendor_id: int
    on_time_deliveries: int = 0
    delayed_deliveries: int = 0
    quality_rating: float = 0.0
    response_time_hours: float = 0.0
    issue_resolution_hours: float = 0.0
    order_completion_rate: float = 0.0


class PerformanceOut(BaseModel):
    id: int
    vendor_id: int
    on_time_deliveries: int
    delayed_deliveries: int
    quality_rating: float
    response_time_hours: float
    issue_resolution_hours: float
    order_completion_rate: float
    recorded_at: dt.datetime

    class Config:
        from_attributes = True


# ---------- Contracts ----------

class ContractCreate(BaseModel):
    vendor_id: int
    contract_title: str
    start_date: dt.datetime
    end_date: dt.datetime
    document_name: Optional[str] = None
    notes: Optional[str] = None


class ContractOut(BaseModel):
    id: int
    vendor_id: int
    contract_title: str
    start_date: dt.datetime
    end_date: dt.datetime
    compliance_status: ComplianceStatusEnum
    document_name: Optional[str]
    notes: Optional[str]

    class Config:
        from_attributes = True


# ---------- Vendor Documents / Certifications ----------

class VendorDocumentOut(BaseModel):
    id: int
    vendor_id: int
    document_type: str
    file_name: str
    expiry_date: Optional[dt.datetime]
    uploaded_at: dt.datetime

    class Config:
        from_attributes = True


# ---------- Messages ----------

class MessageCreate(BaseModel):
    vendor_id: int
    sender: str
    content: str


class MessageOut(BaseModel):
    id: int
    vendor_id: int
    sender: str
    content: str
    sent_at: dt.datetime

    class Config:
        from_attributes = True


# ---------- Notifications ----------

class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    category: str
    is_read: bool
    created_at: dt.datetime

    class Config:
        from_attributes = True
