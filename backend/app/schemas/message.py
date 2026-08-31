from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

VALID_THREAD_TYPES = {"purchase_order", "contract"}


class MessageCreate(BaseModel):
    thread_type: str
    reference_id: int = Field(..., ge=1)
    content: str = Field(..., min_length=1, max_length=10000)

    @field_validator("thread_type")
    @classmethod
    def validate_thread_type(cls, value: str) -> str:
        if value not in VALID_THREAD_TYPES:
            raise ValueError(f"thread_type must be one of: {', '.join(sorted(VALID_THREAD_TYPES))}")
        return value


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    thread_type: str
    reference_id: int
    sender_id: int
    sender_name: str | None = None
    content: str
    created_at: datetime


class MessageHistoryItem(MessageResponse):
    vendor_id: int | None = None
    vendor_name: str | None = None
    reference_label: str
