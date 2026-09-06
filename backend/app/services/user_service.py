from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.user import User
from app.schemas.user import UserCreate
from app.schemas.user import UserLogin

from app.utils.security import (
    hash_password,
    verify_password
)

from app.utils.jwt import create_access_token


# ============================================================
# CREATE USER
# ============================================================

def create_user(
    user: UserCreate,
    db: Session
):

    existing_user = (
        db.query(User)
        .filter(User.email == user.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    hashed_password = hash_password(
        user.password
    )

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


# ============================================================
# LOGIN USER
# ============================================================

def login_user(
    user,
    db: Session
):

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


# ============================================================
# GET ALL USERS
# ============================================================

def get_all_users(
    db: Session
):

    return (
        db.query(User)
        .order_by(User.id.desc())
        .all()
    )


# ============================================================
# GET USER BY ID
# ============================================================

def get_user_by_id(
    db: Session,
    user_id: int
):

    return (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )


# ============================================================
# UPDATE USER
# ============================================================

def update_user(
    db: Session,
    user_id: int,
    user_data
):

    db_user = get_user_by_id(
        db,
        user_id
    )

    if not db_user:
        return None

    update_data = user_data.model_dump(
        exclude_unset=True
    )

    # Prevent duplicate email
    if "email" in update_data:

        existing_user = (
            db.query(User)
            .filter(
                User.email == update_data["email"],
                User.id != user_id
            )
            .first()
        )

        if existing_user:

            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )

    # Hash password if password is being changed
    if "password" in update_data:

        update_data["password"] = hash_password(
            update_data["password"]
        )

    for key, value in update_data.items():

        setattr(
            db_user,
            key,
            value
        )

    db.commit()
    db.refresh(db_user)

    return db_user


# ============================================================
# DELETE USER
# ============================================================

def delete_user(
    db: Session,
    user_id: int
):

    db_user = get_user_by_id(
        db,
        user_id
    )

    if not db_user:
        return None

    db.delete(db_user)
    db.commit()

    return {
        "message": "User deleted successfully"
    }