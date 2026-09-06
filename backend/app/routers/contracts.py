from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models

router = APIRouter(
    prefix="/contracts",
    tags=["Contracts"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/")
def get_contracts(db: Session = Depends(get_db)):
    contracts = db.query(models.Contract).all()
    return contracts

@router.post("/")
def create_contract(contract_data: dict, db: Session = Depends(get_db)):
    new_contract = models.Contract(
        contract_id=contract_data.get("contractId", f"CON{Date.now()}"),
        vendor=contract_data.get("vendor", ""),
        contract_name=contract_data.get("contractName", ""),
        start_date=contract_data.get("startDate", ""),
        expiry_date=contract_data.get("expiryDate", ""),
        renewal_notice_period=int(contract_data.get("renewalNoticePeriod", 30)),
        terms=contract_data.get("terms", ""),
        status=contract_data.get("status", "Active")
    )
    db.add(new_contract)
    db.commit()
    db.refresh(new_contract)
    return new_contract
