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


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    pr_id = Column(Integer, ForeignKey("procurement_requests.id"), nullable=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    amount = Column(Float, nullable=False, default=0.0)
    status = Column(String, default="Pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    vendor = relationship("Vendor", back_populates="purchase_orders")
    procurement_request = relationship("ProcurementRequest", back_populates="purchase_orders")
    items = relationship("POItem", back_populates="purchase_order")


class POItem(Base):
    __tablename__ = "po_items"
    
    id = Column(Integer, primary_key=True, index=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"))
    item_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False)
    
    purchase_order = relationship("PurchaseOrder", back_populates="items")
