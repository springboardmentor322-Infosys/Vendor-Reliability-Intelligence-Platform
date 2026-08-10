from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    notification_type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[int] = None
