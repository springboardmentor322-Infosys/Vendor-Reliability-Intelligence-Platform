from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from typing import List

from app.core.database import get_db
from app.core.dependencies import RoleChecker
from app.modules.auth.service import get_current_user
from app.modules.auth.models import User
from pydantic import BaseModel

router = APIRouter()
allow_admin = RoleChecker(["Administrator", "Procurement Manager"])

class UserResponse(BaseModel):
    id: int
    email: str
    is_active: bool
    role_name: str

    class Config:
        orm_mode = True

@router.get("/", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(allow_admin)
):
    result = await db.execute(select(User).options(joinedload(User.role)))
    users = result.scalars().all()
    # Safely return users with their role name
    return [
        UserResponse(
            id=u.id, 
            email=u.email, 
            is_active=u.is_active, 
            role_name=u.role.name if u.role else "Unknown"
        )
        for u in users
    ]
