from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String, nullable=True)
    role = Column(String, default="Procurement Manager") # Roles: Administrator, Procurement Manager, Supply Chain Manager, Vendor, Finance Officer, Auditor
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    delivery = Column(String, default="On Time") # On Time / Delayed
    category = Column(String, default="Raw Material Suppliers") # Categories: Raw Material Suppliers, Equipment Vendors, IT Vendors, Service Providers, Logistics Partners, Maintenance Vendors
    status = Column(String, default="Active") # Active, Pending Approval, Suspended, Inactive
    approval_status = Column(String, default="Approved") # Approved, Pending, Rejected
    score = Column(Integer, default=85) # Overall Reliability Score (0-100)
    quality = Column(Integer, default=90) # Quality score (0-100)
    response_time = Column(Integer, default=24) # Avg response time in hours
    contact_person = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    risk_level = Column(String, default="Low") # Low, Medium, High
    issue_resolution_time = Column(Integer, default=48) # In hours
    order_completion_rate = Column(Float, default=98.0) # Percentage

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String, unique=True, index=True)
    vendor = Column(String)
    product = Column(String)
    amount = Column(Integer)
    status = Column(String, default="Pending") # Pending, Approved, Ordered, Delivered, Completed, Cancelled
    invoice_number = Column(String, default="")
    invoice_status = Column(String, default="Pending")
    invoice_file = Column(String, nullable=True)
    proof_of_delivery = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(String, unique=True, index=True)
    vendor = Column(String)
    contract_name = Column(String)
    start_date = Column(String)
    expiry_date = Column(String)
    renewal_notice_period = Column(Integer, default=30)
    terms = Column(String, nullable=True)
    status = Column(String, default="Active") # Active, Expiring Soon, Expired, Terminated
    compliance_score = Column(Integer, default=95)
    file_path = Column(String, nullable=True)

class Procurement(Base):
    __tablename__ = "procurements"

    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String)
    quantity = Column(Integer)
    estimated_cost = Column(Integer)
    department = Column(String)
    status = Column(String, default="Pending") # Pending, Approved, Rejected, Ordered
    vendor_assigned = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    message = Column(Text)
    category = Column(String, default="Procurement Alert") # Delivery Delay, Contract Expiry, Vendor Approval, Compliance
    type = Column(String, default="info") # info, warning, danger, success
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class CommunicationMessage(Base):
    __tablename__ = "communication_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender = Column(String)
    recipient = Column(String)
    subject = Column(String)
    body = Column(Text)
    file_attachment = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user = Column(String)
    action = Column(String)
    details = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)