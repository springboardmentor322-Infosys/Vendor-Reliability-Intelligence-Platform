from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.services.dependencies import get_current_user

from app.database import get_db
from app.schemas.user import UserCreate, UserResponse
from app.services.user_service import create_user

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

from app.schemas.user import (
    UserCreate,
    UserResponse,
    UserLogin,
    Token,
)

from app.services.user_service import (
    create_user,
    login_user,
)


@router.post(
    "/login",
    response_model=Token
)
def login(
    user: UserLogin,
    db: Session = Depends(get_db)
):
    return login_user(user, db)


@router.get("/me")
def read_current_user(
    current_user=Depends(get_current_user)
):

    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role
    }
    
    

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=201
)
def register(user: UserCreate, db: Session = Depends(get_db)):
    return create_user(user, db)


@router.get("/test")
def test():
    return {"message": "Authentication Route Working"}