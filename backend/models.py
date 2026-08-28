from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    fullname = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    role = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    status = Column(String, default="pending")

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    invoice_no = Column(String, unique=True, index=True, nullable=False)
    vendor_name = Column(String, nullable=False)
    product_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    department = Column(String, nullable=False)
    creation_date = Column(String, nullable=False)
    expiry_date = Column(String, nullable=False)
    total_value = Column(Float, nullable=False)
    order_status = Column(String, default="Pending")
    
    completed_units = Column(Integer, default=0)
    production_status = Column(String, default="Pending")

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_no = Column(String, unique=True, index=True, nullable=False)
    vendor_name = Column(String, nullable=False)
    product_name = Column(String, nullable=False)
    department = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String, default="Pending")
    delivery_status = Column(String, default="In Transit")
    quality_status = Column(String, default="In Progress")
    payment_status = Column(String, default="Unpaid")
    transaction_id = Column(String, nullable=True)

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    vendor_name = Column(String, unique=True, index=True)
    contact_person = Column(String)
    email = Column(String)
    phone = Column(String, nullable=True)
    category = Column(String, default="General")
    reliability_score = Column(Float, default=100.0)
    risk_tier = Column(String, default="Low Risk")
    status = Column(String, default="Accepting Orders")
    last_ordered_date = Column(String, nullable=True)
    contract_ended_date = Column(String, nullable=True)

class VendorLog(Base):
    __tablename__ = "vendor_logs"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    event_type = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    vendor = relationship("Vendor", backref="logs")

class SystemLog(Base):
    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, nullable=False) 
    description = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.now)

class VendorPerformanceLog(Base):
    __tablename__ = "vendor_performance_logs"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    delivery_timeliness = Column(Float, nullable=False)
    quality_rating = Column(Float, nullable=False)
    response_time_hours = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    vendor = relationship("Vendor", backref="performance_logs")
