import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, create_password_reset_token, decode_access_token, decode_password_reset_token
from app.models.user import User, RoleEnum
from app.models.vendor import Vendor
from app.schemas.user import UserCreate, UserPublicRegistration, UserOut, Token, TokenRefresh, UserProfileUpdate, PasswordChange, PasswordResetRequest, PasswordResetConfirm, VendorAccountLink
from app.api.deps import get_current_user, require_roles
from app.services.notifications import send_email

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/setup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def setup_first_administrator(payload: UserPublicRegistration, db: Session = Depends(get_db)):
    """One-time local bootstrap. It is permanently closed after the first account exists."""
    if db.query(User.id).filter(User.role == RoleEnum.ADMIN).first():
        raise HTTPException(status_code=403, detail="Initial setup is already complete")
    user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=RoleEnum.ADMIN,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_vendor(payload: UserPublicRegistration, db: Session = Depends(get_db)):
    """Local demonstration sign-up for any of the six workspace roles."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_roles(RoleEnum.ADMIN))])
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    """Administrators provision staff and link vendor users to a vendor record."""
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if payload.role == RoleEnum.VENDOR:
        if payload.vendor_id is None:
            raise HTTPException(status_code=422, detail="vendor_id is required for a Vendor user")
        if not db.query(Vendor.id).filter(Vendor.id == payload.vendor_id).first():
            raise HTTPException(status_code=404, detail="Vendor not found")
    elif payload.vendor_id is not None:
        raise HTTPException(status_code=422, detail="Only Vendor users may be linked to a vendor")
    user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        vendor_id=payload.vendor_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/vendor-link", response_model=UserOut,
              dependencies=[Depends(require_roles(RoleEnum.ADMIN))])
def link_vendor_account(user_id: uuid.UUID, payload: VendorAccountLink, db: Session = Depends(get_db)):
    """Link a registered Vendor account to its supplier record.

    Public Vendor sign-up intentionally creates an account first. An
    administrator completes the supplier association here after verification.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != RoleEnum.VENDOR:
        raise HTTPException(status_code=422, detail="Only Vendor accounts can be linked to a vendor record")
    if payload.vendor_id is not None and not db.query(Vendor.id).filter(Vendor.id == payload.vendor_id).first():
        raise HTTPException(status_code=404, detail="Vendor not found")

    user.vendor_id = payload.vendor_id
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2PasswordRequestForm sends "username" + "password" fields (username = email here)
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    return Token(
        access_token=create_access_token(subject=str(user.id), extra_claims={"role": user.role.value}),
        refresh_token=create_refresh_token(subject=str(user.id)),
    )


@router.post("/refresh-token", response_model=Token)
def refresh_token(payload: TokenRefresh, db: Session = Depends(get_db)):
    claims = decode_access_token(payload.refresh_token)
    if claims is None or claims.get("token_type") != "refresh" or not claims.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    try:
        user = db.query(User).filter(User.id == claims["sub"]).first()
    except (ValueError, TypeError):
        user = None
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    return Token(
        access_token=create_access_token(subject=str(user.id), extra_claims={"role": user.role.value}),
        refresh_token=create_refresh_token(subject=str(user.id)),
    )


@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/directory", response_model=list[UserOut])
def user_directory(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Small authenticated directory used to address internal procurement messages."""
    query = db.query(User).filter(User.is_active.is_(True))
    if current_user.role == RoleEnum.VENDOR:
        query = query.filter(User.role != RoleEnum.VENDOR)
    return query.order_by(User.full_name.asc()).all()


@router.patch("/me", response_model=UserOut)
def update_profile(payload: UserProfileUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password")
def change_password(payload: PasswordChange, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


@router.post("/password-reset-request", status_code=202)
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    """Send a short-lived reset link without disclosing whether an account exists."""
    user = db.query(User).filter(User.email == payload.email).first()
    if user and user.is_active:
        token = create_password_reset_token(str(user.id))
        reset_url = f"{settings.APP_PUBLIC_URL.rstrip('/')}/reset-password.html?token={token}"
        send_email(
            user.email,
            f"[{settings.SMTP_FROM_NAME}] Reset your password",
            "A password reset was requested for your VendorIQ account. "
            f"Use this link within 30 minutes: {reset_url}\n\n"
            "If you did not request it, you can safely ignore this email.",
        )
    # Deliberately return the same response for any email to avoid account enumeration.
    return {"message": "If the account exists and email is configured, password-reset instructions will be sent."}


@router.post("/password-reset-confirm")
def confirm_password_reset(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    claims = decode_password_reset_token(payload.token)
    if not claims:
        raise HTTPException(status_code=400, detail="This password-reset link is invalid or has expired")
    try:
        user = db.query(User).filter(User.id == claims["sub"]).first()
    except (ValueError, TypeError):
        user = None
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="This password-reset link is invalid or has expired")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password reset successfully. You can now sign in."}
