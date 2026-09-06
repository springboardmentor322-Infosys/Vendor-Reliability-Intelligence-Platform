from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_vendors: int
    active_vendors: int
    purchase_orders: int
    completed_purchase_orders: int
    pending_purchase_orders: int
    average_reliability: float


class VendorResponse(BaseModel):
    id: int
    vendor_name: str
    category: str
    email: str
    status: str
    reliability_score: float

    class Config:
        from_attributes = True


class PurchaseOrderResponse(BaseModel):
    id: int
    po_number: str
    amount: float
    status: str

    class Config:
        from_attributes = True