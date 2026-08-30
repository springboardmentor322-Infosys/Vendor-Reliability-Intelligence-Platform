import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.notification import NotificationType


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: NotificationType
    message: str
    is_read: bool
    created_at: datetime
