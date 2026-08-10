from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class SupportTicketCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    subject: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1, max_length=5000)


class SupportTicketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    subject: str
    message: str
    status: str
    created_at: datetime
