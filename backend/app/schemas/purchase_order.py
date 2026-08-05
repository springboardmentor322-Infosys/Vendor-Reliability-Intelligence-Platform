from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

VALID_PO_STATUSES = {
    "Pending",
    "Approved",
    "Ordered",
    "In Progress",
    "Shipped",
    "Partial Delivery",
    "Delivered",
    "Completed",
    "Cancelled",
}

# Statuses that Vendors can set
VENDOR_ALLOWED_STATUSES = {
    "In Progress",
    "Shipped",
    "Partial Delivery",
    "Delivered",
}

# Statuses that Procurement Managers can set
PM_ALLOWED_STATUSES = {
    "Approved",
    "Ordered",
    "Completed",
    "Cancelled",
}

VALID_DOC_TYPES = {"Invoice", "Receipt", "Proof of Delivery"}


class POItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    purchase_order_id: int
    item_name: str
    quantity: int
    unit_price: float
    line_total: float = 0.0

    @classmethod
    def compute_line_total(cls, data):
        if hasattr(data, "quantity") and hasattr(data, "unit_price"):
            data_dict = {k: getattr(data, k) for k in cls.model_fields if k != "line_total"}
            data_dict["line_total"] = float(data.quantity) * float(data.unit_price)
            return data_dict
        if isinstance(data, dict):
            data["line_total"] = float(data.get("quantity", 0)) * float(data.get("unit_price", 0))
        return data


class DeliveryDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    purchase_order_id: int
    doc_type: str
    file_url: str
    uploaded_by: int
    uploaded_at: datetime


class PurchaseOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    po_number: str
    procurement_request_id: Optional[int] = None
    vendor_id: int
    order_date: datetime
    expected_delivery_date: Optional[datetime] = None
    total_amount: float
    currency: str
    status: str
    notes: Optional[str] = None
    created_by: int
    created_at: datetime
    items: List[POItemResponse] = []
    documents: List[DeliveryDocumentResponse] = []


class PurchaseOrderListResponse(BaseModel):
    """Lightweight response for list view (no items/documents)."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    po_number: str
    procurement_request_id: Optional[int] = None
    vendor_id: int
    order_date: datetime
    expected_delivery_date: Optional[datetime] = None
    total_amount: float
    currency: str
    status: str
    notes: Optional[str] = None
    created_by: int
    created_at: datetime


class PurchaseOrderCreate(BaseModel):
    procurement_request_id: int = Field(gt=0)
    vendor_id: int = Field(gt=0)
    expected_delivery_date: Optional[datetime] = None
    notes: Optional[str] = Field(default=None, max_length=2000)


class PurchaseOrderStatusUpdate(BaseModel):
    status: str = Field(min_length=1, max_length=50)
    notes: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in VALID_PO_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(sorted(VALID_PO_STATUSES))}")
        return value


class DeliveryDocumentCreate(BaseModel):
    doc_type: str = Field(min_length=1, max_length=50)

    @field_validator("doc_type")
    @classmethod
    def validate_doc_type(cls, value: str) -> str:
        if value not in VALID_DOC_TYPES:
            raise ValueError(f"Document type must be one of: {', '.join(sorted(VALID_DOC_TYPES))}")
        return value
