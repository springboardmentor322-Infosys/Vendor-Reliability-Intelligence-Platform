"""One-time script to seed the sole Administrator account from .env credentials."""

import sys

from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.user import Role, User


def main() -> int:
    settings = get_settings()

    if not settings.ADMIN_EMAIL or not settings.ADMIN_PASSWORD:
        print("Error: ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env", file=sys.stderr)
        return 1

    if len(settings.ADMIN_PASSWORD) < 8:
        print("Error: ADMIN_PASSWORD must be at least 8 characters", file=sys.stderr)
        return 1

    db = SessionLocal()
    try:
        existing_admin = db.scalar(
            select(User).where(User.role == Role.ADMINISTRATOR)
        )
        if existing_admin is not None:
            print(
                "Error: An Administrator account already exists. "
                "This script can only be run once.",
                file=sys.stderr,
            )
            return 1

        email_taken = db.scalar(select(User).where(User.email == settings.ADMIN_EMAIL))
        if email_taken is not None:
            print(
                f"Error: Email {settings.ADMIN_EMAIL!r} is already registered.",
                file=sys.stderr,
            )
            return 1

        admin = User(
            name="Administrator",
            email=settings.ADMIN_EMAIL,
            hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
            role=Role.ADMINISTRATOR,
        )
        db.add(admin)
        db.commit()
        print(f"Administrator account created for {settings.ADMIN_EMAIL}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
