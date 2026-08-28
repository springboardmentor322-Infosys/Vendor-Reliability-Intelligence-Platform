from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class MetricCard(BaseModel):
    label: str
    value: str
    hint: Optional[str] = None


class NamedCount(BaseModel):
    name: str
    count: int


class StatusItem(BaseModel):
    label: str
    status: str


class ActivityItem(BaseModel):
    title: str
    detail: str


class OrderRow(BaseModel):
    po_number: str
    vendor_name: str
    amount: float
    status: str
    order_date: Optional[datetime] = None


class RankedVendor(BaseModel):
    vendor_id: int
    vendor_name: str
    overall_score: float
    risk_level: str


class ContractAlert(BaseModel):
    title: str
    severity: str
    vendor_name: Optional[str] = None


class DocumentRow(BaseModel):
    name: str
    doc_type: str
    uploaded_at: Optional[datetime] = None
    file_url: Optional[str] = None


class SpendPoint(BaseModel):
    period: str
    total_spend: float


class RequestRow(BaseModel):
    id: int
    title: str
    status: str
    created_at: Optional[datetime] = None


class PipelineColumn(BaseModel):
    title: str
    items: list[OrderRow] = Field(default_factory=list)


class FactorBar(BaseModel):
    label: str
    value: float


class AdminDashboardResponse(BaseModel):
    cards: list[MetricCard]
    kpis: list[MetricCard]
    risk_distribution: dict[str, int]
    spend_points: list[SpendPoint]
    top_vendors: list[RankedVendor]
    role_counts: list[NamedCount]
    contract_alerts: list[ContractAlert]
    compliance_pct: float
    recent_orders: list[OrderRow]
    activity: list[ActivityItem]
    health: list[StatusItem]


class VendorDashboardResponse(BaseModel):
    vendor_id: Optional[int] = None
    vendor_name: Optional[str] = None
    cards: list[MetricCard]
    reliability_score: Optional[float] = None
    risk_level: Optional[str] = None
    factors: list[FactorBar]
    recent_orders: list[OrderRow]
    contract_alerts: list[ContractAlert]
    notifications: list[ActivityItem]
    account_status: str
    contract_counts: dict[str, int]
    documents: list[DocumentRow]


class FinanceDashboardResponse(BaseModel):
    cards: list[MetricCard]
    spend_points: list[SpendPoint]
    recent_invoices: list[dict]


class ProcurementDashboardResponse(BaseModel):
    cards: list[MetricCard]
    pipeline: list[PipelineColumn]


class SupplyChainDashboardResponse(BaseModel):
    cards: list[MetricCard]
    recent_requests: list[RequestRow]


class AuditorDashboardResponse(BaseModel):
    cards: list[MetricCard]
    tasks: list[StatusItem]
    insights: list[MetricCard]
    recent_events: list[ActivityItem]
