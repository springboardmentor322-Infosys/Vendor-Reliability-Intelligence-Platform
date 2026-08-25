from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# USER SCHEMAS
class UserCreate(BaseModel):
    fullname: str
    email: EmailStr
    phone: str
    role: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    role: str

# PURCHASE ORDER SCHEMAS
class POCreate(BaseModel):
    invoice_no: str
    vendor_name: str
    product_name: str
    quantity: int
    department: str
    creation_date: str
    expiry_date: str
    total_value: float

class POProgressUpdate(BaseModel):
    completed_units: int
    production_status: str

# INVOICE SCHEMAS
class InvoiceCreate(BaseModel):
    vendor_name: str
    product_name: str
    department: str
    quantity: int
    amount: float

class InvoiceStatusUpdate(BaseModel):
    status: str

class InvoicePaymentUpdate(BaseModel):
    payment_status: str
    transaction_id: str

class InspectionUpdateSchema(BaseModel):
    inspection_status: str

# VENDOR SCHEMAS
class VendorCreate(BaseModel):
    vendor_name: str
    contact_person: str
    email: EmailStr
    phone: Optional[str] = None
    category: Optional[str] = "General"
    status: Optional[str] = "Accepting Orders"
    last_ordered_date: Optional[str] = None
    contract_ended_date: Optional[str] = None

class VendorUpdate(BaseModel):
    vendor_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    category: Optional[str] = None
    last_ordered_date: Optional[str] = None
    contract_ended_date: Optional[str] = None

class VendorResponse(BaseModel):
    id: int
    vendor_name: str
    contact_person: str
    email: str
    phone: Optional[str] = None
    category: Optional[str] = "General"
    reliability_score: float
    risk_tier: str
    status: str
    last_ordered_date: Optional[str] = None
    contract_ended_date: Optional[str] = None

    class Config:
        from_attributes = True

class VendorPerformanceBase(BaseModel):
    delivery_timeliness: float = Field(..., description="Delivery timeliness score (0.0 to 1.0)")
    quality_rating: float = Field(..., description="Product quality evaluation score (0 to 100)")
    response_time_hours: float = Field(..., description="Communication response time in hours")

class VendorPerformanceCreate(VendorPerformanceBase):
    vendor_id: int

class VendorPerformanceResponse(VendorPerformanceBase):
    id: int
    vendor_id: int
    timestamp: datetime

    class Config:
        from_attributes = True

class VendorScoreSummary(BaseModel):
    vendor_id: int
    average_quality: float
    average_delivery_rate: float
    composite_score: float
    risk_tier: str