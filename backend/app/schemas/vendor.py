from pydantic import BaseModel, EmailStr


class VendorCreate(BaseModel):
    vendor_name: str
    email: EmailStr
    phone: str
    address: str
    gst_number: str