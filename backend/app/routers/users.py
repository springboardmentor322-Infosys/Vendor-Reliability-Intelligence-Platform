"""Admin user management API endpoints for VendorIQ."""

from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.database import get_db
from app.models import Role, Vendor
from app.schemas.user import ManagedUserCreate, VendorAccountLink
from app.services.milestone_two import audit, can, commit, fail
from app.services.user_service import get_user_detail, list_users, provision_user, toggle_user_active

router = APIRouter(prefix="/api/v1/users", tags=["User Management"])

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[object, Depends(get_current_user)]


def _require_admin(user) -> None:
    if not can(user, "Administrator"):
        fail(403, "Only Administrators can manage users.")


def _can_provision_vendor_user(user) -> bool:
    return can(user, "Administrator", "Procurement Manager")


@router.get("/roles", summary="List roles available for account provisioning")
def list_assignable_roles(db: DatabaseSession, user: CurrentUser):
    if not _can_provision_vendor_user(user):
        fail(403, "You do not have permission to provision vendor accounts.")
    roles = db.scalars(select(Role).order_by(Role.name)).all()
    if can(user, "Procurement Manager") and not can(user, "Administrator"):
        roles = [role for role in roles if role.name == "Vendor"]
    return [{"id": role.id, "name": role.name} for role in roles]


@router.post("", status_code=201, summary="Create a user or invite a vendor account")
def create_managed_user(data: ManagedUserCreate, db: DatabaseSession, user: CurrentUser):
    if not _can_provision_vendor_user(user):
        fail(403, "You do not have permission to provision user accounts.")
    if can(user, "Procurement Manager") and not can(user, "Administrator") and data.role_name != "Vendor":
        fail(403, "Procurement Managers may only provision Vendor accounts.")
    target = provision_user(db, data)
    audit(db, user.id, "Vendor User Invited" if data.vendor_id else "User Created", "User", target.id)
    commit(db)
    return {"id": target.id, "first_name": target.first_name, "last_name": target.last_name,
            "email": target.email, "phone": target.phone, "vendor_id": target.vendor_id,
            "roles": [role.name for role in target.roles]}


@router.patch("/{user_id}/vendor-company", summary="Link an existing Vendor account to a vendor company")
def link_vendor_company(user_id: int, data: VendorAccountLink, db: DatabaseSession, user: CurrentUser):
    if not _can_provision_vendor_user(user):
        fail(403, "You do not have permission to link vendor accounts.")
    target = get_user_detail(db, user_id)
    if target is None:
        fail(404, "User not found.")
    if not any(role.name == "Vendor" for role in target.roles):
        fail(422, "Only a Vendor-role account may be linked to a vendor company.")
    if db.get(Vendor, data.vendor_id) is None:
        fail(404, "Vendor company not found.")
    target.vendor_id = data.vendor_id
    audit(db, user.id, "Vendor User Linked", "User", target.id)
    commit(db)
    return {"id": target.id, "vendor_id": target.vendor_id}


@router.get("", summary="List all users (Admin only)")
def list_all_users(
    db: DatabaseSession,
    user: CurrentUser,
    search: Optional[str] = Query(None),
    role_name: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Return a paginated, filterable list of all VendorIQ users."""
    _require_admin(user)
    users, total = list_users(db, search, role_name, is_active, page, page_size)
    return {
        "items": [
            {
                "id": u.id,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "email": u.email,
                "phone": u.phone,
                "vendor_id": u.vendor_id,
                "vendor_company_name": u.vendor.company_name if u.vendor else None,
                "is_active": u.is_active,
                "roles": [r.name for r in u.roles],
                "created_at": u.created_at,
            }
            for u in users
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{user_id}", summary="Get user details (Admin only)")
def get_user(user_id: int, db: DatabaseSession, user: CurrentUser):
    """Return full profile details for a specific user."""
    _require_admin(user)
    target = get_user_detail(db, user_id)
    if target is None:
        fail(404, "User not found.")
    return {
        "id": target.id,
        "first_name": target.first_name,
        "last_name": target.last_name,
        "email": target.email,
        "phone": target.phone,
        "vendor_id": target.vendor_id,
        "vendor_company_name": target.vendor.company_name if target.vendor else None,
        "is_active": target.is_active,
        "roles": [{"id": r.id, "name": r.name} for r in target.roles],
        "created_at": target.created_at,
        "updated_at": target.updated_at,
    }


@router.patch("/{user_id}/toggle-active", summary="Toggle user active status (Admin only)")
def toggle_active(user_id: int, db: DatabaseSession, user: CurrentUser):
    """Activate or deactivate a user account. Admins cannot deactivate themselves."""
    _require_admin(user)
    target = toggle_user_active(db, user_id, requesting_user_id=user.id)
    if target is None:
        fail(404, "User not found.")
    action = "User Activated" if target.is_active else "User Deactivated"
    audit(db, user.id, action, "User", user_id)
    commit(db)
    return {"id": target.id, "is_active": target.is_active}
