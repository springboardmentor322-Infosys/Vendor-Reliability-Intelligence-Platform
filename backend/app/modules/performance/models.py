from sqlalchemy import Column, Integer, Float, ForeignKey
from app.core.database import Base

class VendorPerformance(Base):
    __tablename__ = "vendor_performance"
    
    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    quality_score = Column(Float, default=0.0)
    delivery_score = Column(Float, default=0.0)
