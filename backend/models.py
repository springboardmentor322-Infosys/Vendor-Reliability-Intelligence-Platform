from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text, DateTime
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    email = Column(String(100), unique=True, index=True)
    password_hash = Column(String(255))
    role = Column(String(50)) # 'admin', 'vendor', 'manager'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id")) # Links to User if they have an account
    company_name = Column(String(255), index=True)
    contact_email = Column(String(100))
    status = Column(String(50), default="Pending") # Active, Suspended, Pending
    rating = Column(Float, default=0.0)
    risk_level = Column(String(50), default="Low") # Low, Medium, High
    delivery_rate = Column(Float, default=100.0)
    quality_score = Column(Float, default=100.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    item_name = Column(String(255))
    quantity = Column(Integer)
    status = Column(String(50), default="Pending") # Pending, Shipped, Delivered, Cancelled
    created_at = Column(DateTime(timezone=True), server_default=func.now())
