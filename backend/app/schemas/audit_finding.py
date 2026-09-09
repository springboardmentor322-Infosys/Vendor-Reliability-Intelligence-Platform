from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class AuditFindingCreate(BaseModel):
    finding: str = Field(min_length=1)
    description: Optional[str] = None
    vendor_id: Optional[int] = None
    audit: str = Field(min_length=1)
    severity: str = "Medium"
    status: str = "Open"
    evidence_url: Optional[str] = None
    due_date: Optional[date] = None


class AuditFindingUpdate(BaseModel):
    finding: Optional[str] = None
    description: Optional[str] = None
    vendor_id: Optional[int] = None
    audit: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    evidence_url: Optional[str] = None
    due_date: Optional[date] = None