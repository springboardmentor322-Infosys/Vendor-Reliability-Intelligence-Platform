from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NotificationBase(BaseModel):

    title: str

    message: str

    notification_type: str

    vendor_id: Optional[int] = None


class NotificationCreate(NotificationBase):
    pass


class NotificationUpdate(BaseModel):

    is_read: Optional[bool] = None


class NotificationResponse(NotificationBase):

    id: int

    is_read: bool

    created_at: datetime

    class Config:
        from_attributes = True