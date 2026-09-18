from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.schemas import ContractCreate, ContractResponse


router = APIRouter(
    prefix="/contracts",
    tags=["Contracts"]
)


# Create Contract
@router.post(
    "/",
    response_model=ContractResponse
)
def create_contract(
    contract: ContractCreate,
    db: Session = Depends(get_db)
):
    vendor = db.query(
        models.Vendor
    ).filter(
        models.Vendor.id == contract.vendor_id
    ).first()

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )

    new_contract = models.Contract(
        vendor_id=contract.vendor_id,
        contract_name=contract.contract_name,
        start_date=contract.start_date,
        end_date=contract.end_date,
        status=contract.status,
        compliance_status=contract.compliance_status
    )

    db.add(new_contract)
    db.commit()
    db.refresh(new_contract)

    return new_contract


# Get All Contracts
@router.get(
    "/",
    response_model=list[ContractResponse]
)
def get_contracts(
    db: Session = Depends(get_db)
):
    contracts = db.query(
        models.Contract
    ).all()

    return contracts


# Get Contract by ID
@router.get(
    "/{contract_id}",
    response_model=ContractResponse
)
def get_contract(
    contract_id: int,
    db: Session = Depends(get_db)
):
    contract = db.query(
        models.Contract
    ).filter(
        models.Contract.id == contract_id
    ).first()

    if not contract:
        raise HTTPException(
            status_code=404,
            detail="Contract not found"
        )

    return contract


# Update Contract Compliance
@router.put(
    "/{contract_id}/compliance"
)
def update_contract_compliance(
    contract_id: int,
    compliance_status: str,
    db: Session = Depends(get_db)
):
    contract = db.query(
        models.Contract
    ).filter(
        models.Contract.id == contract_id
    ).first()

    if not contract:
        raise HTTPException(
            status_code=404,
            detail="Contract not found"
        )

    contract.compliance_status = compliance_status

    db.commit()
    db.refresh(contract)

    return {
        "message": "Contract compliance status updated successfully",
        "contract": contract
    }
