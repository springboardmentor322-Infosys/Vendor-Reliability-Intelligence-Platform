"""Business logic for registration, authentication, and token refresh."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.security import create_access_token, create_refresh_token, decode_refresh_token, verify_password
from app.models import Role, User, UserRole
from app.schemas.auth import TokenResponse
from app.schemas.user import UserRegister


INVALID_CREDENTIALS_DETAIL = "Incorrect email or password."
INVALID_REFRESH_TOKEN_DETAIL = "Refresh token is invalid or has expired."


def _get_user_with_roles_by_id(database_session: Session, user_id: int) -> User | None:
    """Return a user and eager-load roles for response and token generation."""

    statement = (
        select(User)
        .options(selectinload(User.roles))
        .where(User.id == user_id)
    )
    return database_session.scalar(statement)


def get_user_with_roles(database_session: Session, user_id: int) -> User | None:
    """Public helper used by protected routes and refresh-token handling."""

    return _get_user_with_roles_by_id(database_session, user_id)


def register_user(database_session: Session, registration: UserRegister) -> User:
    """Create an active user and assign the selected seeded role."""

    existing_user = database_session.scalar(
        select(User.id).where(func.lower(User.email) == registration.email)
    )
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    selected_role = database_session.scalar(
        select(Role).where(func.lower(Role.name) == registration.role_name.casefold())
    )
    if selected_role is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The selected role is not available.",
        )
    if selected_role.name.casefold() == "administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator accounts cannot be self-registered. They must be provisioned internally.",
        )
    if selected_role.name.casefold() == "vendor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vendor accounts must be provisioned by a Procurement Manager or Administrator and linked to a vendor company.",
        )

    from app.core.security import get_password_hash

    user = User(
        first_name=registration.first_name,
        last_name=registration.last_name,
        email=registration.email,
        phone=registration.phone,
        password_hash=get_password_hash(registration.password),
        is_active=True,
    )
    user.role_links.append(UserRole(role=selected_role))
    database_session.add(user)

    try:
        database_session.commit()
    except IntegrityError as error:
        database_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        ) from error

    created_user = _get_user_with_roles_by_id(database_session, user.id)
    if created_user is None:
        raise RuntimeError("The newly created user could not be retrieved.")
    return created_user


def authenticate_user(database_session: Session, email: str, password: str) -> User:
    """Verify credentials without revealing which credential was incorrect."""

    statement = (
        select(User)
        .options(selectinload(User.roles))
        .where(func.lower(User.email) == email.casefold())
    )
    user = database_session.scalar(statement)
    if user is None or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_CREDENTIALS_DETAIL,
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive.",
        )
    return user


def create_token_response(user: User) -> TokenResponse:
    """Create a signed access/refresh token pair for an active user."""

    role_names = [role.name for role in user.roles]
    return TokenResponse(
        access_token=create_access_token(subject=user.id, roles=role_names),
        refresh_token=create_refresh_token(subject=user.id),
        token_type="bearer",
        user=user,
    )


def refresh_user_tokens(database_session: Session, refresh_token: str) -> TokenResponse:
    """Validate a refresh token and issue a fresh token pair for its user."""

    payload = decode_refresh_token(refresh_token)
    subject = payload.get("sub")
    try:
        user_id = int(subject)
    except (TypeError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_REFRESH_TOKEN_DETAIL,
            headers={"WWW-Authenticate": "Bearer"},
        ) from error

    user = _get_user_with_roles_by_id(database_session, user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_REFRESH_TOKEN_DETAIL,
            headers={"WWW-Authenticate": "Bearer"},
        )
    return create_token_response(user)
