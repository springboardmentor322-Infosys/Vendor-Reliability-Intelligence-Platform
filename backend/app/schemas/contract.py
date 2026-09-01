from pydantic import BaseModel, Field

from datetime import date

from typing import Optional


# ==========================================
# CONTRACT CREATION / UPDATE
# ==========================================

class ContractCreate(BaseModel):

    vendor_id: int


    contract_name: str = Field(
        min_length=1
    )


    contract_number: str = Field(
        min_length=1
    )


    contract_value: float = Field(
        default=0,
        ge=0
    )


    start_date: date


    expiry_date: date


    status: str = Field(
        default="Active"
    )


    # ======================================
    # RENEWAL
    # ======================================

    renewal_status: str = Field(
        default="Pending"
    )


    renewal_date: Optional[date] = None


    # ======================================
    # COMPLIANCE
    # ======================================

    compliance_status: str = Field(
        default="Compliant"
    )


    description: Optional[str] = None