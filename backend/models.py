from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text, DateTime, Date
from sqlalchemy.orm import relationship
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

    vendors = relationship("Vendor", back_populates="user")


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Links to User if they have an account
    
    company_name = Column(String(255), index=True)
    vendor_code = Column(String(50), unique=True, index=True, nullable=True)
    gstin = Column(String(50), unique=True, index=True, nullable=True)
    category = Column(String(100), nullable=True)
    approval_status = Column(String(50), default="Pending") # Pending, Under Review, Approved, Rejected
    contact_email = Column(String(100))
    
    # Existing fields for backward compatibility with UI/seeds
    rating = Column(Float, default=0.0)
    risk_level = Column(String(50), default="Low") # Low, Medium, High
    delivery_rate = Column(Float, default=100.0)
    quality_score = Column(Float, default=100.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="vendors")
    purchase_orders = relationship("PurchaseOrder", back_populates="vendor")
    contracts = relationship("Contract", back_populates="vendor")
    performance_logs = relationship("PerformanceLog", back_populates="vendor")
    disputes = relationship("Dispute", back_populates="vendor")


class Dispute(Base):
    __tablename__ = "disputes"
    
    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    title = Column(String(255))
    description = Column(Text)
    status = Column(String(50), default="Open") # Open, Resolved
    evidence_url = Column(String(255), nullable=True) # Added for evidence upload
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    vendor = relationship("Vendor", back_populates="disputes")


class PerformanceLog(Base):
    __tablename__ = "performance_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    po_number = Column(String(100), nullable=True)
    
    promised_delivery_date = Column(Date, nullable=True)
    actual_delivery_date = Column(Date, nullable=True)
    
    ordered_quantity = Column(Integer, default=0)
    accepted_quantity = Column(Integer, default=0)
    
    service_rating = Column(Float, default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    vendor = relationship("Vendor", back_populates="performance_logs")



class ProcurementRequest(Base):
    __tablename__ = "procurement_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    request_number = Column(String(100), unique=True, index=True)
    department = Column(String(100))
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    estimated_cost = Column(Float, default=0.0)
    total_cost = Column(Float, default=0.0)
    approval_status = Column(String(50), default="Pending") # Pending, Approved, Rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    vendor = relationship("Vendor")

    items = relationship("PRItem", back_populates="procurement_request")
    purchase_orders = relationship("PurchaseOrder", back_populates="procurement_request")


class PRItem(Base):
    __tablename__ = "pr_items"
    
    id = Column(Integer, primary_key=True, index=True)
    pr_id = Column(Integer, ForeignKey("procurement_requests.id"))
    item_details = Column(String(255))
    quantity = Column(Integer, default=1)
    estimated_cost = Column(Float, default=0.0)
    
    procurement_request = relationship("ProcurementRequest", back_populates="items")
    po_items = relationship("POItem", back_populates="pr_item")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    pr_id = Column(Integer, ForeignKey("procurement_requests.id"), nullable=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    po_number = Column(String(100), unique=True, index=True)
    fulfillment_status = Column(String(50), default="In Progress") # In Progress, Shipped, Delivered
    invoice_url = Column(String(255), nullable=True)
    receipt_url = Column(String(255), nullable=True)
    created_timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    procurement_request = relationship("ProcurementRequest", back_populates="purchase_orders")
    vendor = relationship("Vendor", back_populates="purchase_orders")
    items = relationship("POItem", back_populates="purchase_order")

    @property
    def total_amount(self):
        return self.procurement_request.total_cost if self.procurement_request else 0.0


class POItem(Base):
    __tablename__ = "po_items"
    
    id = Column(Integer, primary_key=True, index=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"))
    pr_item_id = Column(Integer, ForeignKey("pr_items.id"), nullable=True)
    
    purchase_order = relationship("PurchaseOrder", back_populates="items")
    pr_item = relationship("PRItem", back_populates="po_items")


class Contract(Base):
    __tablename__ = "contracts"
    
    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    start_date = Column(Date)
    expiry_date = Column(Date)
    renewal_notice_days = Column(Integer, default=30)
    compliance_flags = Column(String(255), nullable=True)
    document_url = Column(String(255), nullable=True)
    status = Column(String(50), default="Active") # Active, Expiring, Expired
    
    vendor = relationship("Vendor", back_populates="contracts")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(255))
    entity_type = Column(String(100)) # e.g. "Vendor", "PurchaseOrder", "Contract"
    entity_id = Column(Integer)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User")

class MessageThread(Base):
    __tablename__ = "message_threads"
    
    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(100)) # e.g. "PurchaseOrder", "Contract"
    entity_id = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    messages = relationship("Message", back_populates="thread")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("message_threads.id"))
    sender_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    thread = relationship("MessageThread", back_populates="messages")
    sender = relationship("User")

    @property
    def sender_name(self):
        return self.sender.name if self.sender else "Unknown"

    @property
    def sender_role(self):
        return self.sender.role if self.sender else "Unknown"

class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"))
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    invoice_number = Column(String(100), unique=True, index=True)
    amount = Column(Float, default=0.0)
    invoice_date = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(50), default="Pending") # Pending, Approved, Paid, Discrepancy
    discrepancy = Column(Text, nullable=True)
    document_path = Column(String(255), nullable=True)
    
    purchase_order = relationship("PurchaseOrder")
    vendor = relationship("Vendor")

class DeliveryTracking(Base):
    __tablename__ = "delivery_tracking"
    
    id = Column(Integer, primary_key=True, index=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"))
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    expected_date = Column(Date, nullable=True)
    actual_date = Column(Date, nullable=True)
    status = Column(String(50), default="In Transit") # Pending, Shipped, Delivered, Delayed
    delay_days = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    purchase_order = relationship("PurchaseOrder")
    vendor = relationship("Vendor")

class VendorRiskHistory(Base):
    __tablename__ = "vendor_risk_history"
    
    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    score = Column(Float, default=0.0)
    risk_level = Column(String(50), default="Low")
    reason = Column(String(255), nullable=True)
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())
    
    vendor = relationship("Vendor")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(String(50)) # e.g., 'Risk Alert', 'PO Delayed'
    title = Column(String(255))
    message = Column(Text)
    severity = Column(String(50), default="Info") # Info, Warning, Critical
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User")

class Budget(Base):
    __tablename__ = "budgets"
    id = Column(Integer, primary_key=True, index=True)
    department = Column(String(100), unique=True, index=True)
    allocated_limit = Column(Float, default=0.0)
