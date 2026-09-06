from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse
)
from app.services.user_service import (
    create_user,
    get_all_users,
    get_user_by_id,
    update_user,
    delete_user
)
from app.services.authorization import require_roles


router = APIRouter(
    prefix="/users",
    tags=["User Management"]
)


# --------------------------------------------------
# GET ALL USERS
# Administrator only
# --------------------------------------------------

@router.get(
    "/",
    response_model=list[UserResponse]
)
def read_users(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles("Administrator")
    )
):
    return get_all_users(db)


# --------------------------------------------------
# GET USER BY ID
# Administrator only
# --------------------------------------------------

@router.get(
    "/{user_id}",
    response_model=UserResponse
)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles("Administrator")
    )
):
    user = get_user_by_id(
        db,
        user_id
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return user


# --------------------------------------------------
# CREATE USER
# Administrator only
# --------------------------------------------------

@router.post(
    "/",
    response_model=UserResponse,
    status_code=201
)
def add_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles("Administrator")
    )
):
    return create_user(
        user,
        db
    )


# --------------------------------------------------
# UPDATE USER
# Administrator only
# --------------------------------------------------

@router.put(
    "/{user_id}",
    response_model=UserResponse
)
def edit_user(
    user_id: int,
    user: UserUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles("Administrator")
    )
):
    updated_user = update_user(
        db,
        user_id,
        user
    )

    if not updated_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return updated_user


# --------------------------------------------------
# DELETE USER
# Administrator only
# --------------------------------------------------

@router.delete(
    "/{user_id}"
)
def remove_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles("Administrator")
    )
):
    deleted_user = delete_user(
        db,
        user_id
    )

    if not deleted_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return deleted_user