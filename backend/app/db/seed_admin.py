"""Seed or refresh the administrator account from .env credentials."""

import sys
from typing import Any

from sqlalchemy import select

from app.core.config import Settings, get_settings
from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.user import Role, User


def ensure_admin_account(db: Any, settings: Settings | None = None) -> bool:
    settings = settings or get_settings()

    if not settings.ADMIN_EMAIL or not settings.ADMIN_PASSWORD:
        print("Error: ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env", file=sys.stderr)
        return False

    if len(settings.ADMIN_PASSWORD) < 8:
        print("Error: ADMIN_PASSWORD must be at least 8 characters", file=sys.stderr)
        return False

    existing_admin = db.scalar(select(User).where(User.role == Role.ADMINISTRATOR))
    target_user = db.scalar(select(User).where(User.email == settings.ADMIN_EMAIL))

    if existing_admin is None:
        if target_user is None:
            admin = User(
                name="Administrator",
                email=settings.ADMIN_EMAIL,
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                role=Role.ADMINISTRATOR,
                is_active=True,
            )
            db.add(admin)
            db.commit()
            print(f"Administrator account created for {settings.ADMIN_EMAIL}")
            return True

        target_user.name = "Administrator"
        target_user.hashed_password = get_password_hash(settings.ADMIN_PASSWORD)
        target_user.role = Role.ADMINISTRATOR
        target_user.is_active = True
        db.commit()
        print(f"Administrator account refreshed for {settings.ADMIN_EMAIL}")
        return True

    if target_user is None or target_user.id == existing_admin.id:
        existing_admin.name = "Administrator"
        existing_admin.email = settings.ADMIN_EMAIL
        existing_admin.hashed_password = get_password_hash(settings.ADMIN_PASSWORD)
        existing_admin.role = Role.ADMINISTRATOR
        existing_admin.is_active = True
        db.commit()
        print(f"Administrator account refreshed for {settings.ADMIN_EMAIL}")
        return True

    target_user.name = "Administrator"
    target_user.hashed_password = get_password_hash(settings.ADMIN_PASSWORD)
    target_user.role = Role.ADMINISTRATOR
    target_user.is_active = True
    db.commit()
    print(f"Administrator account refreshed for {settings.ADMIN_EMAIL}")
    return True


def main() -> int:
    db = SessionLocal()
    try:
        return 0 if ensure_admin_account(db) else 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
