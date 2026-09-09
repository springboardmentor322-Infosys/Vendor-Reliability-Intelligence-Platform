from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class AuditPlanCreate(BaseModel):

    title: str = Field(
        min_length=1
    )

    vendor_id: Optional[int] = None

    auditor: str = "Auditor"

    audit_type: str = Field(
        min_length=1
    )

    priority: str = "Medium"

    start_date: Optional[date] = None

    due_date: Optional[date] = None

    status: str = "Planned"

    progress: int = Field(
        default=0,
        ge=0,
        le=100
    )

    scope: Optional[str] = None


class AuditPlanUpdate(BaseModel):

    title: Optional[str] = None

    vendor_id: Optional[int] = None

    auditor: Optional[str] = None

    audit_type: Optional[str] = None

    priority: Optional[str] = None

    start_date: Optional[date] = None

    due_date: Optional[date] = None

    status: Optional[str] = None

    progress: Optional[int] = Field(
        default=None,
        ge=0,
        le=100
    )

    scope: Optional[str] = None