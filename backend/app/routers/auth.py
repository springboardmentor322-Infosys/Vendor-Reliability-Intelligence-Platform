"""Authentication HTTP endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.database import get_db
from app.models import User
from app.schemas.auth import LoginRequest, RefreshTokenRequest, TokenResponse
from app.schemas.user import UserRead, UserRegister
from app.services.auth_service import (
    authenticate_user,
    create_token_response,
    refresh_user_tokens,
    register_user,
)


router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(registration: UserRegister, database_session: DatabaseSession) -> TokenResponse:
    """Register a new user with one of the seeded VendorIQ roles."""

    user = register_user(database_session, registration)
    return create_token_response(user)


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, database_session: DatabaseSession) -> TokenResponse:
    """Authenticate a user and return a JWT access/refresh token pair."""

    user = authenticate_user(database_session, credentials.email, credentials.password)
    return create_token_response(user)


@router.post("/refresh-token", response_model=TokenResponse)
def refresh_token(
    payload: RefreshTokenRequest, database_session: DatabaseSession
) -> TokenResponse:
    """Exchange a valid refresh token for a current JWT token pair."""

    return refresh_user_tokens(database_session, payload.refresh_token)


@router.get("/me", response_model=UserRead)
def get_me(current_user: CurrentUser) -> User:
    """Return the profile and roles represented by the current access token."""

    return current_user
