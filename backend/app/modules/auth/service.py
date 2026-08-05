import uuid
from fastapi import HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.auth.repository import get_user_by_email, create_user, update_user_reset_token, get_user_by_reset_token, update_user_password
from app.modules.auth.schemas import UserCreate, UserLogin
from app.core.security import verify_password, create_access_token
from app.core.dependencies import get_db, oauth2_scheme
from app.core.config import settings
from jose import jwt, JWTError

async def authenticate_user(db: AsyncSession, user: UserLogin):
    db_user = await get_user_by_email(db, user.email)
    if not db_user:
        return False
    if not verify_password(user.password, db_user.password_hash):
        return False
    if db_user.status != "active":
        raise HTTPException(status_code=403, detail="Account is pending approval")
    return db_user

async def register_new_user(db: AsyncSession, user: UserCreate):
    db_user = await get_user_by_email(db, user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return await create_user(db, user)

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
            
        from app.core.redis import is_token_blacklisted
        if await is_token_blacklisted(token):
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
        
    user = await get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    return user

async def process_forgot_password(db: AsyncSession, email: str):
    user = await get_user_by_email(db, email)
    if not user:
        # Avoid user enumeration by returning generic success
        return True
    
    reset_token = str(uuid.uuid4())
    await update_user_reset_token(db, user, reset_token)
    # In a real app, send email here. For milestone 1, we just return the token in API for dev testing
    return reset_token

async def process_reset_password(db: AsyncSession, token: str, new_password: str):
    user = await get_user_by_reset_token(db, token)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid token")
    
    await update_user_password(db, user, new_password)
    return True
