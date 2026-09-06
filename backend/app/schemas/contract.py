from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ContractCreate(BaseModel):

    contract_number: str

    vendor_id: int

    start_date: date

    end_date: date

    contract_value: float

    contract_status: str = "Active"

    terms: Optional[str] = None


class ContractUpdate(BaseModel):

    contract_number: Optional[str] = None

    vendor_id: Optional[int] = None

    start_date: Optional[date] = None

    end_date: Optional[date] = None

    contract_value: Optional[float] = None

    contract_status: Optional[str] = None

    terms: Optional[str] = None


class ContractResponse(BaseModel):

    id: int

    contract_number: str

    vendor_id: int

    vendor_name: str

    start_date: date

    end_date: date

    contract_value: float

    contract_status: str

    terms: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True
    )