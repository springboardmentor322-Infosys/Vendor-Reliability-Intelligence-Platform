from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import update
from app.modules.vendors.models import Vendor, VendorCategory, VendorContact
from app.modules.vendors.schemas import VendorCreate, VendorUpdateStatus, VendorCategoryCreate

async def get_vendors(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(
        select(Vendor).options(selectinload(Vendor.category), selectinload(Vendor.contacts)).offset(skip).limit(limit)
    )
    return result.scalars().all()

async def get_vendor(db: AsyncSession, vendor_id: int):
    result = await db.execute(
        select(Vendor)
        .options(selectinload(Vendor.category), selectinload(Vendor.contacts))
        .filter(Vendor.id == vendor_id)
        .execution_options(populate_existing=True)
    )
    return result.scalars().first()

async def create_vendor(db: AsyncSession, vendor: VendorCreate):
    db_vendor = Vendor(
        name=vendor.name,
        contact_email=vendor.contact_email,
        category_id=vendor.category_id,
        status="Pending"
    )
    db.add(db_vendor)
    await db.commit()
    await db.refresh(db_vendor)
    return db_vendor

async def update_vendor_status(db: AsyncSession, vendor_id: int, status_update: VendorUpdateStatus):
    db_vendor = await get_vendor(db, vendor_id)
    if db_vendor:
        db_vendor.status = status_update.status
        await db.commit()
        return await get_vendor(db, vendor_id)
    return None

async def get_categories(db: AsyncSession):
    result = await db.execute(select(VendorCategory))
    return result.scalars().all()

async def create_category(db: AsyncSession, category: VendorCategoryCreate):
    db_category = VendorCategory(name=category.name, description=category.description)
    db.add(db_category)
    await db.commit()
    await db.refresh(db_category)
    return db_category
