from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class NotificationBase(BaseModel):

    title: str

    message: str

    notification_type: str

    is_read: bool = False


class NotificationCreate(NotificationBase):
    pass


class NotificationUpdate(BaseModel):

    title: Optional[str] = None

    message: Optional[str] = None

    notification_type: Optional[str] = None

    is_read: Optional[bool] = None


class NotificationResponse(NotificationBase):

    id: int

    created_at: datetime

    class Config:
        from_attributes = True