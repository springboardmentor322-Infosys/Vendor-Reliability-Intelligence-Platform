from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.user import Role


class AdminUserUpdate(BaseModel):
    role: Role | None = None
    is_active: bool | None = None


class AppSettingsResponse(BaseModel):
    contract_expiry_alert_days: int
    invoice_due_days: int
    updated_at: datetime | None = None


class AppSettingsUpdate(BaseModel):
    contract_expiry_alert_days: int = Field(..., ge=1, le=365)
    invoice_due_days: int = Field(..., ge=1, le=365)


class HealthCheckItem(BaseModel):
    ok: bool
    detail: str


class SystemHealthResponse(BaseModel):
    database: HealthCheckItem
    backend: HealthCheckItem
    smtp: HealthCheckItem
    uptime_seconds: int
    started_at: datetime


class PurchaseOrderTrailEvent(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    action_description: str
    performed_by: int
    performer_name: str | None = None
    timestamp: datetime


class PurchaseOrderTrail(BaseModel):
    purchase_order_id: int
    po_number: str
    vendor_id: int
    vendor_name: str | None = None
    status: str
    created_at: datetime
    events: list[PurchaseOrderTrailEvent]
