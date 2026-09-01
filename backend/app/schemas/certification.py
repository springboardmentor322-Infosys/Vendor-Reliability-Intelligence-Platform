from datetime import date

from pydantic import BaseModel


class CertificationCreate(BaseModel):

    vendor_id: int

    certification_name: str

    certificate_number: str

    issuing_authority: str | None = None

    issue_date: date

    expiry_date: date

    status: str = "Active"

    notes: str | None = None