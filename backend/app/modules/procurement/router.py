from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.core.dependencies import RoleChecker
from app.modules.auth.service import get_current_user
from app.modules.auth.schemas import UserResponse
from app.modules.procurement import schemas, repository
from app.modules.audit.models import AuditLog
from app.modules.notifications.models import Notification
from app.modules.auth.models import User
import os
import shutil

router = APIRouter(tags=["Procurement"])

# SCM can create PR
@router.post("/requests", response_model=schemas.ProcurementRequestResponse, dependencies=[Depends(RoleChecker(["Administrator", "Supply Chain Manager"]))])
async def create_procurement_request(
    pr: schemas.ProcurementRequestCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
):
    return await repository.create_procurement_request(db=db, pr=pr, requested_by_id=current_user.id)

# Any authorized user can view PRs
@router.get("/requests", response_model=List[schemas.ProcurementRequestResponse], dependencies=[Depends(RoleChecker(["Administrator", "Supply Chain Manager", "Finance Officer", "Procurement Manager", "Auditor"]))])
async def read_procurement_requests(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    return await repository.get_procurement_requests(db, skip=skip, limit=limit)

@router.get("/requests/{pr_id}", response_model=schemas.ProcurementRequestResponse, dependencies=[Depends(RoleChecker(["Administrator", "Supply Chain Manager", "Finance Officer", "Procurement Manager", "Auditor"]))])
async def read_procurement_request(pr_id: int, db: AsyncSession = Depends(get_db)):
    pr = await repository.get_procurement_request(db, pr_id=pr_id)
    if pr is None:
        raise HTTPException(status_code=404, detail="Procurement request not found")
    return pr

# Finance and PM can approve/reject
@router.patch("/requests/{pr_id}/status", response_model=schemas.ProcurementRequestResponse, dependencies=[Depends(RoleChecker(["Administrator", "Procurement Manager", "Finance Officer"]))])
async def update_procurement_request_status(pr_id: int, status_update: schemas.ProcurementRequestUpdateStatus, db: AsyncSession = Depends(get_db)):
    pr = await repository.update_procurement_request_status(db, pr_id, status_update)
    if not pr:
        raise HTTPException(status_code=404, detail="Procurement request not found")
    return pr

@router.get("/eligible-vendors", dependencies=[Depends(RoleChecker(["Administrator", "Procurement Manager"]))])
async def get_eligible_vendors(category: str, db: AsyncSession = Depends(get_db)):
    # Quick filter for eligible vendors
    from app.modules.vendors.models import Vendor, VendorCategory
    from sqlalchemy.future import select
    from sqlalchemy.orm import selectinload
    
    query = select(Vendor).filter(
        Vendor.status == "Approved"
    ).options(selectinload(Vendor.category))
    
    result = await db.execute(query)
    vendors = result.scalars().all()
    return [{"id": v.id, "name": v.name, "category": v.category.name if v.category else None} for v in vendors]


@router.post("/purchase-orders", response_model=schemas.PurchaseOrderResponse, dependencies=[Depends(RoleChecker(["Administrator", "Procurement Manager"]))])
async def create_purchase_order(pr_id: int, po_data: schemas.PurchaseOrderCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        po = await repository.create_purchase_order_from_pr(db, pr_id, po_data.vendor_id)
        
        # Log Audit
        audit = AuditLog(user_id=current_user.id, action="CREATE_PO", entity_type="PurchaseOrder", entity_id=po.id)
        db.add(audit)
        
        # Notification to Vendor
        notif = Notification(user_id=po.vendor.contacts[0].id if (po.vendor and po.vendor.contacts) else 1, message=f"New Purchase Order assigned: {po.po_number}")
        db.add(notif)
        
        await db.commit()
        return po
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/purchase-orders", response_model=List[schemas.PurchaseOrderResponse], dependencies=[Depends(RoleChecker(["Administrator", "Supply Chain Manager", "Finance Officer", "Procurement Manager", "Auditor", "Vendor"]))])
async def get_purchase_orders(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    vendor_id = None
    if current_user.role.name == "Vendor":
        from app.modules.vendors.models import VendorContact
        from sqlalchemy.future import select
        contact_res = await db.execute(select(VendorContact).filter(VendorContact.email == current_user.email))
        contact = contact_res.scalars().first()
        if contact:
            vendor_id = contact.vendor_id
        else:
            return [] # No vendor profile found
            
    pos = await repository.get_purchase_orders(db, vendor_id=vendor_id)
    return pos

@router.patch("/purchase-orders/{po_id}/status", response_model=schemas.PurchaseOrderResponse, dependencies=[Depends(RoleChecker(["Administrator", "Procurement Manager", "Vendor"]))])
async def update_purchase_order_status(po_id: int, status_update: schemas.PurchaseOrderUpdateStatus, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    vendor_id = None
    if current_user.role.name == "Vendor":
        from app.modules.vendors.models import VendorContact
        from sqlalchemy.future import select
        contact_res = await db.execute(select(VendorContact).filter(VendorContact.email == current_user.email))
        contact = contact_res.scalars().first()
        if contact:
            vendor_id = contact.vendor_id
            
    try:
        po = await repository.update_purchase_order_status(db, po_id, status_update, vendor_id=vendor_id)
        if not po:
            raise HTTPException(status_code=404, detail="Purchase order not found")
            
        # Log Audit
        audit = AuditLog(user_id=current_user.id, action=f"UPDATE_PO_STATUS_{status_update.status.upper().replace(' ', '_')}", entity_type="PurchaseOrder", entity_id=po.id)
        db.add(audit)
        
        # Notification to PM
        notif = Notification(user_id=1, message=f"Purchase Order {po.po_number} status updated to {status_update.status}")
        db.add(notif)
        
        await db.commit()
        return po
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/purchase-orders/{po_id}/documents", dependencies=[Depends(RoleChecker(["Administrator", "Procurement Manager", "Vendor"]))])
async def upload_po_document(po_id: int, file: UploadFile = File(...), doc_type: str = Form(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if doc_type not in ["invoice", "receipt"]:
        raise HTTPException(status_code=400, detail="Invalid doc_type. Must be 'invoice' or 'receipt'")
        
    po = await repository.get_purchase_order(db, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
        
    # Vendor auth check
    if current_user.role.name == "Vendor":
        from app.modules.vendors.models import VendorContact
        from sqlalchemy.future import select
        contact_res = await db.execute(select(VendorContact).filter(VendorContact.email == current_user.email))
        contact = contact_res.scalars().first()
        if not contact or contact.vendor_id != po.vendor_id:
            raise HTTPException(status_code=403, detail="Unauthorized")

    # Validate file type
    allowed_types = ["application/pdf", "image/jpeg", "image/png"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF/JPG/PNG are allowed.")
        
    # File size limit (FastAPI reads sequentially, we can check max size by reading 10MB chunk)
    contents = await file.read(10 * 1024 * 1024 + 1)
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")
    
    # Setup uploads folder
    os.makedirs("uploads", exist_ok=True)
    file_ext = os.path.splitext(file.filename)[1]
    safe_filename = f"{po.po_number}_{doc_type}{file_ext}"
    file_path = os.path.join("uploads", safe_filename)
    
    with open(file_path, "wb") as f:
        f.write(contents)
        
    if doc_type == "invoice":
        po.invoice_file_path = file_path
    else:
        po.receipt_file_path = file_path
        
    # Audit Log
    audit = AuditLog(user_id=current_user.id, action=f"UPLOAD_{doc_type.upper()}", entity_type="PurchaseOrder", entity_id=po.id)
    db.add(audit)
    
    await db.commit()
    return {"message": f"{doc_type.capitalize()} uploaded successfully", "file_path": file_path}
