from datetime import date
from typing import Optional

from pydantic import BaseModel


class InvoiceBase(BaseModel):

    purchase_order_id: int

    vendor_id: int

    invoice_date: date

    due_date: date

    amount: float

    payment_status: str = "Pending"

    notes: Optional[str] = None


class InvoiceCreate(InvoiceBase):
    pass


class InvoiceUpdate(BaseModel):

    purchase_order_id: Optional[int] = None

    vendor_id: Optional[int] = None

    invoice_date: Optional[date] = None

    due_date: Optional[date] = None

    amount: Optional[float] = None

    payment_status: Optional[str] = None

    notes: Optional[str] = None


class InvoiceResponse(BaseModel):

    id: int

    invoice_number: str

    purchase_order_id: int

    purchase_order_number: str

    vendor_id: int

    vendor_name: str

    invoice_date: date

    due_date: date

    amount: float

    payment_status: str

    notes: Optional[str] = None

    class Config:
        from_attributes = True