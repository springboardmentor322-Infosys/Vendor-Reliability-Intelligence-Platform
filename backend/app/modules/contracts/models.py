from sqlalchemy import Column, Integer, String, Date, ForeignKey, DateTime, Float, Boolean, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Contract(Base):
    __tablename__ = "contracts"
    
    id = Column(Integer, primary_key=True, index=True)
    contract_number = Column(String, unique=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    contract_type = Column(String, nullable=True)
    start_date = Column(Date)
    end_date = Column(Date)
    renewal_date = Column(Date, nullable=True)
    renewal_notice_period = Column(Integer, default=30)  # days
    contract_value = Column(Float, nullable=True)
    currency = Column(String, default="USD")
    status = Column(String, default="Draft")  # Draft, Active, Expiring Soon, Expired, Renewed, Terminated
    
    terms = Column(Text, nullable=True)
    compliance_flags = Column(JSON, nullable=True)  # Store multiple flags e.g., ["Insurance Missing", "NDA Missing"]
    renewal_required = Column(Boolean, default=False)
    auto_renew = Column(Boolean, default=False)
    
    uploaded_document_path = Column(String, nullable=True)
    uploaded_document_name = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String, nullable=True)
    uploaded_at = Column(DateTime, nullable=True)
    
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    vendor = relationship("Vendor", back_populates="contracts")
    purchase_order = relationship("PurchaseOrder")
    creator = relationship("User")
    documents = relationship("ContractDocument", back_populates="contract")


class ContractDocument(Base):
    __tablename__ = "contract_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"))
    document_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    contract = relationship("Contract", back_populates="documents")
