from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from app.modules.auth.models import User, Role
from app.modules.auth.schemas import UserCreate
from app.core.security import get_password_hash

async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(select(User).options(joinedload(User.role)).filter(User.email == email))
    return result.scalars().first()

async def get_user_by_reset_token(db: AsyncSession, token: str):
    result = await db.execute(select(User).filter(User.reset_token == token))
    return result.scalars().first()

async def create_user(db: AsyncSession, user: UserCreate):
    hashed_password = get_password_hash(user.password)
    result = await db.execute(select(Role).filter_by(name=user.role_name))
    role = result.scalars().first()
    
    db_user = User(
        email=user.email,
        password_hash=hashed_password,
        role_id=role.id if role else None,
        status="pending_approval"
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def update_user_reset_token(db: AsyncSession, user: User, token: str):
    user.reset_token = token
    await db.commit()
    await db.refresh(user)
    return user

async def update_user_password(db: AsyncSession, user: User, new_password: str):
    user.password_hash = get_password_hash(new_password)
    user.reset_token = None
    await db.commit()
    await db.refresh(user)
    return user
