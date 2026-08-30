import uuid
from datetime import datetime

from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field

from app.models.purchase_order import POStatus


class PurchaseOrderCreate(BaseModel):
    vendor_id: uuid.UUID
    description: str
    quantity: int = Field(gt=0)
    unit_price: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    expected_delivery_date: datetime | None = None


class PurchaseOrderStatusUpdate(BaseModel):
    status: POStatus
    actual_delivery_date: datetime | None = None
    invoice_reference: str | None = None


class PurchaseOrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    po_number: str
    vendor_id: uuid.UUID
    requested_by_id: uuid.UUID
    description: str
    quantity: int
    unit_price: Decimal
    total_amount: Decimal
    status: POStatus
    expected_delivery_date: datetime | None
    actual_delivery_date: datetime | None
    invoice_reference: str | None
    created_at: datetime
    updated_at: datetime
