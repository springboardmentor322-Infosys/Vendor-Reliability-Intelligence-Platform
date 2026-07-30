from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user_with_role
from app.db.session import get_db
from app.models.user import Role, User
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user_with_role([Role.ADMINISTRATOR])),
) -> list[User]:
    return list(db.scalars(select(User).order_by(User.id)))
