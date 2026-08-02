from sqlalchemy import Column, Integer, Float, ForeignKey
from app.core.database import Base

class VendorReliability(Base):
    __tablename__ = "vendor_reliability"
    
    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    reliability_score = Column(Float, default=0.0)
