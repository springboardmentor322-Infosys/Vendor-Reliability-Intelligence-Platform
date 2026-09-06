from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CommunicationHistoryBase(BaseModel):

    vendor_id: int

    subject: str

    communication_type: str

    sender: str

    receiver: str

    message: str


class CommunicationHistoryCreate(
    CommunicationHistoryBase
):
    pass


class CommunicationHistoryUpdate(BaseModel):

    vendor_id: Optional[int] = None

    subject: Optional[str] = None

    communication_type: Optional[str] = None

    sender: Optional[str] = None

    receiver: Optional[str] = None

    message: Optional[str] = None


class CommunicationHistoryResponse(
    CommunicationHistoryBase
):

    id: int

    communication_date: datetime

    class Config:
        from_attributes = True