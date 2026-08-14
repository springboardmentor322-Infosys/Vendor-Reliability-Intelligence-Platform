from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: str
    price: float
    vendor_id: int


class DeliveryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    purchase_order_id: int
    scheduled_shipping_days: Optional[int] = None
    actual_shipping_days: Optional[int] = None
    shipping_mode: Optional[str] = None
    late_delivery_risk: bool
    delivery_status: str


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    purchase_order_id: int
    invoice_number: str
    amount: float
    status: str
    due_date: datetime
    paid_date: Optional[datetime] = None


class QualityInspectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vendor_id: int
    purchase_order_id: int
    inspection_date: datetime
    quality_score: float
    defects_found: int
    inspector_notes: Optional[str] = None
