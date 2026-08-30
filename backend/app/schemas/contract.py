import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, model_validator

from app.models.contract import ContractStatus


class ContractCreate(BaseModel):
    vendor_id: uuid.UUID
    title: str
    contract_number: str
    start_date: datetime
    end_date: datetime
    is_compliant: bool = True
    notes: str | None = None

    @model_validator(mode="after")
    def end_must_follow_start(self):
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date")
        return self


class ContractUpdate(BaseModel):
    status: ContractStatus | None = None
    is_compliant: bool | None = None
    notes: str | None = None


class ContractOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    vendor_id: uuid.UUID
    title: str
    contract_number: str
    start_date: datetime
    end_date: datetime
    status: ContractStatus
    is_compliant: bool
    notes: str | None
    created_at: datetime
    updated_at: datetime
