from datetime import date

from pydantic import BaseModel


class ProcurementRequestBase(BaseModel):

    request_number: str
    department: str
    requested_by: str
    item_name: str
    quantity: int
    estimated_cost: float
    request_date: date
    status: str


class ProcurementRequestCreate(
    ProcurementRequestBase
):
    pass


class ProcurementRequestUpdate(
    ProcurementRequestBase
):
    pass


class ProcurementRequestResponse(
    ProcurementRequestBase
):

    id: int

    class Config:

        from_attributes = True