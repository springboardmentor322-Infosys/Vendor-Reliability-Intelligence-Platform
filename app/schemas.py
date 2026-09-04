from pydantic import BaseModel, EmailStr


# ---------- USER ----------

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str = "Vendor"



class UserLogin(BaseModel):
    email: EmailStr
    password: str



class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: str | None = None



class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True



# ---------- VENDOR ----------

class VendorCreate(BaseModel):
    vendor_name: str
    category: str
    contact_person: str
    email: str
    phone: str
    address: str

    # Vendor Approval Workflow
    # Pending → Under Review → Approved / Rejected
    status: str = "Pending"



class VendorResponse(BaseModel):
    id: int
    vendor_name: str
    category: str
    contact_person: str
    email: str
    phone: str
    address: str
    status: str

    class Config:
        from_attributes = True



# ---------- PROCUREMENT ----------

class ProcurementCreate(BaseModel):
    product_name: str
    quantity: int
    department: str
    requested_by: str
    priority: str = "Medium"
    status: str = "Pending"



class ProcurementResponse(BaseModel):
    id: int
    product_name: str
    quantity: int
    department: str
    requested_by: str
    priority: str
    status: str

    class Config:
        from_attributes = True
# ---------- PURCHASE ORDERS ----------

class PurchaseOrderCreate(BaseModel):

    vendor_name: str
    product_name: str
    quantity: int
    total_amount: int

    # PO Workflow
    # Pending → Approved → Shipped → Partial Delivery → Delivered

    status: str = "Pending"



class PurchaseOrderResponse(BaseModel):

    id: int
    vendor_name: str
    product_name: str
    quantity: int
    total_amount: int
    status: str


    class Config:
        from_attributes = True




# ---------- VENDOR PERFORMANCE ----------

class VendorPerformanceCreate(BaseModel):
    vendor_name: str
    delivery_score: int
    quality_score: int
    reliability_score: int
    overall_score: int
    on_time_deliveries: int = 0
    delayed_deliveries: int = 0
    response_time_hours: int = 0
    issue_resolution_time_hours: int = 0
    service_rating: int = 0
    order_completion_rate: int = 0
    performance_period: str = "Current"


class VendorPerformanceResponse(BaseModel):
    id: int
    vendor_name: str
    delivery_score: int
    quality_score: int
    reliability_score: int
    overall_score: int
    on_time_deliveries: int = 0
    delayed_deliveries: int = 0
    response_time_hours: int = 0
    issue_resolution_time_hours: int = 0
    service_rating: int = 0
    order_completion_rate: int = 0
    performance_period: str = "Current"

    class Config:
        from_attributes = True

# ---------- CONTRACTS ----------

class ContractCreate(BaseModel):

    vendor_name: str
    contract_title: str
    start_date: str
    expiry_date: str
    renewal_notice_period: int = 30
    terms: str
    compliance_flag: str = "Active"
    document_path: str | None = None

    # Contract Lifecycle
    # Active → Near Expiry → Expired

    status: str = "Active"




class ContractResponse(BaseModel):

    id: int
    vendor_name: str
    contract_title: str
    start_date: str
    expiry_date: str
    renewal_notice_period: int
    terms: str
    compliance_flag: str
    document_path: str | None
    status: str


    class Config:
        from_attributes = True