"""Create login accounts for imported vendors that have no linked user."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import or_, select

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.user import Role, User
from app.models.vendor import Vendor

DEFAULT_PASSWORD = "Vendor@123"


def seed_vendor_logins(password: str = DEFAULT_PASSWORD) -> list[tuple[str, str, str]]:
    db = SessionLocal()
    created: list[tuple[str, str, str]] = []

    try:
        vendors = list(
            db.scalars(
                select(Vendor).where(
                    Vendor.user_id.is_(None),
                    or_(Vendor.contact_email.is_not(None), Vendor.contact_email != ""),
                )
            )
        )

        for vendor in vendors:
            email = vendor.contact_email.strip()
            if not email:
                continue

            existing_user = db.scalar(select(User).where(User.email == email))
            if existing_user is not None:
                vendor.user_id = existing_user.id
                if vendor.created_by is None:
                    vendor.created_by = existing_user.id
                continue

            user = User(
                name=vendor.name,
                email=email,
                hashed_password=get_password_hash(password),
                role=Role.VENDOR,
                is_active=True,
            )
            db.add(user)
            db.flush()

            vendor.user_id = user.id
            if vendor.created_by is None:
                vendor.created_by = user.id

            created.append((vendor.name, email, password))

        db.commit()
        return created
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Create Vendor user logins for imported vendor records",
    )
    parser.add_argument(
        "--password",
        default=DEFAULT_PASSWORD,
        help=f"Password for new vendor accounts (default: {DEFAULT_PASSWORD})",
    )
    args = parser.parse_args()

    if len(args.password) < 8:
        print("Error: password must be at least 8 characters", file=sys.stderr)
        return 1

    try:
        created = seed_vendor_logins(args.password)
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    if not created:
        print("No new vendor logins created (all vendors already linked or no vendors found).")
        print("\nExisting vendor accounts can be listed with:")
        print("  python scripts/list_vendor_logins.py")
        return 0

    print("Vendor login accounts created")
    print("=" * 72)
    print(f"{'Vendor':<24} {'Email':<36} {'Password'}")
    print("-" * 72)
    for name, email, password in created:
        print(f"{name[:24]:<24} {email[:36]:<36} {password}")
    print("\nUse these credentials at /login with role Vendor.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
