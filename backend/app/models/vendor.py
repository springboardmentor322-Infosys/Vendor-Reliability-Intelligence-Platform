from sqlalchemy import Column, Integer, String, Float
from sqlalchemy.orm import relationship

from app.database import Base


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)

    vendor_name = Column(String(150), nullable=False, index=True)

    category = Column(String(100), nullable=False)

    email = Column(String(150), unique=True, nullable=False)

    phone = Column(String(20), nullable=False)

    address = Column(String(255), nullable=True)

    reliability_score = Column(Float, default=0)

    compliance_score = Column(Float, default=0)

    status = Column(
        String(30),
        default="Pending",
        nullable=False
    )
    
    approved_by = Column(
        String(100),
        nullable=True
    )

    approval_notes = Column(
        String(500),
        nullable=True
    )

    purchase_orders = relationship(
        "PurchaseOrder",
        back_populates="vendor",
        cascade="all, delete-orphan"
    )
    
    products = relationship(
        "Product",
        back_populates="vendor",
        cascade="all, delete-orphan"
    )
    
    deliveries = relationship(
        "Delivery",
        back_populates="vendor",
        cascade="all, delete-orphan"
    )
    
    contracts = relationship(
        "Contract",
        back_populates="vendor",
        cascade="all, delete"
    )
    
    invoices = relationship(
        "Invoice",
        back_populates="vendor",
        cascade="all, delete"
    )
    
    quality_inspections = relationship(
        "QualityInspection",
        back_populates="vendor",
        cascade="all, delete"
    )
    
    communication_history = relationship(
        "CommunicationHistory",
        back_populates="vendor",
        cascade="all, delete"
    )
    
