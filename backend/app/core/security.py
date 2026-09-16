"""Password, JWT, and role-based authorization helpers."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any
from uuid import uuid4

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.database.database import get_db
from app.models import User


password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_v1_prefix}/auth/login")


def get_password_hash(password: str) -> str:
    """Return a bcrypt hash for a validated password."""

    return password_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Compare a supplied password with its persisted bcrypt hash safely."""

    try:
        return password_context.verify(plain_password, password_hash)
    except (TypeError, ValueError):
        return False


def _create_token(subject: int, token_type: str, expires_delta: timedelta, roles: list[str] | None = None) -> str:
    """Create a signed JWT with standard identity, lifetime, and type claims."""

    issued_at = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": token_type,
        "iat": issued_at,
        "exp": issued_at + expires_delta,
        "jti": str(uuid4()),
    }
    if roles is not None:
        payload["roles"] = roles
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(subject: int, roles: list[str]) -> str:
    """Create a short-lived token used to authorize API requests."""

    return _create_token(
        subject=subject,
        token_type="access",
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
        roles=roles,
    )


def create_refresh_token(subject: int) -> str:
    """Create a longer-lived token used only to renew access credentials."""

    return _create_token(
        subject=subject,
        token_type="refresh",
        expires_delta=timedelta(days=settings.refresh_token_expire_days),
    )


def _invalid_credentials_exception() -> HTTPException:
    """Create the uniform 401 response used for invalid access tokens."""

    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _decode_token(token: str, expected_type: str) -> dict[str, Any]:
    """Decode a JWT and ensure it is being used for its intended purpose."""

    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as error:
        raise _invalid_credentials_exception() from error

    if payload.get("type") != expected_type or not payload.get("sub"):
        raise _invalid_credentials_exception()
    return payload


def decode_refresh_token(token: str) -> dict[str, Any]:
    """Decode a refresh token, rejecting access tokens at the boundary."""

    return _decode_token(token, expected_type="refresh")


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    database_session: Annotated[Session, Depends(get_db)],
) -> User:
    """Resolve the active user represented by a valid access token."""

    payload = _decode_token(token, expected_type="access")
    try:
        user_id = int(payload["sub"])
    except (TypeError, ValueError, KeyError) as error:
        raise _invalid_credentials_exception() from error

    statement = (
        select(User)
        .options(selectinload(User.roles))
        .where(User.id == user_id)
    )
    user = database_session.scalar(statement)
    if user is None or not user.is_active:
        raise _invalid_credentials_exception()
    return user


def require_roles(*allowed_roles: str) -> Callable[..., User]:
    """Return a dependency that permits users with any supplied role.

    Future protected endpoints can use `Depends(require_roles("Administrator"))`
    without duplicating role checks. Roles come from the database so access
    changes take effect even when an older JWT still exists.
    """

    allowed_role_names = {role.casefold() for role in allowed_roles}

    def role_guard(current_user: Annotated[User, Depends(get_current_user)]) -> User:
        current_role_names = {role.name.casefold() for role in current_user.roles}
        if not current_role_names.intersection(allowed_role_names):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return current_user

    return role_guard
