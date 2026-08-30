from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User, RoleEnum
from app.models.vendor import Vendor
from app.schemas.user import UserCreate, UserPublicRegistration, UserOut, Token
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/setup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def setup_first_administrator(payload: UserPublicRegistration, db: Session = Depends(get_db)):
    """One-time local bootstrap. It is permanently closed after the first account exists."""
    if db.query(User.id).first():
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
    """Public sign-up creates an unlinked Vendor account only; it grants no staff role."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=RoleEnum.VENDOR,
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


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2PasswordRequestForm sends "username" + "password" fields (username = email here)
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = create_access_token(subject=str(user.id), extra_claims={"role": user.role.value})
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user
