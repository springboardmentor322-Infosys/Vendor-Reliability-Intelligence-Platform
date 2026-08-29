from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MessageBase(BaseModel):
    thread_type: str
    thread_id: int
    message: str
    receiver_id: Optional[int] = None

class MessageCreate(MessageBase):
    pass

class MessageResponse(MessageBase):
    id: int
    sender_id: int
    attachment_path: Optional[str] = None
    attachment_name: Optional[str] = None
    is_read: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
