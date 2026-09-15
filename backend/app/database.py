import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:prajota%406789@localhost:5432/vendor_db")

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
except Exception as e:
    print(f"[Database Warning] Could not connect to PostgreSQL ({e}). Falling back to local SQLite database.")
    sqlite_db_path = os.path.join(os.path.dirname(__file__), "..", "vendor_db.sqlite")
    DATABASE_URL = f"sqlite:///{os.path.abspath(sqlite_db_path)}"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

def run_db_migrations():
    from app import models
    Base.metadata.create_all(bind=engine)
    
    migrations = [
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS approval_status VARCHAR DEFAULT 'Approved';",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS contact_person VARCHAR;",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS email VARCHAR;",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS phone VARCHAR;",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS risk_level VARCHAR DEFAULT 'Low';",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS issue_resolution_time INTEGER DEFAULT 48;",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS order_completion_rate FLOAT DEFAULT 98.0;",
        "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;",
        "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS compliance_score INTEGER DEFAULT 95;",
        "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS file_path VARCHAR;",
        "ALTER TABLE procurements ADD COLUMN IF NOT EXISTS vendor_assigned VARCHAR;",
        "ALTER TABLE procurements ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"
    ]
    
    try:
        with engine.connect() as conn:
            for query in migrations:
                try:
                    conn.execute(text(query))
                    conn.commit()
                except Exception as ex:
                    pass
    except Exception as e:
        print(f"[Migration Warning] {e}")

run_db_migrations()