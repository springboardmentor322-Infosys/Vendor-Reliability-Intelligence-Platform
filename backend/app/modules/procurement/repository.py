from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.modules.procurement.models import ProcurementRequest, PRItem, PurchaseOrder, POItem
from app.modules.procurement.schemas import ProcurementRequestCreate, ProcurementRequestUpdateStatus, PurchaseOrderCreate, PurchaseOrderUpdateStatus

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

async def get_purchase_orders(db: AsyncSession, vendor_id: int = None, skip: int = 0, limit: int = 100):
    query = select(PurchaseOrder).options(selectinload(PurchaseOrder.items)).order_by(PurchaseOrder.created_at.desc())
    if vendor_id:
        query = query.filter(PurchaseOrder.vendor_id == vendor_id)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

async def get_purchase_order(db: AsyncSession, po_id: int):
    result = await db.execute(
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.items))
        .filter(PurchaseOrder.id == po_id)
    )
    return result.scalars().first()

async def generate_po_number(db: AsyncSession) -> str:
    result = await db.execute(select(PurchaseOrder).order_by(PurchaseOrder.id.desc()).limit(1))
    last_po = result.scalars().first()
    next_id = 1 if not last_po else last_po.id + 1
    return f"PO-2026-{next_id:06d}"

async def create_purchase_order_from_pr(db: AsyncSession, pr_id: int, vendor_id: int):
    # Fetch PR
    pr = await get_procurement_request(db, pr_id)
    if not pr or pr.status != "Approved":
        raise ValueError("PR not found or not approved")

    po_num = await generate_po_number(db)
    
    # Calculate amount
    total_amount = sum(item.estimated_cost * item.quantity for item in pr.items)
    
    db_po = PurchaseOrder(
        po_number=po_num,
        pr_id=pr.id,
        vendor_id=vendor_id,
        amount=total_amount,
        status="Pending"
    )
    db.add(db_po)
    await db.flush()

    for item in pr.items:
        db_po_item = POItem(
            po_id=db_po.id,
            item_name=item.item_name,
            quantity=item.quantity,
            unit_price=item.estimated_cost
        )
        db.add(db_po_item)

    pr.status = "Ordered"
    await db.commit()
    return await get_purchase_order(db, db_po.id)

async def update_purchase_order_status(db: AsyncSession, po_id: int, status_update: PurchaseOrderUpdateStatus, vendor_id: int = None):
    db_po = await get_purchase_order(db, po_id)
    if not db_po:
        return None
    
    # Ensure vendor can only update their own PO
    if vendor_id and db_po.vendor_id != vendor_id:
        raise ValueError("Unauthorized to update this PO")
        
    valid_transitions = {
        "Pending": ["Accepted"],
        "Accepted": ["In Progress"],
        "In Progress": ["Shipped", "Partial Delivery"],
        "Partial Delivery": ["Shipped", "Delivered"],
        "Shipped": ["Delivered"],
        "Delivered": ["Completed"]
    }
    
    if status_update.status not in valid_transitions.get(db_po.status, []):
        if status_update.status != db_po.status:
            raise ValueError(f"Invalid transition from {db_po.status} to {status_update.status}")
            
    db_po.status = status_update.status
    await db.commit()
    return await get_purchase_order(db, po_id)
