from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_db
from app.core.security import create_access_token
from app.modules.auth.schemas import UserCreate, UserLogin, UserResponse, Token, ForgotPassword, ResetPassword
from app.modules.auth.service import register_new_user, authenticate_user, get_current_user, process_forgot_password, process_reset_password
from app.modules.auth.models import User

router = APIRouter()

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    return register_new_user(db, user)

@router.post("/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = authenticate_user(db, user)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": db_user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password")
def forgot_password(request: ForgotPassword, db: Session = Depends(get_db)):
    token = process_forgot_password(db, request.email)
    if isinstance(token, str):
        # In a real app we wouldn't return the token. For M1 testing, we return it to simulate email.
        return {"message": "Password reset email sent", "token": token}
    return {"message": "Password reset email sent"}

@router.post("/reset-password")
def reset_password(request: ResetPassword, db: Session = Depends(get_db)):
    process_reset_password(db, request.token, request.new_password)
    return {"message": "Password reset successful"}
