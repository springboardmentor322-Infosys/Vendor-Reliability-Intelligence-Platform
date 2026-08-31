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
    po_number: Optional[str] = None
    vendor_id: Optional[int] = None
    vendor_name: Optional[str] = None


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    purchase_order_id: int
    invoice_number: str
    amount: float
    status: str
    due_date: datetime
    paid_date: Optional[datetime] = None
    po_number: Optional[str] = None
    vendor_id: Optional[int] = None
    vendor_name: Optional[str] = None


class InvoiceCreate(BaseModel):
    purchase_order_id: int


class InvoiceStatusUpdate(BaseModel):
    status: str


class InvoiceSummaryResponse(BaseModel):
    total_invoiced: float
    pending_amount: float
    overdue_amount: float
    paid_amount: float
    invoice_count: int
    pending_count: int
    overdue_count: int
    paid_count: int


class QualityInspectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vendor_id: int
    purchase_order_id: int
    inspection_date: datetime
    quality_score: float
    defects_found: int
    inspector_notes: Optional[str] = None
    vendor_name: Optional[str] = None
    po_number: Optional[str] = None
