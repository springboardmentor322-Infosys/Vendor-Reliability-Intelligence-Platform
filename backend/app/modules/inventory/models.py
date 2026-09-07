from sqlalchemy import Column, Integer, String, Float
from app.core.database import Base

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    external_product_id = Column(String, unique=True, index=True, nullable=True) # E.g. Product Card Id from DataCo
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    price = Column(Float, nullable=False, default=0.0)
    status = Column(String, nullable=True)
