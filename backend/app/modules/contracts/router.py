from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import os
import json
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import RoleChecker
from app.modules.auth.service import get_current_user
from app.modules.auth.models import User
from app.modules.contracts import schemas, repository
from app.modules.audit.models import AuditLog
from app.modules.notifications.models import Notification

router = APIRouter(tags=["Contracts"])

@router.get("/", response_model=List[schemas.ContractResponse], dependencies=[Depends(RoleChecker(["Administrator", "Procurement Manager", "Finance Officer", "Auditor", "Vendor"]))])
async def get_contracts(vendor_id: Optional[int] = None, status: Optional[str] = None, compliance_flag: Optional[str] = None, search: Optional[str] = None, skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # If user is a Vendor, restrict to their own contracts
    if current_user.role.name == "Vendor":
        from app.modules.vendors.models import VendorContact
        from sqlalchemy.future import select
        contact_res = await db.execute(select(VendorContact).filter(VendorContact.email == current_user.email))
        contact = contact_res.scalars().first()
        if contact:
            if vendor_id and vendor_id != contact.vendor_id:
                return [] # Requesting another vendor's contracts
            vendor_id = contact.vendor_id
        else:
            return []
            
    return await repository.get_contracts(db, vendor_id=vendor_id, status=status, compliance_flag=compliance_flag, search=search, skip=skip, limit=limit)

@router.get("/expiring", response_model=List[schemas.ContractResponse], dependencies=[Depends(RoleChecker(["Administrator", "Procurement Manager", "Auditor", "Vendor"]))])
async def get_expiring_contracts(days: int = 90, db: AsyncSession = Depends(get_db)):
    return await repository.get_expiring_contracts(db, days=days)

@router.get("/alerts", response_model=List[schemas.ContractAlert], dependencies=[Depends(RoleChecker(["Administrator", "Procurement Manager", "Auditor"]))])
async def get_contract_alerts(db: AsyncSession = Depends(get_db)):
    # 30, 60, 90 days expiry
    expiring = await repository.get_expiring_contracts(db, days=90)
    alerts = []
    today = datetime.utcnow().date()
    for c in expiring:
        if not c.end_date:
            continue
        days_rem = (c.end_date - today).days
        alert_lvl = "Normal"
        if days_rem < 0:
            alert_lvl = "Expired"
        elif days_rem <= 30:
            alert_lvl = "Critical"
        elif days_rem <= 60:
            alert_lvl = "Warning"
        elif days_rem <= 90:
            alert_lvl = "Info"
            
        alerts.append(schemas.ContractAlert(
            id=c.id,
            contract_number=c.contract_number,
            title=c.title,
            vendor_id=c.vendor_id,
            end_date=c.end_date,
            days_remaining=days_rem,
            alert_level=alert_lvl,
            status=c.status
        ))
    return alerts

@router.get("/{contract_id}", response_model=schemas.ContractResponse, dependencies=[Depends(RoleChecker(["Administrator", "Procurement Manager", "Finance Officer", "Auditor", "Vendor"]))])
async def get_contract(contract_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    contract = await repository.get_contract(db, contract_id)
    if current_user.role.name == "Vendor":
        from app.modules.vendors.models import VendorContact
        from sqlalchemy.future import select
        contact_res = await db.execute(select(VendorContact).filter(VendorContact.email == current_user.email))
        contact = contact_res.scalars().first()
        if not contact or contact.vendor_id != contract.vendor_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
    return contract

@router.post("/", response_model=schemas.ContractResponse, dependencies=[Depends(RoleChecker(["Administrator", "Procurement Manager"]))])
async def create_contract(contract: schemas.ContractCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_contract = await repository.create_contract(db, contract, current_user.id)
    
    # Audit Log
    db.add(AuditLog(user_id=current_user.id, action="CREATE_CONTRACT", entity_type="Contract", entity_id=new_contract.id))
    
    # Notification
    db.add(Notification(user_id=1, message=f"New Contract created: {new_contract.contract_number}"))
    
    await db.commit()
    return new_contract

@router.put("/{contract_id}", response_model=schemas.ContractResponse, dependencies=[Depends(RoleChecker(["Administrator", "Procurement Manager"]))])
async def update_contract(contract_id: int, contract_update: schemas.ContractUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    updated_contract = await repository.update_contract(db, contract_id, contract_update)
    db.add(AuditLog(user_id=current_user.id, action="UPDATE_CONTRACT", entity_type="Contract", entity_id=updated_contract.id))
    await db.commit()
    return updated_contract

@router.delete("/{contract_id}", dependencies=[Depends(RoleChecker(["Administrator", "Procurement Manager"]))])
async def delete_contract(contract_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await repository.delete_contract(db, contract_id)
    db.add(AuditLog(user_id=current_user.id, action="DELETE_CONTRACT", entity_type="Contract", entity_id=contract_id))
    await db.commit()
    return {"status": "deleted"}

@router.post("/{contract_id}/renew", response_model=schemas.ContractResponse, dependencies=[Depends(RoleChecker(["Administrator", "Procurement Manager"]))])
async def renew_contract(contract_id: int, renew_data: schemas.ContractRenew, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    renewed_contract = await repository.renew_contract(db, contract_id, renew_data)
    
    db.add(AuditLog(user_id=current_user.id, action="RENEW_CONTRACT", entity_type="Contract", entity_id=renewed_contract.id))
    db.add(Notification(user_id=1, message=f"Contract {renewed_contract.contract_number} has been renewed."))
    await db.commit()
    
    return renewed_contract

@router.post("/{contract_id}/upload", dependencies=[Depends(RoleChecker(["Administrator", "Procurement Manager"]))])
async def upload_contract_document(contract_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    contract = await repository.get_contract(db, contract_id)
    
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
    contents = await file.read(10 * 1024 * 1024 + 1)
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum 10MB.")
        
    os.makedirs(os.path.join("uploads", "contracts"), exist_ok=True)
    file_ext = os.path.splitext(file.filename)[1]
    safe_filename = f"{contract.contract_number}_{int(datetime.utcnow().timestamp())}{file_ext}"
    file_path = os.path.join("uploads", "contracts", safe_filename)
    
    with open(file_path, "wb") as f:
        f.write(contents)
        
    contract.uploaded_document_path = file_path
    contract.uploaded_document_name = file.filename
    contract.file_size = len(contents)
    contract.mime_type = file.content_type
    contract.uploaded_at = datetime.utcnow()
    
    db.add(AuditLog(user_id=current_user.id, action="UPLOAD_CONTRACT_DOCUMENT", entity_type="Contract", entity_id=contract.id))
    db.add(Notification(user_id=1, message=f"Document uploaded for Contract {contract.contract_number}"))
    await db.commit()
    
    return {"message": "Document uploaded successfully", "file_path": file_path}

@router.get("/{contract_id}/download", dependencies=[Depends(RoleChecker(["Administrator", "Procurement Manager", "Finance Officer", "Auditor", "Vendor"]))])
async def download_contract_document(contract_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    contract = await repository.get_contract(db, contract_id)
    
    if current_user.role.name == "Vendor":
        from app.modules.vendors.models import VendorContact
        from sqlalchemy.future import select
        contact_res = await db.execute(select(VendorContact).filter(VendorContact.email == current_user.email))
        contact = contact_res.scalars().first()
        if not contact or contact.vendor_id != contract.vendor_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
            
    if not contract.uploaded_document_path or not os.path.exists(contract.uploaded_document_path):
        raise HTTPException(status_code=404, detail="Document not found")
        
    db.add(AuditLog(user_id=current_user.id, action="DOWNLOAD_CONTRACT", entity_type="Contract", entity_id=contract.id))
    await db.commit()
    
    return FileResponse(path=contract.uploaded_document_path, filename=contract.uploaded_document_name, media_type=contract.mime_type or "application/pdf")
