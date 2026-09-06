from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict


class QualityInspectionCreate(BaseModel):
    purchase_order_id: int
    vendor_id: int

    inspection_date: date
    inspector: str

    quality_score: float
    defects_found: int = 0

    remarks: Optional[str] = None
    status: str = "Passed"


class QualityInspectionUpdate(BaseModel):
    purchase_order_id: Optional[int] = None
    vendor_id: Optional[int] = None

    inspection_date: Optional[date] = None
    inspector: Optional[str] = None

    quality_score: Optional[float] = None
    defects_found: Optional[int] = None

    remarks: Optional[str] = None
    status: Optional[str] = None


class QualityInspectionResponse(BaseModel):
    id: int

    purchase_order_id: int
    purchase_order_number: str

    vendor_id: int
    vendor_name: str

    inspection_date: date
    inspector: str

    quality_score: float
    defects_found: int

    remarks: Optional[str]
    status: str

    model_config = ConfigDict(from_attributes=True)


class QualityInspectionPaginatedResponse(BaseModel):
    items: list[QualityInspectionResponse]

    page: int
    page_size: int

    total: int
    total_pages: int