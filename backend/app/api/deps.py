"""
Reusable FastAPI dependencies:
- get_current_user: reads the JWT from the Authorization header, verifies it,
  and loads the matching User from the database.
- require_roles(...): a factory that produces a dependency you can attach to
  any route to restrict it to specific roles (Role-Based Access Control).
"""
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User, RoleEnum

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def require_roles(*allowed_roles: RoleEnum):
    """
    Usage in a route:
        @router.post("/vendors", dependencies=[Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PROCUREMENT_MANAGER))])
    """
    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return current_user

    return checker


def require_vendor_access(current_user: User, vendor_id: uuid.UUID) -> None:
    """Vendor accounts may only read records belonging to their linked vendor."""
    if current_user.role == RoleEnum.VENDOR:
        if current_user.vendor_id is None or current_user.vendor_id != vendor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vendor accounts may only access their own records",
            )
