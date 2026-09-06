from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict


class PurchaseOrderBase(BaseModel):
    po_number: str
    vendor_id: int
    product_id: int

    amount: float
    order_date: date
    delivery_date: Optional[date] = None
    status: str = "Pending"
    description: Optional[str] = None


class PurchaseOrderCreate(PurchaseOrderBase):
    pass


class PurchaseOrderUpdate(BaseModel):
    po_number: Optional[str] = None
    vendor_id: Optional[int] = None
    product_id: Optional[int] = None

    amount: Optional[float] = None
    order_date: Optional[date] = None
    delivery_date: Optional[date] = None
    status: Optional[str] = None
    description: Optional[str] = None


class PurchaseOrderResponse(PurchaseOrderBase):
    id: int

    model_config = ConfigDict(
        from_attributes=True
    )


class PurchaseOrderPaginatedResponse(BaseModel):
    items: list[PurchaseOrderResponse]

    total: int
    page: int
    limit: int
    total_pages: int