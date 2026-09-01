from pydantic import BaseModel, Field
from typing import Optional


class CommunicationCreate(BaseModel):

    vendor_id: int

    communication_type: str = Field(
        default="Vendor Message"
    )

    subject: Optional[str] = None

    message: str

    file_name: Optional[str] = None

    file_path: Optional[str] = None


class CommunicationUpdate(BaseModel):

    communication_type: Optional[str] = None

    subject: Optional[str] = None

    message: Optional[str] = None

    file_name: Optional[str] = None

    file_path: Optional[str] = None

    status: Optional[str] = None