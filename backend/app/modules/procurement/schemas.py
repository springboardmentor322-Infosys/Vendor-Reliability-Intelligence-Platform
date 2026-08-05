from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class PRItemBase(BaseModel):
    item_name: str
    quantity: int
    estimated_cost: float

class PRItemCreate(PRItemBase):
    pass

class PRItemResponse(PRItemBase):
    id: int
    pr_id: int

    class Config:
        from_attributes = True

class ProcurementRequestBase(BaseModel):
    department: str
    description: Optional[str] = None

class ProcurementRequestCreate(ProcurementRequestBase):
    items: List[PRItemCreate]

class ProcurementRequestUpdateStatus(BaseModel):
    status: str

class ProcurementRequestResponse(ProcurementRequestBase):
    id: int
    status: str
    created_at: datetime
    requested_by_id: Optional[int] = None
    items: List[PRItemResponse] = []
    total_estimated_cost: float = 0.0

    class Config:
        from_attributes = True
