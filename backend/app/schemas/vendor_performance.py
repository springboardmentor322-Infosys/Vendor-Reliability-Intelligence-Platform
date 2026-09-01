from pydantic import BaseModel, Field
from datetime import date


class VendorPerformanceCreate(BaseModel):

    vendor_id: int

    on_time_deliveries: int = Field(
        default=0,
        ge=0
    )

    delayed_deliveries: int = Field(
        default=0,
        ge=0
    )

    quality_rating: float = Field(
        default=0,
        ge=0,
        le=5
    )

    response_time: float = Field(
        default=0,
        ge=0
    )

    issue_resolution_time: float = Field(
        default=0,
        ge=0
    )

    order_completion_rate: float = Field(
        default=0,
        ge=0,
        le=100
    )

    service_rating: float = Field(
        default=0,
        ge=0,
        le=5
    )

    performance_date: date