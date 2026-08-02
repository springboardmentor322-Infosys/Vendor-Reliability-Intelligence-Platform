from sqlalchemy import Column, Integer, String, Boolean
from app.core.database import Base

class Vendor(Base):
    __tablename__ = "vendors"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    status = Column(String, default="active")
    contact_email = Column(String)
