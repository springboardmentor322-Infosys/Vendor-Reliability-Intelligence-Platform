from sqlalchemy.orm import Session, joinedload

from app.models.contract import Contract
from app.schemas.contract import (
    ContractCreate,
    ContractUpdate
)


def get_all_contracts(
    db: Session,
    skip: int = 0,
    limit: int = 50
):
    return (
        db.query(Contract)
        .options(
            joinedload(Contract.vendor)
        )
        .order_by(
            Contract.id.desc()
        )
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_contract_count(
    db: Session
):
    return (
        db.query(Contract)
        .count()
    )


def get_contract_by_id(
    db: Session,
    contract_id: int
):

    return (
        db.query(Contract)
        .options(
            joinedload(Contract.vendor)
        )
        .filter(
            Contract.id == contract_id
        )
        .first()
    )


def create_contract(
    db: Session,
    contract: ContractCreate
):

    db_contract = Contract(
        contract_number=contract.contract_number,
        vendor_id=contract.vendor_id,
        start_date=contract.start_date,
        end_date=contract.end_date,
        contract_value=contract.contract_value,
        contract_status=contract.contract_status,
        terms=contract.terms
    )

    db.add(db_contract)

    db.commit()

    db.refresh(db_contract)

    return get_contract_by_id(
        db,
        db_contract.id
    )


def update_contract(
    db: Session,
    contract_id: int,
    contract: ContractUpdate
):

    db_contract = get_contract_by_id(
        db,
        contract_id
    )

    if not db_contract:
        return None

    update_data = contract.model_dump(
        exclude_unset=True
    )

    for key, value in update_data.items():

        setattr(
            db_contract,
            key,
            value
        )

    db.commit()

    db.refresh(db_contract)

    return get_contract_by_id(
        db,
        contract_id
    )


def delete_contract(
    db: Session,
    contract_id: int
):

    db_contract = get_contract_by_id(
        db,
        contract_id
    )

    if not db_contract:
        return None

    db.delete(db_contract)

    db.commit()

    return {
        "message": "Contract deleted successfully"
    }