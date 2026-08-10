from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    action_description: str
    performed_by: int
    performer_name: str | None = None
    entity_type: str
    entity_id: int
    timestamp: datetime
