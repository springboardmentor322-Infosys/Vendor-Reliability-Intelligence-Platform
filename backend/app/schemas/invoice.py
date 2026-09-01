from pydantic import BaseModel, Field
from datetime import date


class InvoiceCreate(BaseModel):

    invoice_number: str = Field(
        min_length=1
    )

    order_id: int = Field(
        ge=1
    )

    vendor_id: int = Field(
        ge=1
    )

    amount: float = Field(
        ge=0
    )

    invoice_date: date

    due_date: date