from datetime import date
from typing import Optional

from pydantic import BaseModel


class DeliveryBase(BaseModel):

    purchase_order_id: int

    vendor_id: int

    delivery_date: date

    expected_delivery_date: date

    delay_days: int = 0

    delivery_status: str = "Pending"

    damaged_goods: int = 0

    delivery_notes: Optional[str] = None


class DeliveryCreate(DeliveryBase):
    pass


class DeliveryUpdate(BaseModel):

    purchase_order_id: Optional[int] = None

    vendor_id: Optional[int] = None

    delivery_date: Optional[date] = None

    expected_delivery_date: Optional[date] = None

    delay_days: Optional[int] = None

    delivery_status: Optional[str] = None

    damaged_goods: Optional[int] = None

    delivery_notes: Optional[str] = None


class DeliveryResponse(BaseModel):

    id: int

    purchase_order_id: int

    purchase_order_number: str

    vendor_id: int

    vendor_name: str

    delivery_date: date

    expected_delivery_date: date

    delay_days: int

    delivery_status: str

    damaged_goods: int

    delivery_notes: Optional[str] = None

    class Config:
        from_attributes = True