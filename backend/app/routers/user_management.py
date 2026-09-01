from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db

from app.models.user import User

from app.schemas.user import UserCreate, ROLES

from app.utils.permissions import (
    require_roles,
    ADMINISTRATOR
)

from app.utils.security import hash_password


router = APIRouter(
    prefix="/user-management",
    tags=["User Management"]
)


# ==========================================
# GET ALL USERS
# ==========================================

@router.get("/")
def get_all_users(
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR
        )
    )
):

    users = (
        db.query(User)
        .order_by(
            User.id.asc()
        )
        .all()
    )


    return [

        {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role
        }

        for user in users

    ]


# ==========================================
# GET SINGLE USER
# ==========================================

@router.get("/{user_id}")
def get_user(
    user_id: int,

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR
        )
    )
):

    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )


    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )


    return {

        "id": user.id,

        "full_name":
            user.full_name,

        "email":
            user.email,

        "role":
            user.role

    }


# ==========================================
# CREATE USER
# ==========================================

@router.post("/")
def create_user(
    data: UserCreate,

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR
        )
    )
):

    # ======================================
    # VALIDATE ROLE
    # ======================================

    if data.role not in ROLES:

        raise HTTPException(
            status_code=400,
            detail="Invalid user role"
        )


    # ======================================
    # CHECK EMAIL
    # ======================================

    existing_user = (
        db.query(User)
        .filter(
            User.email == data.email
        )
        .first()
    )


    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )


    # ======================================
    # CREATE USER
    # ======================================

    user = User(

        full_name=data.full_name,

        email=data.email,

        password=
            hash_password(
                data.password
            ),

        role=data.role

    )


    db.add(user)

    db.commit()

    db.refresh(user)


    # ======================================
    # RESPONSE
    # ======================================

    return {

        "message":
            "User created successfully",

        "user": {

            "id":
                user.id,

            "full_name":
                user.full_name,

            "email":
                user.email,

            "role":
                user.role

        }

    }


# ==========================================
# UPDATE USER ROLE
# ==========================================

@router.put("/{user_id}/role")
def update_user_role(
    user_id: int,

    role_data: dict,

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR
        )
    )
):

    # ======================================
    # GET USER
    # ======================================

    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )


    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )


    # ======================================
    # GET ROLE
    # ======================================

    new_role = role_data.get(
        "role"
    )


    if not new_role:

        raise HTTPException(
            status_code=400,
            detail="Role is required"
        )


    # ======================================
    # VALIDATE ROLE
    # ======================================

    if new_role not in ROLES:

        raise HTTPException(
            status_code=400,
            detail="Invalid user role"
        )


    # ======================================
    # UPDATE ROLE
    # ======================================

    user.role = new_role


    db.commit()

    db.refresh(user)


    return {

        "message":
            "User role updated successfully",

        "user": {

            "id":
                user.id,

            "full_name":
                user.full_name,

            "email":
                user.email,

            "role":
                user.role

        }

    }


# ==========================================
# UPDATE USER
# ==========================================

@router.put("/{user_id}")
def update_user(
    user_id: int,

    data: dict,

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR
        )
    )
):

    # ======================================
    # GET USER
    # ======================================

    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )


    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )


    # ======================================
    # FULL NAME
    # ======================================

    if "full_name" in data:

        full_name = str(
            data["full_name"]
        ).strip()


        if len(full_name) < 2:

            raise HTTPException(
                status_code=400,
                detail="Full name must contain at least 2 characters"
            )


        user.full_name = full_name


    # ======================================
    # EMAIL
    # ======================================

    if "email" in data:

        email = str(
            data["email"]
        ).strip()


        existing_user = (
            db.query(User)
            .filter(
                User.email == email,
                User.id != user_id
            )
            .first()
        )


        if existing_user:

            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )


        user.email = email


    # ======================================
    # ROLE
    # ======================================

    if "role" in data:

        new_role = data["role"]


        if new_role not in ROLES:

            raise HTTPException(
                status_code=400,
                detail="Invalid user role"
            )


        user.role = new_role


    # ======================================
    # PASSWORD
    # ======================================

    if data.get("password"):

        password = str(
            data["password"]
        )


        if len(password) < 8:

            raise HTTPException(
                status_code=400,
                detail="Password must contain at least 8 characters"
            )


        user.password = hash_password(
            password
        )


    # ======================================
    # SAVE
    # ======================================

    db.commit()

    db.refresh(user)


    return {

        "message":
            "User updated successfully",

        "user": {

            "id":
                user.id,

            "full_name":
                user.full_name,

            "email":
                user.email,

            "role":
                user.role

        }

    }


# ==========================================
# DELETE USER
# ==========================================

@router.delete("/{user_id}")
def delete_user(
    user_id: int,

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR
        )
    )
):

    # ======================================
    # PREVENT SELF DELETE
    # ======================================

    if current_user.id == user_id:

        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account"
        )


    # ======================================
    # GET USER
    # ======================================

    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )


    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )


    # ======================================
    # DELETE
    # ======================================

    db.delete(user)

    db.commit()


    return {

        "message":
            "User deleted successfully"

    }