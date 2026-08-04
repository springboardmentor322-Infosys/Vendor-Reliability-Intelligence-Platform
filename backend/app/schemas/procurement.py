from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

VALID_PROCUREMENT_STATUSES = {
    "Pending",
    "Approved",
    "Ordered",
    "Delivered",
    "Completed",
    "Cancelled",
}


class ProcurementRequestItemCreate(BaseModel):
    item_name: str = Field(min_length=1, max_length=255)
    quantity: int = Field(gt=0)
    estimated_unit_cost: float = Field(gt=0)


class ProcurementRequestCreate(BaseModel):
    department: str = Field(min_length=1, max_length=255)
    items: List[ProcurementRequestItemCreate] = Field(min_length=1)


class ProcurementRequestReject(BaseModel):
    reason: str = Field(min_length=1, max_length=2000)


class ProcurementRequestItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    procurement_request_id: int
    item_name: str
    quantity: int
    estimated_unit_cost: float
    line_total: float = 0.0

    @model_validator(mode="before")
    @classmethod
    def compute_line_total(cls, data):
        if hasattr(data, "quantity") and hasattr(data, "estimated_unit_cost"):
            # ORM object
            data_dict = {k: getattr(data, k) for k in cls.model_fields if k != "line_total"}
            data_dict["line_total"] = float(data.quantity) * float(data.estimated_unit_cost)
            return data_dict
        if isinstance(data, dict):
            data["line_total"] = float(data.get("quantity", 0)) * float(data.get("estimated_unit_cost", 0))
        return data


class ProcurementRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    requested_by: int
    department: str
    status: str
    total_estimated_cost: float
    rejection_reason: Optional[str] = None
    created_at: datetime
    items: List[ProcurementRequestItemResponse] = []
