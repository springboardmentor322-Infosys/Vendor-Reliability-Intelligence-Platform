from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, and_, asc, desc
from datetime import datetime, date, timedelta
from app.modules.contracts.models import Contract
from app.modules.procurement.models import PurchaseOrder
from app.modules.contracts import schemas
from fastapi import HTTPException
import uuid

async def generate_contract_number(db: AsyncSession) -> str:
    year = datetime.utcnow().year
    result = await db.execute(select(Contract).order_by(desc(Contract.id)).limit(1))
    last_contract = result.scalars().first()
    
    if last_contract and last_contract.contract_number and f"CTR-{year}-" in last_contract.contract_number:
        try:
            last_seq = int(last_contract.contract_number.split("-")[-1])
            new_seq = last_seq + 1
        except ValueError:
            new_seq = 1
    else:
        new_seq = 1
        
    return f"CTR-{year}-{new_seq:06d}"

async def get_contract(db: AsyncSession, contract_id: int):
    result = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = result.scalars().first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract

async def get_contracts(db: AsyncSession, vendor_id: int = None, status: str = None, compliance_flag: str = None, search: str = None, skip: int = 0, limit: int = 100):
    query = select(Contract)
    if vendor_id:
        query = query.where(Contract.vendor_id == vendor_id)
    if status:
        query = query.where(Contract.status == status)
    if search:
        query = query.where(or_(
            Contract.title.ilike(f"%{search}%"),
            Contract.contract_number.ilike(f"%{search}%")
        ))
        
    query = query.order_by(desc(Contract.created_at)).offset(skip).limit(limit)
    result = await db.execute(query)
    contracts = result.scalars().all()
    
    if compliance_flag:
        contracts = [c for c in contracts if c.compliance_flags and compliance_flag in c.compliance_flags]
        
    return contracts

async def create_contract(db: AsyncSession, contract: schemas.ContractCreate, user_id: int):
    # Validate PO Relationship
    if contract.purchase_order_id:
        result = await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == contract.purchase_order_id))
        po = result.scalars().first()
        if not po:
            raise HTTPException(status_code=400, detail="Purchase Order not found")
        if po.vendor_id != contract.vendor_id:
            raise HTTPException(status_code=400, detail="Purchase Order does not belong to the specified vendor")
            
    contract_number = await generate_contract_number(db)
    
    db_contract = Contract(
        contract_number=contract_number,
        **contract.model_dump(),
        created_by=user_id
    )
    db.add(db_contract)
    await db.commit()
    await db.refresh(db_contract)
    return db_contract

async def update_contract(db: AsyncSession, contract_id: int, contract_update: schemas.ContractUpdate):
    db_contract = await get_contract(db, contract_id)
    
    if contract_update.status:
        contract_update.status = contract_update.status.value
    
    update_data = contract_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_contract, key, value)
        
    await db.commit()
    await db.refresh(db_contract)
    return db_contract

async def delete_contract(db: AsyncSession, contract_id: int):
    db_contract = await get_contract(db, contract_id)
    await db.delete(db_contract)
    await db.commit()
    return True

async def renew_contract(db: AsyncSession, contract_id: int, renew_data: schemas.ContractRenew):
    db_contract = await get_contract(db, contract_id)
    
    db_contract.renewal_date = renew_data.renewal_date
    if renew_data.end_date:
        db_contract.end_date = renew_data.end_date
    if renew_data.renewal_notice_period:
        db_contract.renewal_notice_period = renew_data.renewal_notice_period
        
    db_contract.status = schemas.ContractStatus.RENEWED.value
    
    await db.commit()
    await db.refresh(db_contract)
    return db_contract

async def get_expiring_contracts(db: AsyncSession, days: int = 90):
    target_date = date.today() + timedelta(days=days)
    query = select(Contract).where(
        and_(
            Contract.end_date <= target_date,
            Contract.status.notin_(["Expired", "Terminated"])
        )
    ).order_by(asc(Contract.end_date))
    
    result = await db.execute(query)
    return result.scalars().all()
