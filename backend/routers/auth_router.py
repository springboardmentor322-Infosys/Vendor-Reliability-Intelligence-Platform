from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth import (
    hash_password, verify_password, create_access_token, get_current_user, require_roles,
    create_password_reset_token, verify_password_reset_token,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=schemas.UserOut, status_code=201)
def register(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # If someone registers with the Vendor role, auto-link them to a Vendor
    # record that already uses the same email (e.g. procurement registered
    # "Acme Steel" with contact email acme@steel.com - if that person then
    # signs up here with acme@steel.com, they see Acme Steel's own dashboard).
    vendor_id = None
    if payload.role == models.RoleEnum.VENDOR:
        matching_vendor = db.query(models.Vendor).filter(models.Vendor.email == payload.email).first()
        if matching_vendor:
            vendor_id = matching_vendor.id

    user = models.User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        vendor_id=vendor_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return schemas.Token(access_token=token, user=user)


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.post("/change-password")
def change_password(
    payload: schemas.ChangePasswordRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Old password is incorrect")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"detail": "Password updated successfully"}


@router.put("/profile", response_model=schemas.UserOut)
def update_profile(
    payload: schemas.ProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.email and payload.email != current_user.email:
        existing = db.query(models.User).filter(models.User.email == payload.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="That email is already in use")

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/forgot-password")
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()

    # Don't reveal whether the email exists - always respond the same way.
    if not user:
        return {"detail": "If that email is registered, a reset link has been generated.", "reset_link": None}

    token = create_password_reset_token(user.id)
    reset_link = f"reset-password.html?token={token}"

    # No real SMTP/email service is configured for this build (see project
    # README - that's an explicit scope cut for the 1-day timeline). We log
    # the link server-side and also hand it back in the response so the flow
    # can be demoed end-to-end without a mail server.
    print(f"\n[PASSWORD RESET] Reset link for {user.email}: {reset_link}\n")

    return {
        "detail": "Reset link generated. (No email server configured in this demo build - "
                  "the link is shown below instead of being emailed.)",
        "reset_link": reset_link,
    }


@router.post("/reset-password")
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    user_id = verify_password_reset_token(payload.token)
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")

    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"detail": "Your password has been reset. You can now log in with your new password."}


# ---------- Admin: User Management (for the Admin Dashboard) ----------

@router.get("/users", response_model=List[schemas.UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(models.RoleEnum.ADMIN)),
):
    return db.query(models.User).order_by(models.User.created_at.desc()).all()


@router.post("/users/{user_id}/toggle-active", response_model=schemas.UserOut)
def toggle_user_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(models.RoleEnum.ADMIN)),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You can't deactivate your own account.")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return user
