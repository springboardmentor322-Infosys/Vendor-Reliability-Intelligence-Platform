from sqlalchemy import Column, Integer, String, Float
from app.database import Base

class Budget(Base):
    __tablename__ = "budgets"
    id = Column(Integer, primary_key=True, index=True)
    department = Column(String, unique=True, nullable=False, index=True)
    allocated_limit = Column(Float, nullable=False, default=0.0)
