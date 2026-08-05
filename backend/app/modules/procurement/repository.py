from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.modules.procurement.models import ProcurementRequest, PRItem
from app.modules.procurement.schemas import ProcurementRequestCreate, ProcurementRequestUpdateStatus

async def get_procurement_requests(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(
        select(ProcurementRequest)
        .options(selectinload(ProcurementRequest.items))
        .offset(skip)
        .limit(limit)
        .execution_options(populate_existing=True)
    )
    prs = result.scalars().all()
    for pr in prs:
        pr.total_estimated_cost = sum(item.estimated_cost * item.quantity for item in pr.items)
    return prs

async def get_procurement_request(db: AsyncSession, pr_id: int):
    result = await db.execute(
        select(ProcurementRequest)
        .options(selectinload(ProcurementRequest.items))
        .filter(ProcurementRequest.id == pr_id)
        .execution_options(populate_existing=True)
    )
    pr = result.scalars().first()
    if pr:
        pr.total_estimated_cost = sum(item.estimated_cost * item.quantity for item in pr.items)
    return pr

async def create_procurement_request(db: AsyncSession, pr: ProcurementRequestCreate, requested_by_id: int):
    db_pr = ProcurementRequest(
        department=pr.department,
        description=pr.description,
        status="Pending",
        requested_by_id=requested_by_id
    )
    db.add(db_pr)
    await db.flush()  # To get db_pr.id
    
    for item in pr.items:
        db_item = PRItem(
            pr_id=db_pr.id,
            item_name=item.item_name,
            quantity=item.quantity,
            estimated_cost=item.estimated_cost
        )
        db.add(db_item)
        
    await db.commit()
    return await get_procurement_request(db, db_pr.id)

async def update_procurement_request_status(db: AsyncSession, pr_id: int, status_update: ProcurementRequestUpdateStatus):
    db_pr = await get_procurement_request(db, pr_id)
    if db_pr:
        db_pr.status = status_update.status
        await db.commit()
        return await get_procurement_request(db, pr_id)
    return None
