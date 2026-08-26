import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Reads backend/.env automatically so DATABASE_URL doesn't need to be set by
# hand in every new terminal session. See backend/.env - fill in your real
# PostgreSQL password there.
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # No PostgreSQL connection configured - fall back so the app doesn't
    # crash, but this is NOT what you want if PostgreSQL is a requirement.
    # Set DATABASE_URL in backend/.env to fix this.
    print("\n[WARNING] DATABASE_URL not set in backend/.env - falling back to local SQLite.")
    print("If PostgreSQL is required, fix backend/.env before continuing.\n")
    DATABASE_URL = "sqlite:///./vendoriq.db"

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)

db_kind = "PostgreSQL" if DATABASE_URL.startswith("postgresql") else "SQLite (fallback)"
print(f"[DB] Connected using: {db_kind}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
