from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# --- Auth & User Schemas ---
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: Optional[str] = None
    role: Optional[str] = "Procurement Manager"

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# --- Vendor Schemas ---
class VendorCreate(BaseModel):
    name: str
    delivery: Optional[str] = "On Time"
    category: Optional[str] = "Raw Material Suppliers"
    status: Optional[str] = "Active"
    approval_status: Optional[str] = "Approved"
    score: Optional[int] = 85
    quality: Optional[int] = 90
    response_time: Optional[int] = 24
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    risk_level: Optional[str] = "Low"

class VendorResponse(VendorCreate):
    id: int
    issue_resolution_time: Optional[int] = 48
    order_completion_rate: Optional[float] = 98.0

    class Config:
        from_attributes = True

# --- Purchase Order Schemas ---
class PurchaseOrderCreate(BaseModel):
    order_id: str
    vendor: str
    product: str
    amount: int
    status: Optional[str] = "Pending"
    invoice_number: Optional[str] = ""
    invoice_status: Optional[str] = "Pending"

class PurchaseOrderResponse(PurchaseOrderCreate):
    id: int
    invoice_file: Optional[str] = None
    proof_of_delivery: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Contract Schemas ---
class ContractCreate(BaseModel):
    contract_id: Optional[str] = None
    vendor: str
    contract_name: str
    start_date: str
    expiry_date: str
    renewal_notice_period: Optional[int] = 30
    terms: Optional[str] = None
    status: Optional[str] = "Active"

class ContractResponse(ContractCreate):
    id: int
    compliance_score: Optional[int] = 95
    file_path: Optional[str] = None

    class Config:
        from_attributes = True

# --- Procurement Schemas ---
class ProcurementCreate(BaseModel):
    item_name: str
    quantity: int
    estimated_cost: int
    department: str
    status: Optional[str] = "Pending"
    vendor_assigned: Optional[str] = None

class ProcurementResponse(ProcurementCreate):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Notification Schemas ---
class NotificationCreate(BaseModel):
    title: str
    message: str
    category: Optional[str] = "Procurement Alert"
    type: Optional[str] = "info"

class NotificationResponse(NotificationCreate):
    id: int
    is_read: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Communication Schemas ---
class MessageCreate(BaseModel):
    sender: str
    recipient: str
    subject: str
    body: str

class MessageResponse(MessageCreate):
    id: int
    file_attachment: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True