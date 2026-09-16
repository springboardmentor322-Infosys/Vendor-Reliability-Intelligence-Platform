"""Pydantic contracts for invoice and payment workflow."""
from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

InvoiceStatus = Literal["Draft", "Submitted", "Under Review", "Approved", "Rejected", "Payment Pending", "Paid", "Overdue"]

class ORM(BaseModel): model_config = ConfigDict(from_attributes=True)
class InvoiceCreate(BaseModel):
    purchase_order_id: int
    invoice_number: str = Field(min_length=2, max_length=100)
    invoice_date: date
    due_date: date
    subtotal: Decimal = Field(gt=0)
    tax_amount: Decimal = Field(default=Decimal("0"), ge=0)
    currency: str = Field(default="INR", min_length=3, max_length=3)
    notes: str | None = Field(default=None, max_length=4000)
    @model_validator(mode="after")
    def dates(self):
        if self.due_date < self.invoice_date: raise ValueError("Due date cannot be before invoice date.")
        return self
class InvoiceDecision(BaseModel): comment: str | None = Field(default=None, max_length=2000)
class PaymentCreate(BaseModel):
    payment_date: date
    amount: Decimal = Field(gt=0)
    payment_method: str = Field(min_length=2, max_length=80)
    reference_number: str = Field(min_length=2, max_length=150)
    notes: str | None = Field(default=None, max_length=2000)
class PaymentRead(ORM):
    id: int
    invoice_id: int
    vendor_id: int
    payment_date: date
    amount: Decimal
    payment_method: str
    reference_number: str
    status: str
    notes: str | None
    created_by: int
    created_at: datetime
    updated_at: datetime


class InvoiceReceivingEvidence(BaseModel):
    purchase_order_status: str
    purchase_order_total: Decimal
    expected_delivery_date: date
    ordered_quantity: Decimal | None = None
    received_quantity: Decimal | None = None
    accepted_quantity: Decimal | None = None
    rejected_quantity: Decimal | None = None
    quality_status: str | None = None
    actual_delivery_date: date | None = None


class InvoiceRead(ORM):
    id: int
    invoice_number: str
    vendor_id: int
    purchase_order_id: int
    invoice_date: date
    due_date: date
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    currency: str
    status: str
    document_path: str | None
    notes: str | None
    reviewed_by: int | None
    reviewed_at: datetime | None
    review_comment: str | None
    created_by: int
    created_at: datetime
    updated_at: datetime
    payments: list[PaymentRead] = Field(default_factory=list)
    vendor_name: str | None = None
    po_number: str | None = None
    receiving_evidence: InvoiceReceivingEvidence | None = None
