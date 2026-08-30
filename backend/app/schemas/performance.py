import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PerformanceRecordCreate(BaseModel):
    vendor_id: uuid.UUID
    on_time_deliveries: int | None = Field(None, ge=0)
    delayed_deliveries: int | None = Field(None, ge=0)
    quality_rating: float | None = Field(None, ge=0, le=5)
    response_time_hours: float | None = Field(None, ge=0)
    issue_resolution_hours: float | None = Field(None, ge=0)
    order_completion_rate: float | None = Field(None, ge=0, le=100)


class PerformanceRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    vendor_id: uuid.UUID
    recorded_by_id: uuid.UUID
    on_time_deliveries: int | None
    delayed_deliveries: int | None
    quality_rating: float | None
    response_time_hours: float | None
    issue_resolution_hours: float | None
    order_completion_rate: float | None
    created_at: datetime


class ReliabilityScoreOut(BaseModel):
    vendor_id: uuid.UUID
    reliability_score: float
