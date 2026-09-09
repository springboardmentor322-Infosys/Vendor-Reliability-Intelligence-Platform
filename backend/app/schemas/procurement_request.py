from pydantic import BaseModel, Field
from datetime import date


class ProcurementRequestCreate(BaseModel):

    vendor_id: int

    product_name: str = Field(
        min_length=1
    )

    quantity: int = Field(
        default=1,
        ge=1
    )

    estimated_amount: float = Field(
        default=0,
        ge=0
    )

    department: str = Field(
        default="General",
        min_length=1
    )

    expected_delivery_date: date