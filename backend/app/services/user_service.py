"""User management service — Admin-only user listing, detail, and status toggling."""

from __future__ import annotations

from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.security import get_password_hash
from app.models import Role, User, UserRole, Vendor
from app.schemas.user import ManagedUserCreate


def list_users(
    db: Session,
    search: Optional[str] = None,
    role_name: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[User], int]:
    """Return a paginated, filterable list of users."""
    statement = (
        select(User)
        .options(selectinload(User.roles))
        .order_by(User.created_at.desc())
    )

    if search:
        term = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                User.first_name.ilike(term),
                User.last_name.ilike(term),
                User.email.ilike(term),
            )
        )

    if role_name:
        statement = statement.join(User.role_links).join(UserRole.role).where(
            Role.name == role_name
        )

    if is_active is not None:
        statement = statement.where(User.is_active == is_active)

    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    users = db.scalars(
        statement.offset((page - 1) * page_size).limit(page_size)
    ).all()
    return list(users), total


def get_user_detail(db: Session, user_id: int) -> Optional[User]:
    return db.scalar(
        select(User).options(selectinload(User.roles)).where(User.id == user_id)
    )


def toggle_user_active(db: Session, user_id: int, requesting_user_id: int) -> Optional[User]:
    """Toggle the is_active flag of a user. Admins cannot deactivate themselves."""
    user = get_user_detail(db, user_id)
    if user is None:
        return None
    if user.id == requesting_user_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account.")
    user.is_active = not user.is_active
    return user


def provision_user(db: Session, data: ManagedUserCreate) -> User:
    """Create an account and, for suppliers, bind it to exactly one vendor."""
    role = db.scalar(select(Role).where(func.lower(Role.name) == data.role_name.casefold()))
    if role is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="The selected role is not available.")
    is_vendor_role = role.name.casefold() == "vendor"
    if is_vendor_role and data.vendor_id is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="A Vendor account must be linked to one vendor company.")
    if not is_vendor_role and data.vendor_id is not None:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="Only Vendor accounts may be linked to a vendor company.")
    if data.vendor_id is not None and db.get(Vendor, data.vendor_id) is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Vendor company not found.")
    if db.scalar(select(User.id).where(func.lower(User.email) == data.email.casefold())) is not None:
        from fastapi import HTTPException
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(first_name=data.first_name, last_name=data.last_name, email=data.email, phone=data.phone,
                password_hash=get_password_hash(data.password), vendor_id=data.vendor_id, is_active=True)
    user.role_links.append(UserRole(role=role))
    db.add(user)
    db.flush()
    return user
