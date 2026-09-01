from pydantic import BaseModel, Field

from datetime import date

from typing import Optional


# ==========================================
# CREATE CERTIFICATION / DOCUMENT
# ==========================================

class ContractDocumentCreate(BaseModel):

    contract_id: int

    certification_name: str = Field(
        min_length=1,
        max_length=200
    )

    certification_number: Optional[str] = None

    issue_date: Optional[date] = None

    expiry_date: Optional[date] = None

    status: str = Field(
        default="Active"
    )


# ==========================================
# RESPONSE
# ==========================================

class ContractDocumentResponse(BaseModel):

    id: int

    contract_id: int

    certification_name: str

    certification_number: Optional[str] = None

    issue_date: Optional[date] = None

    expiry_date: Optional[date] = None

    status: str

    document_name: Optional[str] = None

    document_path: Optional[str] = None

    class Config:
        from_attributes = True