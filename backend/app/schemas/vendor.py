from typing import Optional

from pydantic import BaseModel, EmailStr


# ==========================================
# VENDOR CATEGORIES
# ==========================================

VENDOR_CATEGORIES = [

    "Raw Material Supplier",

    "Equipment Vendor",

    "IT Vendor",

    "Service Provider",

    "Logistics Partner",

    "Maintenance Vendor"

]


# ==========================================
# APPROVAL STATUS
# ==========================================

VENDOR_APPROVAL_STATUSES = [

    "Pending",

    "Approved",

    "Rejected"

]


# ==========================================
# VENDOR STATUS
# ==========================================

VENDOR_STATUSES = [

    "Active",

    "Inactive",

    "Suspended"

]


# ==========================================
# CREATE / UPDATE VENDOR
# ==========================================

class VendorCreate(BaseModel):

    vendor_name: str

    email: EmailStr

    phone: str

    address: str

    gst_number: str

    category: str = "Service Provider"

    contact_person: Optional[str] = None


# ==========================================
# UPDATE VENDOR STATUS
# ==========================================

class VendorStatusUpdate(BaseModel):

    status: str


# ==========================================
# APPROVE / REJECT VENDOR
# ==========================================

class VendorApprovalUpdate(BaseModel):

    approval_status: str