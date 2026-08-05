from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.core.dependencies import RoleChecker
from app.modules.auth.service import get_current_user
from app.modules.auth.schemas import UserResponse
from app.modules.procurement import schemas, repository

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
@router.patch("/requests/{pr_id}/status", response_model=schemas.ProcurementRequestResponse, dependencies=[Depends(RoleChecker(["Administrator", "Finance Officer", "Procurement Manager"]))])
async def update_procurement_request_status(
    pr_id: int, 
    status_update: schemas.ProcurementRequestUpdateStatus, 
    db: AsyncSession = Depends(get_db)
):
    pr = await repository.update_procurement_request_status(db, pr_id=pr_id, status_update=status_update)
    if pr is None:
        raise HTTPException(status_code=404, detail="Procurement request not found")
    return pr
