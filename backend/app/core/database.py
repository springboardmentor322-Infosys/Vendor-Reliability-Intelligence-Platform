"""
Sets up the SQLAlchemy engine and a session factory.

Every API request that needs the database will call `get_db()`,
which hands it a session and cleans up afterwards - this pattern
is called "dependency injection" in FastAPI.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# All our model classes (User, Vendor, etc.) will inherit from this Base.
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
