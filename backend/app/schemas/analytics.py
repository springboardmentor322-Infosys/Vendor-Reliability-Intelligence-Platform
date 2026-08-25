from pydantic import BaseModel, Field


class SpendOverTimePoint(BaseModel):
    period: str = Field(description="Month label in YYYY-MM format")
    total_spend: float
    order_count: int


class SpendOverTimeResponse(BaseModel):
    points: list[SpendOverTimePoint]
    total_spend: float
    currency: str = "USD"


class VendorCategoryDistributionItem(BaseModel):
    category_id: int
    category_name: str
    vendor_count: int
    total_spend: float
    order_count: int


class VendorCategoryDistributionResponse(BaseModel):
    categories: list[VendorCategoryDistributionItem]
    total_vendors: int


class ProcurementCostTrendPoint(BaseModel):
    period: str
    total_spend: float
    average_order_value: float
    order_count: int


class ProcurementCostTrendsResponse(BaseModel):
    points: list[ProcurementCostTrendPoint]
    quarter_over_quarter_change_pct: float | None = None


class DeliveryStatusBreakdown(BaseModel):
    status: str
    count: int
    percentage: float


class ShippingModeBreakdown(BaseModel):
    mode: str
    count: int
    on_time_pct: float | None


class DeliveryPerformanceSummaryResponse(BaseModel):
    total_deliveries: int
    on_time_count: int
    late_count: int
    canceled_count: int
    on_time_pct: float
    late_pct: float
    by_status: list[DeliveryStatusBreakdown]
    by_shipping_mode: list[ShippingModeBreakdown]
