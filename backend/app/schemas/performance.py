from typing import Optional

from pydantic import BaseModel, Field


class PerformanceSampleSizes(BaseModel):
    deliveries: int = 0
    quality_inspections: int = 0
    purchase_orders: int = 0
    response_pairs: int = 0


class VendorPerformanceMetrics(BaseModel):
    vendor_id: int
    vendor_name: str
    on_time_delivery_pct: Optional[float] = Field(
        None, description="Percentage of on-time deliveries (0-100)"
    )
    average_quality_score: Optional[float] = Field(
        None, description="Average quality inspection score (0-100)"
    )
    order_completion_rate: Optional[float] = Field(
        None, description="Percentage of non-cancelled POs completed or delivered (0-100)"
    )
    average_response_time_hours: Optional[float] = Field(
        None, description="Average vendor reply time in thread discussions (hours)"
    )
    sample_sizes: PerformanceSampleSizes
