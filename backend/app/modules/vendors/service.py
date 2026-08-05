from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.modules.vendors.schemas import VendorCreate, VendorUpdateStatus, VendorCategoryCreate
from app.modules.vendors import repository
from app.modules.auth.repository import get_user_by_email
from sqlalchemy.future import select
from sqlalchemy import update
from app.modules.auth.models import User

async def get_all_vendors(db: AsyncSession, skip: int = 0, limit: int = 100):
    return await repository.get_vendors(db, skip=skip, limit=limit)

async def get_vendor(db: AsyncSession, vendor_id: int):
    vendor = await repository.get_vendor(db, vendor_id=vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor

async def create_new_vendor(db: AsyncSession, vendor: VendorCreate):
    return await repository.create_vendor(db=db, vendor=vendor)

async def update_vendor_approval_status(db: AsyncSession, vendor_id: int, status_update: VendorUpdateStatus):
    vendor = await repository.update_vendor_status(db=db, vendor_id=vendor_id, status_update=status_update)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
        
    # Bridge Vendor Approval to User Account Activation
    if status_update.status == "Approved" and vendor.contact_email:
        user = await get_user_by_email(db, vendor.contact_email)
        if user:
            user.status = "active"
            await db.commit()
            
    return vendor

async def get_all_categories(db: AsyncSession):
    return await repository.get_categories(db)

async def create_new_category(db: AsyncSession, category: VendorCategoryCreate):
    return await repository.create_category(db=db, category=category)
