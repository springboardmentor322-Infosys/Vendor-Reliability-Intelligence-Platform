from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app import models, schemas


router = APIRouter(
    prefix="/contracts",
    tags=["Contracts"]
)



# -------------------- Get All Contracts --------------------

@router.get("/", response_model=list[schemas.ContractResponse])
def get_contracts(
    db: Session = Depends(get_db)
):

    return db.query(models.Contract).all()





# -------------------- Get Contract By ID --------------------

@router.get("/{contract_id}",
            response_model=schemas.ContractResponse)
def get_contract(
    contract_id: int,
    db: Session = Depends(get_db)
):

    contract = db.query(models.Contract).filter(
        models.Contract.id == contract_id
    ).first()


    if not contract:
        raise HTTPException(
            status_code=404,
            detail="Contract not found"
        )


    return contract






# -------------------- Add Contract --------------------

@router.post("/add",
             response_model=schemas.ContractResponse)
def add_contract(
    contract: schemas.ContractCreate,
    db: Session = Depends(get_db)
):

    new_contract = models.Contract(
        **contract.model_dump()
    )


    db.add(new_contract)
    db.commit()
    db.refresh(new_contract)


    return new_contract






# -------------------- Update Contract --------------------

@router.put("/{contract_id}",
            response_model=schemas.ContractResponse)
def update_contract(
    contract_id: int,
    contract: schemas.ContractCreate,
    db: Session = Depends(get_db)
):

    existing_contract = db.query(models.Contract).filter(
        models.Contract.id == contract_id
    ).first()


    if not existing_contract:
        raise HTTPException(
            status_code=404,
            detail="Contract not found"
        )


    for key, value in contract.model_dump().items():
        setattr(existing_contract, key, value)


    db.commit()
    db.refresh(existing_contract)


    return existing_contract






# -------------------- Check Expiry --------------------

@router.put("/{contract_id}/check-expiry",
            response_model=schemas.ContractResponse)
def check_expiry(
    contract_id: int,
    db: Session = Depends(get_db)
):

    contract = db.query(models.Contract).filter(
        models.Contract.id == contract_id
    ).first()


    if not contract:
        raise HTTPException(
            status_code=404,
            detail="Contract not found"
        )


    expiry = datetime.strptime(
        contract.expiry_date,
        "%Y-%m-%d"
    )


    today = datetime.today()

    days_left = (expiry - today).days



    if days_left <= 0:
        contract.status = "Expired"

    elif days_left <= 90:
        contract.status = "Near Expiry"

    else:
        contract.status = "Active"



    db.commit()
    db.refresh(contract)


    return contract






# -------------------- Delete Contract --------------------

@router.delete("/{contract_id}")
def delete_contract(
    contract_id: int,
    db: Session = Depends(get_db)
):

    contract = db.query(models.Contract).filter(
        models.Contract.id == contract_id
    ).first()


    if not contract:
        raise HTTPException(
            status_code=404,
            detail="Contract not found"
        )


    db.delete(contract)
    db.commit()


    return {
        "message": "Contract deleted successfully"
    }