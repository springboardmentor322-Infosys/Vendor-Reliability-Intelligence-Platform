from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Assuming standard local XAMPP/WAMP/MySQL defaults: username=root, no password, db=vendorintel
# You can change these details if your MySQL is configured differently.
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:1234@localhost/vendorintel"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
