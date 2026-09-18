
from pydantic import BaseModel, EmailStr
from datetime import date


# ============================================================
# USER
# ============================================================

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True


# ============================================================
# VENDOR
# ============================================================

class VendorCreate(BaseModel):
    vendor_name: str
    category: str
    contact_person: str
    email: EmailStr
    phone: str
    address: str
    delivery_score: float = 0
    quality_score: float = 0
    payment_score: float = 0
    compliance_score: float = 0


class VendorResponse(BaseModel):
    id: int
    vendor_name: str
    category: str
    contact_person: str
    email: EmailStr
    phone: str
    address: str
    delivery_score: float
    quality_score: float
    payment_score: float
    compliance_score: float
    reliability_score: float
    risk_level: str
    status: str

    class Config:
        from_attributes = True


class VendorUpdate(BaseModel):
    vendor_name: str
    category: str
    contact_person: str
    email: EmailStr
    phone: str
    address: str
    delivery_score: float = 0
    quality_score: float = 0
    payment_score: float = 0
    compliance_score: float = 0
    reliability_score: float = 0
    risk_level: str = "Pending"
    status: str = "Pending"


# ============================================================
# PROCUREMENT
# ============================================================

class ProcurementCreate(BaseModel):
    item_name: str
    quantity: int
    budget: float
    request_date: date
    vendor_id: int


class ProcurementResponse(BaseModel):
    id: int
    item_name: str
    quantity: int
    budget: float
    request_date: date
    status: str
    vendor_id: int

    class Config:
        from_attributes = True


# ============================================================
# PURCHASE ORDER
# ============================================================

class PurchaseOrderCreate(BaseModel):
    order_number: str
    vendor_id: int
    procurement_id: int
    order_date: date

    delivery_date: date | None = None
    item_category: str | None = None
    quantity: int | None = None
    unit_price: float | None = None
    negotiated_price: float | None = None
    defective_units: int = 0
    compliance: str | None = None

    amount: float
    status: str = "Pending"


class PurchaseOrderResponse(BaseModel):
    id: int
    order_number: str
    vendor_id: int
    procurement_id: int
    order_date: date

    delivery_date: date | None = None
    item_category: str | None = None
    quantity: int | None = None
    unit_price: float | None = None
    negotiated_price: float | None = None
    defective_units: int | None = None
    compliance: str | None = None
    amount: float | None = None
    status: str

    class Config:
        from_attributes = True


# ============================================================
# VENDOR PERFORMANCE
# ============================================================

class VendorPerformanceCreate(BaseModel):
    vendor_id: int
    on_time_deliveries: int
    delayed_deliveries: int
    quality_rating: float
    response_time: float
    issue_resolution_time: float
    order_completion_rate: float


class VendorPerformanceResponse(BaseModel):
    id: int
    vendor_id: int
    on_time_deliveries: int
    delayed_deliveries: int
    quality_rating: float
    response_time: float
    issue_resolution_time: float
    order_completion_rate: float

    class Config:
        from_attributes = True


# ============================================================
# CONTRACT
# ============================================================

class ContractCreate(BaseModel):
    vendor_id: int
    contract_name: str
    start_date: date
    end_date: date
    status: str
    compliance_status: str


class ContractResponse(BaseModel):
    id: int
    vendor_id: int
    contract_name: str
    start_date: date
    end_date: date
    status: str
    compliance_status: str

    class Config:
        from_attributes = True


# ============================================================
# COMMUNICATION
# ============================================================

class CommunicationCreate(BaseModel):
    vendor_id: int
    procurement_id: int | None = None
    sender: str
    message: str
    communication_type: str
    status: str = "Unread"


class CommunicationResponse(BaseModel):
    id: int
    vendor_id: int
    procurement_id: int | None = None
    sender: str
    message: str
    communication_type: str
    status: str

    class Config:
        from_attributes = True