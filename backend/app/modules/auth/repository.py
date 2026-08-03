from sqlalchemy.orm import Session
from app.modules.auth.models import User, Role
from app.modules.auth.schemas import UserCreate
from app.core.security import get_password_hash

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def get_user_by_reset_token(db: Session, token: str):
    return db.query(User).filter(User.reset_token == token).first()

def create_user(db: Session, user: UserCreate):
    hashed_password = get_password_hash(user.password)
    # Default to user role if it exists, otherwise role_id = None for now
    db_user = User(email=user.email, password_hash=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user_reset_token(db: Session, user: User, token: str):
    user.reset_token = token
    db.commit()
    db.refresh(user)
    return user

def update_user_password(db: Session, user: User, new_password: str):
    user.password_hash = get_password_hash(new_password)
    user.reset_token = None
    db.commit()
    db.refresh(user)
    return user
