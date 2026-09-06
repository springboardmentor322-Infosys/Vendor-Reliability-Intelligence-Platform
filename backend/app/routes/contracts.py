from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.services.authorization import require_roles
from app.database import get_db
from app.schemas.contract import (
    ContractCreate,
    ContractUpdate,
    ContractResponse,
)
from app.services.audit_log_service import create_audit_log
from app.services.contract_service import (
    get_all_contracts,
    get_contract_count,
    get_contract_by_id,
    create_contract,
    update_contract,
    delete_contract,
)


router = APIRouter(
    prefix="/contracts",
    tags=["Contracts"],
)


def contract_response(contract):
    return {
        "id": contract.id,
        "contract_number": contract.contract_number,
        "vendor_id": contract.vendor_id,
        "vendor_name": (
            contract.vendor.vendor_name
            if contract.vendor
            else ""
        ),
        "start_date": contract.start_date,
        "end_date": contract.end_date,
        "contract_value": contract.contract_value,
        "contract_status": contract.contract_status,
        "terms": contract.terms,
    }


def contract_audit_values(contract):
    return {
        "contract_number": contract.contract_number,
        "vendor_id": contract.vendor_id,
        "start_date": (
            str(contract.start_date)
            if contract.start_date
            else None
        ),
        "end_date": (
            str(contract.end_date)
            if contract.end_date
            else None
        ),
        "contract_value": (
            float(contract.contract_value)
            if contract.contract_value is not None
            else None
        ),
        "contract_status": contract.contract_status,
        "terms": contract.terms,
    }


@router.get(
    "",
    response_model=dict,
)
def read_contracts(
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Procurement Manager",
            "Supply Chain Manager",
            "Finance Officer",
            "Auditor",
        )
    ),
):
    if page < 1:
        page = 1

    if limit < 1:
        limit = 50

    if limit > 100:
        limit = 100

    total = get_contract_count(db)

    skip = (
        page - 1
    ) * limit

    contracts = get_all_contracts(
        db,
        skip=skip,
        limit=limit,
    )

    total_pages = (
        (total + limit - 1) // limit
        if total
        else 1
    )

    return {
        "items": [
            contract_response(contract)
            for contract in contracts
        ],
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": total_pages,
    }


@router.get(
    "/{contract_id}",
    response_model=ContractResponse,
)
def read_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Procurement Manager",
            "Supply Chain Manager",
            "Finance Officer",
            "Auditor",
        )
    ),
):
    contract = get_contract_by_id(
        db,
        contract_id,
    )

    if not contract:
        raise HTTPException(
            status_code=404,
            detail="Contract not found",
        )

    return contract_response(contract)


@router.post(
    "",
    response_model=ContractResponse,
    status_code=201,
)
def add_contract(
    contract_data: ContractCreate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Procurement Manager",
        )
    ),
):
    contract = create_contract(
        db,
        contract_data,
    )

    create_audit_log(
        db=db,
        user=current_user,
        action="CREATE",
        module="Contracts",
        entity_type="Contract",
        entity_id=contract.id,
        description=(
            f"Contract "
            f"'{contract.contract_number}' "
            f"was created."
        ),
        new_values=contract_audit_values(
            contract
        ),
    )

    db.commit()
    db.refresh(contract)

    return contract_response(contract)


@router.put(
    "/{contract_id}",
    response_model=ContractResponse,
)
def edit_contract(
    contract_id: int,
    contract_data: ContractUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
            "Procurement Manager",
        )
    ),
):
    existing_contract = get_contract_by_id(
        db,
        contract_id,
    )

    if not existing_contract:
        raise HTTPException(
            status_code=404,
            detail="Contract not found",
        )

    old_values = contract_audit_values(
        existing_contract
    )

    old_status = (
        existing_contract.contract_status
    )

    updated_contract = update_contract(
        db,
        contract_id,
        contract_data,
    )

    if not updated_contract:
        raise HTTPException(
            status_code=404,
            detail="Contract not found",
        )

    new_values = contract_audit_values(
        updated_contract
    )

    new_status = (
        updated_contract.contract_status
    )

    create_audit_log(
        db=db,
        user=current_user,
        action="UPDATE",
        module="Contracts",
        entity_type="Contract",
        entity_id=updated_contract.id,
        description=(
            f"Contract "
            f"'{updated_contract.contract_number}' "
            f"was updated."
        ),
        old_values=old_values,
        new_values=new_values,
    )

    if old_status != new_status:
        create_audit_log(
            db=db,
            user=current_user,
            action="STATUS_CHANGE",
            module="Contracts",
            entity_type="Contract",
            entity_id=updated_contract.id,
            description=(
                f"Contract "
                f"'{updated_contract.contract_number}' "
                f"status changed from "
                f"'{old_status}' to "
                f"'{new_status}'."
            ),
            old_values={
                "contract_status": old_status,
            },
            new_values={
                "contract_status": new_status,
            },
        )

    db.commit()
    db.refresh(updated_contract)

    return contract_response(
        updated_contract
    )


@router.delete(
    "/{contract_id}",
)
def remove_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            "Administrator",
        )
    ),
):
    contract = get_contract_by_id(
        db,
        contract_id,
    )

    if not contract:
        raise HTTPException(
            status_code=404,
            detail="Contract not found",
        )

    old_values = contract_audit_values(
        contract
    )

    deleted = delete_contract(
        db,
        contract_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Contract not found",
        )

    create_audit_log(
        db=db,
        user=current_user,
        action="DELETE",
        module="Contracts",
        entity_type="Contract",
        entity_id=contract_id,
        description=(
            f"Contract "
            f"'{old_values['contract_number']}' "
            f"was deleted."
        ),
        old_values=old_values,
    )

    db.commit()

    return deleted