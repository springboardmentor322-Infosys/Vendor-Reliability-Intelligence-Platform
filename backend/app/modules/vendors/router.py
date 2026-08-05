from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.core.dependencies import get_db, RoleChecker
from app.modules.vendors.schemas import VendorResponse, VendorCreate, VendorUpdateStatus, VendorCategoryResponse, VendorCategoryCreate
from app.modules.vendors import service
from app.modules.auth.models import User

router = APIRouter()

pm_or_admin = RoleChecker(["Administrator", "Procurement Manager"])

@router.get("/", response_model=List[VendorResponse])
async def read_vendors(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    return await service.get_all_vendors(db, skip=skip, limit=limit)

@router.get("/categories/", response_model=List[VendorCategoryResponse])
async def read_categories(db: AsyncSession = Depends(get_db)):
    return await service.get_all_categories(db)

@router.post("/categories/", response_model=VendorCategoryResponse)
async def create_category(category: VendorCategoryCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(pm_or_admin)):
    return await service.create_new_category(db=db, category=category)

@router.post("/", response_model=VendorResponse)
async def create_vendor(vendor: VendorCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(pm_or_admin)):
    return await service.create_new_vendor(db=db, vendor=vendor)

@router.get("/{vendor_id}", response_model=VendorResponse)
async def read_vendor(vendor_id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_vendor(db, vendor_id=vendor_id)

@router.patch("/{vendor_id}/status", response_model=VendorResponse)
async def update_vendor_status(vendor_id: int, status_update: VendorUpdateStatus, db: AsyncSession = Depends(get_db), current_user: User = Depends(pm_or_admin)):
    return await service.update_vendor_approval_status(db=db, vendor_id=vendor_id, status_update=status_update)
