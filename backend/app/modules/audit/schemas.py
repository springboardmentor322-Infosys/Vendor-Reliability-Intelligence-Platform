from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AuditLogBase(BaseModel):
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None

class AuditLogResponse(AuditLogBase):
    id: int
    user_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True
