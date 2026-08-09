from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

VALID_CONTRACT_STATUSES = {"Active", "Expiring Soon", "Expired", "Draft"}
VALID_COMPLIANCE_FLAGS = {"Compliant", "Non-Compliant", "Under Review"}


class ContractResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    contract_number: str
    vendor_id: int
    created_by_user_id: int
    title: str
    file_url: Optional[str] = None
    start_date: datetime
    expiry_date: datetime
    renewal_notice_period_days: int
    contract_value: float
    currency: str
    terms: Optional[str] = None
    compliance_flag: str
    status: str
    created_at: datetime
    days_until_expiry: Optional[int] = None


class ContractCreate(BaseModel):
    vendor_id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=255)
    start_date: datetime
    expiry_date: datetime
    renewal_notice_period_days: int = Field(default=30, ge=1, le=365)
    contract_value: float = Field(gt=0)
    currency: str = Field(default="USD", max_length=10)
    terms: Optional[str] = Field(default=None, max_length=10000)
    compliance_flag: str = Field(default="Under Review")
    status: str = Field(default="Draft")

    @field_validator("compliance_flag")
    @classmethod
    def validate_compliance(cls, value: str) -> str:
        if value not in VALID_COMPLIANCE_FLAGS:
            raise ValueError(f"Compliance flag must be one of: {', '.join(sorted(VALID_COMPLIANCE_FLAGS))}")
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in VALID_CONTRACT_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(sorted(VALID_CONTRACT_STATUSES))}")
        return value

    @field_validator("expiry_date")
    @classmethod
    def validate_expiry(cls, value: datetime, info) -> datetime:
        start = info.data.get("start_date")
        if start and value <= start:
            raise ValueError("Expiry date must be after start date")
        return value


class ContractUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    start_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    renewal_notice_period_days: Optional[int] = Field(default=None, ge=1, le=365)
    contract_value: Optional[float] = Field(default=None, gt=0)
    currency: Optional[str] = Field(default=None, max_length=10)
    terms: Optional[str] = Field(default=None, max_length=10000)
    compliance_flag: Optional[str] = None
    status: Optional[str] = None

    @field_validator("compliance_flag")
    @classmethod
    def validate_compliance(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in VALID_COMPLIANCE_FLAGS:
            raise ValueError(f"Compliance flag must be one of: {', '.join(sorted(VALID_COMPLIANCE_FLAGS))}")
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in VALID_CONTRACT_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(sorted(VALID_CONTRACT_STATUSES))}")
        return value
