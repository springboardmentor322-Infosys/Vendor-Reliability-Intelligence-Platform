from pydantic import BaseModel
from typing import Optional, List

class VendorCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class VendorCategoryCreate(VendorCategoryBase):
    pass

class VendorCategoryResponse(VendorCategoryBase):
    id: int

    class Config:
        from_attributes = True

class VendorContactBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    is_primary: bool = False

class VendorContactCreate(VendorContactBase):
    pass

class VendorContactResponse(VendorContactBase):
    id: int
    vendor_id: int

    class Config:
        from_attributes = True

class VendorBase(BaseModel):
    name: str
    contact_email: str
    category_id: int

class VendorCreate(VendorBase):
    pass

class VendorUpdateStatus(BaseModel):
    status: str

class VendorResponse(BaseModel):
    id: int
    name: str
    contact_email: Optional[str] = None
    category_id: Optional[int] = None
    status: str
    category: Optional[VendorCategoryResponse] = None
    contacts: List[VendorContactResponse] = []

    class Config:
        from_attributes = True
