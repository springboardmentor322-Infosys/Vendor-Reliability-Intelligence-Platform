"""Password reset service — secure one-time token flow for VendorIQ.

Tokens are hashed with SHA-256 before storage so the raw token value
is never persisted (protection against database leakage).
"""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models import PasswordResetToken, User

TOKEN_EXPIRY_HOURS = 2


def _hash_token(token: str) -> str:
    """Return a SHA-256 digest of the raw token."""
    return hashlib.sha256(token.encode()).hexdigest()


def generate_reset_token(db: Session, email: str) -> Optional[str]:
    """Create and store a secure one-time reset token for the given email.

    Returns the raw token string (to be included in the reset URL sent by email).
    Returns None if no active user with that email exists (so as not to leak
    account existence information to callers — the API should return 200 either way).
    """
    user = db.scalar(
        select(User).where(User.email == email.lower().strip(), User.is_active == True)
    )
    if user is None:
        return None

    # Expire any existing tokens for this user
    existing = db.scalars(
        select(PasswordResetToken).where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.is_used == False,
        )
    ).all()
    for t in existing:
        t.is_used = True

    raw_token = secrets.token_urlsafe(48)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRY_HOURS)

    record = PasswordResetToken(
        user_id=user.id,
        token_hash=_hash_token(raw_token),
        expires_at=expires_at,
        is_used=False,
    )
    db.add(record)
    return raw_token


def validate_reset_token(db: Session, token: str) -> Optional[User]:
    """Look up a valid, unexpired, unused token and return its owner."""
    now = datetime.now(timezone.utc)
    record = db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == _hash_token(token),
            PasswordResetToken.is_used == False,
            PasswordResetToken.expires_at > now,
        )
    )
    if record is None:
        return None

    user = db.scalar(select(User).where(User.id == record.user_id, User.is_active == True))
    return user


def apply_password_reset(db: Session, token: str, new_password: str) -> bool:
    """Validate the token and update the user's password. Returns True on success."""
    now = datetime.now(timezone.utc)
    record = db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == _hash_token(token),
            PasswordResetToken.is_used == False,
            PasswordResetToken.expires_at > now,
        )
    )
    if record is None:
        return False

    user = db.scalar(select(User).where(User.id == record.user_id, User.is_active == True))
    if user is None:
        return False

    user.password_hash = get_password_hash(new_password)
    record.is_used = True
    return True
