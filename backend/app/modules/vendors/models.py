from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class VendorCategory(Base):
    __tablename__ = "vendor_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String)
    
    vendors = relationship("Vendor", back_populates="category")

class Vendor(Base):
    __tablename__ = "vendors"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    status = Column(String, default="active")
    contact_email = Column(String)
    
    category_id = Column(Integer, ForeignKey("vendor_categories.id"))
    category = relationship("VendorCategory", back_populates="vendors")
    
    contacts = relationship("VendorContact", back_populates="vendor")
    purchase_orders = relationship("PurchaseOrder", back_populates="vendor")
    contracts = relationship("Contract", back_populates="vendor")

class VendorContact(Base):
    __tablename__ = "vendor_contacts"
    
    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String)
    is_primary = Column(Boolean, default=False)
    
    vendor = relationship("Vendor", back_populates="contacts")
