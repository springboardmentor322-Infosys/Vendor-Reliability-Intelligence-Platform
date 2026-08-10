"""Vendor profile helpers for registration and backfill reporting."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.user import Role, User
from app.models.vendor import Vendor, VendorCategory, VendorStatus, VendorStatusHistory

DEFAULT_CATEGORY_NAME = "Services"
PLACEHOLDER_PHONE = "00000"
PLACEHOLDER_ADDRESS = "Pending — complete vendor profile"


def get_default_category_id(db: Session) -> int:
    category = db.scalar(
        select(VendorCategory)
        .where(VendorCategory.name == DEFAULT_CATEGORY_NAME)
        .limit(1)
    )
    if category is None:
        category = db.scalar(select(VendorCategory).order_by(VendorCategory.id).limit(1))
    if category is None:
        raise ValueError("No vendor categories configured")
    return category.id


def create_vendor_profile_for_user(db: Session, user: User) -> Vendor:
    """Create a Pending vendor profile linked to a newly registered Vendor user."""
    vendor = Vendor(
        name=user.name,
        category_id=get_default_category_id(db),
        contact_email=user.email,
        contact_phone=PLACEHOLDER_PHONE,
        address=PLACEHOLDER_ADDRESS,
        status=VendorStatus.PENDING,
        user_id=user.id,
        created_by=user.id,
    )
    vendor.status_history.append(
        VendorStatusHistory(
            from_status=None,
            to_status=VendorStatus.PENDING.value,
            changed_by=user.id,
        )
    )
    db.add(vendor)
    return vendor


def count_vendor_users_missing_profile(db: Session) -> int:
    """Return how many Vendor-role users have no linked vendor record."""
    linked_user_ids = select(Vendor.user_id).where(Vendor.user_id.is_not(None))
    linked_creator_ids = select(Vendor.created_by).where(Vendor.created_by.is_not(None))

    return db.scalar(
        select(func.count())
        .select_from(User)
        .where(
            User.role == Role.VENDOR,
            User.is_active.is_(True),
            User.id.not_in(linked_user_ids),
            User.id.not_in(linked_creator_ids),
        )
    ) or 0
