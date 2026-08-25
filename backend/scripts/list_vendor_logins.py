"""List vendor records and their linked login emails."""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import SessionLocal
from app.models.vendor import Vendor


def main() -> int:
    db = SessionLocal()
    try:
        vendors = list(
            db.scalars(
                select(Vendor)
                .options(selectinload(Vendor.owner))
                .order_by(Vendor.name)
            )
        )
    finally:
        db.close()

    if not vendors:
        print("No vendors found.")
        return 0

    print(f"{'ID':<4} {'Vendor':<22} {'Login Email':<40} {'Has User?'}")
    print("-" * 80)
    for vendor in vendors:
        email = vendor.owner.email if vendor.owner else vendor.contact_email
        has_user = "Yes" if vendor.user_id else "No — run seed_vendor_logins.py"
        print(f"{vendor.id:<4} {vendor.name[:22]:<22} {email[:40]:<40} {has_user}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
