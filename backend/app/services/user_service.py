from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.user import User
from app.schemas.user import UserCreate
from app.utils.security import hash_password

from app.utils.security import verify_password
from app.utils.jwt import create_access_token


def create_user(user: UserCreate, db: Session):
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user.email).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # Hash password
    hashed_password = hash_password(user.password)

    # Create user
    new_user = User(
        full_name=user.full_name,
        email=user.email,
        password=hashed_password,
        role="Vendor"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user

def login_user(user, db: Session):
    existing_user = (
        db.query(User)
        .filter(User.email == user.email)
        .first()
    )

    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(
        user.password,
        existing_user.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_access_token(
        {
            "sub": existing_user.email,
            "role": existing_user.role
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }