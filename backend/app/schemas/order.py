from pydantic import BaseModel
from typing import Optional
from datetime import date


class OrderResponse(BaseModel):

    id: int

    vendor_id: int

    product_name: str

    quantity: int

    amount: float

    status: str

    expected_delivery_date: Optional[date] = None
    source_order_id: Optional[str] = None
    order_date: Optional[date] = None
    shipping_date: Optional[date] = None
    shipping_mode: Optional[str] = None
    delivery_status: Optional[str] = None
    late_delivery_risk: Optional[int] = 0
    order_country: Optional[str] = None
    order_region: Optional[str] = None
    order_state: Optional[str] = None

    class Config:
        from_attributes = True