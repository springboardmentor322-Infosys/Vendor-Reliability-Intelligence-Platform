from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class ProcurementRequest(Base):
    __tablename__ = "procurement_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    department = Column(String, nullable=False)
    description = Column(String)
    status = Column(String, default="Pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Could link to the user who requested it, but we keep it simple for now
    requested_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    purchase_orders = relationship("PurchaseOrder", back_populates="procurement_request")
    items = relationship("PRItem", back_populates="procurement_request", cascade="all, delete-orphan")

class PRItem(Base):
    __tablename__ = "pr_items"
    
    id = Column(Integer, primary_key=True, index=True)
    pr_id = Column(Integer, ForeignKey("procurement_requests.id"))
    item_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    estimated_cost = Column(Float, nullable=False)
    
    procurement_request = relationship("ProcurementRequest", back_populates="items")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String, unique=True, index=True)
    pr_id = Column(Integer, ForeignKey("procurement_requests.id"), nullable=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    amount = Column(Float, nullable=False, default=0.0)
    status = Column(String, default="Pending")
    invoice_file_path = Column(String, nullable=True)
    receipt_file_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    source = Column(String, default="System") # e.g. "DataCo" or "System"
    external_order_id = Column(String, unique=True, index=True, nullable=True)
    
    vendor = relationship("Vendor", back_populates="purchase_orders")
    procurement_request = relationship("ProcurementRequest", back_populates="purchase_orders")
    items = relationship("POItem", back_populates="purchase_order", cascade="all, delete-orphan")
    deliveries = relationship("Delivery", back_populates="purchase_order", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="purchase_order", cascade="all, delete-orphan")
    inspections = relationship("QualityInspection", back_populates="purchase_order", cascade="all, delete-orphan")


class POItem(Base):
    __tablename__ = "po_items"
    
    id = Column(Integer, primary_key=True, index=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"))
    item_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False)
    
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    external_item_id = Column(String, unique=True, index=True, nullable=True)
    
    purchase_order = relationship("PurchaseOrder", back_populates="items")


class Delivery(Base):
    __tablename__ = "deliveries"
    
    id = Column(Integer, primary_key=True, index=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"))
    shipping_date = Column(DateTime, nullable=True)
    scheduled_shipping_date = Column(DateTime, nullable=True)
    delivery_status = Column(String, nullable=True)
    shipping_mode = Column(String, nullable=True)
    days_real = Column(Float, nullable=True)
    days_scheduled = Column(Float, nullable=True)
    late_risk_flag = Column(Integer, nullable=True)
    
    purchase_order = relationship("PurchaseOrder", back_populates="deliveries")


class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"))
    invoice_number = Column(String, unique=True, index=True)
    invoice_date = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    amount = Column(Float, nullable=False, default=0.0)
    status = Column(String, default="Pending")
    
    purchase_order = relationship("PurchaseOrder", back_populates="invoices")


class QualityInspection(Base):
    __tablename__ = "quality_inspections"
    
    id = Column(Integer, primary_key=True, index=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"))
    inspection_date = Column(DateTime, nullable=True)
    status = Column(String, nullable=True) # e.g. "Passed", "Failed", "Pending"
    defect_count = Column(Integer, default=0)
    remarks = Column(String, nullable=True)
    
    purchase_order = relationship("PurchaseOrder", back_populates="inspections")
