from sqlalchemy import Column, Integer, String, Date, ForeignKey
from app.core.database import Base

class Contract(Base):
    __tablename__ = "contracts"
    
    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    start_date = Column(Date)
    end_date = Column(Date)
    status = Column(String, default="active")
