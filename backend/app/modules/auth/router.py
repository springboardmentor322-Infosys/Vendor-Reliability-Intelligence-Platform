from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.core.security import create_access_token, create_refresh_token
from app.modules.auth.schemas import UserCreate, UserLogin, UserResponse, Token, ForgotPassword, ResetPassword
from app.modules.auth.service import register_new_user, authenticate_user, get_current_user, process_forgot_password, process_reset_password, get_user_by_email
from app.modules.auth.models import User

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    return await register_new_user(db, user)

@router.post("/login")
async def login(user: UserLogin, db: AsyncSession = Depends(get_db)):
    db_user = await authenticate_user(db, user)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": db_user.email, "role": db_user.role.name})
    refresh_token = create_refresh_token(data={"sub": db_user.email, "role": db_user.role.name})
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.post("/refresh-token")
async def refresh_token(refresh_token: str, db: AsyncSession = Depends(get_db)):
    try:
        from app.core.config import settings
        from jose import jwt, JWTError
        payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    db_user = await get_user_by_email(db, email)
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    access_token = create_access_token(data={"sub": db_user.email, "role": db_user.role.name})
    new_refresh_token = create_refresh_token(data={"sub": db_user.email, "role": db_user.role.name})
    return {"access_token": access_token, "refresh_token": new_refresh_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password")
async def forgot_password(request: ForgotPassword, db: AsyncSession = Depends(get_db)):
    token = await process_forgot_password(db, request.email)
    if isinstance(token, str):
        # In a real app we wouldn't return the token. For M1 testing, we return it to simulate email.
        return {"message": "Password reset email sent", "token": token}
    return {"message": "Password reset email sent"}

@router.post("/reset-password")
async def reset_password(request: ResetPassword, db: AsyncSession = Depends(get_db)):
    await process_reset_password(db, request.token, request.new_password)
    return {"message": "Password reset successful"}
