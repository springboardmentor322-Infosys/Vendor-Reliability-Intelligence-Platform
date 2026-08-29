from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import date, datetime
from enum import Enum

class ContractStatus(str, Enum):
    DRAFT = "Draft"
    PENDING = "Pending"
    ACTIVE = "Active"
    EXPIRING_SOON = "Expiring Soon"
    EXPIRED = "Expired"
    RENEWED = "Renewed"
    CANCELLED = "Cancelled"

class ComplianceFlag(str, Enum):
    INSURANCE_MISSING = "Insurance Missing"
    GST_MISSING = "GST Missing"
    ISO_EXPIRED = "ISO Expired"
    NDA_MISSING = "NDA Missing"
    SIGNED_COPY_MISSING = "Signed Copy Missing"

class ContractBase(BaseModel):
    vendor_id: int
    purchase_order_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    contract_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    renewal_date: Optional[date] = None
    renewal_notice_period: Optional[int] = 30
    contract_value: Optional[float] = None
    currency: Optional[str] = "USD"
    status: Optional[ContractStatus] = ContractStatus.DRAFT
    terms: Optional[str] = None
    compliance_flags: Optional[List[ComplianceFlag]] = None
    renewal_required: Optional[bool] = False
    auto_renew: Optional[bool] = False

class ContractCreate(ContractBase):
    pass

class ContractUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    contract_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    renewal_date: Optional[date] = None
    renewal_notice_period: Optional[int] = None
    contract_value: Optional[float] = None
    currency: Optional[str] = None
    status: Optional[ContractStatus] = None
    terms: Optional[str] = None
    compliance_flags: Optional[List[ComplianceFlag]] = None
    renewal_required: Optional[bool] = None
    auto_renew: Optional[bool] = None

class ContractRenew(BaseModel):
    renewal_date: date
    end_date: Optional[date] = None
    renewal_notice_period: Optional[int] = None

class ContractResponse(ContractBase):
    id: int
    contract_number: str
    uploaded_document_path: Optional[str] = None
    uploaded_document_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    uploaded_at: Optional[datetime] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ContractAlert(BaseModel):
    id: int
    contract_number: str
    title: str
    vendor_id: int
    end_date: date
    days_remaining: int
    alert_level: str
    status: str
    
    class Config:
        from_attributes = True
