from pydantic import BaseModel
from datetime import date
from typing import Optional


# ==========================================
# CREATE DELIVERY
# ==========================================

class DeliveryCreate(BaseModel):

    order_id: int

    vendor_id: int

    expected_delivery_date: date

    actual_delivery_date: Optional[date] = None

    status: str = "Pending"

    tracking_number: Optional[str] = None

    notes: Optional[str] = None


# ==========================================
# UPDATE DELIVERY
# ==========================================

class DeliveryUpdate(BaseModel):

    expected_delivery_date: Optional[date] = None

    actual_delivery_date: Optional[date] = None

    status: Optional[str] = None

    tracking_number: Optional[str] = None

    notes: Optional[str] = None